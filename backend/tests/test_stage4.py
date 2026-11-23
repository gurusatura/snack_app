from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import os
import socket
import subprocess
import sys
import time

from fastapi.testclient import TestClient
import httpx
import pytest
from sqlalchemy import text

from app.auth import ALGORITHM, create_access_token
from app.config import get_settings
from app.database import SessionLocal
from app.main import app
from app.models import Activity, ActivityAction, Snack, SnackCategory, User, UserRole, Vote
from seed import seed_database

settings = get_settings()
client = TestClient(app)


# ---------- Helpers & Fixtures ----------

@pytest.fixture(scope="module")
def ensure_seed():
    seed_database()


@pytest.fixture(scope="module", autouse=True)
def cleanup_residual_test_snacks():
    yield
    db = SessionLocal()
    try:
        test_snacks = (
            db.query(Snack)
            .filter(
                Snack.name.like("Test Snack%")
                | Snack.name.like("Delete Snack%")
                | Snack.name.like("Flow Snack%")
                | Snack.name.like("Concurrency Snack%")
                | Snack.name.like("Vote Summary Snack%")
                | Snack.name.like("Patch Test%")
            )
            .all()
        )
        for s in test_snacks:
            db.query(Activity).filter(Activity.snack_id == s.id).delete(synchronize_session=False)
            db.query(Vote).filter(Vote.snack_id == s.id).delete(synchronize_session=False)
            db.delete(s)
        db.commit()
    finally:
        db.close()


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


@pytest.fixture(scope="module")
def member2_token(ensure_seed):
    return _get_token(settings.SEED_MEMBER2_EMAIL, settings.SEED_MEMBER2_PASSWORD)


def _auth(token: str):
    return {"Authorization": f"Bearer {token}"}


# ---------- 1. List, Filters, Pagination, Search ----------

def test_list_snacks_filters_and_search(member_token):
    # 1. Base list
    res = client.get("/snacks", headers=_auth(member_token))
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert data["total"] >= 8
    assert len(data["items"]) <= 10

    # 2. Category filter
    res_sweet = client.get("/snacks?category=sweet", headers=_auth(member_token))
    assert res_sweet.status_code == 200
    sweet_items = res_sweet.json()["items"]
    assert all(item["category"] == "sweet" for item in sweet_items)

    # 3. Status filter: gone
    res_gone = client.get("/snacks?status=gone", headers=_auth(member_token))
    assert res_gone.status_code == 200
    gone_items = res_gone.json()["items"]
    assert all(item["quantity"] == 0 and item["status"] == "gone" for item in gone_items)

    # 4. Status filter: running_low
    res_low = client.get("/snacks?status=running_low", headers=_auth(member_token))
    assert res_low.status_code == 200
    low_items = res_low.json()["items"]
    assert all(item["status"] == "running_low" for item in low_items)

    # 5. Status filter: stocked
    res_stocked = client.get("/snacks?status=stocked", headers=_auth(member_token))
    assert res_stocked.status_code == 200
    stocked_items = res_stocked.json()["items"]
    assert all(item["status"] == "stocked" for item in stocked_items)

    # 6. Search filter (case-insensitive partial match)
    res_search = client.get("/snacks?search=pea", headers=_auth(member_token))
    assert res_search.status_code == 200
    search_items = res_search.json()["items"]
    assert any("peanut" in item["name"].lower() for item in search_items)

    # 7. Combined Search and Category filter (SQL AND condition)
    res_comb = client.get("/snacks?search=pea&category=savoury", headers=_auth(member_token))
    assert res_comb.status_code == 200
    comb_items = res_comb.json()["items"]
    assert len(comb_items) >= 1
    assert all("pea" in item["name"].lower() and item["category"] == "savoury" for item in comb_items)

    # Combined Search and Category mismatch returns empty list
    res_mismatch = client.get("/snacks?search=pea&category=sweet", headers=_auth(member_token))
    assert res_mismatch.status_code == 200
    assert len(res_mismatch.json()["items"]) == 0

    # 8. Pagination
    res_page = client.get("/snacks?page=1&limit=2", headers=_auth(member_token))
    assert res_page.status_code == 200
    pdata = res_page.json()
    assert len(pdata["items"]) == 2
    assert pdata["page"] == 1
    assert pdata["limit"] == 2
    assert pdata["total_pages"] >= 4


# ---------- 2. Get Snack by ID ----------

