"""
Alembic migration environment — configured for async SQLAlchemy (asyncpg).

Key changes from the default template:
  * Reads DATABASE_URL from pydantic-settings (not alembic.ini).
  * Uses asyncio runner for async engine compatibility.
  * Imports all SQLModel table models so autogenerate can detect them.
"""
from __future__ import annotations

import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlmodel import SQLModel

from alembic import context

# ── Load app settings ─────────────────────────────────────────────────────────
# Import constants first so DATABASE_URL is available.
from app.core.constants import constants  # noqa: E402

# ── Import ALL models so Alembic can autogenerate their tables ────────────────
import app.features.users.models  # noqa: F401  – registers User
import app.features.auth.models   # noqa: F401  – registers UserSession
from app.features import SequenceIDGenerator


# ── Alembic config ────────────────────────────────────────────────────────────
config = context.config

# Override sqlalchemy.url with the value from our Constants object.
# This means you never need to put the DB URL in alembic.ini.
config.set_main_option("sqlalchemy.url", constants.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


# ── Offline migrations ────────────────────────────────────────────────────────
def run_migrations_offline() -> None:
    """Run migrations without a live DB connection (generates SQL script)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online migrations (async) ─────────────────────────────────────────────────
def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Create an async engine and run migrations inside an asyncio event loop."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


# ── Entry point ───────────────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
