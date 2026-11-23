import sys
import os
from sqlalchemy.orm import Session
from app.config import get_settings
from app.database import SessionLocal
from app.models import User, Snack, UserRole, SnackCategory
from app.security import hash_password


def seed_database(reset_stock: bool = False):
    """
    Seed initial users and sample snacks into the database.
    - Credentials are read exclusively from environment variables via Settings.
    - Idempotent: checks for existence before inserting; skips existing records silently.
    - Never crashes or duplicates on repeated execution.
    """
    settings = get_settings()
    db: Session = SessionLocal()

    try:
        # 1. Seed Users
        users_to_seed = [
            {
                "name": "Admin User",
                "email": settings.SEED_ADMIN_EMAIL,
                "password": settings.SEED_ADMIN_PASSWORD,
                "role": UserRole.admin,
            },
            {
                "name": "Alice Member",
                "email": settings.SEED_MEMBER1_EMAIL,
                "password": settings.SEED_MEMBER1_PASSWORD,
                "role": UserRole.member,
            },
            {
                "name": "Bob Member",
                "email": settings.SEED_MEMBER2_EMAIL,
                "password": settings.SEED_MEMBER2_PASSWORD,
                "role": UserRole.member,
            },
        ]

        users_created = 0
        for u in users_to_seed:
            existing = db.query(User).filter_by(email=u["email"]).first()
            if existing:
                # Silently skip existing user
                continue
            new_user = User(
                name=u["name"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
            )
            db.add(new_user)
            users_created += 1

        # 2. Seed Snacks
        # 8 sample snacks covering sweet, savoury, drink, healthy-ish
        # Varied quantities: at least one gone (0), at least one running_low (<= threshold), at least one stocked
        snacks_to_seed = [
            {
                "name": "Masala Peanuts",
                "category": SnackCategory.savoury,
                "quantity": 0,
                "low_stock_threshold": 5,  # gone
            },
            {
                "name": "Dark Chocolate Almonds",
                "category": SnackCategory.sweet,
                "quantity": 14,
                "low_stock_threshold": 5,  # stocked
            },
            {
                "name": "Cold Brew Coffee",
                "category": SnackCategory.drink,
                "quantity": 2,
                "low_stock_threshold": 5,  # running_low
            },
            {
                "name": "Greek Yogurt Cups",
                "category": SnackCategory.healthy_ish,
                "quantity": 8,
                "low_stock_threshold": 4,  # stocked
            },
            {
                "name": "Oat & Honey Granola Bar",
                "category": SnackCategory.healthy_ish,
                "quantity": 3,
                "low_stock_threshold": 6,  # running_low
            },
            {
                "name": "Sparkling Lime Water",
                "category": SnackCategory.drink,
                "quantity": 12,
                "low_stock_threshold": 6,  # stocked
            },
            {
                "name": "Sea Salt Potato Crisps",
                "category": SnackCategory.savoury,
                "quantity": 9,
                "low_stock_threshold": 5,  # stocked
            },
            {
                "name": "Matcha Green Tea",
                "category": SnackCategory.drink,
                "quantity": 0,
                "low_stock_threshold": 4,  # gone
            },
        ]

        snacks_created = 0
        snacks_updated = 0
        for s in snacks_to_seed:
            existing = db.query(Snack).filter_by(name=s["name"]).first()
            if existing:
                if reset_stock:
                    existing.quantity = s["quantity"]
                    existing.low_stock_threshold = s["low_stock_threshold"]
                    existing.category = s["category"]
                    snacks_updated += 1
                continue
            new_snack = Snack(
                name=s["name"],
                category=s["category"],
                quantity=s["quantity"],
                low_stock_threshold=s["low_stock_threshold"],
            )
            db.add(new_snack)
            snacks_created += 1

        db.commit()
        print(f"Seed completed successfully: {users_created} users added, {snacks_created} snacks added, {snacks_updated} snacks reset.")
    except Exception as exc:
        db.rollback()
        print(f"Error during seeding: {exc}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    reset_flag = "--reset" in sys.argv
    seed_database(reset_stock=reset_flag)
