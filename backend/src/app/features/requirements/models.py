"""
models.py — SQLModel definitions for the Requirements Master Catalog entity.
Serves as the single source of truth for student requirements across all ALS categories.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
import uuid

from sqlalchemy import Column, DateTime, func, JSON
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Requirement(SQLModel, table=True):
    __tablename__ = "requirements"

    requirement_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        nullable=False,
    )
    code: str = Field(
        nullable=False,
        unique=True,
        index=True,
        description="Unique system slug/code e.g. 'birth', 'school', 'identity'",
    )
    title: str = Field(nullable=False, index=True)
    description: Optional[str] = Field(default=None, nullable=True)
    guidance: Optional[str] = Field(default=None, nullable=True)

    # Accepted document variations (e.g. PSA Birth Certificate, Form 138, etc.)
    accepted_document_types: List[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False, default=[]),
    )

    # File upload policy configuration
    allowed_extensions: List[str] = Field(
        default_factory=lambda: ["pdf", "jpg", "jpeg", "png", "webp"],
        sa_column=Column(JSON, nullable=False, default=["pdf", "jpg", "jpeg", "png", "webp"]),
    )

    is_required: bool = Field(default=True, nullable=False, index=True)
    is_conditional: bool = Field(default=False, nullable=False)
    allow_assistance: bool = Field(default=False, nullable=False)
    max_file_size_mb: int = Field(default=10, nullable=False)
    sample_document_url: Optional[str] = Field(default=None, nullable=True)
    order_index: int = Field(default=0, nullable=False, index=True)
    is_active: bool = Field(default=True, nullable=False, index=True)

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
