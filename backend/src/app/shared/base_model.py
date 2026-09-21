"""
base_model.py — Base model providing UUID primary keys and timestamp fields.
"""
from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class BaseModel(SQLModel):
    """
    Abstract base model with standard UUID PK and created/updated timestamps.
    """
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
    )
