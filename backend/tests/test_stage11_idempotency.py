from concurrent.futures import ThreadPoolExecutor
import time
import uuid
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import SessionLocal
from app.main import app
from app.models import Activity, IdempotencyKey, Snack, SnackCategory, User
from seed import seed_database

settings = get_settings()
client = TestClient(app)


# ---------- Helpers & Fixtures ----------

@pytest.fixture(scope="module", autouse=True)
def setup_and_teardown():
    seed_database()
    yield
    # Cleanup any residual idempotency test snacks & keys
    db = SessionLocal()
    try:
        test_snacks = db.query(Snack).filter(Snack.name.like("Idemp Snack%")).all()
        for s in test_snacks:
            db.query(Activity).filter(Activity.snack_id == s.id).delete(synchronize_session=False)
            db.delete(s)

        db.query(IdempotencyKey).filter(
            IdempotencyKey.key.like("test-idemp-%")
            | IdempotencyKey.key.like("test-concurrent-%")
        ).delete(synchronize_session=False)

        db.commit()
    finally:
        db.close()


def _get_member_token() -> str:
    res = client.post(
        "/auth/login",
        json={"email": settings.SEED_MEMBER1_EMAIL, "password": settings.SEED_MEMBER1_PASSWORD},
    )
    assert res.status_code == 200, f"Member login failed: {res.text}"
    return res.json()["token"]


def _get_admin_token() -> str:
    res = client.post(
        "/auth/login",
        json={"email": settings.SEED_ADMIN_EMAIL, "password": settings.SEED_ADMIN_PASSWORD},
    )
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["token"]


def _create_test_snack(name: str, quantity: int = 10, threshold: int = 3) -> int:
    admin_token = _get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "name": name,
        "category": "savoury",
        "quantity": quantity,
        "low_stock_threshold": threshold,
    }
    res = client.post("/snacks", json=payload, headers=headers)
    assert res.status_code == 201, f"Failed to create test snack: {res.text}"
    return res.json()["id"]


# ---------- Tests ----------

