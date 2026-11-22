import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from app.database import SessionLocal
from app.models import (
    User,
    Snack,
    Vote,
    Activity,
    UserRole,
    SnackCategory,
    ActivityAction,
)
from app.security import hash_password, verify_password
from seed import seed_database


@pytest.fixture(scope="function")
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_password_hashing_bcrypt():
    """Verify that bcrypt hashing and verification work as expected without passlib."""
    password = "SuperSecretPassword123!"
    hashed = hash_password(password)

    assert hashed != password
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

    # Unique salts generate distinct hashes for identical plain passwords
    hashed2 = hash_password(password)
    assert hashed != hashed2
    assert verify_password(password, hashed2) is True


def test_seeded_users_and_snacks(db):
    """Verify seeded users and snacks in the database."""
    # Run seed to ensure data is present
    seed_database()

    admin = db.query(User).filter_by(role=UserRole.admin).first()
    assert admin is not None
    assert admin.email != ""
    assert verify_password("AdminPassword123!", admin.password_hash) is True

    members = db.query(User).filter_by(role=UserRole.member).all()
    assert len(members) >= 2

    # Verify snacks coverage across categories and stock states
    snacks = db.query(Snack).all()
    assert len(snacks) >= 8

    categories = {s.category for s in snacks}
    assert SnackCategory.sweet in categories
    assert SnackCategory.savoury in categories
    assert SnackCategory.drink in categories
    assert SnackCategory.healthy_ish in categories

    statuses = {s.status for s in snacks}
    assert "gone" in statuses
    assert "running_low" in statuses
    assert "stocked" in statuses


def test_snack_derived_status():
    """Verify derived status logic for all inventory states."""
    gone_snack = Snack(name="Test Gone", category=SnackCategory.sweet, quantity=0, low_stock_threshold=5)
    assert gone_snack.status == "gone"

    low_snack = Snack(name="Test Low", category=SnackCategory.savoury, quantity=3, low_stock_threshold=5)
    assert low_snack.status == "running_low"

    equal_threshold = Snack(name="Test Equal", category=SnackCategory.drink, quantity=5, low_stock_threshold=5)
    assert equal_threshold.status == "running_low"

    stocked_snack = Snack(name="Test Stocked", category=SnackCategory.healthy_ish, quantity=10, low_stock_threshold=5)
    assert stocked_snack.status == "stocked"


def test_database_constraints(db):
    """Verify database-level CHECK and UNIQUE constraints."""
    # 1. Unique email on User
    dup_user = User(
        name="Duplicate Email Test",
        email="admin@snackoverflow.local",  # Already exists from seed
        password_hash="fakehash",
        role=UserRole.member,
    )
    db.add(dup_user)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    # 2. Check constraint: snack quantity >= 0
    neg_snack = Snack(
        name="Negative Stock Snack",
        category=SnackCategory.sweet,
        quantity=-5,
        low_stock_threshold=5,
    )
    db.add(neg_snack)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    # 3. Check constraint: low_stock_threshold >= 0
    neg_threshold = Snack(
        name="Negative Threshold Snack",
        category=SnackCategory.sweet,
        quantity=5,
        low_stock_threshold=-1,
    )
    db.add(neg_threshold)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    # 4. Check constraint: activity amount > 0
    member = db.query(User).filter_by(role=UserRole.member).first()
    snack = db.query(Snack).first()
    invalid_activity = Activity(
        user_id=member.id,
        snack_id=snack.id,
        action=ActivityAction.consumed,
        amount=0,  # Must be > 0
    )
    db.add(invalid_activity)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_vote_unique_constraint_and_cascade(db):
    """Verify vote uniqueness per (user, snack) and CASCADE on delete."""
    # Create temporary user and snack for isolated vote test
    test_user = User(
        name="Vote Test User",
        email="votetest@snackoverflow.local",
        password_hash="fakehash",
        role=UserRole.member,
    )
    test_snack = Snack(
        name="Vote Test Snack",
        category=SnackCategory.sweet,
        quantity=10,
        low_stock_threshold=5,
    )
    db.add(test_user)
    db.add(test_snack)
    db.commit()

    # First vote succeeds
    vote1 = Vote(user_id=test_user.id, snack_id=test_snack.id)
    db.add(vote1)
    db.commit()

    # Second vote by same user on same snack fails (schema-level unique constraint)
    vote2 = Vote(user_id=test_user.id, snack_id=test_snack.id)
    db.add(vote2)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    # Deleting test_snack cascades to delete the vote
    db.delete(test_snack)
    db.commit()

    remaining_vote = db.query(Vote).filter_by(user_id=test_user.id).first()
    assert remaining_vote is None

    # Clean up test user
    db.delete(test_user)
    db.commit()


def test_activity_restrict_foreign_key(db):
    """Verify ON DELETE RESTRICT on activity prevents accidental deletion of referenced user/snack."""
    test_user = User(
        name="Restrict Test User",
        email="restricttest@snackoverflow.local",
        password_hash="fakehash",
        role=UserRole.member,
    )
    test_snack = Snack(
        name="Restrict Test Snack",
        category=SnackCategory.drink,
        quantity=10,
        low_stock_threshold=5,
    )
    db.add(test_user)
    db.add(test_snack)
    db.commit()

    # Add activity record
    activity = Activity(
        user_id=test_user.id,
        snack_id=test_snack.id,
        action=ActivityAction.restocked,
        amount=10,
    )
    db.add(activity)
    db.commit()

    # Deleting the user should fail due to ON DELETE RESTRICT
    db.delete(test_user)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    # Clean up activity first, then snack and user
    act = db.query(Activity).filter_by(user_id=test_user.id).first()
    db.delete(act)
    db.commit()

    u = db.query(User).filter_by(id=test_user.id).first()
    s = db.query(Snack).filter_by(id=test_snack.id).first()
    db.delete(u)
    db.delete(s)
    db.commit()
