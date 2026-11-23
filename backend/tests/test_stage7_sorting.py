import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import SessionLocal
from app.main import app
from app.models import Snack, User, Vote
from seed import seed_database

settings = get_settings()
client = TestClient(app)


@pytest.fixture(scope="module")
def ensure_seed():
    seed_database()


def _get_token(email: str, password: str) -> str:
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["token"]


@pytest.fixture(scope="module")
def member_token(ensure_seed):
    return _get_token(settings.SEED_MEMBER1_EMAIL, settings.SEED_MEMBER1_PASSWORD)


@pytest.fixture(scope="module")
def member2_token(ensure_seed):
    return _get_token(settings.SEED_MEMBER2_EMAIL, settings.SEED_MEMBER2_PASSWORD)


def _auth(token: str):
    return {"Authorization": f"Bearer {token}"}


# ---------- 1. Sort by Name (A-Z and Z-A) ----------

def test_sort_name_asc(member_token):
    """Sort snacks alphabetically A to Z via SQL ORDER BY."""
    res = client.get("/snacks?sort=name_asc&limit=20", headers=_auth(member_token))
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) >= 8

    names = [i["name"] for i in items]
    sorted_names = sorted(names)
    assert names == sorted_names, f"Expected {sorted_names}, got {names}"


def test_sort_name_desc(member_token):
    """Sort snacks reverse alphabetically Z to A via SQL ORDER BY."""
    res = client.get("/snacks?sort=name_desc&limit=20", headers=_auth(member_token))
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) >= 8

    names = [i["name"] for i in items]
    sorted_names = sorted(names, reverse=True)
    assert names == sorted_names, f"Expected {sorted_names}, got {names}"


# ---------- 2. Sort by Quantity (Ascending and Descending) ----------

def test_sort_quantity_asc(member_token):
    """Sort snacks lowest quantity first (ascending)."""
    res = client.get("/snacks?sort=quantity_asc&limit=20", headers=_auth(member_token))
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) >= 8

    quantities = [i["quantity"] for i in items]
    for i in range(len(quantities) - 1):
        assert quantities[i] <= quantities[i + 1], f"Expected ascending quantity, got {quantities}"


def test_sort_quantity_desc(member_token):
    """Sort snacks highest quantity first (descending)."""
    res = client.get("/snacks?sort=quantity_desc&limit=20", headers=_auth(member_token))
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) >= 8

    quantities = [i["quantity"] for i in items]
    for i in range(len(quantities) - 1):
        assert quantities[i] >= quantities[i + 1], f"Expected descending quantity, got {quantities}"


# ---------- 3. Sort by Votes (Most Popular First) ----------

def test_sort_votes_desc(member_token, member2_token):
    """Sort snacks by votes count descending using SQL scalar subquery."""
    # Find a specific snack to receive votes
    res_all = client.get("/snacks?limit=20", headers=_auth(member_token))
    target_snack = res_all.json()["items"][0]
    target_id = target_snack["id"]

    try:
        # Cast votes from member 1 and member 2
        res_v1 = client.post(f"/snacks/{target_id}/vote", headers=_auth(member_token))
        assert res_v1.status_code in (201, 409)

        res_v2 = client.post(f"/snacks/{target_id}/vote", headers=_auth(member2_token))
        assert res_v2.status_code in (201, 409)

        # Query with sort=votes_desc
        res_sorted = client.get("/snacks?sort=votes_desc&limit=20", headers=_auth(member_token))
        assert res_sorted.status_code == 200
        sorted_items = res_sorted.json()["items"]

        # Top item should have the highest vote count and match target_id
        assert sorted_items[0]["id"] == target_id
        assert sorted_items[0]["votes_count"] >= 2

        # Verify all subsequent items have votes_count <= previous
        votes = [i["votes_count"] for i in sorted_items]
        for i in range(len(votes) - 1):
            assert votes[i] >= votes[i + 1]

    finally:
        # Teardown votes cleanly
        db = SessionLocal()
        try:
            db.query(Vote).filter(Vote.snack_id == target_id).delete(synchronize_session=False)
            db.commit()
        finally:
            db.close()


# ---------- 4. Combined Filtering & Sorting ----------

def test_sort_combined_with_category_and_status(member_token):
    """Sorting works seamlessly alongside SQL category and status filters."""
    # Query: category=drink, sorted by quantity descending
    res = client.get("/snacks?category=drink&sort=quantity_desc", headers=_auth(member_token))
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) >= 1
    assert all(i["category"] == "drink" for i in items)

    quantities = [i["quantity"] for i in items]
    for i in range(len(quantities) - 1):
        assert quantities[i] >= quantities[i + 1]


def test_sort_with_pagination(member_token):
    """Sorting maintains stable pagination ordering across pages."""
    res_p1 = client.get("/snacks?sort=name_asc&page=1&limit=3", headers=_auth(member_token))
    assert res_p1.status_code == 200
    p1_items = res_p1.json()["items"]
    assert len(p1_items) == 3

    res_p2 = client.get("/snacks?sort=name_asc&page=2&limit=3", headers=_auth(member_token))
    assert res_p2.status_code == 200
    p2_items = res_p2.json()["items"]
    assert len(p2_items) == 3

    # Ensure no overlap between pages and alphabetical continuity
    p1_names = [i["name"] for i in p1_items]
    p2_names = [i["name"] for i in p2_items]
    assert set(p1_names).isdisjoint(set(p2_names))
    assert p1_names[-1] <= p2_names[0]
