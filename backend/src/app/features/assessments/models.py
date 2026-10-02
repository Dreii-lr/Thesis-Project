"""
models.py — SQLModel definitions for the Assessment Subsystem.
Implements the 4-table normalized schema with JSONB question pools and attempts.
Reuses UserCategory from users.models.
"""
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
import uuid

from sqlalchemy import Column, DateTime, Enum as SAEnum, JSON, func
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM, JSONB
from sqlmodel import Field, Relationship, SQLModel

from app.features.users.models import UserCategory

# Support PostgreSQL native JSONB while allowing in-memory SQLite JSON in test suites
JSON_TYPE = JSON().with_variant(JSONB, "postgresql")

# Reusable cross-database enum type: binds to existing PostgreSQL enum without recreating, VARCHAR in SQLite
USER_CATEGORY_COLUMN_TYPE = SAEnum(
    UserCategory,
    name="usercategory",
).with_variant(
    PG_ENUM("ELEMENTARY", "SECONDARY", "BLP", name="usercategory", create_type=False),
    "postgresql",
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TaskType(str, Enum):
    ACTIVITY = "ACTIVITY"
    QUIZ = "QUIZ"
    EXAM = "EXAM"


class TaskStatus(str, Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class SubmissionStatus(str, Enum):
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    GRADED = "GRADED"


class Assessment(SQLModel, table=True):
    __tablename__ = "assessments"

    assessment_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True
    )
    teacher_id: str = Field(foreign_key="users.user_id", index=True, nullable=False)
    title: str = Field(nullable=False)
    description: Optional[str] = Field(default=None, nullable=True)
    subject_code: str = Field(nullable=False, index=True)
    # Directly reuse UserCategory from users.models (None = Universal / All Categories)
    target_category: Optional[UserCategory] = Field(
        default=None,
        sa_column=Column(USER_CATEGORY_COLUMN_TYPE, index=True, nullable=True),
    )
    assessment_type: TaskType = Field(nullable=False, index=True)
    status: TaskStatus = Field(default=TaskStatus.DRAFT, index=True, nullable=False)
    start_date: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    end_date: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    grace_period_minutes: int = Field(default=5, nullable=False)
    duration_minutes: Optional[int] = Field(default=None, nullable=True)
    max_score: float = Field(default=100.0, nullable=False)
    is_ai_generated: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))

    # 1:1 Relationship with AssessmentQuestions
    questions: Optional["AssessmentQuestions"] = Relationship(
        back_populates="assessment",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "uselist": False, "lazy": "selectin"},
    )
    # 1:N Relationship with AssessmentMaterial
    materials: List["AssessmentMaterial"] = Relationship(
        back_populates="assessment",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"},
    )
    # 1:N Relationship with AssessmentSubmission
    submissions: List["AssessmentSubmission"] = Relationship(
        back_populates="assessment",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"},
    )


class AssessmentQuestions(SQLModel, table=True):
    __tablename__ = "assessment_questions"

    question_set_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True
    )
    assessment_id: str = Field(
        foreign_key="assessments.assessment_id",
        unique=True,
        index=True,
        nullable=False,
    )
    # Multi-category question pools and configurations stored in JSON_TYPE
    categories_data: List[dict] = Field(
        default_factory=list,
        sa_column=Column(JSON_TYPE, nullable=False),
    )
    total_pool_items: int = Field(default=0, nullable=False)
    total_required_items: int = Field(default=0, nullable=False)
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))

    assessment: Optional[Assessment] = Relationship(back_populates="questions")


class AssessmentMaterial(SQLModel, table=True):
    __tablename__ = "assessment_materials"

    material_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True
    )
    assessment_id: str = Field(foreign_key="assessments.assessment_id", index=True, nullable=False)
    file_name: str = Field(nullable=False)
    file_url: str = Field(nullable=False)
    file_type: str = Field(nullable=False)
    file_size_bytes: int = Field(nullable=False)
    uploaded_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )

    assessment: Optional[Assessment] = Relationship(back_populates="materials")


class AssessmentSubmission(SQLModel, table=True):
    __tablename__ = "assessment_submissions"

    submission_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True
    )
    assessment_id: str = Field(foreign_key="assessments.assessment_id", index=True, nullable=False)
    student_id: str = Field(foreign_key="users.user_id", index=True, nullable=False)
    # Directly reuse UserCategory for student profile snapshot
    student_category: Optional[UserCategory] = Field(
        default=None,
        sa_column=Column(USER_CATEGORY_COLUMN_TYPE, nullable=True),
    )
    answers_payload: Optional[dict] = Field(default=None, sa_column=Column(JSON_TYPE, nullable=True))
    attachments_payload: Optional[List[dict]] = Field(default=None, sa_column=Column(JSON_TYPE, nullable=True))
    auto_score: float = Field(default=0.0, nullable=False)
    manual_score: float = Field(default=0.0, nullable=False)
    final_score: float = Field(default=0.0, nullable=False)
    feedback: Optional[str] = Field(default=None, nullable=True)
    is_late: bool = Field(default=False, nullable=False)
    status: SubmissionStatus = Field(default=SubmissionStatus.IN_PROGRESS, nullable=False)
    started_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    submitted_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    time_spent_seconds: int = Field(default=0, nullable=False)
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))

    assessment: Optional[Assessment] = Relationship(back_populates="submissions")
