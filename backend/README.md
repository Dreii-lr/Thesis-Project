# Thesis Project — FastAPI Backend

Feature-based monolith backend built with FastAPI, SQLModel, asyncpg, and Firebase Authentication.

## Tech Stack
- **FastAPI** (with standard extras)
- **SQLModel** + **asyncpg** for async PostgreSQL ORM
- **Pydantic-Settings** for typed config management
- **Firebase Admin SDK** for authentication
- **Alembic** for database migrations
- **uv** as the package manager

## Getting Started

```bash
# 1. Copy env file
cp .env.example .env
# 2. Edit .env with your DB URL and Firebase credentials
# 3. Sync dependencies
uv sync
# 4. Run migrations
uv run alembic upgrade head
# 5. Start dev server
uv run fastapi dev src/app/main.py
```

## Authentication verification

Login, refresh, and logout use HttpOnly cookies through the frontend `/api/v1` proxy.
Start the API on the port configured in the frontend `BACKEND_URL` (8989 by default):

```bash
uv run fastapi dev src/app/main.py --port 8989
```

Token expiry returns `401 TOKEN_EXPIRED` and permits one refresh. Revoked, invalid,
or disabled credentials require sign-in. Firebase transport failures return
`503 AUTH_UNAVAILABLE`, after bounded retries, and do not clear the session.
Both server and browser session responses use `no-store`.

`FIREBASE_CLOCK_SKEW_SECONDS` defaults to 5 (allowed range 0–60), using the
[Firebase verifier's supported tolerance](https://firebase.google.com/docs/reference/admin/python/firebase_admin.auth#verify_id_token).
Keep the server clock synchronized; this does not relax revocation, signature,
issuer, or audience validation. No login delay is required.

Account creation now fails if Firebase is unavailable instead of saving a fabricated
UID. Existing accounts with a `mock-firebase-` UID require administrator repair;
these changes do not rewrite account data or reset passwords.

Run isolated authentication regressions (no live Firebase accounts required):

```bash
uv run pytest tests/test_login_service.py tests/test_firebase_auth.py tests/test_session_api.py tests/test_password_sync.py tests/test_auth_cookies.py tests/test_exceptions.py
# From frontend/:
npm run test:auth
```

## Project Structure

```
src/app/
├── main.py             # FastAPI entry point
├── core/
│   ├── config.py       # pydantic-settings (all env vars)
│   ├── database.py     # async SQLModel engine + session dependency
│   ├── firebase.py     # Firebase Admin SDK init + helpers
│   └── exceptions.py   # Global HTTP exception handlers
├── features/
│   ├── auth/
│   │   ├── models.py       # UserSession SQLModel table
│   │   ├── schemas.py      # LoginRequest / LoginResponse Pydantic models
│   │   ├── service.py      # Login business logic (follows flowchart)
│   │   ├── dependencies.py # Cookie / token extraction FastAPI deps
│   │   └── router.py       # /api/v1/auth routes
│   └── users/
│       ├── models.py       # User SQLModel table (from ERD)
│       ├── schemas.py      # UserCreate / UserRead / UserUpdate
│       ├── service.py      # User CRUD service
│       └── router.py       # /api/v1/users routes
└── shared/
    └── base_model.py   # TimestampMixin, UUIDMixin
```
