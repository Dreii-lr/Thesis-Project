"""
schemas.py — Pydantic DTOs for Assessment request and response contracts.
Directly uses UserCategory from users.models.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.features.assessments.models import (
    SubmissionStatus,
    TaskStatus,
    TaskType,
)
from app.features.users.models import UserCategory


# ── Question & Category Building Blocks ───────────────────────────────────────

class QuestionItemSchema(BaseModel):
    id: str
    text: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    premise: Optional[str] = None
    match: Optional[str] = None
    image_url: Optional[str] = None


class CategoryConfigSchema(BaseModel):
    category_id: str = Field(default_factory=lambda : str(uuid.uuid4()))
    type: str  # "Multiple Choice" | "True/False" | "Matching Type" | "Essay"
    pool_size: int = Field(default=1, ge=1)
    required_count: int = Field(default=1, ge=1)
    points_per_item: float = Field(default=1.0, ge=0.0)
    is_expanded: Optional[bool] = True
    distractors: Optional[List[str]] = Field(
        default_factory=list,
        description="Extra Column B decoy terms for Matching Type to prevent elimination guessing",
    )
    questions: List[QuestionItemSchema] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_matching_distractors(self) -> "CategoryConfigSchema":
        if self.type == "Matching Type":
            num_items = len(self.questions)
            max_distractors = num_items // 5
            cleaned_distractors = [d.strip() for d in (self.distractors or []) if d and d.strip()]
            if len(cleaned_distractors) > max_distractors:
                raise ValueError(
                    f"For Matching Type, exactly 1 distractor is allowed for every 5 items. "
                    f"With {num_items} items, at most {max_distractors} distractor(s) are allowed."
                )
            self.distractors = cleaned_distractors
        return self


class AssessmentMaterialInput(BaseModel):
    file_name: str
    file_url: str
    file_type: str
    file_size_bytes: int


class AssessmentMaterialRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    material_id: str
    assessment_id: str
    file_name: str
    file_url: str
    file_type: str
    file_size_bytes: int
    uploaded_at: datetime


# ── Assessment Create, Update, Read ───────────────────────────────────────────

class AssessmentCreateSchema(BaseModel):
    title: str
    description: Optional[str] = None
    subject_code: str
    target_category: UserCategory  # Mandatory specific ALS program (ELEMENTARY, SECONDARY, BLP)
    assessment_type: TaskType
    status: TaskStatus = TaskStatus.DRAFT
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    grace_period_minutes: int = 5
    duration_minutes: Optional[int] = None
    max_score: Optional[float] = None
    is_ai_generated: bool = False
    categories_data: Optional[List[CategoryConfigSchema]] = None
    materials: Optional[List[AssessmentMaterialInput]] = None

    @field_validator("target_category", mode="before")
    @classmethod
    def validate_target_category(cls, value: Any) -> UserCategory:
        if value is None or str(value).strip() == "" or str(value).lower() in ("all", "universal"):
            raise ValueError("An assessment must be specifically assigned to ELEMENTARY, SECONDARY, or BLP.")
        val_str = str(value).strip().upper()
        if val_str in ("JUNIOR", "JUNIOR_HIGH_SCHOOL", "SECONDARY"):
            return UserCategory.SECONDARY
        if val_str == "ELEMENTARY":
            return UserCategory.ELEMENTARY
        if val_str in ("BLP", "BASIC_LITERACY", "BASIC_LITERACY_PROGRAM"):
            return UserCategory.BLP
        raise ValueError(f"Invalid target category '{value}'. Allowed: ELEMENTARY, SECONDARY, BLP.")


class AssessmentUpdateSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject_code: Optional[str] = None
    target_category: Optional[UserCategory] = None
    status: Optional[TaskStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    grace_period_minutes: Optional[int] = None
    duration_minutes: Optional[int] = None
    max_score: Optional[float] = None
    categories_data: Optional[List[CategoryConfigSchema]] = None

    @field_validator("target_category", mode="before")
    @classmethod
    def validate_target_category_update(cls, value: Any) -> Optional[UserCategory]:
        if value is None:
            return None
        if str(value).strip() == "" or str(value).lower() in ("all", "universal"):
            raise ValueError("An assessment must be specifically assigned to ELEMENTARY, SECONDARY, or BLP.")
        val_str = str(value).strip().upper()
        if val_str in ("JUNIOR", "JUNIOR_HIGH_SCHOOL", "SECONDARY"):
            return UserCategory.SECONDARY
        if val_str == "ELEMENTARY":
            return UserCategory.ELEMENTARY
        if val_str in ("BLP", "BASIC_LITERACY", "BASIC_LITERACY_PROGRAM"):
            return UserCategory.BLP
        raise ValueError(f"Invalid target category '{value}'. Allowed: ELEMENTARY, SECONDARY, BLP.")


class AssessmentDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    assessment_id: str
    teacher_id: str
    title: str
    description: Optional[str] = None
    subject_code: str
    target_category: Optional[UserCategory] = None
    assessment_type: TaskType
    status: TaskStatus
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    grace_period_minutes: int
    duration_minutes: Optional[int] = None
    max_score: float
    is_ai_generated: bool
    categories_data: List[dict] = Field(default_factory=list)
    materials: List[AssessmentMaterialRead] = Field(default_factory=list)
    questions: dict | None = None
    submissions_count: int = 0
    can_edit: bool = True
    lock_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None



class AssessmentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    subject: str
    type: TaskType
    targetCategory: Optional[UserCategory] = None
    deadline: Optional[str] = None
    submissions: int = 0
    needsGrading: int = 0
    status: TaskStatus
    maxScore: float = 100.0
    can_edit: bool = True
    lock_reason: Optional[str] = None




# ── Student Task Discovery & Delivery ─────────────────────────────────────────

class StudentTaskItem(BaseModel):
    assessment_id: str
    title: str
    description: Optional[str] = None
    subject_code: str
    assessment_type: TaskType
    status: TaskStatus = TaskStatus.ACTIVE
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    grace_period_minutes: int
    duration_minutes: Optional[int] = None
    max_score: float
    submission_status: Optional[SubmissionStatus] = None
    final_score: Optional[float] = None
    is_available: bool = True


class QuestionStudentView(BaseModel):
    id: str
    category_id: str
    category_type: str
    points_per_item: float
    text: Optional[str] = None
    options: Optional[List[str]] = None
    premise: Optional[str] = None
    match: Optional[str] = None
    matching_pool: Optional[List[str]] = None  # Shuffled Column B matches for selection
    image_url: Optional[str] = None


class StudentDeliveryPayload(BaseModel):
    assessment_id: str
    title: str
    description: Optional[str] = None
    assessment_type: TaskType
    duration_minutes: Optional[int] = None
    max_score: float
    submission_id: str
    started_at: datetime
    questions: List[QuestionStudentView] = Field(default_factory=list)
    materials: List[AssessmentMaterialRead] = Field(default_factory=list)


# ── Student Response & Submission ─────────────────────────────────────────────

class StudentAnswerItem(BaseModel):
    question_id: str
    student_answer: str


class SubmissionSubmitPayload(BaseModel):
    answers: Optional[List[StudentAnswerItem]] = None
    attachments: Optional[List[dict]] = None
    time_spent_seconds: int = 0


class ManualGradePayload(BaseModel):
    manual_score: float = Field(ge=0.0)
    feedback: Optional[str] = None


class SubmissionDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    submission_id: str
    assessment_id: str
    account_id: Optional[str] = None
    student_name: Optional[str] = None
    student_category: Optional[UserCategory] = None
    auto_score: float
    manual_score: float
    final_score: float
    feedback: Optional[str] = None
    is_late: bool
    status: SubmissionStatus
    started_at: datetime
    submitted_at: Optional[datetime] = None
    time_spent_seconds: int
    answers_payload: Optional[dict] = None
    attachments_payload: Optional[List[dict]] = None


class StudentActivityMetrics(BaseModel):
    submitted_count: int
    pending_count: int
    total_assigned: int


# ── Cohort Diagnostic & Struggling Topics Analysis ───────────────────────────
from app.features.assessments.analysis.schemas import (
    StudentCohortBreakdownSchema,
    StrugglingTopicSchema,
    RecommendedLessonSchema,
    CohortOverviewSchema,
    AssessmentCohortAnalysisResponse,
)


