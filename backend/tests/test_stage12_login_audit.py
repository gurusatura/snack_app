import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import SessionLocal
from app.main import app
from app.models import LoginHistory, User
from seed import seed_database

settings = get_settings()
client = TestClient(app)


# ---------- Helpers & Fixtures ----------

@pytest.fixture(scope="module", autouse=True)
def setup_and_teardown():
    seed_database()
    yield
    # Cleanup any residual test entries in login_history
    db = SessionLocal()
    try:
        db.query(LoginHistory).filter(
            LoginHistory.attempted_email.like("%test_audit_%")
            | LoginHistory.attempted_email.like("unknown_%")
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def _get_admin_token() -> str:
    res = client.post(
        "/auth/login",
        json={"email": settings.SEED_ADMIN_EMAIL, "password": settings.SEED_ADMIN_PASSWORD},
    )
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["token"]


def _get_member_token() -> str:
    res = client.post(
        "/auth/login",
        json={"email": settings.SEED_MEMBER1_EMAIL, "password": settings.SEED_MEMBER1_PASSWORD},
    )
    assert res.status_code == 200, f"Member login failed: {res.text}"
    return res.json()["token"]


# ---------- Tests ----------

def test_login_success_records_history():
    """Successful login writes a LoginHistory record with success=True and user_id."""
    res = client.post(
        "/auth/login",
        json={"email": settings.SEED_MEMBER2_EMAIL, "password": settings.SEED_MEMBER2_PASSWORD},
    )
    assert res.status_code == 200

    db = SessionLocal()
    try:
        record = (
            db.query(LoginHistory)
            .filter(LoginHistory.attempted_email == settings.SEED_MEMBER2_EMAIL)
            .order_by(LoginHistory.id.desc())
            .first()
        )
        assert record is not None
        assert record.success is True
        assert record.user_id is not None
        assert record.attempted_email == settings.SEED_MEMBER2_EMAIL
    finally:
        db.close()


def test_login_failure_invalid_password_records_history():
    """Failed login with wrong password writes a record with success=False and the known user_id."""
    res = client.post(
        "/auth/login",
        json={"email": settings.SEED_MEMBER1_EMAIL, "password": "WrongPassword123!"},
    )
    assert res.status_code == 401

    db = SessionLocal()
    try:
        record = (
            db.query(LoginHistory)
            .filter(
                LoginHistory.attempted_email == settings.SEED_MEMBER1_EMAIL,
                LoginHistory.success == False,
            )
            .order_by(LoginHistory.id.desc())
            .first()
        )
        assert record is not None
        assert record.success is False
        assert record.user_id is not None
    finally:
        db.close()


def test_login_failure_unknown_user_records_history():
    """Failed login with an unregistered email writes a record with success=False and user_id=None."""
    ghost_email = "unknown_ghost_user_audit@example.com"
    res = client.post(
        "/auth/login",
        json={"email": ghost_email, "password": "AnyPassword123!"},
    )
    assert res.status_code == 401

    db = SessionLocal()
    try:
        record = (
            db.query(LoginHistory)
            .filter(LoginHistory.attempted_email == ghost_email)
            .order_by(LoginHistory.id.desc())
            .first()
        )
        assert record is not None
        assert record.success is False
        assert record.user_id is None
    finally:
        db.close()


def test_login_history_unauthenticated_401():
    """Unauthenticated requests to GET /login-history are rejected with 401/403."""
    res = client.get("/login-history")
    assert res.status_code in (401, 403)


def test_login_history_member_forbidden_403():
    """Members without admin role receive 403 Forbidden on GET /login-history."""
    member_token = _get_member_token()
    headers = {"Authorization": f"Bearer {member_token}"}
    res = client.get("/login-history", headers=headers)
    assert res.status_code == 403
    err = res.json().get("error") or res.json().get("detail", {}).get("error")
    assert err["code"] == "FORBIDDEN"
    assert "Admin" in err["message"]


def test_login_history_admin_access_success():
    """Admins can successfully retrieve paginated login audit history."""
    admin_token = _get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/login-history", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "limit" in data
    assert "total_pages" in data

    assert data["total"] >= 1
    assert len(data["items"]) >= 1

    # Verify item schema
    item = data["items"][0]
    assert "id" in item
    assert "attempted_email" in item
    assert "success" in item
    assert "timestamp" in item


def test_login_history_pagination():
    """Verify page and limit query parameters partition login audit logs correctly."""
    admin_token = _get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Request page 1 with limit 2
    res_page1 = client.get("/login-history?page=1&limit=2", headers=headers)
    assert res_page1.status_code == 200
    data_page1 = res_page1.json()
    assert data_page1["page"] == 1
    assert data_page1["limit"] == 2
    assert len(data_page1["items"]) <= 2

    if data_page1["total"] > 2:
        # Request page 2 with limit 2
        res_page2 = client.get("/login-history?page=2&limit=2", headers=headers)
        assert res_page2.status_code == 200
        data_page2 = res_page2.json()
        assert data_page2["page"] == 2
        assert data_page2["limit"] == 2

        # Ensure page 1 and page 2 contain different entries
        p1_ids = {i["id"] for i in data_page1["items"]}
        p2_ids = {i["id"] for i in data_page2["items"]}
        assert p1_ids.isdisjoint(p2_ids), "Page 1 and Page 2 contain overlapping items"


def test_self_registered_user_audit_log_shows_user_info():
    """
    Verify that when a user registers via /auth/register:
    1. A successful login history record is created for the new user.
    2. Admin viewing GET /login-history sees the registered user's actual name, email, and user_id (NOT 'unregistered').
    3. When the user logs in via /auth/login, the login history also correctly links to their name and email.
    """
    import time

    reg_email = f"test_audit_reg_{int(time.time() * 1000)}@snackoverflow.local"
    reg_name = "Self Registered Audit Tester"
    reg_password = "SecurePassword123!"

    # 1. Register new user
    res_reg = client.post(
        "/auth/register",
        json={"name": reg_name, "email": reg_email, "password": reg_password},
    )
    assert res_reg.status_code == 201
    registered_user_id = res_reg.json()["user"]["id"]

    # 2. Admin inspects audit log
    admin_token = _get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}
    res_audit = client.get("/login-history?page=1&limit=20", headers=headers)
    assert res_audit.status_code == 200

    items = res_audit.json()["items"]
    reg_item = next((i for i in items if i["attempted_email"] == reg_email.lower()), None)
    assert reg_item is not None, f"Audit log did not record registration login for {reg_email}"
    assert reg_item["user_id"] == registered_user_id
    assert reg_item["user_name"] == reg_name
    assert reg_item["user_email"] == reg_email.lower()
    assert reg_item["success"] is True

    # 3. User logs in explicitly via /auth/login
    res_login = client.post(
        "/auth/login",
        json={"email": reg_email, "password": reg_password},
    )
    assert res_login.status_code == 200

    # 4. Admin inspects audit log again
    res_audit_after = client.get("/login-history?page=1&limit=20", headers=headers)
    assert res_audit_after.status_code == 200
    new_items = res_audit_after.json()["items"]
    user_logins = [i for i in new_items if i["attempted_email"] == reg_email.lower()]
    assert len(user_logins) >= 2
    for entry in user_logins:
        assert entry["user_id"] == registered_user_id
        assert entry["user_name"] == reg_name
        assert entry["user_email"] == reg_email.lower()
        assert entry["success"] is True
