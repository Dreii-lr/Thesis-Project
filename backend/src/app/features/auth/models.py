"""
models.py — UserSession table for session and refresh token management.
"""
from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy import DateTime, Column, func
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserSession(SQLModel, table=True):
    __tablename__ = "user_sessions"

    id: str = Field(
        default_factory=lambda : str(uuid.uuid4()),
        primary_key=True,
        index=True,
        nullable=False,
    )
    user_id: str = Field(
        foreign_key="users.user_id",
        index=True,
        nullable=False,
    )
    refresh_token_hash: str = Field(index=True, nullable=False)
    user_agent: str | None = Field(default=None, nullable=True)
    ip_address: str | None = Field(default=None, nullable=True)
    is_revoked: bool = Field(default=False, nullable=False)
    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=True),nullable=False))
    created_at: datetime = Field(default_factory=utc_now,
                                 sa_column=(Column(DateTime(timezone=True), nullable=False, server_default=func.now())))
