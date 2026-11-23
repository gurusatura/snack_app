import os
import sys
from app.database import SessionLocal
from app.models import Snack, User, Vote, Activity

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

        users = db.query(User).all()
        print(f"\nTotal users in DB: {len(users)}")
        for u in users:
            print(f"  [ID {u.id}] {u.name} ({u.email}) - {u.role.value}")

    finally:
        db.close()

if __name__ == "__main__":
    check_and_clean()
