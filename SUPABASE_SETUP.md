# Supabase setup quick guide

1. Go to https://supabase.com/dashboard and create/open your project.
2. Press **Connect** > **Session pooler** and copy your project's Postgres URI (usually port 5432).
3. In `backend/.env`, change the URI scheme from `postgresql://` to `postgresql+psycopg://` and add `?sslmode=require` if not already present. Keep this credential **backend-only**. Use URL-encoded password characters.
4. Generate a new `JWT_SECRET` (see `README.md`).
5. Install `backend/requirements.txt` and start `uvicorn app.main:app --reload` from `backend`.
6. Visit the frontend, register and create a transaction; inspect `users`, `transactions`, `budgets` in Supabase **Table Editor**. The backend auto-creates these tables on first successful start.

Architecture: React → FastAPI → SQLAlchemy → Supabase PostgreSQL. This does **not** use Supabase Auth; app auth continues to use JWT/Argon2.

Never paste the DB password into a chat, commit, frontend `.env`, or public issue. Tests use SQLite in a temporary directory, not Supabase. `create_all` is not a production migration tool. See `README.md` for troubleshooting and deployment cautions.
