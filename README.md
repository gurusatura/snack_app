# Snack Overflow 🍿

> **Full Stack Hiring Assignment — Office Pantry Inventory & Snack Tracker**  
> A production-grade, concurrency-safe, role-based snack tracking platform built with **FastAPI**, **SQLAlchemy 2.0 (Sync)**, **PostgreSQL (Supabase)**, and **Next.js 16 (App Router + TypeScript)**.

---

## 📌 Executive Summary & Engineering Focus

In any shared office pantry, real-world inventory management fails in the edge cases: two teammates simultaneously grab the last cold brew, an admin deletes a snack leaving orphaned consumption logs, or a tampered JWT elevates a member to admin.

**Snack Overflow** was built prioritizing **correctness, data integrity, security, and atomic concurrency** over superficial UI gimmicks:
1. **Zero Overselling (Single Atomic SQL Statement)**: High-concurrency snack consumption executes an atomic SQL `UPDATE ... WHERE id = :id AND quantity >= :amount RETURNING quantity` statement, ensuring stock never drops below zero even under heavy parallel load without needing application-level locking.
2. **Defensive Security & Authentication**: JWTs use pinned `PyJWT` signed exclusively with hardcoded `HS256`. The JWT payload contains **only** user identity and expiration; user roles are **never trusted from token claims** and are re-fetched from PostgreSQL on every protected request.
3. **Database-Enforced Referential Integrity**: Schema-level constraints (`CHECK (quantity >= 0)`, `CHECK (amount > 0)`, `UNIQUE(user_id, snack_id)`) and foreign key rules (`ON DELETE RESTRICT` on activity logs, `ON DELETE CASCADE` on votes) ensure data cannot be corrupted.
4. **Predictable API Error Envelope**: Every error response across all endpoints strictly adheres to the standard contract:
   ```json
   {
     "error": {
       "code": "INSUFFICIENT_STOCK",
       "message": "Someone beat you to the last packet! Not enough stock remaining."
     }
   }
   ```
5. **Clean, Utilitarian Frontend**: Built with Next.js 16 App Router, TypeScript, and Tailwind CSS. Features real-time stock status, search, multi-factor filtering, voting, admin CRUD, audit logs, and persistent navigation without AI-slop design tropes.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Frontend["Frontend (Next.js 16 + TypeScript + App Router)"]
        UI["Tailwind CSS UI\n(Dashboard, Pantry Grid, Modals)"]
        AuthCtx["Auth Context\n(Bearer Token in Memory / Storage)"]
        ActPage["Admin Audit Log Page\n(/activity)"]
        AxiosClient["Axios API Client\n(Interceptors & Error Mapping)"]
        UI --> AxiosClient
        ActPage --> AxiosClient
        AuthCtx --> AxiosClient
    end

    subgraph Backend["Backend (FastAPI Sync + SQLAlchemy 2.0)"]
        AuthRouter["Auth Router\n(/auth/login)"]
        SnacksRouter["Snacks Router\n(CRUD, Consume, Restock, Vote, Summary)"]
        ActivityRouter["Activity Router\n(Paginated Admin Audit Log)"]
        AuthDep["Security Dependency\n(HS256 Decode + Live DB Role Fetch)"]
        AtomicEngine["Atomic Execution Engine\n(Single-Statement UPDATE ... RETURNING)"]
    end

    subgraph Database["Database (PostgreSQL / Supabase)"]
        UsersTbl[("users\n(id, name, email, password_hash, role)")]
        SnacksTbl[("snacks\n(id, name, category, quantity, threshold)")]
        VotesTbl[("votes\n(UNIQUE user_id + snack_id, CASCADE)")]
        ActivityTbl[("activity\n(FK RESTRICT, action, amount, timestamp)")]
    end

    AxiosClient -->|"HTTP Bearer Token"| AuthDep
    AuthDep -->|"Verify & Re-fetch Role"| UsersTbl
    AuthRouter -->|"Bcrypt Verify"| UsersTbl
    SnacksRouter --> AtomicEngine
    AtomicEngine -->|"Atomic Condition & Decrement"| SnacksTbl
    AtomicEngine -->|"Append Audit Record"| ActivityTbl
    ActivityRouter -->|"JOIN users + snacks"| ActivityTbl
    SnacksRouter -->|"Toggle Vote"| VotesTbl
