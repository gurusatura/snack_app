import time
from fastapi.testclient import TestClient
import pytest

from app.config import get_settings
from app.database import SessionLocal
from app.main import app
from app.models import Activity, ActivityAction, Snack, User, UserRole
from seed import seed_database

settings = get_settings()
client = TestClient(app)


# ---------- Fixtures ----------

@pytest.fixture(scope="module")
def ensure_seed():
    seed_database()


def _get_token(email: str, password: str) -> str:
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["token"]


@pytest.fixture(scope="module")
def admin_token(ensure_seed):
    return _get_token(settings.SEED_ADMIN_EMAIL, settings.SEED_ADMIN_PASSWORD)


@pytest.fixture(scope="module")
def member_token(ensure_seed):
    return _get_token(settings.SEED_MEMBER1_EMAIL, settings.SEED_MEMBER1_PASSWORD)


def _auth(token: str):
    return {"Authorization": f"Bearer {token}"}


# ---------- Tests for GET /activity ----------

def test_activity_unauthorized():
    """Accessing /activity without authentication fails with 401/403."""
    res = client.get("/activity")
    assert res.status_code in (401, 403)


def test_activity_member_forbidden(member_token):
    """Member role is strictly forbidden from accessing /activity."""
    res = client.get("/activity", headers=_auth(member_token))
    assert res.status_code == 403
    err = res.json().get("error") or res.json().get("detail", {}).get("error")
    assert err["code"] == "FORBIDDEN"
    assert "Admin" in err["message"]


def test_activity_admin_success_and_pagination(admin_token):
    """Admin role successfully retrieves paginated activity logs."""
    res = client.get("/activity?page=1&limit=5", headers=_auth(admin_token))
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "limit" in data
    assert "total_pages" in data
    assert data["page"] == 1
    assert data["limit"] == 5


def test_activity_joined_data_and_ordering(admin_token):
    """Activity items contain joined user_name, snack_name, action, amount, and timestamp."""
    # 1. Create a transient snack
    snack_name = f"Activity Test Snack {int(time.time() * 1000)}"
    res_snack = client.post(
        "/snacks",
        headers=_auth(admin_token),
        json={"name": snack_name, "category": "sweet", "quantity": 10, "low_stock_threshold": 3},
    )
    assert res_snack.status_code == 201
    snack_id = res_snack.json()["id"]

    try:
        # 2. Trigger restock to create an activity row
        res_restock = client.post(
            f"/snacks/{snack_id}/restock",
            headers=_auth(admin_token),
            json={"amount": 7},
        )
        assert res_restock.status_code == 200

        # 3. Fetch activity log
        res_act = client.get("/activity?limit=5", headers=_auth(admin_token))
        assert res_act.status_code == 200
        items = res_act.json()["items"]
        assert len(items) >= 1

        # The newest item should be our restock action
        latest = items[0]
        assert latest["snack_name"] == snack_name
        assert latest["action"] == "restocked"
        assert latest["amount"] == 7
        assert "user_name" in latest
        assert "created_at" in latest
        assert latest["user_name"] != ""

    finally:
        # Teardown: purge activity row and snack
        db = SessionLocal()
        try:
            db.query(Activity).filter(Activity.snack_id == snack_id).delete(synchronize_session=False)
            db.query(Snack).filter(Snack.id == snack_id).delete(synchronize_session=False)
            db.commit()
        finally:
            db.close()
