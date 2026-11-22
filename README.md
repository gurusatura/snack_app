# Snack Overflow

A production-minded snack tracking platform built for office pantry inventory, ensuring concurrency correctness, data integrity, and role-based access control.

---

## Tech Stack

- **Backend**: FastAPI (sync), SQLAlchemy 2.0 (sync), PostgreSQL (Supabase), Alembic, Pydantic v2, PyJWT, bcrypt, pytest
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, Axios

---

## Database Schema & Migrations

The database models are managed via **Alembic** and PostgreSQL.

### Tables Overview
1. **users**:
   - `id`: Integer PK
   - `name`: String, required
   - `email`: String, unique, not null, indexed
   - `password_hash`: String, bcrypt hashed (never plain text)
   - `role`: Enum (`admin` | `member`)
   - `created_at`: Timestamp with timezone (default `now()`)

2. **snacks**:
   - `id`: Integer PK
   - `name`: String, unique, not null, indexed
   - `category`: Enum (`sweet` | `savoury` | `drink` | `healthy-ish`)
   - `quantity`: Integer, check `quantity >= 0`, default 0
   - `low_stock_threshold`: Integer, check `low_stock_threshold >= 0`, default 5
   - `created_at`: Timestamp with timezone (default `now()`)
   - *Status is derived dynamically, never stored*:
     - `gone`: `quantity == 0`
     - `running_low`: `1 <= quantity <= low_stock_threshold`
     - `stocked`: `quantity > low_stock_threshold`

3. **votes**:
   - `id`: Integer PK
   - `user_id`: Integer FK → `users.id` (`ON DELETE CASCADE`)
   - `snack_id`: Integer FK → `snacks.id` (`ON DELETE CASCADE`)
   - `created_at`: Timestamp with timezone (default `now()`)
   - Constraint: `UNIQUE(user_id, snack_id)` guarantees one vote per person per snack at the schema level.

4. **activity**:
   - `id`: Integer PK
   - `user_id`: Integer FK → `users.id` (`ON DELETE RESTRICT`)
   - `snack_id`: Integer FK → `snacks.id` (`ON DELETE RESTRICT`)
   - `action`: Enum (`consumed` | `restocked`)
   - `amount`: Integer, check `amount > 0`
   - `created_at`: Timestamp with timezone (default `now()`, indexed)
   - Indexes: composite index on `(user_id, snack_id)` and index on `created_at`.

---

## Migration & Seeding Instructions

### 1. Environment Configuration
Copy `backend/.env.example` to `backend/.env` and supply your credentials:
```bash
cp backend/.env.example backend/.env
```
> **Security Note**: All demo credentials (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_MEMBER1_EMAIL`, etc.) and database connection strings are loaded exclusively from `.env` and are strictly for local evaluation purposes. No credentials or secrets are committed to the repository.

### 2. Run Database Migrations
To apply database migrations to the Supabase PostgreSQL database:
```bash
cd backend
alembic upgrade head
```
*(Alembic automatically uses `DIRECT_URL` for running DDL migrations against PostgreSQL).*

### 3. Seed Initial Users and Snacks
To populate the database with initial admin and member accounts along with 8 sample snacks across all categories and inventory states:
```bash
cd backend
python seed.py
```
*The seed script is strictly idempotent: re-running it will skip existing records without failing or duplicating data.*

---

## Running Automated Tests

Run pytest across all stages:
```bash
pytest backend/tests -v
```