def test_get_snack_by_id(member_token):
    # Find existing snack
    res = client.get("/snacks", headers=_auth(member_token))
    first_snack = res.json()["items"][0]

    # 200 for existing
    res_get = client.get(f"/snacks/{first_snack['id']}", headers=_auth(member_token))
    assert res_get.status_code == 200
    assert res_get.json()["id"] == first_snack["id"]
    assert res_get.json()["name"] == first_snack["name"]

    # 404 for non-existent
    res_404 = client.get("/snacks/999999", headers=_auth(member_token))
    assert res_404.status_code == 404
    error = res_404.json().get("error") or res_404.json().get("detail", {}).get("error")
    assert error["code"] == "SNACK_NOT_FOUND"


# ---------- 3. Admin CRUD: Create, Patch, Delete ----------

def test_admin_create_snack(admin_token, member_token):
    unique_name = f"Test Snack {int(time.time() * 1000)}"

    # Member forbidden
    res_member = client.post(
        "/snacks",
        headers=_auth(member_token),
        json={"name": unique_name, "category": "sweet", "quantity": 10, "low_stock_threshold": 5},
    )
    assert res_member.status_code == 403

    # Admin success
    res_admin = client.post(
        "/snacks",
        headers=_auth(admin_token),
        json={"name": unique_name, "category": "sweet", "quantity": 10, "low_stock_threshold": 5},
    )
    assert res_admin.status_code == 201
    snack_id = res_admin.json()["id"]

    # Duplicate name 409
    res_dup = client.post(
        "/snacks",
        headers=_auth(admin_token),
        json={"name": unique_name, "category": "sweet", "quantity": 10, "low_stock_threshold": 5},
    )
    assert res_dup.status_code == 409
    err = res_dup.json().get("error") or res_dup.json().get("detail", {}).get("error")
    assert err["code"] == "SNACK_ALREADY_EXISTS"

    # Clean up
    client.delete(f"/snacks/{snack_id}", headers=_auth(admin_token))


