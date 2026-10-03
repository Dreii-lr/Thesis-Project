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
