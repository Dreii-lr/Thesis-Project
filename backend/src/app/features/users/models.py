"""
models.py — User table definition adhering to users_ERD.xml schema.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
import uuid

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, Enum):
    STUDENT = "student"
    EMPLOYEE = "employee"
    ADMIN = "admin"


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"


class User(SQLModel, table=True):
    __tablename__ = "users"

    user_id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    email: str = Field(unique=True, index=True, nullable=False)
    password: str = Field(nullable=False)
    student_id: str | None = Field(default=None, index=True, nullable=True)
    employee_id: str | None = Field(default=None, index=True, nullable=True)
    first_name: str = Field(nullable=False)
    last_name: str = Field(nullable=False)
    middle_name: str | None = Field(default=None, nullable=True)
    role: UserRole = Field(default=UserRole.STUDENT, nullable=False)
    status: UserStatus = Field(default=UserStatus.ACTIVE, nullable=False)
    is_verified: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=utc_now, nullable=False)
    updated_at: datetime = Field(default_factory=utc_now, nullable=False)
