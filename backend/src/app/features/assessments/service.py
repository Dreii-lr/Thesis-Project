"""
service.py — Business logic orchestrator for Assessments.
Implements question pool sampling, anti-cheating shuffling, and dual auto/manual grading.
Framework-agnostic domain service with no FastAPI dependencies.
"""
from __future__ import annotations

import copy
from datetime import datetime, timezone
import random
from typing import Any, List, Optional
from sqlalchemy.orm.attributes import flag_modified

import httpx
from app.core.constants import constants
from app.core.exceptions import (
    DomainEntityNotFoundException,
    DomainForbiddenDomainException,
    DomainValidationDomainException,
)
from app.core.unit_of_work import AbstractUnitOfWork
from app.features.assessments.models import (
    Assessment,
    AssessmentCohortAnalysis,
    AssessmentMaterial,
    AssessmentQuestions,
    AssessmentSubmission,
    SubmissionStatus,
    TaskStatus,
    TaskType,
)
from app.features.assessments.schemas import (
    AssessmentCreateSchema,
    AssessmentDetailResponse,
    AssessmentListItem,
    AssessmentMaterialInput,
    AssessmentMaterialRead,
    AssessmentUpdateSchema,
    ManualGradePayload,
    QuestionStudentView,
    StudentDeliveryPayload,
    StudentTaskItem,
    SubmissionDetailResponse,
    SubmissionSubmitPayload,
)
from app.features.users.models import UserCategory
from app.features.users.schemas import UserRead, UserRole
from app.shared.schema import AdditionalData, SuccessfulResponseSchema


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AssessmentService:
    def __init__(self, uow: AbstractUnitOfWork) -> None:
        self.uow = uow

    async def create_assessment(
        self,
        teacher_id: str,
        data: AssessmentCreateSchema,
    ) -> SuccessfulResponseSchema:
        # 1. Calculate max_score dynamically if not provided
        max_score = data.max_score
        categories_dicts = []
        total_pool = 0
        total_required = 0

        if data.categories_data:
            categories_dicts = [cat.model_dump() for cat in data.categories_data]
            total_pool = sum(len(c.questions) for c in data.categories_data)
            total_required = sum(c.required_count for c in data.categories_data)
            computed_score = sum(c.required_count * c.points_per_item for c in data.categories_data)
            if max_score is None:
                max_score = computed_score

        if max_score is None:
            max_score = 100.0

        # 2. Instantiate Assessment
        assessment = Assessment(
            teacher_id=teacher_id,
            title=data.title,
            description=data.description,
            subject_code=data.subject_code,
            target_category=data.target_category,
            assessment_type=data.assessment_type,
            status=data.status,
            start_date=data.start_date,
            end_date=data.end_date,
            grace_period_minutes=data.grace_period_minutes,
            duration_minutes=data.duration_minutes,
            max_score=max_score,
            is_ai_generated=data.is_ai_generated,
        )

        # 3. Instantiate Questions (if provided)
        questions_record = None
        if categories_dicts:
            questions_record = AssessmentQuestions(
                assessment_id=assessment.assessment_id,
                categories_data=categories_dicts,
                total_pool_items=total_pool,
                total_required_items=total_required,
            )

        # 4. Instantiate Materials (if provided)
        material_records = []
        if data.materials:
            for m in data.materials:
                material_records.append(
                    AssessmentMaterial(
                        assessment_id=assessment.assessment_id,
                        file_name=m.file_name,
                        file_url=m.file_url,
                        file_type=m.file_type,
                        file_size_bytes=m.file_size_bytes,
                    )
                )

        await self.uow.assessments.create_assessment(assessment, questions_record, material_records)
        await self.uow.commit()

        detail = await self._build_detail_response(assessment.assessment_id)
        return SuccessfulResponseSchema(
            message="Assessment created successfully.",
            message_status="SUCCESS_CREATED",
            data=AdditionalData(resources=detail.model_dump(mode="json")),
        )

    def _compute_lock_status(self, assessment: Assessment) -> tuple[bool, Optional[str]]:
        has_submissions = len(assessment.submissions) > 0 if assessment.submissions else False
        is_completed = assessment.status == TaskStatus.COMPLETED
        if not is_completed and assessment.end_date:
            grace_cutoff = assessment.end_date.timestamp() + (assessment.grace_period_minutes * 60)
            if utc_now().timestamp() > grace_cutoff:
                is_completed = True

        can_edit = not (is_completed or has_submissions)
        lock_reason = None
        if is_completed:
            lock_reason = "This assessment is completed and can no longer be edited."
        elif has_submissions:
            lock_reason = "Students are currently taking or have already submitted this assessment. Editing is locked."

        return can_edit, lock_reason

    async def update_assessment(
        self,
        assessment_id: str,
        teacher_id: str,
        data: AssessmentUpdateSchema,
    ) -> SuccessfulResponseSchema:
        assessment = await self.uow.assessments.get_assessment_by_id(assessment_id)
        if not assessment:
            raise DomainEntityNotFoundException("Assessment not found.")

        if assessment.teacher_id != teacher_id:
            raise DomainForbiddenDomainException("You are not authorized to update this assessment.")

        # Guard: check if assessment is completed or students are taking it
        can_edit, lock_reason = self._compute_lock_status(assessment)
        if not can_edit:
            # Check if this is an allowed status-only transition to COMPLETED (e.g. closing an assessment early)
            is_closing_to_completed = (
                data.status == TaskStatus.COMPLETED and
                data.title is None and
                data.description is None and
                data.subject_code is None and
                data.target_category is None and
                data.start_date is None and
                data.end_date is None and
                data.max_score is None and
                data.categories_data is None and
                data.duration_minutes is None
            )
            if not is_closing_to_completed:
                raise DomainValidationDomainException(
                    lock_reason or "This assessment is locked and cannot be edited."
                )

        # Update scalar fields if provided
        for field, val in data.model_dump(exclude_unset=True, exclude={"categories_data"}).items():
            setattr(assessment, field, val)


        # In-Place Questions & Categories update
        if data.categories_data is not None:
            categories_dicts = [cat.model_dump() for cat in data.categories_data]
            total_pool = sum(len(c.questions) for c in data.categories_data)
            total_required = sum(c.required_count for c in data.categories_data)
            assessment.max_score = sum(c.required_count * c.points_per_item for c in data.categories_data)

            questions_record = await self.uow.assessments.get_questions_by_assessment_id(assessment_id)
            if questions_record:
                questions_record.categories_data = categories_dicts
                questions_record.total_pool_items = total_pool
                questions_record.total_required_items = total_required
                questions_record.updated_at = utc_now()
            else:
                new_q = AssessmentQuestions(
                    assessment_id=assessment_id,
                    categories_data=categories_dicts,
                    total_pool_items=total_pool,
                    total_required_items=total_required,
                )
                await self.uow.assessments.create_assessment(assessment, new_q)

        assessment.updated_at = utc_now()
        await self.uow.commit()

        detail = await self._build_detail_response(assessment_id)
        return SuccessfulResponseSchema(
            message="Assessment updated successfully.",
            message_status="SUCCESS_UPDATED",
            data=AdditionalData(resources=detail.model_dump(mode="json")),
        )

    async def get_assessment_details(
        self,
        assessment_id: str,
    ) -> SuccessfulResponseSchema:
        detail = await self._build_detail_response(assessment_id)
        return SuccessfulResponseSchema(
            message="Assessment details retrieved successfully.",
            message_status="SUCCESS_FETCHED",
            data=AdditionalData(resources=detail.model_dump(mode="json")),
        )

    async def list_teacher_assessments(
        self,
        teacher_id: str,
        status: Optional[TaskStatus] = None,
        target_category: Optional[UserCategory] = None,
        offset: int = 0,
        limit: int = 50,
    ) -> SuccessfulResponseSchema:
        assessments = await self.uow.assessments.list_assessments_for_teacher(
            teacher_id=teacher_id,
            status=status,
            target_category=target_category,
            offset=offset,
            limit=limit,
        )
        # items = []
        # for a in assessments:
        #     # Format deadline string matching frontend expectations
        #     deadline_str = "No Deadline"
        #     if a.start_date and a.end_date:
        #         deadline_str = (
        #             f"{a.start_date.strftime('%b %d, %Y %I:%M %p')} to\n"
        #             f"{a.end_date.strftime('%b %d, %Y %I:%M %p')}"
        #         )
        #     elif a.end_date:
        #         deadline_str = f"{a.end_date.strftime('%b %d, %Y')}\n11:59 PM"
        #
        #     submissions_count = len(a.submissions) if a.submissions else 0
        #     needs_grading = sum(1 for s in (a.submissions or []) if s.status == SubmissionStatus.SUBMITTED)
        #
        #     items.append(
        #         AssessmentListItem(
        #             id=a.assessment_id,
        #             title=a.title,
        #             subject=a.subject_code,
        #             type=a.assessment_type,
        #             targetCategory=a.target_category,
        #             deadline=deadline_str,
        #             submissions=submissions_count,
        #             needsGrading=needs_grading,
        #             status=a.status,
        #             maxScore=a.max_score,
        #         )
        #     )
        details = []
        for a in assessments:
            cat_data = a.questions.categories_data if a.questions else []
            materials_read = [
                AssessmentMaterialRead.model_validate(m) for m in (a.materials or [])
            ]
            sub_count = len(a.submissions) if a.submissions else 0
            can_edit, lock_reason = self._compute_lock_status(a)
            details.append(
                AssessmentDetailResponse(
                    assessment_id=a.assessment_id,
                    teacher_id=a.teacher_id,
                    title=a.title,
                    description=a.description,
                    subject_code=a.subject_code,
                    target_category=a.target_category,
                    assessment_type=a.assessment_type,
                    status=a.status,
                    start_date=a.start_date,
                    end_date=a.end_date,
                    grace_period_minutes=a.grace_period_minutes,
                    duration_minutes=a.duration_minutes,
                    max_score=a.max_score,
                    is_ai_generated=a.is_ai_generated,
                    categories_data=cat_data,
                    materials=materials_read,
                    submissions_count=sub_count,
                    can_edit=can_edit,
                    lock_reason=lock_reason,
                    created_at=a.created_at,
                    updated_at=a.updated_at,
                ).model_dump(mode="json")
            )

        return SuccessfulResponseSchema(
            message="Assessments retrieved successfully.",
            message_status="SUCCESS_FETCHED",
            data=AdditionalData(resources=details),
        )

    async def list_student_tasks(
        self,
        student_user: UserRead,
    ) -> SuccessfulResponseSchema:
        category = student_user.user_category
        assessments = await self.uow.assessments.list_assessments_for_student(category)
        tasks = []
        now = utc_now()

        for a in assessments:
            submission = await self.uow.assessments.get_submission_by_student_and_assessment(
                a.assessment_id, student_user.user_id
            )
            sub_status = submission.status if submission else None
            final_sc = submission.final_score if submission else None

            # Check schedule window availability
            is_avail = True
            if a.start_date and now < a.start_date:
                is_avail = False
            if a.end_date and now > a.end_date:
                grace_cutoff = a.end_date.timestamp() + (a.grace_period_minutes * 60)
                if now.timestamp() > grace_cutoff:
                    is_avail = False

            tasks.append(
                StudentTaskItem(
                    assessment_id=a.assessment_id,
                    title=a.title,
                    description=a.description,
                    subject_code=a.subject_code,
                    assessment_type=a.assessment_type,
                    start_date=a.start_date,
                    end_date=a.end_date,
                    grace_period_minutes=a.grace_period_minutes,
                    duration_minutes=a.duration_minutes,
                    max_score=a.max_score,
                    submission_status=sub_status,
                    final_score=final_sc,
                    is_available=is_avail,
                )
            )

        return SuccessfulResponseSchema(
            message="Student tasks retrieved successfully.",
            message_status="SUCCESS_FETCHED",
            data=AdditionalData(resources=[t.model_dump(mode="json") for t in tasks]),
        )

    async def start_student_attempt(
        self,
        assessment_id: str,
        student_user: UserRead,
    ) -> SuccessfulResponseSchema:
        assessment = await self.uow.assessments.get_assessment_by_id(assessment_id)
        if not assessment:
            raise DomainEntityNotFoundException("Assessment not found.")

        if assessment.status != TaskStatus.ACTIVE:
            raise DomainValidationDomainException("This assessment is not currently active.")

        # Validate Category Targeting: assessment must strictly match learner's program
        if assessment.target_category != student_user.user_category:
            raise DomainForbiddenDomainException("This assessment is not assigned to your learner category.")

        # Check existing submission
        existing = await self.uow.assessments.get_submission_by_student_and_assessment(
            assessment_id, student_user.user_id
        )
        if existing and existing.status in (SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED):
            raise DomainValidationDomainException("You have already submitted this assessment.")

        # If already in progress, reuse the frozen delivered question snapshot
        if existing and existing.answers_payload and "delivered_questions" in existing.answers_payload:
            raw_delivered = existing.answers_payload["delivered_questions"]
            questions_view = [QuestionStudentView(**q) for q in raw_delivered]
            materials_view = [AssessmentMaterialRead.model_validate(m) for m in assessment.materials]
            delivery = StudentDeliveryPayload(
                assessment_id=assessment.assessment_id,
                title=assessment.title,
                description=assessment.description,
                assessment_type=assessment.assessment_type,
                duration_minutes=assessment.duration_minutes,
                max_score=assessment.max_score,
                submission_id=existing.submission_id,
                started_at=existing.started_at,
                questions=questions_view,
                materials=materials_view,
            )
            return SuccessfulResponseSchema(
                message="Assessment session resumed successfully.",
                message_status="SUCCESS_RESUMED",
                data=AdditionalData(resources=delivery.model_dump(mode="json")),
            )

        # Build delivery payload by sampling required questions from pool
        questions_record = await self.uow.assessments.get_questions_by_assessment_id(assessment_id)
        delivered_questions: List[dict] = []

        if questions_record and questions_record.categories_data:
            for cat in questions_record.categories_data:
                c_id = cat.get("category_id", "")
                c_type = cat.get("type", "Multiple Choice")
                points = float(cat.get("points_per_item", 1.0))
                required = int(cat.get("required_count", 1))
                all_questions = cat.get("questions", [])

                # Random sample required questions from pool
                sampled = (
                    random.sample(all_questions, min(required, len(all_questions)))
                    if all_questions
                    else []
                )

                # Gather matching pool targets for Matching Type (Column B)
                matching_pool = []
                if c_type == "Matching Type":
                    matches = [q.get("match", "") for q in sampled if q.get("match")]
                    max_delivery_distractors = len(sampled) // 5
                    extra_distractors = [d for d in cat.get("distractors", []) if d][:max_delivery_distractors]
                    combined = list(dict.fromkeys(matches + extra_distractors))
                    random.shuffle(combined)
                    matching_pool = combined

                for q in sampled:
                    # Shuffle options for Multiple Choice
                    options_copy = None
                    if q.get("options"):
                        options_copy = list(q["options"])
                        random.shuffle(options_copy)

                    # Create student view: STRIP correct_answer!
                    item_dict = {
                        "id": q.get("id"),
                        "category_id": c_id,
                        "category_type": c_type,
                        "points_per_item": points,
                        "text": q.get("text"),
                        "options": options_copy,
                        "premise": None if str(c_type).lower() == "essay" else q.get("premise"),
                        "match": None,  # Hide match answer!
                        "matching_pool": matching_pool if c_type == "Matching Type" else None,
                    }
                    delivered_questions.append(item_dict)

        # Initialize Submission record
        submission = AssessmentSubmission(
            assessment_id=assessment_id,
            student_id=student_user.user_id,
            student_category=student_user.user_category,
            answers_payload={"delivered_questions": delivered_questions, "answers": []},
            status=SubmissionStatus.IN_PROGRESS,
            started_at=utc_now(),
        )
        await self.uow.assessments.create_submission(submission)
        await self.uow.commit()

        questions_view = [QuestionStudentView(**q) for q in delivered_questions]
        materials_view = [AssessmentMaterialRead.model_validate(m) for m in assessment.materials]

        delivery = StudentDeliveryPayload(
            assessment_id=assessment.assessment_id,
            title=assessment.title,
            description=assessment.description,
            assessment_type=assessment.assessment_type,
            duration_minutes=assessment.duration_minutes,
            max_score=assessment.max_score,
            submission_id=submission.submission_id,
            started_at=submission.started_at,
            questions=questions_view,
            materials=materials_view,
        )
        return SuccessfulResponseSchema(
            message="Assessment session started successfully.",
            message_status="SUCCESS_STARTED",
            data=AdditionalData(resources=delivery.model_dump(mode="json")),
        )

    async def submit_student_attempt(
        self,
        assessment_id: str,
        student_user: UserRead,
        payload: SubmissionSubmitPayload,
    ) -> SuccessfulResponseSchema:
        assessment = await self.uow.assessments.get_assessment_by_id(assessment_id)
        if not assessment:
            raise DomainEntityNotFoundException("Assessment not found.")

        submission = await self.uow.assessments.get_submission_by_student_and_assessment(
            assessment_id, student_user.user_id
        )
        now = utc_now()

        # For activities, allow initial direct submission without pre-started attempt
        if not submission:
            submission = AssessmentSubmission(
                assessment_id=assessment_id,
                student_id=student_user.user_id,
                student_category=student_user.user_category,
                started_at=now,
            )
            await self.uow.assessments.create_submission(submission)

        if submission.status in (SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED):
            raise DomainValidationDomainException("This attempt has already been submitted.")

        # Check if late
        is_late = False
        if assessment.end_date and now > assessment.end_date:
            is_late = True

        submission.submitted_at = now
        submission.time_spent_seconds = payload.time_spent_seconds
        submission.is_late = is_late

        # ── EVALUATION & GRADING ──────────────────────────────────────────
        if assessment.assessment_type == TaskType.ACTIVITY:
            # Subjective Activity: Store attachments and route to teacher queue
            submission.attachments_payload = list(payload.attachments or [])
            flag_modified(submission, "attachments_payload")
            submission.status = SubmissionStatus.SUBMITTED
        else:
            # Objective Quiz or Exam: Auto-Grading Engine
            questions_record = await self.uow.assessments.get_questions_by_assessment_id(assessment_id)
            answer_key_map = {}
            points_map = {}
            question_text_map = {}
            guidelines_map = {}
            essay_qids = set()

            if questions_record and questions_record.categories_data:
                for cat in questions_record.categories_data:
                    c_type = cat.get("type", "Multiple Choice")
                    pts = float(cat.get("points_per_item", 1.0))
                    for q in cat.get("questions", []):
                        qid = q.get("id")
                        question_text_map[qid] = q.get("text", "")
                        guidelines_map[qid] = q.get("premise", "")
                        if str(c_type).lower() == "essay":
                            essay_qids.add(qid)
                        elif c_type == "Matching Type":
                            answer_key_map[qid] = q.get("match", "")
                        else:
                            answer_key_map[qid] = q.get("correct_answer", "")
                        points_map[qid] = pts

            # Grade student answers
            graded_answers = []
            total_earned = 0.0

            for item in payload.answers or []:
                qid = item.question_id
                ans = item.student_answer.strip() if item.student_answer else ""

                if qid in essay_qids:
                    # Subjective Essay answer: requires teacher evaluation
                    graded_answers.append(
                        {
                            "question_id": qid,
                            "question_text": question_text_map.get(qid, ""),
                            "guidelines": guidelines_map.get(qid, ""),
                            "student_answer": ans,
                            "is_correct": None,
                            "points_awarded": 0.0,
                            "max_points": points_map.get(qid, 1.0),
                            "type": "Essay",
                            "needs_teacher_review": True,
                        }
                    )
                else:
                    # Objective auto-grading (Multiple Choice, True/False, Matching Type)
                    expected = str(answer_key_map.get(qid, "")).strip()
                    is_correct = False
                    points_awarded = 0.0

                    if expected and ans.lower() == expected.lower():
                        is_correct = True
                        points_awarded = points_map.get(qid, 1.0)
                        total_earned += points_awarded

                    graded_answers.append(
                        {
                            "question_id": qid,
                            "question_text": question_text_map.get(qid, ""),
                            "student_answer": ans,
                            "is_correct": is_correct,
                            "points_awarded": points_awarded,
                            "max_points": points_map.get(qid, 1.0),
                            "type": "Objective",
                        }
                    )

            # Persist evaluated answers
            current_payload = dict(submission.answers_payload or {})
            current_payload["answers"] = graded_answers
            submission.answers_payload = current_payload
            flag_modified(submission, "answers_payload")
            submission.auto_score = total_earned

            # If the assessment includes essay questions, route to teacher grading queue
            if essay_qids:
                submission.status = SubmissionStatus.SUBMITTED
                submission.manual_score = 0.0
                submission.final_score = total_earned  # Provisional objective score
            else:
                submission.status = SubmissionStatus.GRADED
                submission.final_score = total_earned

        await self.uow.commit()

        result = SubmissionDetailResponse(
            submission_id=submission.submission_id,
            assessment_id=submission.assessment_id,
            student_id=submission.student_id,
            student_category=submission.student_category,
            auto_score=submission.auto_score,
            manual_score=submission.manual_score,
            final_score=submission.final_score,
            feedback=submission.feedback,
            is_late=submission.is_late,
            status=submission.status,
            started_at=submission.started_at,
            submitted_at=submission.submitted_at,
            time_spent_seconds=submission.time_spent_seconds,
            answers_payload=submission.answers_payload,
            attachments_payload=submission.attachments_payload,
        )
        return SuccessfulResponseSchema(
            message="Assessment submitted successfully.",
            message_status="SUCCESS_SUBMITTED",
            data=AdditionalData(resources=result.model_dump(mode="json")),
        )

    async def grade_submission(
        self,
        assessment_id: str,
        submission_id: str,
        teacher_id: str,
        grade_data: ManualGradePayload,
    ) -> SuccessfulResponseSchema:
        assessment = await self.uow.assessments.get_assessment_by_id(assessment_id)
        if not assessment:
            raise DomainEntityNotFoundException("Assessment not found.")

        submission = await self.uow.assessments.get_submission_by_id(submission_id)
        if not submission or submission.assessment_id != assessment_id:
            raise DomainEntityNotFoundException("Submission not found for this assessment.")

        submission.manual_score = grade_data.manual_score
        if assessment.assessment_type in (TaskType.QUIZ, TaskType.EXAM):
            submission.final_score = submission.auto_score + grade_data.manual_score
        else:
            submission.final_score = grade_data.manual_score
        submission.feedback = grade_data.feedback
        submission.status = SubmissionStatus.GRADED
        submission.updated_at = utc_now()

        await self.uow.commit()

        result = SubmissionDetailResponse(
            submission_id=submission.submission_id,
            assessment_id=submission.assessment_id,
            student_id=submission.student_id,
            student_category=submission.student_category,
            auto_score=submission.auto_score,
            manual_score=submission.manual_score,
            final_score=submission.final_score,
            feedback=submission.feedback,
            is_late=submission.is_late,
            status=submission.status,
            started_at=submission.started_at,
            submitted_at=submission.submitted_at,
            time_spent_seconds=submission.time_spent_seconds,
            answers_payload=submission.answers_payload,
            attachments_payload=submission.attachments_payload,
        )
        return SuccessfulResponseSchema(
            message="Submission graded successfully.",
            message_status="SUCCESS_GRADED",
            data=AdditionalData(resources=result.model_dump(mode="json")),
        )

    async def list_assessment_submissions(
        self,
        assessment_id: str,
    ) -> SuccessfulResponseSchema:
        submissions = await self.uow.assessments.list_submissions_for_assessment(assessment_id)
        results = []
        for s in submissions:
            student = await self.uow.users.get_by_id(s.student_id)
            student_name = f"{student.first_name} {student.last_name}" if student else None
            results.append(
                SubmissionDetailResponse(
                    submission_id=s.submission_id,
                    assessment_id=s.assessment_id,
                    student_id=s.student_id,
                    student_name=student_name,
                    student_category=s.student_category,
                    auto_score=s.auto_score,
                    manual_score=s.manual_score,
                    final_score=s.final_score,
                    feedback=s.feedback,
                    is_late=s.is_late,
                    status=s.status,
                    started_at=s.started_at,
                    submitted_at=s.submitted_at,
                    time_spent_seconds=s.time_spent_seconds,
                    answers_payload=s.answers_payload,
                    attachments_payload=s.attachments_payload,
                )
            )
        return SuccessfulResponseSchema(
            message="Submissions retrieved successfully.",
            message_status="SUCCESS_FETCHED",
            data=AdditionalData(resources=[r.model_dump(mode="json") for r in results]),
        )

    async def get_assessment_submission_details(
        self,
        assessment_id: str,
        submission_id: str,
    ) -> SuccessfulResponseSchema:
        submission = await self.uow.assessments.get_submission_by_id(submission_id)
        if not submission or submission.assessment_id != assessment_id:
            raise DomainEntityNotFoundException("Submission not found for this assessment.")

        student = await self.uow.users.get_by_id(submission.student_id)
        student_name = f"{student.first_name} {student.last_name}" if student else None

        result = SubmissionDetailResponse(
            submission_id=submission.submission_id,
            assessment_id=submission.assessment_id,
            student_id=submission.student_id,
            student_name=student_name,
            student_category=submission.student_category,
            auto_score=submission.auto_score,
            manual_score=submission.manual_score,
            final_score=submission.final_score,
            feedback=submission.feedback,
            is_late=submission.is_late,
            status=submission.status,
            started_at=submission.started_at,
            submitted_at=submission.submitted_at,
            time_spent_seconds=submission.time_spent_seconds,
            answers_payload=submission.answers_payload,
            attachments_payload=submission.attachments_payload,
        )
        return SuccessfulResponseSchema(
            message="Submission details retrieved successfully.",
            message_status="SUCCESS_FETCHED",
            data=AdditionalData(resources=result.model_dump(mode="json")),
        )

    async def get_student_submission_result(
        self,
        assessment_id: str,
        student_id: str,
    ) -> SuccessfulResponseSchema:
        s = await self.uow.assessments.get_submission_by_student_and_assessment(
            assessment_id, student_id
        )
        if not s:
            return SuccessfulResponseSchema(
                message="No submission found.",
                message_status="NOT_FOUND",
                data=AdditionalData(resources=None),
            )

        student = await self.uow.users.get_by_id(s.student_id)
        student_name = f"{student.first_name} {student.last_name}" if student else None

        result = SubmissionDetailResponse(
            submission_id=s.submission_id,
            assessment_id=s.assessment_id,
            student_id=s.student_id,
            student_name=student_name,
            student_category=s.student_category,
            auto_score=s.auto_score,
            manual_score=s.manual_score,
            final_score=s.final_score,
            feedback=s.feedback,
            is_late=s.is_late,
            status=s.status,
            started_at=s.started_at,
            submitted_at=s.submitted_at,
            time_spent_seconds=s.time_spent_seconds,
            answers_payload=s.answers_payload,
            attachments_payload=s.attachments_payload,
        )
        return SuccessfulResponseSchema(
            message="Result retrieved successfully.",
            message_status="SUCCESS_FETCHED",
            data=AdditionalData(resources=result.model_dump(mode="json")),
        )

    async def get_student_activity_metrics(
        self,
        student_user: UserRead,
    ) -> SuccessfulResponseSchema:
        metrics = await self.uow.assessments.get_student_activity_metrics(
            student_id=student_user.user_id,
            student_category=student_user.user_category,
        )
        return SuccessfulResponseSchema(
            message="Student activity metrics retrieved successfully.",
            message_status="SUCCESS_FETCHED",
            data=AdditionalData(resources=metrics),
        )

    async def _build_detail_response(
        self,
        assessment_id: str,
    ) -> AssessmentDetailResponse:
        assessment = await self.uow.assessments.get_assessment_by_id(assessment_id)
        if not assessment:
            raise DomainEntityNotFoundException("Assessment not found.")

        questions_record = await self.uow.assessments.get_questions_by_assessment_id(assessment_id)
        cat_data = questions_record.categories_data if questions_record else []
        materials_read = [
            AssessmentMaterialRead.model_validate(m) for m in (assessment.materials or [])
        ]
        sub_count = len(assessment.submissions) if assessment.submissions else 0
        can_edit, lock_reason = self._compute_lock_status(assessment)

        return AssessmentDetailResponse(
            assessment_id=assessment.assessment_id,
            teacher_id=assessment.teacher_id,
            title=assessment.title,
            description=assessment.description,
            subject_code=assessment.subject_code,
            target_category=assessment.target_category,
            assessment_type=assessment.assessment_type,
            status=assessment.status,
            start_date=assessment.start_date,
            end_date=assessment.end_date,
            grace_period_minutes=assessment.grace_period_minutes,
            duration_minutes=assessment.duration_minutes,
            max_score=assessment.max_score,
            is_ai_generated=assessment.is_ai_generated,
            categories_data=cat_data,
            materials=materials_read,
            submissions_count=sub_count,
            can_edit=can_edit,
            lock_reason=lock_reason,
            created_at=assessment.created_at,
            updated_at=assessment.updated_at,
        )

    async def generate_cohort_struggle_analysis(
        self,
        assessment_id: str,
        user_category: str,
        current_user: UserRead,
    ) -> SuccessfulResponseSchema:
        """Executes the 4-step cohort struggle analysis pipeline:
        1. Query user_categories table in DB (case-insensitive) to validate requested category.
        2. Query assessments table in DB to validate assessment and ensure status is COMPLETED.
        3. Query assessment_submissions table in DB filtered strictly for that category.
        4. Feed aggregated data to document-processing-ms via HTTP API, build student breakdowns,
           cache the result, and return diagnostic response.
        """
        # Step 1: Query category from database (handling case sensitivity)
        category_record = await self.uow.user_categories.get_by_code_or_name(user_category)
        if not category_record:
            raise DomainEntityNotFoundException(
                f"User category '{user_category}' is invalid or not found in the database."
            )

        # Resolve canonical UserCategory enum if applicable
        target_category_enum: Optional[UserCategory] = None
        for member in UserCategory:
            if member.value.upper() in (category_record.code.upper(), category_record.name.upper()):
                target_category_enum = member
                break

        # Step 2: Query assessment from database
        assessment = await self.uow.assessments.get_assessment_by_id(assessment_id)
        if not assessment:
            raise DomainEntityNotFoundException(f"Assessment with ID '{assessment_id}' not found.")

        # Verify teacher authorization
        if current_user.role != UserRole.ADMIN and assessment.teacher_id != current_user.user_id:
            raise DomainForbiddenDomainException("You are not authorized to analyze this assessment.")

        # Strict assessment status guard: Analysis is only permissible when assessment is COMPLETED.
        is_completed = assessment.status == TaskStatus.COMPLETED
        if not is_completed and assessment.end_date:
            grace_cutoff = assessment.end_date.timestamp() + (assessment.grace_period_minutes * 60)
            if utc_now().timestamp() > grace_cutoff:
                is_completed = True
                assessment.status = TaskStatus.COMPLETED
                assessment.updated_at = utc_now()
                await self.uow.commit()

        if not is_completed:
            raise DomainValidationDomainException(
                f"Cannot generate cohort analysis. Assessment status is '{assessment.status.value}'. "
                "Cohort struggle analysis can only be generated once the quiz or exam status is COMPLETED."
            )

        questions_record = await self.uow.assessments.get_questions_by_assessment_id(assessment_id)
        if not questions_record or not questions_record.categories_data:
            raise DomainValidationDomainException("No questions configured for this assessment.")

        # Step 3: Query assessment submissions strictly for this category from the database
        submissions = await self.uow.assessments.list_submissions_for_assessment(
            assessment_id=assessment_id,
            category=target_category_enum or category_record.code,
        )
        completed_subs = [
            s for s in submissions
            if s.status in (SubmissionStatus.GRADED, SubmissionStatus.SUBMITTED)
        ]

        if not completed_subs:
            raise DomainValidationDomainException(
                f"No completed student submissions found for category '{category_record.name}'. "
                "Students in this category must submit their quiz before cohort analysis can be generated."
            )

        # Step 4: Feed data to document-processor microservice and generate actual analysis
        total_submissions = len(completed_subs)
        scores = [s.final_score for s in completed_subs]
        class_average = sum(scores) / total_submissions if total_submissions > 0 else 0.0

        passing_threshold = assessment.max_score * 0.5
        passed_count = sum(1 for sc in scores if sc >= passing_threshold)
        passing_rate = (passed_count / total_submissions * 100.0) if total_submissions > 0 else 0.0

        # Preload student names and track incorrect questions per student
        student_name_map: dict[str, str] = {}
        student_wrong_questions_map: dict[str, set[str]] = {}

        for sub in completed_subs:
            student = await self.uow.users.get_by_id(sub.student_id)
            if student:
                name = f"{student.first_name or ''} {student.last_name or ''}".strip()
                student_name_map[sub.student_id] = name if name else sub.student_id
            else:
                student_name_map[sub.student_id] = sub.student_id

            wrong_qids: set[str] = set()
            answers_list = (sub.answers_payload or {}).get("answers", [])
            for ans in answers_list:
                if ans.get("is_correct") is False:
                    qid = ans.get("question_id")
                    if qid:
                        wrong_qids.add(qid)
            student_wrong_questions_map[sub.student_id] = wrong_qids

        # Build map of questions
        question_stats_map = {}
        for cat in questions_record.categories_data:
            c_type = cat.get("type", "Multiple Choice")
            for q in cat.get("questions", []):
                qid = q.get("id")
                prompt_text = q.get("text") or q.get("premise") or ""
                correct_val = q.get("correct_answer") or q.get("match") or ""
                opts = list(q.get("options") or [])
                if c_type == "Matching Type" and not opts:
                    opts = list(cat.get("distractors") or [])
                question_stats_map[qid] = {
                    "question_id": qid,
                    "category_type": c_type,
                    "prompt": prompt_text,
                    "options": opts if opts else None,
                    "correct_answer": correct_val,
                    "total_attempts": 0,
                    "correct_count": 0,
                    "incorrect_count": 0,
                    "answer_distribution": {},
                }

        # Tally answers from student submissions
        for sub in completed_subs:
            answers_list = (sub.answers_payload or {}).get("answers", [])
            for ans in answers_list:
                qid = ans.get("question_id")
                if qid in question_stats_map:
                    q_stat = question_stats_map[qid]
                    q_stat["total_attempts"] += 1
                    is_corr = ans.get("is_correct")
                    if is_corr is True:
                        q_stat["correct_count"] += 1
                    elif is_corr is False:
                        q_stat["incorrect_count"] += 1

                    student_ans = str(ans.get("student_answer") or "").strip()
                    if student_ans:
                        dist = q_stat["answer_distribution"]
                        dist[student_ans] = dist.get(student_ans, 0) + 1

        # Calculate error rates
        question_statistics = []
        for q_stat in question_stats_map.values():
            attempts = q_stat["total_attempts"]
            inc = q_stat["incorrect_count"]
            err_rate = (inc / attempts * 100.0) if attempts > 0 else 0.0
            q_stat["error_rate_percent"] = round(err_rate, 2)
            question_statistics.append(q_stat)

        # Build payload for document-processing-ms
        docs_ms_payload = {
            "assessment_id": assessment.assessment_id,
            "assessment_title": assessment.title,
            "subject_code": assessment.subject_code,
            "als_program": category_record.code,
            "target_category": category_record.code,
            "max_score": assessment.max_score,
            "total_submissions": total_submissions,
            "class_average_score": round(class_average, 2),
            "passing_rate_percent": round(passing_rate, 2),
            "question_statistics": question_statistics,
        }

        # Request analysis from document-processing-ms via HTTP API
        base_ms_url = constants.DOCS_PROCESSING_SERVICE_URL.rstrip("/")
        target_endpoint = f"{base_ms_url}/api/v2/quiz-analysis/cohort-struggles"

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(target_endpoint, json=docs_ms_payload)
                if res.status_code != 200:
                    raise DomainValidationDomainException(
                        f"Document processing microservice returned status {res.status_code}: {res.text}"
                    )
                analysis_data = res.json()
        except httpx.RequestError as exc:
            raise DomainValidationDomainException(
                f"Could not connect to document processing microservice at {target_endpoint}: {str(exc)}"
            )

        # Associate struggling students with diagnosed topics
        struggling_topics = analysis_data.get("struggling_topics", [])
        for topic in struggling_topics:
            aff_qids = set(topic.get("affected_question_ids", []))
            struggling_student_names = []
            for sub in completed_subs:
                s_wrong = student_wrong_questions_map.get(sub.student_id, set())
                if aff_qids.intersection(s_wrong):
                    s_name = student_name_map.get(sub.student_id, sub.student_id)
                    struggling_student_names.append(s_name)
            topic["struggling_students"] = struggling_student_names

        # Build per-student performance and struggle breakdown
        student_breakdowns = []
        for sub in completed_subs:
            s_wrong = student_wrong_questions_map.get(sub.student_id, set())
            personal_topics = []
            for topic in struggling_topics:
                aff_qids = set(topic.get("affected_question_ids", []))
                if aff_qids.intersection(s_wrong):
                    personal_topics.append(topic.get("topic_name"))

            score = float(sub.final_score)
            max_sc = float(assessment.max_score)
            pct = round((score / max_sc * 100.0), 2) if max_sc > 0 else 0.0
            passed = score >= passing_threshold

            student_breakdowns.append({
                "student_id": sub.student_id,
                "student_name": student_name_map.get(sub.student_id, sub.student_id),
                "score": score,
                "max_score": max_sc,
                "percentage": pct,
                "passed": passed,
                "personal_struggling_topics": personal_topics,
            })

        analysis_data["student_breakdowns"] = student_breakdowns

        # Guard: Check if matching curriculum topics were found by document-processing-ms
        is_topic_found = bool(analysis_data.get("topic_found", True)) and analysis_data.get("status") != "NO_TOPIC_FOUND"

        if not is_topic_found:
            # DO NOT insert or cache into database when no matching curriculum topics were found.
            msg = analysis_data.get("message") or "No matching curriculum topic found in the uploaded materials for this assessment."
            return SuccessfulResponseSchema(
                message=msg,
                message_status="NO_TOPIC_FOUND",
                status_code=200,
                data=AdditionalData(resources=analysis_data),
            )

        # Persist / Cache analysis record ONLY when matching curriculum topics are found
        now = utc_now()
        analysis_record = AssessmentCohortAnalysis(
            assessment_id=assessment.assessment_id,
            total_submissions=total_submissions,
            class_average=round(class_average, 2),
            passing_rate=round(passing_rate, 2),
            analysis_payload=analysis_data,
            created_at=now,
            updated_at=now,
        )
        saved = await self.uow.assessments.save_cohort_analysis(analysis_record)
        await self.uow.commit()

        analysis_data["created_at"] = saved.created_at.isoformat() if saved.created_at else None
        analysis_data["updated_at"] = saved.updated_at.isoformat() if saved.updated_at else None

        return SuccessfulResponseSchema(
            message="Cohort struggle analysis generated successfully.",
            message_status="SUCCESS_GENERATED",
            status_code=200,
            data=AdditionalData(resources=analysis_data),
        )


    async def get_cohort_struggle_analysis(
        self,
        assessment_id: str,
        current_user: UserRead,
        user_category: Optional[str] = None,
    ) -> SuccessfulResponseSchema:
        """Retrieves previously generated and cached cohort struggle analysis."""
        assessment = await self.uow.assessments.get_assessment_by_id(assessment_id)
        if not assessment:
            raise DomainEntityNotFoundException("Assessment not found.")

        if current_user.role != UserRole.ADMIN and assessment.teacher_id != current_user.user_id:
            raise DomainForbiddenDomainException("You are not authorized to view analysis for this assessment.")

        record = await self.uow.assessments.get_cohort_analysis(assessment_id)
        if not record:
            raise DomainEntityNotFoundException(
                "No cohort struggle analysis has been generated for this assessment yet. "
                "Please click generate to run the analysis."
            )

        data = dict(record.analysis_payload or {})
        data["created_at"] = record.created_at.isoformat() if record.created_at else None
        data["updated_at"] = record.updated_at.isoformat() if record.updated_at else None

        if not data.get("topic_found", True):
            return SuccessfulResponseSchema(
                message=data.get("message") or "No matching curriculum topic found in the uploaded materials for this assessment.",
                message_status="NO_TOPIC_FOUND",
                data=AdditionalData(resources=data),
            )

        return SuccessfulResponseSchema(
            message="Cohort struggle analysis retrieved successfully.",
            message_status="SUCCESS_FETCHED",
            data=AdditionalData(resources=data),
        )


