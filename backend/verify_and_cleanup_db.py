import os
import sys
from app.database import SessionLocal
from app.models import Snack, User, Vote, Activity, LoginHistory

def check_and_clean():
    db = SessionLocal()
    try:
        canonical_names = {
            "Masala Peanuts",
            "Dark Chocolate Almonds",
            "Cold Brew Coffee",
            "Greek Yogurt Cups",
            "Oat & Honey Granola Bar",
            "Sparkling Lime Water",
            "Sea Salt Potato Crisps",
            "Matcha Green Tea",
        }

        all_snacks = db.query(Snack).all()
        print(f"Total snacks currently in DB: {len(all_snacks)}")
        
        non_canonical = [s for s in all_snacks if s.name not in canonical_names]
        if non_canonical:
            print(f"Found {len(non_canonical)} non-canonical test snacks:")
            for s in non_canonical:
                print(f"  - ID: {s.id}, Name: {s.name}, Category: {s.category}")
                # Delete activity & votes
                db.query(Activity).filter(Activity.snack_id == s.id).delete(synchronize_session=False)
                db.query(Vote).filter(Vote.snack_id == s.id).delete(synchronize_session=False)
                db.delete(s)
            db.commit()
            print("Purged all non-canonical snacks successfully.")
        else:
            print("Database is clean! Only canonical seeded snacks exist.")

        remaining = db.query(Snack).order_by(Snack.id.asc()).all()
        print("\nCanonical Snacks in DB:")
        for s in remaining:
            print(f"  [ID {s.id}] {s.name} | Category: {s.category.value} | Quantity: {s.quantity} | Threshold: {s.low_stock_threshold} | Status: {s.status}")

        canonical_emails = {
            "admin@snackoverflow.local",
            "member1@snackoverflow.local",
            "member2@snackoverflow.local",
        }

        non_canonical_users = [u for u in db.query(User).all() if u.email not in canonical_emails]
        if non_canonical_users:
            print(f"Found {len(non_canonical_users)} non-canonical test users:")
            for u in non_canonical_users:
                print(f"  - Purging test user [ID {u.id}] {u.name} ({u.email})")
                db.query(Activity).filter(Activity.user_id == u.id).delete(synchronize_session=False)
                db.query(Vote).filter(Vote.user_id == u.id).delete(synchronize_session=False)
                db.delete(u)
            db.commit()
            print("Purged non-canonical users successfully.")

        users = db.query(User).all()
        print(f"\nTotal users in DB: {len(users)}")
        for u in users:
            print(f"  [ID {u.id}] {u.name} ({u.email}) - {u.role.value}")

        # Purge test login history attempts
        test_login_records = db.query(LoginHistory).filter(
            LoginHistory.attempted_email.like("%ghost%")
            | LoginHistory.attempted_email.like("unknown_%")
            | LoginHistory.attempted_email.like("%test%")
        ).delete(synchronize_session=False)
        db.commit()
        if test_login_records:
            print(f"Purged {test_login_records} test login history records.")

    finally:
        db.close()

if __name__ == "__main__":
    check_and_clean()
