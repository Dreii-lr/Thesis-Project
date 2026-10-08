"""
models.py — SQLModel definitions for User Category entity.
Supports categories such as Elementary, Secondary, and BLP.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
import uuid

from sqlalchemy import Column, DateTime, func
from sqlalchemy.orm import relationship
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.features.subjects.models import Subject


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserCategoryModel(SQLModel, table=True):
    __tablename__ = "user_categories"

    category_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        nullable=False,
    )
    code: str = Field(
        nullable=False,
        unique=True,
        index=True,
    )
    name: str = Field(
        nullable=False,
        unique=True,
        index=True,
    )
    description: Optional[str] = Field(default=None, nullable=True)

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    # 1:N Relationship with Subjects
    subjects: List["Subject"] = Relationship(
        sa_relationship=relationship(
            "Subject",
            back_populates="category",
            cascade="all, delete-orphan",
            lazy="selectin",
        )
    )


# Convenient alias
UserCategoryEntity = UserCategoryModel
