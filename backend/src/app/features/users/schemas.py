"""
schemas.py — Pydantic DTOs for User operations including normalized profile details.
"""
from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, List, Optional, Dict

from fastapi import Form, Body
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.shared.utils import SharedUtils


class UserRole(str, Enum):
    STUDENT = "STUDENT"
    TEACHER = "TEACHER"
    EMPLOYEE = "EMPLOYEE"
    ADMIN = "ADMIN"


class UserCategory(str, Enum):
    ELEMENTARY = "ELEMENTARY"
    SECONDARY = "SECONDARY"
    BLP = "BLP"


class LearningModality(str, Enum):
    BLENDED = "BLENDED"
    FTF = "FTF"


class UserStatus(str, Enum):
    MAPPED = "MAPPED" #This is the initial process, where teacher map the student first before they enroll it.
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    COMPLETED = "COMPLETED"  # if the student is finished the ALS program or graduated.




class PersonalDetailsInput(BaseModel):
    user_id: str | None = None
    is_interested: bool | None = True
    gender: str | None = None
    birth_date: date | str | None = None
    nationality: str | None = "Filipino"
    civil_status: str | None = None
    religion: str | None = None
    learning_modalities: LearningModality | None = LearningModality.FTF
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
    is_interested: bool | None = None
    gender: str | None = None
    birth_date: date | None = None
    nationality: str | None = None
    civil_status: str | None = None
    religion: str | None = None
    learning_modalities: LearningModality | None = None
    lrn_number: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ContactDetailsInput(BaseModel):
    street_building_no: str | None = None
    municipality: str | None = None
    province: str | None = None
    contact_no: str | None = None

    @field_validator(
        "street_building_no", "municipality", "province", mode="before"
    )
    @classmethod
    def capitalize_first_letter(cls, value: str | None) -> str | None:
        return SharedUtils.capitalized_first_letter(value)


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