```

---

## 🛠️ Tech Stack & Architectural Justifications

| Layer | Technology | Version | Architectural Justification |
| :--- | :--- | :--- | :--- |
| **Backend Runtime** | Python | `3.12+` | Modern type hints, high performance, robust ecosystem. |
| **Backend Framework** | FastAPI | `0.115.6` | Sync handlers for deterministic, straightforward connection pooling without async event-loop leaks. |
| **ORM & Database** | SQLAlchemy | `2.0.36` | Pure sync Session with direct atomic SQL execution (`text()`) and explicit transaction boundaries. |
| **Migrations** | Alembic | `1.14.1` | Direct DDL migrations against PostgreSQL with version-controlled revisions. |
| **Database Host** | PostgreSQL (Supabase) | `15+` | Hosted relational engine with ACID guarantees and native single-statement atomicity. |
| **Password Hashing** | bcrypt | `4.2.1` | Direct `bcrypt` library usage with salted key derivation (avoids passlib version conflicts). |
| **Authentication** | PyJWT | `2.10.1` | Pinned version, algorithm fixed to `HS256` in code to prevent algorithm-confusion attacks. |
| **Frontend Framework** | Next.js (App Router) | `16.4.6` | React 19, Server Components, client interactivity, production bundle optimization. |
| **Styling** | Tailwind CSS | `4.3.3` | Clean utility-first design, high-contrast accessible color palette, zero CSS bloat. |
| **HTTP Client** | Axios | `1.21.1` | Standardized request interceptors for Bearer token injection and error unwrapping. |
| **Testing** | pytest + httpx | `8.3.4` | Comprehensive test coverage across all stages, including live multi-threaded concurrency. |
| **Containerization** | Docker & Compose | `v2+` | Multi-container orchestration (DB, API, Frontend) with automated healthchecks, migrations, and seeding. |

---

## 🔒 Concurrency & Single-Statement Atomic SQL Execution Deep Dive

### The Challenge
When multiple employees attempt to consume the last available snack simultaneously, standard `read -> check -> write` ORM operations create a classic **race condition**:
```
User A reads quantity = 1  ───┐
User B reads quantity = 1     ├─► Both check (quantity >= 1) ──► Both deduct 1 ──► Final quantity = -1 (OVERSELL!)
```

### The Solution: Single Atomic UPDATE with Conditional WHERE & RETURNING
Rather than relying on multi-step application-level locking, [snacks.py](backend/app/routers/snacks.py) executes a single, atomic SQL statement directly against PostgreSQL:

```sql
UPDATE snacks
SET quantity = quantity - :amount
WHERE id = :id AND quantity >= :amount
RETURNING quantity;
```

In Python / SQLAlchemy:
```python
# Query 1: Check existence (404 if snack does not exist)
existence = db.execute(text("SELECT id FROM snacks WHERE id = :id"), {"id": snack_id}).fetchone()
if not existence:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"error": {"code": "SNACK_NOT_FOUND", "message": "Snack not found."}},
    )

# Query 2: Atomic update relying on PostgreSQL's single-statement atomicity
result = db.execute(
    text(
        "UPDATE snacks SET quantity = quantity - :amount "
        "WHERE id = :id AND quantity >= :amount RETURNING quantity"
    ),
    {"id": snack_id, "amount": body.amount},
)
row = result.fetchone()

if row is None:
    # 0 rows affected because quantity < amount: atomically rejected!
    db.rollback()
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "error": {
                "code": "INSUFFICIENT_STOCK",
                "message": "Someone beat you to the last packet! Not enough stock remaining.",
            }
        },
    )

