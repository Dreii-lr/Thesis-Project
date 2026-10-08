"""
models.py — User and normalized profile entities definition adhering to USERS.drawio ERD schema.
"""
from datetime import date, datetime, timezone
from enum import Enum
from typing import Optional
import uuid

from sqlalchemy import Column, Date, DateTime, func
from sqlalchemy.orm import relationship
from sqlmodel import Field, Relationship, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


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
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    COMPLETED = "COMPLETED"  # if the student is finished the ALS program or graduated.


class User(SQLModel, table=True):
    __tablename__ = "users"

    user_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        nullable=False,
    )
    firebase_uid: Optional[str] = Field(default=None, nullable=True, index=True)
    email: str = Field(unique=True, index=True, nullable=False)
    password: str = Field(nullable=False)
    student_id: Optional[str] = Field(default=None, index=True, nullable=True)
    teacher_id: Optional[str] = Field(default=None, unique=True, nullable=True)
    first_name: str = Field(nullable=False)
    last_name: str = Field(nullable=False)
    middle_name: Optional[str] = Field(default=None, nullable=True)
    suffix: Optional[str] = Field(default=None, nullable=True)
    role: UserRole = Field(default=UserRole.STUDENT, nullable=False)
    user_category: UserCategory = Field(default=UserCategory.SECONDARY, nullable=True)
    status: UserStatus = Field(default=UserStatus.ACTIVE, nullable=False)
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    @property
    def employee_id(self) -> Optional[str]:
        """Backward-compatible alias for teacher_id."""
        return self.teacher_id

    # Normalized relationships from USERS.drawio
    personal_details: Optional[PersonalDetails] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "uselist": False, "lazy": "selectin"},
    )
    contact_details: Optional[ContactDetails] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "uselist": False, "lazy": "selectin"},
    )
    family_details: Optional[FamilyDetails] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "uselist": False, "lazy": "selectin"},
    )


class PersonalDetails(SQLModel, table=True):
    __tablename__ = "personal_details"

    personal_details_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        nullable=False,
    )
    user_id: str = Field(
        foreign_key="users.user_id",
        ondelete="CASCADE",
        index=True,
        unique=True,
        nullable=False,
    )
    student_id: Optional[str] = Field(default=None, index=True, nullable=True)
    gender: Optional[str] = Field(default=None, nullable=True)
    birth_date: Optional[date] = Field(
        default=None,
        sa_column=Column(Date, nullable=True),
    )
    nationality: Optional[str] = Field(default="Filipino", nullable=True)
    civil_status: Optional[str] = Field(default=None, nullable=True)
    religion: Optional[str] = Field(default=None, nullable=True)
    learning_modalities: LearningModality = Field(default=LearningModality.FTF, nullable=True)
    lrn_number: str = Field(default=None, index=True, nullable=False)

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    user: Optional[User] = Relationship(back_populates="personal_details")


class ContactDetails(SQLModel, table=True):
    __tablename__ = "contact_details"

    contact_details_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        nullable=False,
    )
    user_id: str = Field(
        foreign_key="users.user_id",
        ondelete="CASCADE",
        index=True,
        nullable=False,
    )
    street_building_no: Optional[str] = Field(default=None, nullable=True)
    municipality: Optional[str] = Field(default=None, nullable=True)
    province: Optional[str] = Field(default=None, nullable=True)
    contact_no: Optional[str] = Field(default=None, nullable=True)

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    user: Optional[User] = Relationship(back_populates="contact_details")

    @property
    def contact_details(self) -> str:
        """Alias property matching ERD PK naming in USERS.drawio."""
        return self.contact_details_id

    @contact_details.setter
    def contact_details(self, value: str) -> None:
        self.contact_details_id = value


class FamilyDetails(SQLModel, table=True):
    __tablename__ = "family_details"

    family_details_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        nullable=False,
    )
    user_id: str = Field(
        foreign_key="users.user_id",
        ondelete="CASCADE",
        index=True,
        nullable=False,
    )
    mother_name: Optional[str] = Field(default=None, nullable=True)
    father_name: Optional[str] = Field(default=None, nullable=True)
    guardian_name: Optional[str] = Field(default=None, nullable=True)
    guardian_relation: Optional[str] = Field(default=None, nullable=True)
    contact_no: Optional[str] = Field(default=None, nullable=True)

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    user: Optional[User] = Relationship(back_populates="family_details")

    @property
    def family_details(self) -> str:
        """Alias property matching ERD PK naming in USERS.drawio."""
        return self.family_details_id

    @family_details.setter
    def family_details(self, value: str) -> None:
        self.family_details_id = value
