"""
schemas.py — Pydantic DTOs for User operations.
"""
from __future__ import annotations

from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.features.users.models import UserRole, UserStatus


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    middle_name: str | None = None
    student_id: str | None = None
    employee_id: str | None = None
    role: UserRole = UserRole.STUDENT


class UserRead(BaseModel):
    user_id: uuid.UUID
    email: EmailStr
    first_name: str
    last_name: str
    middle_name: str | None = None
    student_id: str | None = None
    employee_id: str | None = None
    role: UserRole
    status: UserStatus
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    middle_name: str | None = None
    student_id: str | None = None
    employee_id: str | None = None
    role: UserRole | None = None
    status: UserStatus | None = None
    is_verified: bool | None = None
