"""
models.py — SQLModel definitions for the Requirements Master Catalog entity.
Serves as the single source of truth for student requirements across all ALS categories.
"""
from datetime import datetime, timezone
from typing import List, Optional
import uuid

from sqlalchemy import Column, DateTime, func, JSON
from sqlmodel import Field, Relationship, SQLModel

from app.features.users.models import User


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

    is_required: bool = Field(default=True, nullable=False, index=True)
    is_conditional: bool = Field(default=False, nullable=False)
    allow_assistance: bool = Field(default=False, nullable=False)
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


class StudentRequirement(SQLModel, table=True):
    __tablename__ = "student_requirements"

    submission_id: str = Field(
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
        description="Foreign key referencing the student users.user_id",
    )
    requirement_id: Optional[str] = Field(
        default=None,
        foreign_key="requirements.requirement_id",
        ondelete="SET NULL",
        index=True,
        nullable=True,
        description="Optional foreign key to requirements master catalog",
    )
    requirement_code: str = Field(
        index=True,
        nullable=False,
        description="Requirement code slug (e.g. 'rpl', 'af1', 'af2', 'flt', 'psa_police_clearance', 'proof_of_education')",
    )
    document_type: str = Field(
        nullable=False,
        description="Specific document variation selected/submitted (e.g. 'PSA Birth Certificate')",
    )
    status: str = Field(
        default="review",
        index=True,
        nullable=False,
        description="Status: 'review', 'verified', 'correction', 'exempted'",
    )
    file_url: Optional[str] = Field(default=None, nullable=True)
    file_name: Optional[str] = Field(default=None, nullable=True)
    file_size_bytes: Optional[int] = Field(default=0, nullable=True)
    mime_type: Optional[str] = Field(default=None, nullable=True)
    storage_key: Optional[str] = Field(default=None, nullable=True, description="Cloudflare R2 object key")



    student_remarks: Optional[str] = Field(default=None, nullable=True)
    teacher_feedback: Optional[str] = Field(default=None, nullable=True)
    reviewed_by: Optional[str] = Field(default=None, nullable=True, description="User ID of reviewer")
    reviewed_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    is_conditional: bool = Field(default=False, nullable=False)
    requested_assistance: bool = Field(default=False, nullable=False)

    versions_payload: List[dict] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False, default=[]),
        description="History of previous file versions upon resubmission",
    )

    created_at: datetime = Field(

        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    # Relationships
    student: Optional[User] = Relationship(
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    requirement: Optional[Requirement] = Relationship(
        sa_relationship_kwargs={"lazy": "selectin"},
    )


    @property
    def account_id(self) -> Optional[str]:
        student = self.__dict__.get("student")
        if student and hasattr(student, "account_id") and student.account_id:
            return student.account_id
        return None

    @property
    def student_name(self) -> Optional[str]:
        student = self.__dict__.get("student")
        if student:
            first = getattr(student, "first_name", "") or ""
            last = getattr(student, "last_name", "") or ""
            name = f"{first} {last}".strip()
            return name or None
        return None

    @property
    def student_category(self) -> Optional[str]:
        student = self.__dict__.get("student")
        if student and hasattr(student, "user_category") and student.user_category:
            cat = student.user_category
            return getattr(cat, "value", str(cat))
        return None


class StudentDocumentUploadAttempt(SQLModel, table=True):
    __tablename__ = "student_document_upload_attempts"

    attempt_id: str = Field(
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
        description="Student user ID",
    )
    requirement_code: Optional[str] = Field(
        default=None,
        index=True,
        nullable=True,
        description="Requirement code slug (e.g. 'psa_police_clearance')",
    )
    document_type: Optional[str] = Field(
        default=None,
        nullable=True,
        description="Document variation (e.g. 'Valid Government ID', 'PSA Birth Certificate')",
    )
    is_gemini_verified: bool = Field(
        default=True,
        index=True,
        nullable=False,
        description="Whether this attempt was for an AI-verifiable document that uses Gemini Vision",
    )
    is_successful: bool = Field(
        default=False,
        nullable=False,
        description="Whether upload and verification succeeded",
    )
    error_message: Optional[str] = Field(
        default=None,
        nullable=True,
        description="Error detail if attempt failed",
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now(),index=True,),

    )