def test_admin_patch_snack(admin_token, member_token):
    unique_name = f"Patch Test {int(time.time() * 1000)}"
    res_create = client.post(
        "/snacks",
        headers=_auth(admin_token),
        json={"name": unique_name, "category": "drink", "quantity": 5, "low_stock_threshold": 3},
    )
    snack_id = res_create.json()["id"]

    # Member forbidden
    res_member = client.patch(
        f"/snacks/{snack_id}",
        headers=_auth(member_token),
        json={"quantity": 15},
    )
    assert res_member.status_code == 403

    # Admin partial update
    res_patch = client.patch(
        f"/snacks/{snack_id}",
        headers=_auth(admin_token),
        json={"quantity": 15, "category": "healthy-ish"},
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["quantity"] == 15
    assert res_patch.json()["category"] == "healthy-ish"

    # Patch non-existent 404
    res_404 = client.patch(
        "/snacks/999999",
        headers=_auth(admin_token),
        json={"quantity": 5},
    )
    assert res_404.status_code == 404

    # Clean up
    client.delete(f"/snacks/{snack_id}", headers=_auth(admin_token))


def test_admin_delete_snack_and_restrict_integrity(admin_token):
    # 1. Create a snack
    res_create = client.post(
        "/snacks",
        headers=_auth(admin_token),
        json={"name": f"Delete Snack {int(time.time() * 1000)}", "category": "savoury", "quantity": 10, "low_stock_threshold": 2},
    )
    snack_id = res_create.json()["id"]

    try:
        # 2. Add activity history (restock)
        client.post(
            f"/snacks/{snack_id}/restock",
            headers=_auth(admin_token),
            json={"amount": 5},
        )

        # 3. Attempt delete: must return 409 CANNOT_DELETE_SNACK (FK RESTRICT)
        res_del = client.delete(f"/snacks/{snack_id}", headers=_auth(admin_token))
        assert res_del.status_code == 409
        err = res_del.json().get("error") or res_del.json().get("detail", {}).get("error")
        assert err["code"] == "CANNOT_DELETE_SNACK"

        # Delete non-existent returns 404
        res_404 = client.delete("/snacks/999999", headers=_auth(admin_token))
        assert res_404.status_code == 404
    finally:
        # Clean up test snack and its activity so database stays clean
        db = SessionLocal()
        try:
            db.query(Activity).filter(Activity.snack_id == snack_id).delete(synchronize_session=False)
            db.query(Snack).filter(Snack.id == snack_id).delete(synchronize_session=False)
            db.commit()
        finally:
            db.close()


# ---------- 4. Consume & Restock (Atomic Actions & Input Validation) ----------

def test_amount_validation_and_not_found(member_token, admin_token):
    # Negative amount
    res_neg = client.post("/snacks/1/consume", headers=_auth(member_token), json={"amount": -1})
    assert res_neg.status_code == 422

    # Zero amount
    res_zero = client.post("/snacks/1/consume", headers=_auth(member_token), json={"amount": 0})
    assert res_zero.status_code == 422

    # Oversized amount (> 1000)
    res_over = client.post("/snacks/1/consume", headers=_auth(member_token), json={"amount": 1001})
    assert res_over.status_code == 422

    # Non-existent snack
    res_404 = client.post("/snacks/999999/consume", headers=_auth(member_token), json={"amount": 1})
    assert res_404.status_code == 404


def test_consume_and_restock_flow(admin_token, member_token):
    # Create test snack with quantity 5
    unique_name = f"Flow Snack {int(time.time() * 1000)}"
    res_create = client.post(
        "/snacks",
        headers=_auth(admin_token),
        json={"name": unique_name, "category": "sweet", "quantity": 5, "low_stock_threshold": 2},
    )
    snack_id = res_create.json()["id"]

    try:
        # Member consumes 2 -> remaining 3
        res_con = client.post(f"/snacks/{snack_id}/consume", headers=_auth(member_token), json={"amount": 2})
        assert res_con.status_code == 200
        assert res_con.json()["remaining_quantity"] == 3

        # Member attempts to consume 5 when only 3 remaining -> 409 INSUFFICIENT_STOCK
        res_fail = client.post(f"/snacks/{snack_id}/consume", headers=_auth(member_token), json={"amount": 5})
        assert res_fail.status_code == 409
        err = res_fail.json().get("error") or res_fail.json().get("detail", {}).get("error")
        assert err["code"] == "INSUFFICIENT_STOCK"

        # Admin restocks 10 -> new quantity 13
        res_restock = client.post(f"/snacks/{snack_id}/restock", headers=_auth(admin_token), json={"amount": 10})
        assert res_restock.status_code == 200
        assert res_restock.json()["new_quantity"] == 13

        # Member cannot restock
        res_mem_restock = client.post(f"/snacks/{snack_id}/restock", headers=_auth(member_token), json={"amount": 5})
        assert res_mem_restock.status_code == 403
    finally:
        # Clean up test snack and its activity records
        db = SessionLocal()
        try:
            db.query(Activity).filter(Activity.snack_id == snack_id).delete(synchronize_session=False)
            db.query(Snack).filter(Snack.id == snack_id).delete(synchronize_session=False)
            db.commit()
        finally:
            db.close()


# ---------- 5. Voting & Snack of the Week Summary ----------

def test_vote_and_summary(admin_token, member_token, member2_token):
    # Create a fresh snack
    unique_name = f"Vote Summary Snack {int(time.time() * 1000)}"
    res_create = client.post(
        "/snacks",
        headers=_auth(admin_token),
        json={"name": unique_name, "category": "healthy-ish", "quantity": 10, "low_stock_threshold": 3},
    )
    snack_id = res_create.json()["id"]

    try:
        # Member 1 votes
        res_v1 = client.post(f"/snacks/{snack_id}/vote", headers=_auth(member_token))
        assert res_v1.status_code == 201

        # Member 1 duplicate vote -> 409 ALREADY_VOTED
        res_v1_dup = client.post(f"/snacks/{snack_id}/vote", headers=_auth(member_token))
        assert res_v1_dup.status_code == 409
        err = res_v1_dup.json().get("error") or res_v1_dup.json().get("detail", {}).get("error")
        assert err["code"] == "ALREADY_VOTED"

        # Member 2 votes
        res_v2 = client.post(f"/snacks/{snack_id}/vote", headers=_auth(member2_token))
        assert res_v2.status_code == 201

        # Check summary: snack_of_the_week should reflect votes
        res_summary = client.get("/snacks/summary", headers=_auth(member_token))
        assert res_summary.status_code == 200
        sdata = res_summary.json()
        assert "stock_summary" in sdata
        assert sdata["stock_summary"]["stocked"] >= 1
        assert sdata["snack_of_the_week"] is not None
        assert sdata["snack_of_the_week"]["votes"] >= 2

        # Member 1 unvotes
        res_del_v = client.delete(f"/snacks/{snack_id}/vote", headers=_auth(member_token))
        assert res_del_v.status_code == 200

        # Member 1 unvotes again -> 404 VOTE_NOT_FOUND
        res_del_v2 = client.delete(f"/snacks/{snack_id}/vote", headers=_auth(member_token))
        assert res_del_v2.status_code == 404
    finally:
        # Clean up test snack and its votes
        db = SessionLocal()
        try:
            db.query(Vote).filter(Vote.snack_id == snack_id).delete(synchronize_session=False)
            db.query(Snack).filter(Snack.id == snack_id).delete(synchronize_session=False)
            db.commit()
        finally:
            db.close()


# ---------- 6. CRITICAL CONCURRENCY TEST ----------

def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]