class ParentGuardianInfo(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    name: Optional[str] = None
    contact_no: Optional[str] = Field(default=None)


class SiblingInfo(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    name: Optional[str] = None
    last_grade_level_completed: Optional[str] = None
    occupation: Optional[str] = None


class FamilyDetailsInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    mother: Optional[ParentGuardianInfo] = None
    father: Optional[ParentGuardianInfo] = None
    guardian: Optional[ParentGuardianInfo]  = None
    siblings: Optional[List[SiblingInfo]]  = Field(default_factory=list)

    @property
    def mother_name(self) -> Optional[str]:
        if isinstance(self.mother, dict):
            return self.mother.get("name")
        elif hasattr(self.mother, "name"):
            return getattr(self.mother, "name", None)
        return None

    @property
    def father_name(self) -> Optional[str]:
        if isinstance(self.father, dict):
            return self.father.get("name")
        elif hasattr(self.father, "name"):
            return getattr(self.father, "name", None)
        return None

    @property
    def guardian_name(self) -> Optional[str]:
        if isinstance(self.guardian, dict):
            return self.guardian.get("name")
        elif hasattr(self.guardian, "name"):
            return getattr(self.guardian, "name", None)
        return None

    @property
    def contact_no(self) -> Optional[str]:
        for entity in (self.guardian, self.mother, self.father):
            if isinstance(entity, dict):
                val = entity.get("contact_number") or entity.get("contact_no")
                if val:
                    return val
            elif entity and hasattr(entity, "contact_number"):
                val = getattr(entity, "contact_number", None) or getattr(entity, "contact_no", None)
                if val:
                    return val
        return None


class FamilyDetailsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    family_details_id: str | None = None
    user_id: str | None = None
    mother: Optional[ParentGuardianInfo | Dict[str, Any]] = None
    father: Optional[ParentGuardianInfo | Dict[str, Any]] = None
    guardian: Optional[ParentGuardianInfo | Dict[str, Any]] = None
    siblings: Optional[List[SiblingInfo] | List[Dict[str, Any]]] = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @property
    def mother_name(self) -> Optional[str]:
        if isinstance(self.mother, dict):
            return self.mother.get("name")
        elif hasattr(self.mother, "name"):
            return getattr(self.mother, "name", None)
        return None

    @property
    def father_name(self) -> Optional[str]:
        if isinstance(self.father, dict):
            return self.father.get("name")
        elif hasattr(self.father, "name"):
            return getattr(self.father, "name", None)
        return None

    @property
    def guardian_name(self) -> Optional[str]:
        if isinstance(self.guardian, dict):
            return self.guardian.get("name")
        elif hasattr(self.guardian, "name"):
            return getattr(self.guardian, "name", None)
        return None

    @property
    def guardian_relation(self) -> Optional[str]:
        if isinstance(self.guardian, dict):
            return self.guardian.get("relationship") or self.guardian.get("guardian_relation")
        elif hasattr(self.guardian, "relationship"):
            return getattr(self.guardian, "relationship", None)
        return None

    @property
    def contact_no(self) -> Optional[str]:
        for entity in (self.guardian, self.mother, self.father):
            if isinstance(entity, dict):
                val = entity.get("contact_number") or entity.get("contact_no")
                if val:
                    return val
            elif entity and hasattr(entity, "contact_number"):
                val = getattr(entity, "contact_number", None) or getattr(entity, "contact_no", None)
                if val:
                    return val
        return None


class MapStudent(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    email: EmailStr | None = None
    password: str | None = None
    first_name: str = Field()
    last_name: str = Field()
    middle_name: str | None = Field(default=None, )
    suffix: str | None = None
    student_id: str | None = Field(default=None, )
    teacher_id: str | None = Field(default=None, )
    role: UserRole = UserRole.STUDENT
    user_category: UserCategory = Field(default=UserCategory.SECONDARY, )
    status: UserStatus = UserStatus.ACTIVE
    firebase_uid: str | None = None
    personal_details: PersonalDetailsInput | None = Field(default=None, )
    contact_details: ContactDetailsInput | None = Field(default=None, )
    family_details: FamilyDetailsInput | None = Field(default=None, )

    @field_validator("first_name", "last_name", "middle_name", "suffix", )
    @classmethod
    def capitalized_first_letter(cls, value: str):
        return SharedUtils.capitalized_first_letter(value)

    @classmethod
    def get_map_student_dependency(cls, email: EmailStr | None = Body(),
                                   first_name: str = Body(),
                                   last_name: str = Body(),
                                   middle_name: str | None = Body(default=None, ),
                                   suffix: str | None = Body(default=None),
                                   user_category: UserCategory = Body(default=UserCategory.SECONDARY, ),
                                   personal_details: PersonalDetailsInput | None = Body(default=None, ),
                                   contact_details: ContactDetailsInput | None = Body(default=None, ),
                                   family_details: FamilyDetailsInput | None = Body(default=None, )) -> MapStudent:
        return MapStudent(email=email,
                          first_name=first_name,
                          last_name=last_name,
                          middle_name=middle_name,
                          suffix=suffix,
                          user_category=user_category,
                          personal_details=personal_details,
                          contact_details=contact_details,
                          family_details=family_details)

class UserCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    email: EmailStr
    password: str | None = None
    first_name: str = Field(default="", )
    last_name: str = Field(default="", )
    middle_name: str | None = Field(default=None, )
    suffix: str | None = None
    student_id: str | None = Field(default=None, )
    teacher_id: str | None = Field(default=None, )
    role: UserRole = UserRole.STUDENT
    user_category: UserCategory = Field(default=UserCategory.SECONDARY, )
    status: UserStatus = UserStatus.ACTIVE
    firebase_uid: str | None = None
    personal_details: PersonalDetailsInput | None = Field(default=None, )
    contact_details: ContactDetailsInput | None = Field(default=None, )
    family_details: FamilyDetailsInput | None = Field(default=None, )

    @field_validator("first_name", "last_name", "middle_name", "suffix", )
    @classmethod
    def capitalized_first_letter(cls, value: str):
        return SharedUtils.capitalized_first_letter(value)

    @classmethod
    def get_user_create_dependency(cls, email: EmailStr | str = Body(),
                                   first_name: str = Body(default="", ),
                                   last_name: str = Body(default="", ),
                                   middle_name: str | None = Body(default=None, ),
                                   suffix: str | None = Body(default=None),
                                   role: UserRole = Body(default=UserRole.STUDENT),
                                   user_category: UserCategory = Body(default=UserCategory.SECONDARY, ),
                                   personal_details: PersonalDetailsInput | None = Body(default=None, ),
                                   contact_details: ContactDetailsInput | None = Body(default=None, ),
                                   family_details: FamilyDetailsInput | None = Body(default=None, )) -> UserCreate:
        return UserCreate(email=email,
                          role=role,
                          first_name=first_name,
                          last_name=last_name,
                          middle_name=middle_name,
                          suffix=suffix,
                          user_category=user_category,
                          personal_details=personal_details,
                          contact_details=contact_details,
                          family_details=family_details)


class TeacherCreate(UserCreate):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    role: UserRole = UserRole.TEACHER


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: str | None = None
    student_id: str | None = None
    teacher_id: str | None = None
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
    student_id: str | None = None
    teacher_id: str | None = None
    employee_id: str | None = None
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
                last_name: str | None = Body(default=None),
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


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, description="Current password of the user")
    new_password: str = Field(..., min_length=6, description="New password (minimum 6 characters)")
    confirm_password: Optional[str] = Field(default=None, description="Confirmation of new password")
