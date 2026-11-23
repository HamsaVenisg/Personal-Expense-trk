# Spendwise — Personal Expenses Tracker

A full-stack **personal expenses tracker** starter application for VS Code and OpenAI Codex.

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, CSS, Recharts, Lucide icons
- **Backend:** Python FastAPI, Pydantic, SQLAlchemy 2
- **Database:** Supabase PostgreSQL (via SQLAlchemy + psycopg; local SQLite only in automated tests)
- **Authentication:** email/password with Argon2 password hashing and expiring JWTs

## Features

- Register / sign in / sign out; user-scoped private financial records
- Add, view, edit, and delete income and expense transactions
- Monthly income, spending, and net balance summary
- Donut chart showing spending by category
- Set/update/delete category budgets; progress and over-budget indicators
- Download transaction CSV
- Mobile-friendly design, typed API client, validation, and backend tests

## Folder structure

```text
personal-expenses-tracker/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── security.py
│   │   └── main.py
│   ├── tests/test_api.py
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/TransactionForm.tsx
│   │   ├── lib/api.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── .env.example
│   ├── package.json
│   ├── index.html
│   ├── tsconfig.json
│   └── vite.config.ts
├── .vscode/
├── .gitignore
├── CODEX_PROMPT.md
└── README.md
```

## Setup (Windows PowerShell + VS Code)

Prerequisites: **Python 3.11–3.13**, **Node.js LTS (20.19+ or 22.12+)**, npm, and VS Code.

### 1. Open folder

Extract ZIP. Open **personal-expenses-tracker** in VS Code (`File > Open Folder`).

### 2. Start backend (VS Code terminal 1)

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env`: paste your Supabase **Session pooler** connection URI into `DATABASE_URL` (use `postgresql+psycopg://` instead of `postgresql://`), then replace `JWT_SECRET` with a strong random secret. Generate one with:

```powershell
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
```

Then run:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

If your installed Python is not 3.13, use `py -3.12` or `py -3.11` in the virtual environment command. You may also use `python -m venv .venv` if `python` is on PATH.

Backend API: **http://127.0.0.1:8000/docs**

### 3. Start frontend (VS Code terminal 2)

```powershell
cd frontend
npm install
npm run dev
```

Visit **http://127.0.0.1:5173/**. Register with a name, email, and password. Add a few transactions and budgets.

The Vite dev server proxies `/api` calls to `127.0.0.1:8000`, so no frontend API URL is necessary locally.

### 4. Run backend tests

In the `backend` folder:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

### 5. Build the frontend

In the `frontend` folder:

```powershell
npm run build
```

## Backend API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Current user |
| GET, POST | `/api/transactions` | List / create transactions |
| PUT, DELETE | `/api/transactions/{id}` | Edit / delete transaction |
| GET | `/api/summary?month=YYYY-MM` | Monthly summary |
| GET | `/api/budgets?month=YYYY-MM` | List budgets |
| PUT | `/api/budgets` | Create/update category budget |
| DELETE | `/api/budgets/{id}` | Delete budget |
| GET | `/api/export/csv` | Download transactions CSV |

## Supabase database connectivity (required)

1. Create a project at [Supabase](https://supabase.com/dashboard) and save its **database password**.
2. Open that project and click **Connect** (top of dashboard), select **Session pooler**, and copy the URI. Session pooler on port **5432** is suitable for development computers using IPv4. Copy the exact hostname, username, and region shown for **your** project; do not copy example hostnames.
3. Copy `backend/.env.example` to `backend/.env`. Set `DATABASE_URL` using your own connection URI, changing the scheme to **`postgresql+psycopg://`** and appending `?sslmode=require` (or `&sslmode=require` if it already contains query parameters). Example *format only*:

   ```env
   DATABASE_URL=postgresql+psycopg://postgres.PROJECT_REF:YOUR_URL_ENCODED_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require
   ```

   If your password contains `@`, `#`, `/`, `:` etc., URL-encode it. Alternatively reset the Supabase database password to a strong URL-safe password in Supabase settings. Never put this connection URI in the frontend, browser, Git, screenshots, or Codex prompts.
4. Start FastAPI from the `backend` directory. The existing SQLAlchemy `User`, `Transaction`, and `Budget` models are created in Supabase PostgreSQL's `public` schema automatically on first backend startup. Check them in **Database > Tables / Table Editor** in Supabase.
5. Register a user from the frontend, add a transaction, and refresh the page. Data should persist in Supabase. Your existing app's Argon2/JWT user authentication remains unchanged; **Supabase Auth is not used** in this integration.

**Architecture:** React → FastAPI authenticated `/api` endpoints → SQLAlchemy + psycopg → Supabase PostgreSQL. The browser **never** connects to Postgres directly. The backend checks `user_id` for private records. Do **not** expose database credentials or rely on Supabase's Data API to enforce those checks: SQLAlchemy connects with database credentials that may bypass RLS. For direct browser Supabase access, implement Supabase Auth and proper RLS in a separate redesign.

**Testing:** `pytest` injects a temporary SQLite database into the API tests. Normal backend startup requires PostgreSQL. From `backend`, run `.\.venv\Scripts\python.exe -m app.database` to check the configured connection. The command runs only `SELECT 1`, prints a sanitized result, and exits without starting FastAPI or creating tables.

**Schema changes:** `create_all()` is only a starter convenience and does not migrate existing tables. Before changing models or deploying publicly, add versioned Alembic migrations and plan database backups. If you already have records in the old local `expenses.db`, they are **not migrated automatically**.

**Troubleshooting:** Wrong password or hostname → copy the exact project URI from Connect; IPv4 failure with a direct connection → use Session pooler; errors on startup → check `DATABASE_URL`, installed `psycopg[binary]`, connectivity, and project status. For production, configure network restrictions, least-privilege DB credentials, SSL certificate validation, and appropriate pooling.

## Security and production considerations

This is a working **local-development starter**, not a hardened production finance product. Before going live: enforce strong secret configuration, HTTPS, rate limiting and abuse protection, proper database migrations, backup/restore, monitoring, pagination, stronger password policies, account recovery, token revocation, and comprehensive tests. JWTs are stored in sessionStorage for simplicity: a production authentication design should reassess token storage and XSS/CSRF defenses. Only the owner can access each transaction/budget using server-side checks. No bank integration or payment processing is included. Keep `.env` files and database credentials out of Git.

**Amounts are in INR** and summary is calculated server-side from decimal amounts. The frontend defaults to the device's current month.

## Codex

Open `CODEX_PROMPT.md`, copy the prompt into Codex with this folder open, and ask it to inspect and expand features incrementally. Do not let Codex replace working code without running the tests and build first.
