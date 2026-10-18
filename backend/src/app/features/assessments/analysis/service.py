"""
service.py — Cohort struggle and diagnostic analysis service.
Orchestrates teacher diagnostic evaluation across completed assessments,
strictly verifies string IDs, and interfaces with document-processing-ms for RAG curriculum recommendations.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
import httpx

from app.core.constants import constants
from app.core.exceptions import (
    DomainEntityNotFoundException,
    DomainForbiddenDomainException,
    DomainValidationDomainException,
)
from app.core.unit_of_work import AbstractUnitOfWork
from app.features.assessments.models import (
    AssessmentCohortAnalysis,
    SubmissionStatus,
    TaskStatus,
    TaskType,
)
from app.features.users.models import UserCategory
from app.features.users.schemas import UserRead, UserRole
from app.shared.schema import AdditionalData, SuccessfulResponseSchema


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class CohortAnalysisService:
    """Service dedicated to analyzing student struggle patterns on completed assessments."""

    def __init__(self, uow: AbstractUnitOfWork) -> None:
        self.uow = uow

    async def generate_cohort_struggle_analysis(
        self,
        assessment_id: str,
        user_category: str,
        current_user: UserRead,
    ) -> SuccessfulResponseSchema:
        """Executes the full 4-step cohort struggle analysis pipeline:
        1. Query user_categories table in DB (case-insensitive) to validate requested category.
        2. Query assessments table in DB to validate assessment and ensure status is COMPLETED.
        3. Query assessment_submissions table in DB filtered strictly for that category.
        4. Feed aggregated data with string IDs to document-processing-ms via HTTP API,
           build student breakdowns, cache the result (if topic found), and return diagnostic response.
        """
        assessment_id_str = str(assessment_id).strip()

        # Step 1: Query category from database (handling case-insensitivity)
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
        assessment = await self.uow.assessments.get_assessment_by_id(assessment_id_str)
        if not assessment:
            raise DomainEntityNotFoundException(f"Assessment with ID '{assessment_id_str}' not found.")

        # Verify teacher authorization
        if current_user.role != UserRole.ADMIN and assessment.teacher_id != current_user.user_id:
            raise DomainForbiddenDomainException("You are not authorized to analyze this assessment.")

        # Strict assessment type guard: Quizzes, Exams, and Tests are analyzable (TEST is the last included type).
        if assessment.assessment_type not in (TaskType.QUIZ, TaskType.EXAM, TaskType.TEST):
            raise DomainValidationDomainException(
                f"Cohort struggle analysis is only applicable to Quizzes, Exams, and Tests. "
                f"'{assessment.assessment_type.value}' is excluded."
            )

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

        questions_record = await self.uow.assessments.get_questions_by_assessment_id(assessment_id_str)
        if not questions_record or not questions_record.categories_data:
            raise DomainValidationDomainException("No questions configured for this assessment.")

        # Step 3: Query assessment submissions strictly for this category from the database
        submissions = await self.uow.assessments.list_submissions_for_assessment(
            assessment_id=assessment_id_str,
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

        # Preload student names and track incorrect questions per student with strict string IDs
        student_name_map: Dict[str, str] = {}
        student_account_id_map: Dict[str, Optional[str]] = {}
        student_wrong_questions_map: Dict[str, Set[str]] = {}

        for sub in completed_subs:
            sub_student_id = str(sub.student_id).strip()
            student = await self.uow.users.get_by_id(sub.student_id)
            if student:
                name = f"{student.first_name or ''} {student.last_name or ''}".strip()
                student_name_map[sub_student_id] = name if name else sub_student_id
                student_account_id_map[sub_student_id] = student.account_id
            else:
                student_name_map[sub_student_id] = sub_student_id
                student_account_id_map[sub_student_id] = None

            wrong_qids: Set[str] = set()
            answers_list = (sub.answers_payload or {}).get("answers", [])
            for ans in answers_list:
                if ans.get("is_correct") is False:
                    raw_qid = ans.get("question_id")
                    if raw_qid is not None:
                        wrong_qids.add(str(raw_qid).strip())
            student_wrong_questions_map[sub_student_id] = wrong_qids

        # Build map of questions with strictly string question IDs
        question_stats_map: Dict[str, Dict[str, Any]] = {}
        for cat in questions_record.categories_data:
            c_type = cat.get("type", "Multiple Choice")
            for q in cat.get("questions", []):
                raw_qid = q.get("id")
                if raw_qid is None:
                    continue
                qid = str(raw_qid).strip()
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
                    "correct_answer": str(correct_val).strip(),
                    "total_attempts": 0,
                    "correct_count": 0,
                    "incorrect_count": 0,
                    "answer_distribution": {},
                }

        # Tally answers from student submissions
        for sub in completed_subs:
            answers_list = (sub.answers_payload or {}).get("answers", [])
            for ans in answers_list:
                raw_qid = ans.get("question_id")
                if raw_qid is None:
                    continue
                qid = str(raw_qid).strip()
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

        # Build payload for document-processing-ms with strict string types
        docs_ms_payload = {
            "assessment_id": str(assessment.assessment_id).strip(),
            "assessment_title": assessment.title,
            "subject_code": assessment.subject_code,
            "als_program": category_record.code,
            "target_category": category_record.code,
            "max_score": float(assessment.max_score),
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

        # Associate struggling students with diagnosed topics (strictly string set intersection)
        struggling_topics = analysis_data.get("struggling_topics", [])
        for topic in struggling_topics:
            raw_aff = topic.get("affected_question_ids", [])
            aff_qids = {str(x).strip() for x in raw_aff if str(x).strip()}
            topic["affected_question_ids"] = list(aff_qids)

            struggling_student_names = []
            for sub in completed_subs:
                s_id = str(sub.student_id).strip()
                s_wrong = student_wrong_questions_map.get(s_id, set())
                if aff_qids.intersection(s_wrong):
                    s_name = student_name_map.get(s_id, s_id)
                    struggling_student_names.append(s_name)
            topic["struggling_students"] = struggling_student_names

        # Build per-student performance and struggle breakdown
        student_breakdowns = []
        for sub in completed_subs:
            s_id = str(sub.student_id).strip()
            s_wrong = student_wrong_questions_map.get(s_id, set())
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
                "account_id": student_account_id_map.get(s_id) or s_id,
                "student_name": student_name_map.get(s_id, s_id),
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
            assessment_id=str(assessment.assessment_id).strip(),
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
        assessment_id_str = str(assessment_id).strip()
        assessment = await self.uow.assessments.get_assessment_by_id(assessment_id_str)
        if not assessment:
            raise DomainEntityNotFoundException("Assessment not found.")

        if current_user.role != UserRole.ADMIN and assessment.teacher_id != current_user.user_id:
            raise DomainForbiddenDomainException("You are not authorized to view analysis for this assessment.")

        # Strict assessment type guard: Quizzes, Exams, and Tests are analyzable (TEST is the last included type).
        if assessment.assessment_type not in (TaskType.QUIZ, TaskType.EXAM, TaskType.TEST):
            raise DomainValidationDomainException(
                f"Cohort struggle analysis is only applicable to Quizzes, Exams, and Tests. "
                f"'{assessment.assessment_type.value}' is excluded."
            )

        record = await self.uow.assessments.get_cohort_analysis(assessment_id_str)
        if not record:
            raise DomainEntityNotFoundException(
                "No cohort struggle analysis has been generated for this assessment yet. "
                "Please click generate to run the analysis."
            )

        data = dict(record.analysis_payload or {})
        data["created_at"] = record.created_at.isoformat() if record.created_at else None
        data["updated_at"] = record.updated_at.isoformat() if record.updated_at else None

        if not data.get("topic_found", True) or data.get("status") == "NO_TOPIC_FOUND":
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
