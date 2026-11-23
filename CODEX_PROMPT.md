# Copy the prompt below into OpenAI Codex in VS Code

You are a senior full-stack engineer and code reviewer. I am building a personal expenses tracker named Spendwise for an MCA academic project. The repository is already scaffolded and contains a React+TypeScript+Vite frontend, FastAPI+SQLAlchemy backend, Supabase PostgreSQL database (SQLAlchemy + psycopg through the backend), Argon2/JWT authentication, transaction CRUD, category budgets, monthly analytics, and CSV export.

FIRST: Inspect the existing repository and understand all routes, UI components, dependencies, and database relationships. DO NOT regenerate the project from scratch, delete working features, silently change API contracts, or generate duplicate components/routes.

GOALS:
1. Verify local backend-to-database-to-frontend connectivity end-to-end, including user isolation, sign-up, sign-in, transactions, budgets, summaries, and CSV export.
2. Fix any runtime errors, typing problems, security gaps, bad error states, responsive design issues, and inconsistent numeric/date behavior. Handle expired sessions cleanly and never create duplicate transactions from double submissions.
3. Add robust filters/search, pagination, category management, recurring transactions, monthly trend charts, and optional spending notifications with sensible schema migrations.
4. Add integration tests and unit tests; prefer deterministic isolated test databases, clear error responses, and accessible forms.
5. Improve the UI with a refined modern dashboard, mobile responsive layout, accessible navigation, skeleton loading, empty states, form validation, and gentle animations while keeping performance fast.
6. Keep this academic project easy to run locally on Windows in VS Code. Keep Supabase PostgreSQL as the application database; preserve isolated SQLite only for automated tests. Never revert the application to SQLite or expose credentials to React.
7. Prepare production-readiness improvements as separate, reviewable changes: Alembic migrations, strong JWT secret validation, auth rate limiting, HTTPS, logging without secrets, backup strategy, secure token design, cross-database query correctness, and CI checks. Do not falsely claim production readiness.

WORKFLOW:
- Start with a brief audit and prioritized changes.
- Implement in small coherent steps, reuse existing APIs/components, and keep migrations backwards compatible.
- Run `python -m pytest -q` in backend and `npm run build` in frontend, resolve failures, and report exact test/build results.
- Do not hardcode passwords, JWT secrets, API keys, or database credentials. Never commit .env or personal expense records.
- Give me the exact commands to run and the files changed.

ACCEPTANCE CRITERIA:
- A new user can register, sign in, create an income/expense, edit/delete it, set a budget, see correct month totals, export CSV, and sign out.
- Two different users cannot view, edit, or delete each other's data.
- Frontend, backend, and Supabase PostgreSQL connect correctly after the user configures backend/.env.
- No duplicate writes caused by accidental double-click submissions, no broken imports, no TypeScript build errors, and no unhandled API errors in normal use.
- All automated tests and production build pass, with remaining gaps documented.