def test_idempotency_same_key_deducts_only_once():
    """
    Sending the same Idempotency-Key twice must return the identical cached response
    and deduct stock only once.
    """
    snack_id = _create_test_snack("Idemp Snack SameKey", quantity=10)
    member_token = _get_member_token()
    key = f"test-idemp-{uuid.uuid4()}"
    headers = {
        "Authorization": f"Bearer {member_token}",
        "Idempotency-Key": key,
    }

    # First request: deducts 2 units
    res1 = client.post(f"/snacks/{snack_id}/consume", json={"amount": 2}, headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["snack_id"] == snack_id
    assert data1["amount_consumed"] == 2
    assert data1["remaining_quantity"] == 8

    # Second request: same key, same payload
    res2 = client.post(f"/snacks/{snack_id}/consume", json={"amount": 2}, headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()

    # Verify identical response body
    assert data1 == data2
    assert data2["remaining_quantity"] == 8

    # Verify directly in the DB that stock was deducted ONLY ONCE (quantity == 8, not 6)
    db = SessionLocal()
    try:
        snack = db.query(Snack).filter(Snack.id == snack_id).first()
        assert snack.quantity == 8

        # Verify only 1 activity record was created
        activities = db.query(Activity).filter(Activity.snack_id == snack_id).all()
        assert len(activities) == 1

        # Verify 1 idempotency key record was stored
        idemp_record = db.query(IdempotencyKey).filter(IdempotencyKey.key == key).first()
        assert idemp_record is not None
        assert idemp_record.status_code == 200
    finally:
        db.close()


def test_idempotency_different_keys_deduct_separately():
    """
    Sending requests with different Idempotency-Keys must process independently,
    deducting stock separately for each logical action.
    """
    snack_id = _create_test_snack("Idemp Snack DiffKeys", quantity=10)
    member_token = _get_member_token()
    key1 = f"test-idemp-{uuid.uuid4()}"
    key2 = f"test-idemp-{uuid.uuid4()}"

    headers1 = {"Authorization": f"Bearer {member_token}", "Idempotency-Key": key1}
    headers2 = {"Authorization": f"Bearer {member_token}", "Idempotency-Key": key2}

    # Request 1 with key1
    res1 = client.post(f"/snacks/{snack_id}/consume", json={"amount": 3}, headers=headers1)
    assert res1.status_code == 200
    assert res1.json()["remaining_quantity"] == 7

    # Request 2 with key2
    res2 = client.post(f"/snacks/{snack_id}/consume", json={"amount": 2}, headers=headers2)
    assert res2.status_code == 200
    assert res2.json()["remaining_quantity"] == 5

    # Verify DB state
    db = SessionLocal()
    try:
        snack = db.query(Snack).filter(Snack.id == snack_id).first()
        assert snack.quantity == 5

        activities = db.query(Activity).filter(Activity.snack_id == snack_id).all()
        assert len(activities) == 2
    finally:
        db.close()


def test_idempotency_optional_header():
    """
    The Idempotency-Key header is completely optional: requests without it work normally.
    """
    snack_id = _create_test_snack("Idemp Snack OptionalHeader", quantity=10)
    member_token = _get_member_token()
    headers = {"Authorization": f"Bearer {member_token}"}

    # Request without Idempotency-Key header
    res1 = client.post(f"/snacks/{snack_id}/consume", json={"amount": 1}, headers=headers)
    assert res1.status_code == 200
    assert res1.json()["remaining_quantity"] == 9

    # Another request without Idempotency-Key header
    res2 = client.post(f"/snacks/{snack_id}/consume", json={"amount": 1}, headers=headers)
    assert res2.status_code == 200
    assert res2.json()["remaining_quantity"] == 8

    # Verify DB state
    db = SessionLocal()
    try:
        snack = db.query(Snack).filter(Snack.id == snack_id).first()
        assert snack.quantity == 8
    finally:
        db.close()


def test_idempotency_concurrent_duplicate_requests():
    """
    Under high concurrency, multiple concurrent requests sending the EXACT SAME
    Idempotency-Key must deduct stock only once and all receive the identical response.
    """
    snack_id = _create_test_snack("Idemp Snack Concurrency", quantity=10)
    member_token = _get_member_token()
    key = f"test-concurrent-{uuid.uuid4()}"
    headers = {
        "Authorization": f"Bearer {member_token}",
        "Idempotency-Key": key,
    }

    num_concurrent_requests = 6

    def _fire_consume():
        # Create a new client per thread to simulate distinct HTTP connections
        thread_client = TestClient(app)
        return thread_client.post(f"/snacks/{snack_id}/consume", json={"amount": 2}, headers=headers)

    with ThreadPoolExecutor(max_workers=num_concurrent_requests) as executor:
        futures = [executor.submit(_fire_consume) for _ in range(num_concurrent_requests)]
        responses = [f.result() for f in futures]

    # Every response must be 200 OK
    for r in responses:
        assert r.status_code == 200, f"Expected 200 but got {r.status_code}: {r.text}"
        data = r.json()
        assert data["remaining_quantity"] == 8
        assert data["amount_consumed"] == 2

    # Verify in DB that stock was only deducted ONCE (10 - 2 = 8, NOT 10 - 12 = -2)
    db = SessionLocal()
    try:
        snack = db.query(Snack).filter(Snack.id == snack_id).first()
        assert snack.quantity == 8, f"Expected quantity 8, got {snack.quantity}"

        activities = db.query(Activity).filter(Activity.snack_id == snack_id).all()
        assert len(activities) == 1, f"Expected exactly 1 activity, got {len(activities)}"

        keys = db.query(IdempotencyKey).filter(IdempotencyKey.key == key).all()
        assert len(keys) == 1, f"Expected exactly 1 idempotency key, got {len(keys)}"
    finally:
        db.close()