def test_concurrency_real_server_supabase(admin_token, member_token):
    """
    CRITICAL CONCURRENCY TEST:
    - Starts uvicorn on a real live port against live Supabase PostgreSQL.
    - Creates a target snack seeded with EXACTLY quantity = 3.
    - Fires 10 concurrent HTTP requests (each consuming amount = 1) across 10 threads,
      each with an independent httpx client.
    - Asserts:
        * Exactly 3 return 200 OK
        * Exactly 7 return 409 INSUFFICIENT_STOCK
        * Final database quantity is EXACTLY 0
        * Exactly 3 activity records created for that snack
        * Failed requests created ZERO activity records
    """
    # 1. Create target snack with quantity = 3
    snack_name = f"Concurrency Snack {int(time.time() * 1000)}"
    res_create = client.post(
        "/snacks",
        headers=_auth(admin_token),
        json={"name": snack_name, "category": "savoury", "quantity": 3, "low_stock_threshold": 1},
    )
    assert res_create.status_code == 201
    target_snack_id = res_create.json()["id"]

    # 2. Start uvicorn live server in background subprocess
    port = _find_free_port()
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    python_exe = os.path.join(backend_dir, "venv", "Scripts", "python.exe")

    proc = subprocess.Popen(
        [python_exe, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    server_url = f"http://127.0.0.1:{port}"

    try:
        # Wait for server to become healthy (up to 15 seconds)
        healthy = False
        for _ in range(30):
            try:
                r = httpx.get(f"{server_url}/health", timeout=1.0)
                if r.status_code == 200:
                    healthy = True
                    break
            except Exception:
                time.sleep(0.5)

        assert healthy, "Live uvicorn server failed to start within timeout"

        # 3. Define worker function for concurrency: independent client and request
        def fire_consume(thread_id: int):
            with httpx.Client(base_url=server_url, timeout=15.0) as http_client:
                response = http_client.post(
                    f"/snacks/{target_snack_id}/consume",
                    headers={"Authorization": f"Bearer {member_token}"},
                    json={"amount": 1},
                )
                return response.status_code, response.json()

        # 4. Fire 10 concurrent requests simultaneously
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(fire_consume, i) for i in range(10)]
            results = [f.result() for f in futures]

        status_codes = [r[0] for r in results]
        success_count = status_codes.count(200)
        conflict_count = status_codes.count(409)

        print(f"\n[CONCURRENCY RESULTS] Total: 10 | 200 OK: {success_count} | 409 Conflict: {conflict_count}")
        assert success_count == 3, f"Expected exactly 3 requests to succeed, got {success_count}"
        assert conflict_count == 7, f"Expected exactly 7 requests to fail with 409, got {conflict_count}"

        # 5. Direct DB Assertions against real Supabase connection
        db = SessionLocal()
        try:
            db_snack = db.query(Snack).filter(Snack.id == target_snack_id).first()
            assert db_snack.quantity == 0, f"Expected final DB quantity to be 0, got {db_snack.quantity}"

            activity_records = (
                db.query(Activity)
                .filter(
                    Activity.snack_id == target_snack_id,
                    Activity.action == ActivityAction.consumed,
                )
                .all()
            )
            assert len(activity_records) == 3, (
                f"Expected exactly 3 activity records, got {len(activity_records)}"
            )

            # Cleanup concurrency test snack and activity records
            db.query(Activity).filter(Activity.snack_id == target_snack_id).delete(synchronize_session=False)
            db.query(Snack).filter(Snack.id == target_snack_id).delete(synchronize_session=False)
            db.commit()
        finally:
            db.close()

    finally:
        # Terminate uvicorn process cleanly
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
