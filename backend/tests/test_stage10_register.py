import time
import pytest
from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.models import User, UserRole
from app.security import verify_password
from seed import seed_database

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def ensure_seed_and_cleanup():
    seed_database()
    yield
    # Cleanup any registered test users
    db = SessionLocal()
    try:
        db.query(User).filter(
            User.email.like("%test%@%")
            | User.email.like("charlie%")
            | User.email.like("hacker%")
            | User.email.like("case_test%")
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def test_register_success():
    """Verify standard user registration creates a member account with a valid JWT."""
    email = f"charlie_{int(time.time() * 1000)}@snackoverflow.local"
    payload = {
        "name": "Charlie Member",
        "email": email,
        "password": "CharliePassword123!",
    }

    res = client.post("/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()

    assert "token" in data
    assert data["user"]["name"] == "Charlie Member"
    assert data["user"]["email"] == email.lower()
    assert data["user"]["role"] == "member"

    # Verify password was securely hashed with bcrypt in DB
    db = SessionLocal()
    try:
        user_in_db = db.query(User).filter(User.email == email.lower()).first()
        assert user_in_db is not None
        assert user_in_db.password_hash != "CharliePassword123!"
        assert verify_password("CharliePassword123!", user_in_db.password_hash) is True
        assert user_in_db.role == UserRole.member
    finally:
        db.close()

    # Verify member token works on member routes
    member_headers = {"Authorization": f"Bearer {data['token']}"}
    res_snacks = client.get("/snacks", headers=member_headers)
    assert res_snacks.status_code == 200

    # Verify member token is rejected on admin routes (cannot access /activity)
    res_activity = client.get("/activity", headers=member_headers)
    assert res_activity.status_code == 403


def test_register_privilege_escalation_prevented():
    """
    CRITICAL SECURITY TEST:
    A client injecting 'role: admin' into the registration payload MUST be explicitly rejected with 403 Forbidden;
    admin accounts can NEVER be self-registered.
    """
    email = f"hacker_{int(time.time() * 1000)}@snackoverflow.local"
    payload = {
        "name": "Hacker User",
        "email": email,
        "password": "HackerPassword123!",
        "role": "admin",  # Malicious attempt to self-assign admin
    }

    res = client.post("/auth/register", json=payload)
    assert res.status_code == 403
    data = res.json()
    assert data["error"]["code"] == "ADMIN_REGISTRATION_PROHIBITED"
    assert "Admin accounts cannot be self-registered" in data["error"]["message"]

    # DB record must NOT have been created
    db = SessionLocal()
    try:
        user_in_db = db.query(User).filter(User.email == email.lower()).first()
        assert user_in_db is None
    finally:
        db.close()

    # Invalid role attempt must return 422
    payload["role"] = "superadmin"
    res_invalid = client.post("/auth/register", json=payload)
    assert res_invalid.status_code == 422
    data_inv = res_invalid.json()
    assert data_inv["error"]["code"] == "INVALID_ROLE"


def test_register_duplicate_email():
    """Registering an email that already exists returns 409 Conflict with EMAIL_ALREADY_EXISTS."""
    payload = {
        "name": "Duplicate Admin",
        "email": "admin@snackoverflow.local",  # Canonical seeded admin email
        "password": "AnotherPassword123!",
    }

    res = client.post("/auth/register", json=payload)
    assert res.status_code == 409
    data = res.json()
    assert data["error"]["code"] == "EMAIL_ALREADY_EXISTS"


def test_register_case_insensitive_duplicate_email():
    """Email uniqueness check must be case-insensitive (e.g. MEMBER1@... matches member1@...)."""
    payload = {
        "name": "Duplicate Member Case",
        "email": "MEMBER1@SNACKOVERFLOW.LOCAL",
        "password": "AnotherPassword123!",
    }

    res = client.post("/auth/register", json=payload)
    assert res.status_code == 409
    data = res.json()
    assert data["error"]["code"] == "EMAIL_ALREADY_EXISTS"


def test_register_invalid_email_format():
    """Malformed email strings must be rejected with 422."""
    payload = {
        "name": "Invalid Email User",
        "email": "not-a-valid-email-string",
        "password": "ValidPassword123!",
    }

    res = client.post("/auth/register", json=payload)
    assert res.status_code == 422


def test_register_short_password():
    """Passwords shorter than 6 characters must be rejected with 422."""
    payload = {
        "name": "Short Password User",
        "email": f"short_pwd_{int(time.time())}@snackoverflow.local",
        "password": "123",  # Too short
    }

    res = client.post("/auth/register", json=payload)
    assert res.status_code == 422


def test_existing_login_still_works_for_all_seeded_users():
    """Verify that existing seeded users (admin, member1, member2) can still log in without issue."""
    # 1. Admin login
    res_admin = client.post(
        "/auth/login",
        json={"email": "admin@snackoverflow.local", "password": "AdminPassword123!"},
    )
    assert res_admin.status_code == 200
    assert res_admin.json()["user"]["role"] == "admin"

    # 2. Member 1 login
    res_m1 = client.post(
        "/auth/login",
        json={"email": "member1@snackoverflow.local", "password": "Member1Password123!"},
    )
    assert res_m1.status_code == 200
    assert res_m1.json()["user"]["role"] == "member"

    # 3. Member 2 login
    res_m2 = client.post(
        "/auth/login",
        json={"email": "member2@snackoverflow.local", "password": "Member2Password123!"},
    )
    assert res_m2.status_code == 200
    assert res_m2.json()["user"]["role"] == "member"
