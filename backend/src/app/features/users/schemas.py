"""
schemas.py — Pydantic DTOs for User operations.
"""
from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.features.users.models import UserRole, UserStatus, UserCategory


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    middle_name: str | None = None
    student_id: str | None = None
    employee_id: str | None = None
    role: UserRole = UserRole.STUDENT
    user_category : UserCategory = UserCategory.SECONDARY



class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str | None = None
    email: EmailStr| None = None
    first_name: str| None = None
    last_name: str| None = None
    middle_name: str | None = None
    student_id: str | None = None
    employee_id: str | None = None
    role: UserRole | None = None
    status: UserStatus | None = None
    is_verified: bool | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None



class ListUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    users: List[UserRead] | None


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    middle_name: str | None = None
    student_id: str | None = None
    employee_id: str | None = None
    role: UserRole | None = None
    status: UserStatus | None = None
    is_verified: bool | None = None
