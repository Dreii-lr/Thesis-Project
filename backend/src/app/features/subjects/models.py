"""
models.py — SQLModel definitions for Subject entity.
Supports subjects associated with user categories (Elementary, Secondary, BLP)
with image support for LS3 Math, LS6 Digital Citizenship, and other subjects.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
import uuid

from sqlalchemy import Column, DateTime, UniqueConstraint, func
from sqlalchemy.orm import relationship
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.features.user_categories.models import UserCategoryModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Subject(SQLModel, table=True):
    __tablename__ = "subjects"
    __table_args__ = (
        UniqueConstraint("category_id", "code", name="uq_category_subject_code"),
    )

    subject_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        nullable=False,
    )
    category_id: str = Field(
        foreign_key="user_categories.category_id",
        ondelete="CASCADE",
        index=True,
        nullable=False,
    )
    code: str = Field(
        nullable=False,
        index=True,
    )
    name: str = Field(
        nullable=False,
        index=True,
    )
    description: Optional[str] = Field(default=None, nullable=True)
    image_url: Optional[str] = Field(default=None, nullable=True)
    is_active: bool = Field(default=True, nullable=False)

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    # N:1 Relationship back to UserCategoryModel
    category: Optional["UserCategoryModel"] = Relationship(
        sa_relationship=relationship(
            "UserCategoryModel",
            back_populates="subjects",
            lazy="selectin",
        )
    )
