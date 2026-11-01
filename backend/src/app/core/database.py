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
    future=True,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_recycle=1800,
    pool_timeout=30,
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

