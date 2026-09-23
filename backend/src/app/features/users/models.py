"""
models.py — User table definition adhering to users_ERD.xml schema.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
import uuid

from sqlalchemy import Column, DateTime, func
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, Enum):
    STUDENT = "student"
    EMPLOYEE = "employee"
    ADMIN = "admin"



class UserCategory(str, Enum):
    ELEMENTARY = 'elementary'
    SECONDARY = "junior"
    BLP = "basic_literacy"


class UserStatus(str, Enum):
    ENROLLED = "enrolled"
    UNENROLL = "unenroll"
    COMPLETED = "completed"


class User(SQLModel, table=True):
    __tablename__ = "users"

    user_id: str = Field(
        default_factory=lambda : str(uuid.uuid4()),
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
    user_category : UserCategory = Field(default=UserCategory.SECONDARY, nullable=False)
    status: UserStatus = Field(default=UserStatus.ENROLLED, nullable=False)
    is_verified: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=utc_now,
                                 sa_column=(Column(DateTime(timezone=True),nullable=False, server_default=func.now())))
    updated_at: datetime = Field(sa_column=(Column(DateTime(timezone=True),nullable=True)))
