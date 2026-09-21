"""
database.py — async SQLModel engine and session factory.

The session factory (``async_session_factory``) is used by the
Unit of Work instead of being injected directly via Depends().
"""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from app.core.constants import constants

# ── Engine ────────────────────────────────────────────────────────────────────
engine = create_async_engine(
    constants.DATABASE_URL,
    echo=constants.DEBUG,     # log all SQL in dev; disable in production
    future=True,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# ── Session factory ────────────────────────────────────────────────────────────
# The UnitOfWork calls this factory to open a new session per transaction.
async_session_factory: sessionmaker[AsyncSession] = sessionmaker(  # type: ignore[type-arg]
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# ── Dev helper ────────────────────────────────────────────────────────────────
async def create_db_and_tables() -> None:
    """
    Create all SQLModel-registered tables.
    Use ONLY in development — prefer `alembic upgrade head` in production.
    """
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
