"""
repository.py — Data access layer for Assessments, Question Banks, and Submissions.
"""
from __future__ import annotations

from typing import List, Optional
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.assessments.models import (
    Assessment,
    AssessmentCohortAnalysis,
    AssessmentMaterial,
    AssessmentQuestions,
    AssessmentSubmission,
    SubmissionStatus,
    TaskStatus,
    TaskType,
    utc_now,
)
from app.features.assessments.schemas import AssessmentDetailResponse
from app.features.users.models import UserCategory


class AssessmentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_assessment(
        self,
        assessment: Assessment,
        questions: Optional[AssessmentQuestions] = None,
        materials: Optional[List[AssessmentMaterial]] = None,
    ) -> Assessment:
        self._session.add(assessment)
        if questions:
            self._session.add(questions)
        if materials:
            self._session.add_all(materials)
        return assessment

    async def get_assessment_by_id(self, assessment_id: str) -> Optional[Assessment]:
        stmt = (
            select(Assessment)
            .where(Assessment.assessment_id == assessment_id)
            .options(
                selectinload(Assessment.questions),
                selectinload(Assessment.materials),
                selectinload(Assessment.submissions),
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_questions_by_assessment_id(self, assessment_id: str) -> Optional[AssessmentQuestions]:
        stmt = select(AssessmentQuestions).where(AssessmentQuestions.assessment_id == assessment_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_assessments_for_teacher(
        self,
        teacher_id: str,
        status: Optional[TaskStatus] = None,
        target_category: Optional[UserCategory] = None,
        offset: int = 0,
        limit: int = 50,
    ) -> List[Assessment]:
        stmt = (
            select(Assessment)
            .where(Assessment.teacher_id == teacher_id)
            .options(
                selectinload(Assessment.questions),
                selectinload(Assessment.submissions),
                selectinload(Assessment.materials),
            )
        )
        if status:
            stmt = stmt.where(Assessment.status == status)
        if target_category:
            stmt = stmt.where(Assessment.target_category == target_category)

        stmt = stmt.order_by(Assessment.created_at.desc()).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        data = list(result.scalars().all())
        return data

    async def list_assessments_for_student(
        self,
        student_category: Optional[UserCategory],
    ) -> List[Assessment]:
        """
        Retrieves active or scheduled assessments targeted strictly to the student's specific ALS category.
        Universal assignment (target_category IS NULL) is excluded.
        """
        if not student_category:
            return []

        conditions = [
            Assessment.status.in_([TaskStatus.ACTIVE, TaskStatus.SCHEDULED]),
            Assessment.target_category == student_category,
        ]
        stmt = (
            select(Assessment)
            .where(*conditions)
            .options(
                selectinload(Assessment.materials),
                selectinload(Assessment.submissions),
            )
            .order_by(Assessment.end_date.asc().nulls_last())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_submission_by_id(self, submission_id: str) -> Optional[AssessmentSubmission]:
        stmt = select(AssessmentSubmission).where(AssessmentSubmission.submission_id == submission_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_submission_by_student_and_assessment(
        self,
        assessment_id: str,
        student_id: str,
    ) -> Optional[AssessmentSubmission]:
        stmt = select(AssessmentSubmission).where(
            AssessmentSubmission.assessment_id == assessment_id,
            AssessmentSubmission.student_id == student_id,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_submissions_for_assessment(
        self,
        assessment_id: str,
        category: Optional[UserCategory | str] = None,
    ) -> List[AssessmentSubmission]:
        stmt = select(AssessmentSubmission).where(
            AssessmentSubmission.assessment_id == assessment_id
        )
        if category is not None:
            cat_val = category.value if hasattr(category, "value") else str(category)
            stmt = stmt.where(
                or_(
                    AssessmentSubmission.student_category == category,
                    AssessmentSubmission.student_category == cat_val,
                )
            )
        stmt = stmt.order_by(AssessmentSubmission.created_at.desc())
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


    async def create_submission(self, submission: AssessmentSubmission) -> AssessmentSubmission:
        self._session.add(submission)
        return submission

    async def count_needs_grading(self, assessment_id: str) -> int:
        stmt = (
            select(func.count(AssessmentSubmission.submission_id))
            .where(
                AssessmentSubmission.assessment_id == assessment_id,
                AssessmentSubmission.status == SubmissionStatus.SUBMITTED,
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar() or 0

    async def get_student_activity_metrics(
        self,
        student_id: str,
        student_category: Optional[UserCategory],
    ) -> dict:
        if not student_category:
            return {"submitted_count": 0, "pending_count": 0, "total_assigned": 0}

        # 1. Active or scheduled activities assigned to student's category
        stmt_assigned = select(Assessment.assessment_id).where(
            Assessment.status.in_([TaskStatus.ACTIVE, TaskStatus.SCHEDULED]),
            Assessment.target_category == student_category,
            Assessment.assessment_type == TaskType.ACTIVITY,
        )
        res_assigned = await self._session.execute(stmt_assigned)
        assigned_ids = list(res_assigned.scalars().all())
        total_assigned = len(assigned_ids)

        # 2. Total activities submitted by this student (all-time)
        stmt_submitted = (
            select(func.count(AssessmentSubmission.submission_id))
            .join(Assessment, AssessmentSubmission.assessment_id == Assessment.assessment_id)
            .where(
                AssessmentSubmission.student_id == student_id,
                Assessment.assessment_type == TaskType.ACTIVITY,
                AssessmentSubmission.status.in_([SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED]),
            )
        )
        res_submitted = await self._session.execute(stmt_submitted)
        submitted_count = res_submitted.scalar() or 0

        # 3. Pending activities (currently active/scheduled assigned activities not yet submitted)
        if assigned_ids:
            stmt_active_sub = select(func.count(AssessmentSubmission.submission_id)).where(
                AssessmentSubmission.student_id == student_id,
                AssessmentSubmission.assessment_id.in_(assigned_ids),
                AssessmentSubmission.status.in_([SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED]),
            )
            res_active_sub = await self._session.execute(stmt_active_sub)
            active_submitted_count = res_active_sub.scalar() or 0
            pending_count = max(0, total_assigned - active_submitted_count)
        else:
            pending_count = 0

        return {
            "submitted_count": submitted_count,
            "pending_count": pending_count,
            "total_assigned": total_assigned,
        }

    async def get_cohort_analysis(
        self,
        assessment_id: str,
    ) -> Optional[AssessmentCohortAnalysis]:
        stmt = select(AssessmentCohortAnalysis).where(
            AssessmentCohortAnalysis.assessment_id == assessment_id
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def save_cohort_analysis(
        self,
        analysis: AssessmentCohortAnalysis,
    ) -> AssessmentCohortAnalysis:
        existing = await self.get_cohort_analysis(analysis.assessment_id)
        if existing:
            existing.total_submissions = analysis.total_submissions
            existing.class_average = analysis.class_average
            existing.passing_rate = analysis.passing_rate
            existing.analysis_payload = analysis.analysis_payload
            existing.updated_at = analysis.updated_at or utc_now()
            return existing
        else:
            self._session.add(analysis)
            return analysis

