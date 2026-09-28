"""
schemas.py — Pydantic DTOs for User operations including normalized profile details.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, List, Optional

from fastapi import Form, Body
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator, field_validator

from app.features.users.models import UserRole, UserStatus, UserCategory


class PersonalDetailsInput(BaseModel):
    user_id: str | None = None
    gender: str | None = None
    birth_date: date | str | None = None
    nationality: str | None = "Filipino"
    civil_status: str | None = None
    religion: str | None = None
    place_of_birth: str | None = None
    lrn_number: str | None = None


    @field_validator("birth_date", mode="before")
    @classmethod
    def parse_birth_date(cls, data: Any) -> Any:
        if isinstance(data, str) and data:
            try:
                return datetime.strptime(data[:10], "%Y-%m-%d").date()
            except Exception:
                return data
        return data


class PersonalDetailsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    personal_details_id: str | None = None
    user_id: str | None = None
    student_id: str | None = None
    gender: str | None = None
    birth_date: date | None = None
    nationality: str | None = None
    civil_status: str | None = None
    religion: str | None = None
    place_of_birth: str | None = None
    lrn_number: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ContactDetailsInput(BaseModel):
    street_building_no: str | None = None
    municipality: str | None = None
    province: str | None = None
    contact_no: str | None = None



class ContactDetailsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    contact_details_id: str | None = None
    user_id: str | None = None
    street_building_no: str | None = None
    municipality: str | None = None
    province: str | None = None
    contact_no: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class FamilyDetailsInput(BaseModel):
    mother_name: str | None = None
    father_name: str | None = None
    guardian_name: str | None = None
    guardian_relation: str | None = None
    contact_no: str | None = None



class FamilyDetailsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    family_details_id: str | None = None
    user_id: str | None = None
    mother_name: str | None = None
    father_name: str | None = None
    guardian_name: str | None = None
    guardian_relation: str | None = None
    contact_no: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    middle_name: str | None = None
    suffix: str | None = None
    student_id: str | None = None
    employee_id: str | None = None
    role: UserRole = UserRole.STUDENT
    user_category: UserCategory = UserCategory.SECONDARY
    status: UserStatus = UserStatus.ENROLLED
    firebase_uid: str | None = None
    personal_details: PersonalDetailsInput | None = None
    contact_details: ContactDetailsInput | None = None
    family_details: FamilyDetailsInput | None = None

    @staticmethod
    def get_user_create_dependency(
        # --- Core User Fields ---
        email: EmailStr = Body(...),
        first_name: Optional[str] = Body(None),
        last_name: Optional[str] = Body(None),
        middle_name: Optional[str] = Body(None),
        suffix: Optional[str] = Body(None),
        user_category: Optional[UserCategory] = Body(None),
        personal_details: Optional[PersonalDetailsInput] = Body(None),
        contact_details: Optional[ContactDetailsInput] = Body(None),
        family_details: Optional[FamilyDetailsInput] = Body(None),
    ) -> UserCreate:
        return UserCreate(
            email=email,
            first_name=first_name or "",
            last_name=last_name or "",
            middle_name=middle_name,
            suffix=suffix,
            user_category=user_category or UserCategory.SECONDARY,
            personal_details=personal_details,
            contact_details=contact_details,
            family_details=family_details,
        )


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: str | None = None
    student_id: str | None = None
    employee_id: str | None = None
    firebase_uid: str | None = None
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    middle_name: str | None = None
    suffix: str | None = None
    password: str | None = None
    role: UserRole | None = None
    user_category: UserCategory | None = None
    status: UserStatus | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    personal_details: PersonalDetailsRead | None = None
    contact_details: ContactDetailsRead | None = None
    family_details: FamilyDetailsRead | None = None


class UserReadLessData(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str | None = None
    firebase_uid: str | None = None
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    middle_name: str | None = None
    suffix: str | None = None
    role: UserRole | None = None
    user_category: UserCategory | None = None
    status: UserStatus | None = None


class ListUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    users: List[UserRead] | None = None
    total: int | None = None
    offset: int | None = None
    limit: int | None = None


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    middle_name: str | None = None
    suffix: str | None = None
    user_category: UserCategory | None = None
    status: UserStatus | None = None

    personal_details: PersonalDetailsInput | None = None
    contact_details: ContactDetailsInput | None = None
    family_details: FamilyDetailsInput | None = None

    @staticmethod
    def depends(first_name: str = Body(default=None),
    last_name: str | None= Body(default=None),
    middle_name: str | None = Body(default=None),
    suffix: str | None = Body(default=None),
    user_category: UserCategory | None = None,
    status: UserStatus | None = None,
    personal_details: PersonalDetailsInput | None = None,
    contact_details: ContactDetailsInput | None = None,
    family_details: FamilyDetailsInput | None = None):
        return UserUpdate(first_name=first_name,
                          last_name=last_name,
                          middle_name=middle_name,
                          suffix=suffix,
                          user_category=user_category,
                          status=status,
                          personal_details=personal_details,
                          contact_details=contact_details,
                          family_details=family_details)