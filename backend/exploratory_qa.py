import sys
import time
import httpx
from app.config import get_settings
from app.database import SessionLocal
from app.models import Snack, User, Vote, Activity

settings = get_settings()
BASE_URL = "http://127.0.0.1:8000"

def run_exploratory_qa():
    print("=" * 70)
    print("SNACK OVERFLOW - END-TO-END EXPLORATORY USER QA")
    print("=" * 70)

    with httpx.Client(base_url=BASE_URL, timeout=15.0) as client:
        # -------------------------------------------------------------
        # STEP 1: MEMBER LOGIN & AUTH
        # -------------------------------------------------------------
        print("\n[SCENARIO 1] Member Authentication & Initial Load")
        member_creds = {"email": settings.SEED_MEMBER1_EMAIL, "password": settings.SEED_MEMBER1_PASSWORD}
        resp = client.post("/auth/login", json=member_creds)
        assert resp.status_code == 200, f"Member login failed: {resp.text}"
        member_data = resp.json()
        member_token = member_data["token"]
        member_headers = {"Authorization": f"Bearer {member_token}"}
        print(f"  ✓ Logged in as Member: {member_data['user']['name']} ({member_data['user']['email']})")
        assert member_data["user"]["role"] == "member"

        # Fetch initial dashboard summary
        res_summary = client.get("/snacks/summary", headers=member_headers)
        assert res_summary.status_code == 200
        summary_data = res_summary.json()
        print(f"  ✓ Summary loaded: Total Stocked: {summary_data['stock_summary']['stocked']}, Running Low: {summary_data['stock_summary']['running_low']}, Gone: {summary_data['stock_summary']['gone']}")
        if summary_data["snack_of_the_week"]:
            print(f"  ✓ Snack of the Week: {summary_data['snack_of_the_week']['name']} ({summary_data['snack_of_the_week']['votes']} votes)")
        else:
            print("  ✓ Snack of the Week: None (0 votes this week)")

        # -------------------------------------------------------------
        # STEP 2: SEARCH & FILTERING (INDIVIDUAL & COMBINED)
        # -------------------------------------------------------------
        print("\n[SCENARIO 2] Search & Category Filter Interactivity")
        
        # 2a. Search alone
        res = client.get("/snacks?search=Pea", headers=member_headers)
        assert res.status_code == 200
        items = res.json()["items"]
        print(f"  ✓ Search 'Pea' alone -> Found {len(items)} snack(s): {[i['name'] for i in items]}")
        assert any("peanut" in i["name"].lower() for i in items)

        # 2b. Category alone: Savoury
        res = client.get("/snacks?category=savoury", headers=member_headers)
        assert res.status_code == 200
        savoury_items = res.json()["items"]
        print(f"  ✓ Category 'savoury' alone -> Found {len(savoury_items)} snack(s): {[i['name'] for i in savoury_items]}")
        assert all(i["category"] == "savoury" for i in savoury_items)

        # 2c. Combined: Search 'Pea' + Category 'savoury' (Matching)
        res = client.get("/snacks?search=Pea&category=savoury", headers=member_headers)
        assert res.status_code == 200
        comb_match = res.json()["items"]
        print(f"  ✓ Combined Search 'Pea' + Category 'savoury' -> Found {len(comb_match)} item(s): {[i['name'] for i in comb_match]}")
        assert len(comb_match) == 1
        assert comb_match[0]["name"] == "Masala Peanuts"
        assert comb_match[0]["category"] == "savoury"

        # 2d. Combined: Search 'Pea' + Category 'sweet' (Mismatch - must return 0 results)
        res = client.get("/snacks?search=Pea&category=sweet", headers=member_headers)
        assert res.status_code == 200
        comb_mismatch = res.json()["items"]
        print(f"  ✓ Combined Search 'Pea' + Category 'sweet' -> Correctly returned {len(comb_mismatch)} items (SQL AND works)")
        assert len(comb_mismatch) == 0

        # 2e. Status filter: gone
        res = client.get("/snacks?status=gone", headers=member_headers)
        assert res.status_code == 200
        gone_items = res.json()["items"]
        print(f"  ✓ Status 'gone' -> Found {len(gone_items)} item(s): {[i['name'] for i in gone_items]}")
        assert all(i["quantity"] == 0 for i in gone_items)

        # 2f. Combined Status + Category: drink + gone
        res = client.get("/snacks?status=gone&category=drink", headers=member_headers)
        assert res.status_code == 200
        drink_gone = res.json()["items"]
        print(f"  ✓ Status 'gone' + Category 'drink' -> Found {len(drink_gone)} item(s): {[i['name'] for i in drink_gone]}")
        assert any(i["name"] == "Matcha Green Tea" for i in drink_gone)

        # -------------------------------------------------------------
        # STEP 3: CONSUMPTION (GRAB SNACK) & EDGE CASES
        # -------------------------------------------------------------
        print("\n[SCENARIO 3] Snack Consumption (Grab Snack Flow & Concurrency/Stock Edge Cases)")
        # Find Cold Brew Coffee (in stock)
        res = client.get("/snacks?search=Cold+Brew", headers=member_headers)
        cold_brew = res.json()["items"][0]
        initial_qty = cold_brew["quantity"]
        print(f"  - Target snack: '{cold_brew['name']}' (Current qty: {initial_qty})")

        # 3a. Member grabs 1 packet
        grab_res = client.post(f"/snacks/{cold_brew['id']}/consume", headers=member_headers, json={"amount": 1})
        assert grab_res.status_code == 200
        new_qty = grab_res.json()["remaining_quantity"]
        print(f"  ✓ Successfully grabbed 1 packet! New remaining quantity: {new_qty} (expected: {initial_qty - 1})")
        assert new_qty == initial_qty - 1

        # 3b. Member attempts to grab more than available
        excess_res = client.post(f"/snacks/{cold_brew['id']}/consume", headers=member_headers, json={"amount": 999})
        assert excess_res.status_code == 409
        err_body = excess_res.json().get("error") or excess_res.json().get("detail", {}).get("error")
        print(f"  ✓ Over-consumption blocked with 409: [{err_body['code']}] {err_body['message']}")
        assert err_body["code"] == "INSUFFICIENT_STOCK"

        # 3c. Member attempts to grab snack with 0 stock (Gone)
        matcha = [i for i in gone_items if i["name"] == "Matcha Green Tea"][0]
        zero_res = client.post(f"/snacks/{matcha['id']}/consume", headers=member_headers, json={"amount": 1})
        assert zero_res.status_code == 409
        err_zero = zero_res.json().get("error") or zero_res.json().get("detail", {}).get("error")
        print(f"  ✓ Gone-snack consumption blocked with 409: [{err_zero['code']}] {err_zero['message']}")

        # -------------------------------------------------------------
        # STEP 4: VOTING WORKFLOW
        # -------------------------------------------------------------
        print("\n[SCENARIO 4] Voting Workflow & Favourites Tracking")
        # 4a. Vote for Cold Brew
        v_res = client.post(f"/snacks/{cold_brew['id']}/vote", headers=member_headers)
        assert v_res.status_code == 201
        print(f"  ✓ Member 1 voted for '{cold_brew['name']}' (201 Created)")

        # 4b. Duplicate vote should fail with 409
        v_dup = client.post(f"/snacks/{cold_brew['id']}/vote", headers=member_headers)
        assert v_dup.status_code == 409
        err_dup = v_dup.json().get("error") or v_dup.json().get("detail", {}).get("error")
        print(f"  ✓ Duplicate vote blocked with 409: [{err_dup['code']}] {err_dup['message']}")
        assert err_dup["code"] == "ALREADY_VOTED"

        # 4c. Verify user_voted flag in list
        check_v = client.get("/snacks?search=Cold+Brew", headers=member_headers)
        assert check_v.json()["items"][0]["user_voted"] is True
        print("  ✓ Snack card correctly shows user_voted: True (Heart active)")

        # 4d. Unvote
        unvote = client.delete(f"/snacks/{cold_brew['id']}/vote", headers=member_headers)
        assert unvote.status_code == 200
        print(f"  ✓ Unvoted '{cold_brew['name']}' (200 OK)")

        # 4e. Verify user_voted flag reverted
        check_unv = client.get("/snacks?search=Cold+Brew", headers=member_headers)
        assert check_unv.json()["items"][0]["user_voted"] is False
        print("  ✓ Snack card correctly shows user_voted: False (Heart inactive)")

        # -------------------------------------------------------------
        # STEP 5: RBAC RESTRICTION (MEMBER CANNOT RESTOCK OR ADMIN)
        # -------------------------------------------------------------
        print("\n[SCENARIO 5] RBAC Security Restrictions for Member")
        # Member tries to restock
        r_forbid = client.post(f"/snacks/{cold_brew['id']}/restock", headers=member_headers, json={"amount": 5})
        assert r_forbid.status_code == 403
        print("  ✓ Member cannot restock: 403 Forbidden")

        # Member tries to add snack
        a_forbid = client.post("/snacks", headers=member_headers, json={"name": "Hacker Snack", "category": "sweet", "quantity": 10, "low_stock_threshold": 2})
        assert a_forbid.status_code == 403
        print("  ✓ Member cannot add snack: 403 Forbidden")

        # Member tries to delete snack
        d_forbid = client.delete(f"/snacks/{cold_brew['id']}", headers=member_headers)
        assert d_forbid.status_code == 403
        print("  ✓ Member cannot delete snack: 403 Forbidden")

        # -------------------------------------------------------------
        # STEP 6: ADMIN CRUD & RESTOCK WORKFLOW
        # -------------------------------------------------------------
        print("\n[SCENARIO 6] Admin Workflow: Add, Edit, Restock & Referential Integrity")
        admin_creds = {"email": settings.SEED_ADMIN_EMAIL, "password": settings.SEED_ADMIN_PASSWORD}
        resp = client.post("/auth/login", json=admin_creds)
        assert resp.status_code == 200
        admin_data = resp.json()
        admin_token = admin_data["token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print(f"  ✓ Logged in as Admin: {admin_data['user']['name']} ({admin_data['user']['email']})")

        # 6a. Admin adds a new snack
        new_snack_payload = {
            "name": "Organic Trail Mix",
            "category": "healthy-ish",
            "quantity": 12,
            "low_stock_threshold": 4,
        }
        create_res = client.post("/snacks", headers=admin_headers, json=new_snack_payload)
        assert create_res.status_code == 201
        created_snack = create_res.json()
        new_snack_id = created_snack["id"]
        print(f"  ✓ Admin created new snack: ID {new_snack_id} '{created_snack['name']}' (Qty: {created_snack['quantity']}, Status: {created_snack['status']})")

        # 6b. Admin edits the snack
        edit_payload = {
            "name": "Super Organic Trail Mix",
            "category": "healthy-ish",
            "quantity": 15,
            "low_stock_threshold": 5,
        }
        edit_res = client.patch(f"/snacks/{new_snack_id}", headers=admin_headers, json=edit_payload)
        assert edit_res.status_code == 200
        updated_snack = edit_res.json()
        print(f"  ✓ Admin updated snack: '{updated_snack['name']}', Qty: {updated_snack['quantity']}")
        assert updated_snack["name"] == "Super Organic Trail Mix"
        assert updated_snack["quantity"] == 15

        # 6c. Admin restocks Cold Brew
        restock_res = client.post(f"/snacks/{cold_brew['id']}/restock", headers=admin_headers, json={"amount": 5})
        assert restock_res.status_code == 200
        print(f"  ✓ Admin restocked Cold Brew (+5): New quantity = {restock_res.json()['new_quantity']}")

        # 6d. Referential Integrity: Attempt to delete snack with activity history
        # Cold brew has consume and restock activity!
        del_fail = client.delete(f"/snacks/{cold_brew['id']}", headers=admin_headers)
        assert del_fail.status_code == 409
        err_del = del_fail.json().get("error") or del_fail.json().get("detail", {}).get("error")
        print(f"  ✓ Delete snack with activity history blocked with 409 (FK RESTRICT): [{err_del['code']}] {err_del['message']}")
        assert err_del["code"] == "CANNOT_DELETE_SNACK"

        # 6e. Admin deletes newly created snack with NO activity
        del_ok = client.delete(f"/snacks/{new_snack_id}", headers=admin_headers)
        assert del_ok.status_code == 200
        print(f"  ✓ Admin deleted snack with no activity: ID {new_snack_id} (200 OK)")

        # Verify snack is deleted
        del_check = client.get(f"/snacks/{new_snack_id}", headers=admin_headers)
        assert del_check.status_code == 404
        print("  ✓ Verified deleted snack returns 404 SNACK_NOT_FOUND")

        # -------------------------------------------------------------
        # STEP 7: RESTORE CLEAN SEEDED STATE
        # -------------------------------------------------------------
        print("\n[SCENARIO 7] Restoring Canonical Seeded State")
        db = SessionLocal()
        try:
            # Reset Cold Brew quantity back to original initial_qty
            cb = db.query(Snack).filter(Snack.id == cold_brew["id"]).first()
            cb.quantity = initial_qty
            # Purge test activities for cold brew created during this QA run
            db.query(Activity).filter(Activity.snack_id == cold_brew["id"]).delete()
            db.commit()
            print(f"  ✓ Restored '{cold_brew['name']}' quantity to {initial_qty} and cleared test activity logs.")
        finally:
            db.close()

    print("\n" + "=" * 70)
    print("ALL EXPLORATORY QA SCENARIOS PASSED WITH ZERO ERRORS!")
    print("=" * 70)

if __name__ == "__main__":
    run_exploratory_qa()