new_quantity = row[0]

# Query 3: Insert activity log in the same transaction
activity = Activity(
    user_id=current_user.id,
    snack_id=snack_id,
    action=ActivityAction.consumed,
    amount=body.amount,
)
db.add(activity)
db.commit()
```

### Why This Architecture Excels:
1. **PostgreSQL Single-Statement Atomicity**: PostgreSQL guarantees that individual `UPDATE` statements are atomic and evaluate the row condition (`quantity >= :amount`) under an internal row-exclusive lock. No two concurrent transactions can simultaneously update the same row.
2. **Zero Deadlocks**: Because no long-lived locks or multi-step lock acquisitions are held across application pauses, deadlock risk is completely eliminated.
3. **Deterministic Row Matching**: If stock is insufficient, exactly 0 rows match the `WHERE` clause. `RETURNING quantity` returns `None`, immediately triggering a `409 INSUFFICIENT_STOCK` conflict.

### Concurrency Test Verification
In [test_stage4.py](backend/tests/test_stage4.py) (`test_concurrency_real_server_supabase`):
- Spawns a real live Uvicorn server in a subprocess against live Supabase PostgreSQL.
- Creates a target snack seeded with exactly **`quantity = 3`**.
- Fires **10 concurrent HTTP requests** simultaneously across 10 threads using independent `httpx` clients.
- **Results**:
  - Exactly **3 requests return `200 OK`**.
  - Exactly **7 requests return `409 Conflict (INSUFFICIENT_STOCK)`**.
  - Final database quantity is verified to be **exactly `0`**.
  - Exactly **3 audit records** created; failed requests produce **zero orphaned logs**.

---

## ⚡ Distributed Idempotency (`Idempotency-Key`)

To eliminate double-spend / double-deduction risks from network retries, double-clicking, or client re-transmissions:

1. **Header Support**: `POST /snacks/{id}/consume` accepts an optional `Idempotency-Key` header (e.g. UUIDv4 generated client-side).
2. **24-Hour Cache Window**: If a key was processed within the last 24 hours, the backend returns the exact cached JSON response and status code without re-executing stock deduction.
3. **Concurrent Deduplication**: The `idempotency_keys` table enforces a `UNIQUE(key)` constraint. Concurrent duplicate requests attempting to process simultaneously hit this constraint during transaction commit, triggering an automatic rollback of the duplicate stock deduction and returning the first transaction's cached response.
4. **Verified via Tests**:
   - Same key sent sequentially returns identical response and deducts stock only once.
   - Different keys process independently and each deducts stock separately.
   - Missing header functions normally without blocking.
   - 6 concurrent threads firing with the exact same key deduct stock exactly once.

---

## 🛡️ Security & Role-Based Access Control (RBAC)

1. **Algorithm Confusion Protection**:
   - The decoding process hardcodes `algorithms=["HS256"]`. It **never** trusts the `alg` header from incoming tokens, preventing `none` or asymmetric public key attacks.
2. **Stateless Identity, Stateful Privileges**:
   - JWT payload contains **only** `sub` (user ID) and `exp` (timestamp).
   - The user's role is intentionally **omitted** from the JWT payload.
   - On every request, `get_current_user` queries PostgreSQL to verify the user exists and retrieves their live role. If an admin revokes privileges, the change takes effect immediately without waiting for token expiry.
3. **Role Enforcement**:
   - `require_admin` dependency guarantees administrative routes (`POST /snacks`, `PATCH /snacks/{id}`, `DELETE /snacks/{id}`, `POST /snacks/{id}/restock`, `GET /activity`) strictly reject members with `403 Forbidden`.
4. **Data Isolation**:
   - Passwords hashed using salted `bcrypt` (12 rounds) with non-deterministic salts.
   - Plaintext passwords never logged, stored, or returned by any API endpoint.

---

## 📊 Database Schema & Derived Status

### Tables & Integrity Rules

```mermaid
erDiagram
    users ||--o{ votes : "casts (CASCADE)"
    users ||--o{ activity : "performs (RESTRICT)"
    users ||--o{ idempotency_keys : "issues (CASCADE)"
    users ||--o{ login_history : "records (SET NULL)"
    snacks ||--o{ votes : "receives (CASCADE)"
    snacks ||--o{ activity : "logs (RESTRICT)"

    users {
        int id PK
        string name
        string email UK
        string password_hash
        enum role "admin | member"
        timestamp created_at
    }

    snacks {
        int id PK
        string name UK
        enum category "sweet | savoury | drink | healthy-ish"
        int quantity "CHECK >= 0"
        int low_stock_threshold "CHECK >= 0"
        timestamp created_at
    }

    votes {
        int id PK
        int user_id FK
        int snack_id FK
        timestamp created_at
    }

    activity {
        int id PK
        int user_id FK
        int snack_id FK
        enum action "consumed | restocked"
        int amount "CHECK > 0"
        timestamp created_at
    }

    idempotency_keys {
        int id PK
        string key UK
        int user_id FK
        int status_code
        string response_body
        timestamp created_at
    }

    login_history {
        int id PK
        int user_id FK
        string attempted_email
        boolean success
        timestamp timestamp
    }
```

### Derived Stock Status (Computed Dynamically)
Stock status is never stored as a mutable database column (eliminating data drift). It is computed dynamically at the Python model level and in SQL filters:
- **`gone`**: `quantity == 0`
- **`running_low`**: `1 <= quantity <= low_stock_threshold`
- **`stocked`**: `quantity > low_stock_threshold`

---

## 🚀 API Specification

All protected endpoints require an `Authorization: Bearer <token>` header.

| Method | Endpoint | Access Level | Description | Status Codes |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Public | Authenticate user, return JWT token & user info | `200`, `401`, `422` |
| `POST` | `/auth/register` | Public | Register new member account (enforces member role & email uniqueness; rejects admin self-assignment with 403) | `201`, `403`, `409`, `422` |
| `GET` | `/health` | Public | API health check and operational status | `200` |
| `GET` | `/snacks` | Member+ | List snacks with SQL search, category, and status filters | `200`, `401` |
| `GET` | `/snacks/summary` | Member+ | Inventory counts (stocked/low/gone) & Snack of the Week | `200`, `401` |
| `GET` | `/snacks/{id}` | Member+ | Retrieve single snack details | `200`, `401`, `404` |
| `POST` | `/snacks/{id}/consume` | Member+ | Atomically consume 1+ packets (Atomic `UPDATE ... RETURNING` with optional `Idempotency-Key` header) | `200`, `401`, `409`, `422` |
| `POST` | `/snacks/{id}/vote` | Member+ | Vote for a snack as office favourite | `201`, `401`, `404`, `409` |
| `DELETE`| `/snacks/{id}/vote` | Member+ | Remove previous vote for a snack | `200`, `401`, `404` |
| `POST` | `/snacks` | **Admin Only** | Add a new snack to pantry inventory | `201`, `401`, `403`, `409`, `422` |
| `PATCH`| `/snacks/{id}` | **Admin Only** | Update name, category, quantity, or threshold | `200`, `401`, `403`, `404`, `409` |
| `DELETE`| `/snacks/{id}` | **Admin Only** | Delete snack (blocked if activity history exists) | `200`, `401`, `403`, `404`, `409` |
| `POST` | `/snacks/{id}/restock` | **Admin Only** | Atomically restock inventory packets | `200`, `401`, `403`, `404`, `422` |
| `GET` | `/activity` | **Admin Only** | Paginated audit log joining user, snack, action, amount | `200`, `401`, `403` |
| `GET` | `/login-history` | **Admin Only** | Paginated login security audit log (user, attempted email, outcome, timestamp) | `200`, `401`, `403` |

---

## 💻 Local Setup & Development Instructions

### Prerequisites
- **Python**: 3.12+
- **Node.js**: 20+ and `npm`
- **PostgreSQL**: Supabase project or local PostgreSQL instance

---

### Step 1: Clone Repository
```bash
git clone https://github.com/gurusatura/snack_app.git
cd snack_app
```

---

### Option A: One-Command Docker Compose (Fastest & Recommended for Evaluators)

Launch the entire stack (PostgreSQL database, FastAPI backend with auto-migrations and seed, and Next.js frontend) with a single command:

```bash
docker compose up --build
```

What this does automatically:
1. **Database Container (`snack_overflow_db`)**: Starts PostgreSQL 16 on port `5432` with built-in healthchecks.
2. **Backend Container (`snack_overflow_backend`)**: Waits for PostgreSQL to become healthy, automatically applies Alembic migrations (`alembic upgrade head`), seeds canonical demo snacks and users (`python seed.py`), and starts the FastAPI server on port `8000`.
3. **Frontend Container (`snack_overflow_frontend`)**: Compiles and starts the Next.js production server on port `3000`.

* Once running, open **`http://localhost:3000`** in your browser.
* API documentation is live at **`http://localhost:8000/docs`**.
* To stop all services: `docker compose down -v`

> [!NOTE]
> `docker compose up` creates its own local PostgreSQL container with seeded demo data — this is separate from the Supabase-hosted database used for local development and production. Running Docker Compose will not affect your Supabase data.

---

### Option B: Manual Local Setup (Python + Node.js)

1. **Create Virtual Environment & Install Dependencies**:
   ```bash
   cd backend
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate

   pip install -r requirements.txt
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   Fill in your PostgreSQL credentials and JWT secret in `backend/.env`:
   ```ini
   DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
   DIRECT_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
   JWT_SECRET=your_32_byte_hex_secret_here
   JWT_EXPIRE_MINUTES=1440
   CORS_ORIGIN=http://localhost:3000

   SEED_ADMIN_EMAIL=admin@snackoverflow.local
   SEED_ADMIN_PASSWORD=AdminPassword123!
   SEED_MEMBER1_EMAIL=member1@snackoverflow.local
   SEED_MEMBER1_PASSWORD=MemberPassword123!
   SEED_MEMBER2_EMAIL=member2@snackoverflow.local
   SEED_MEMBER2_PASSWORD=MemberPassword123!
   ```

3. **Run Migrations & Seed Database**:
   ```bash
   alembic upgrade head
   python seed.py
   ```

4. **Start Backend Server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   Backend will be accessible at: `http://localhost:8000` (API Docs: `http://localhost:8000/docs`).

---

### Step 3: Frontend Setup

1. **Install Node Packages**:
   ```bash
   cd ../frontend
   npm install
   ```

2. **Configure Frontend Environment**:
   ```bash
   cp .env.local.example .env.local
   ```
   Ensure `frontend/.env.local` points to the local backend:
   ```ini
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. **Start Next.js Development Server**:
   ```bash
   npm run dev
   ```
   Frontend will be accessible at: `http://localhost:3000`.

---

## 🧪 Testing & Verification

### Running Automated Test Suite
From the `backend` folder with your virtual environment active:
```bash
pytest -v
```
**Test Results (57 tests across 9 modules)**:
- `test_scaffold.py`: Health endpoint and strict CORS origin enforcement.
- `test_stage2.py`: Model hashing, seed integrity, derived statuses, database CHECK constraints, UNIQUE constraints, FK CASCADE and RESTRICT.
- `test_stage3.py`: Authentication, invalid credentials, JWT expiry, signature tampering, algorithm-confusion attack prevention, role-from-DB verification.
- `test_stage4.py`: Snack listing, multi-factor search/filtering, pagination, admin CRUD, consumption, restocking, voting, Snack of the Week calculation, and live 10-thread Uvicorn concurrency.
- `test_activity.py`: Admin audit log access control (`403` for members, `200` for admin), table joins, pagination, and sorting.
- `test_stage7_sorting.py`: SQL-level sorting (name ascending/descending, quantity ascending/descending, vote popularity via subquery), combined filter/search/sort integration, and pagination.
- `test_stage10_register.py`: Public member signup, strict role assignment (privilege escalation prevention returning HTTP 403 `ADMIN_REGISTRATION_PROHIBITED` against admin injections), case-insensitive email uniqueness, validation, and login preservation.
- `test_stage11_idempotency.py`: Distributed `Idempotency-Key` header support, 24-hour cache replay, single-deduction guarantees, optional header compatibility, and concurrent duplicate request deduplication.
- `test_stage12_login_audit.py`: Security login audit logging for success/failure attempts, anonymous login tracking, admin-only access (`403` for members), and pagination.

### Continuous Integration (GitHub Actions)
Every `push` and `pull_request` to `main` automatically triggers [.github/workflows/ci.yml](.github/workflows/ci.yml):
1. **Backend Matrix**: Spins up an isolated `postgres:16-alpine` service container, executes Alembic migrations, runs database seeding, and executes the complete 57-test pytest suite (including live multi-threaded concurrency verification).
2. **Frontend Matrix**: Sets up Node.js 20, validates dependencies, runs TypeScript checks, and builds the Next.js production bundle.

### Running End-to-End User Simulation QA
Execute the automated QA script simulating complete member and admin browser flows:
```bash
python exploratory_qa.py
```

### Inspecting Database Cleanliness
Verify only the 8 canonical seeded snacks exist without test leftovers:
```bash
python verify_and_cleanup_db.py
```

---

## 🔑 Demo Credentials for Evaluators

The application includes pre-configured demo user accounts (credentials loaded from environment variables):

| Role | Name | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Admin User | `admin@snackoverflow.local` | `AdminPassword123!` | View pantry, consume, vote, add snack, edit snack, delete snack, restock, view audit activity logs |
| **Member 1**| Alice Member| `member1@snackoverflow.local`| `MemberPassword123!`| View pantry, search/filter, consume snacks, vote/unvote |
| **Member 2**| Bob Member | `member2@snackoverflow.local`| `MemberPassword123!`| View pantry, search/filter, consume snacks, vote/unvote |

> *Quick-login buttons for all 3 demo accounts are conveniently built into the login screen for instant evaluation.*

---

## ☁️ Production Deployment

### Backend Deployment (Render / Railway / Fly.io)
1. **Procfile & Dockerfile**: The repository includes both [Procfile](backend/Procfile) and [Dockerfile](backend/Dockerfile) configured for containerized or buildpack deployments.
2. **Environment Variables**:
   Set `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_EXPIRE_MINUTES`, and `CORS_ORIGIN` (pointing to your Vercel frontend URL).
3. **Build & Start Commands**:
   - Build: `pip install -r requirements.txt && alembic upgrade head && python seed.py`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend Deployment (Vercel)
1. Import repository on [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL`: Your deployed backend production URL (e.g. `https://snack-overflow-api.onrender.com`).
4. Deploy! Vercel will automatically build the Next.js production output.

---

## 📈 What Would Break at 100x Scale & Architectural Evolutions

Scaling Snack Overflow from a 50-person office to an enterprise campus with 5,000 active employees (100x throughput) changes the performance bottlenecks from raw business logic to network roundtrips, database connection limits, and write lock contention.

### 1. The N+1 Query Problem & Network Latency (A Real Production Case Study)
* **What broke even at small scale**:
  When fetching snacks, the backend initially evaluated vote counts and user-voted statuses inside a Python iteration loop (`_snack_to_out()`), executing 2 queries per snack row. With 8 snacks, this resulted in 17+ sequential SQL queries. Because our PostgreSQL database was hosted across the public cloud (AWS Tokyo, ~200ms ping), 17 sequential roundtrips took **3.8 to 5.5 seconds**!
* **At 100x scale**:
  With 100 snacks or concurrent requests, 1,000+ sequential network queries would saturate connection pools, trigger TCP socket timeouts, and crash API workers with network errors.
* **The fix & evolution**:
  We optimized this into **bulk aggregation queries** (`WHERE snack_id IN (...) GROUP BY snack_id`), dropping response latency from **3.76s down to 0.50s (7.4x speedup)**. At 100x scale, this evolves into a single SQL `JOIN` with aggregation or a database `MATERIALIZED VIEW` refreshed periodically or via trigger.

### 2. Database Connection Pool Saturation
* **What breaks**:
  PostgreSQL allocates memory per connection. Under 100x concurrent users, spinning up 500+ direct connections causes connection exhaustion, out-of-memory errors, and refused connections.
* **Architecture evolution**:
  - Deploy **PgBouncer** in transaction-pooling mode directly in front of PostgreSQL to reuse a small pool of 20–30 physical connections across thousands of client requests.
  - Switch FastAPI endpoints to asynchronous I/O (`async def` with `asyncpg` or `SQLAlchemy async`) to free up event loop workers while awaiting network I/O.

### 3. Row-Lock Contention on "Hot" Snacks ("The 3 PM Snack Drop")
* **What breaks**:
  Our single-statement atomic update (`UPDATE snacks SET quantity = quantity - :amount WHERE id = :id AND quantity >= :amount RETURNING quantity`) relies on PostgreSQL's row-exclusive lock. If 500 users attempt to grab the same trending snack simultaneously, all 500 transactions queue behind the exact same row lock, causing database connection wait timeouts and throughput collapse.
* **Architecture evolution**:
  - **Redis Atomic Pre-decrement**: Move high-frequency stock counters into an in-memory Redis cluster. Use atomic `DECRBY` or Lua scripts for instant sub-millisecond stock reservations.
  - **Asynchronous Persistence Queue**: Successful grabs publish an event to a message broker (RabbitMQ / Redis Streams / Kafka), and background workers batch write inventory updates and audit records to PostgreSQL asynchronously.

### 4. Database Read/Write Splitting & Read Replicas
* **What breaks**:
  Combining high-throughput write operations (`consume`, `restock`, `vote`) with heavy analytical reads (multi-factor search, sorting by popularity, paginated audit logs) on a single database instance creates disk I/O and CPU contention.
* **Architecture evolution**:
  - Implement a **Primary-Replica topology**.
  - Route all mutation operations (`POST`, `PATCH`, `DELETE`) to the read-write Primary database.
  - Route all read queries (`GET /snacks`, `GET /activity`, `GET /snacks/summary`) to geographically distributed Read Replicas.

### 5. Edge Caching & Stale-While-Revalidate
* **What breaks**:
  Re-calculating the `Snack of the Week` and pantry summary on every dashboard load wastes computational resources.
* **Architecture evolution**:
  - Cache `/snacks/summary` at the CDN / reverse-proxy edge using HTTP `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`.
  - Invalidate the edge cache via webhooks only when inventory state mutations (`restock` or `vote`) occur.

### 6. Audit Log Partitioning & Cold Archival
* **What breaks**:
  At 100x scale, hundreds of thousands of activity events are logged every week, ballooning the `activity` table to millions of rows, degrading index scan performance.
* **Architecture evolution**:
  - Partition the `activity` table by month using PostgreSQL Declarative Table Partitioning (`PARTITION BY RANGE (created_at)`).
  - Automatically archive audit logs older than 90 days into columnar cloud storage (AWS S3 / Parquet) for long-term compliance queries via DuckDB or Athena.

---

## 📄 License
This project was developed for the Bipolar Factory Round 2 Full Stack Intern evaluation.
