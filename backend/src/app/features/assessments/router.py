"""
router.py — REST API endpoints for the Assessment Subsystem.
Follows clean router architecture: zero business logic, service dependency injection,
and response formatting via SharedUtils.SuccessfulResponse.
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from starlette.responses import JSONResponse

from app.core.dependencies import (
    get_assessment_service,
    require_student,
    require_teacher,
)
from app.features.assessments.models import TaskStatus
from app.features.assessments.schemas import (
    AssessmentCreateSchema,
    AssessmentUpdateSchema,
    ManualGradePayload,
    SubmissionSubmitPayload,
)
from app.features.assessments.service import AssessmentService
from app.features.users.models import UserCategory
from app.features.users.schemas import UserRead
from app.shared.utils import SharedUtils

router = APIRouter(prefix="/assessments", tags=["Assessments"])


# ══════════════════════════════════════════════════════════════════════════════
# TEACHER / ADMIN ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/", status_code=status.HTTP_201_CREATED, tags=["Teacher Assessments"])
async def create_assessment(
    data: AssessmentCreateSchema,
    current_user: UserRead = Depends(require_teacher),
    service: AssessmentService = Depends(get_assessment_service),
) -> JSONResponse:
    """
    Create an Activity, Quiz, or Exam.
    Supports multi-category question banks and DepEd ALS category targeting.
    """
    response = await service.create_assessment(current_user.user_id, data)
    response.status_code = status.HTTP_201_CREATED
    return SharedUtils.SuccessfulResponse(response)


@router.put("/{assessment_id}", status_code=status.HTTP_200_OK, tags=["Teacher Assessments"])
async def update_assessment(
    assessment_id: str,
    data: AssessmentUpdateSchema,
    current_user: UserRead = Depends(require_teacher),
    service: AssessmentService = Depends(get_assessment_service),
) -> JSONResponse:
    """
    In-Place update of assessment metadata, schedule, and multi-category question pools.
    """
    response = await service.update_assessment(assessment_id, current_user.user_id, data)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.get("/teacher/my-tasks", status_code=status.HTTP_200_OK, tags=["Teacher Assessments"])
async def list_teacher_assessments(
    status_filter: Optional[TaskStatus] = Query(default=None, alias="status"),
    target_category: Optional[UserCategory] = Query(default=None),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: UserRead = Depends(require_teacher),
    service: AssessmentService = Depends(get_assessment_service),
) -> JSONResponse:
    """
    List assessments authored by teacher formatted for dashboard presentation.
    Supports both /teacher/list and /teacher/my-tasks endpoints.
    """
    response = await service.list_teacher_assessments(
        teacher_id=current_user.user_id,
        status=status_filter,
        target_category=target_category,
        offset=offset,
        limit=limit,
    )
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.get("/{assessment_id}", status_code=status.HTTP_200_OK, tags=["Teacher Assessments"])
async def get_assessment_details(
    assessment_id: str,
    current_user: UserRead = Depends(require_teacher),
    service: AssessmentService = Depends(get_assessment_service),
) -> JSONResponse:
    """
    Fetch complete assessment configuration including multi-category question banks.
    """
    response = await service.get_assessment_details(assessment_id)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.get("/{assessment_id}/submissions", status_code=status.HTTP_200_OK, tags=["Teacher Assessments"])
async def list_assessment_submissions(
    assessment_id: str,
    current_user: UserRead = Depends(require_teacher),
    service: AssessmentService = Depends(get_assessment_service),
) -> JSONResponse:
    """
    View all student submissions for an assessment.
    """
    response = await service.list_assessment_submissions(assessment_id)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.get(
    "/{assessment_id}/submissions/{submission_id}",
    status_code=status.HTTP_200_OK,
    tags=["Teacher Assessments"],
)
async def get_assessment_submission_details(
    assessment_id: str,
    submission_id: str,
    current_user: UserRead = Depends(require_teacher),
    service: AssessmentService = Depends(get_assessment_service),
) -> JSONResponse:
    """
    Fetch single student submission details including question breakdown, prompt, and scores.
    """
    response = await service.get_assessment_submission_details(assessment_id, submission_id)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.post(
    "/{assessment_id}/submissions/{submission_id}/grade",
    status_code=status.HTTP_200_OK,
    tags=["Teacher Assessments"],
)
async def grade_student_submission(
    assessment_id: str,
    submission_id: str,
    grade_data: ManualGradePayload,
    current_user: UserRead = Depends(require_teacher),
    service: AssessmentService = Depends(get_assessment_service),
) -> JSONResponse:
    """
    Teacher review queue: manually score an Activity submission and provide feedback.
    """
    response = await service.grade_submission(
        assessment_id=assessment_id,
        submission_id=submission_id,
        teacher_id=current_user.user_id,
        grade_data=grade_data,
    )
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


# ══════════════════════════════════════════════════════════════════════════════
# STUDENT ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/student/my-tasks", status_code=status.HTTP_200_OK, tags=["Student Assessments"])
async def list_student_tasks(
    current_user: UserRead = Depends(require_student),
    service: AssessmentService = Depends(get_assessment_service),
) -> JSONResponse:
    """
    List active assessments matching the student's category (BLP, Elementary, Junior) or 'all'.
    """
    response = await service.list_student_tasks(current_user)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.post("/{assessment_id}/start", status_code=status.HTTP_200_OK, tags=["Student Assessments"])
async def start_student_attempt(
    assessment_id: str,
    current_user: UserRead = Depends(require_student),
    service: AssessmentService = Depends(get_assessment_service),
) -> JSONResponse:
    """
    Begin taking an assessment.
    Randomly samples the required question subset from each pool and strips answer keys.
    """
    response = await service.start_student_attempt(assessment_id, current_user)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.post("/{assessment_id}/submit", status_code=status.HTTP_200_OK, tags=["Student Assessments"])
async def submit_student_attempt(
    assessment_id: str,
    payload: SubmissionSubmitPayload,
    current_user: UserRead = Depends(require_student),
    service: AssessmentService = Depends(get_assessment_service),
) -> JSONResponse:
    """
    Submit completed assessment answers or activity files.
    Triggers objective auto-grading engine for Quizzes/Exams.
    """
    response = await service.submit_student_attempt(
        assessment_id=assessment_id,
        student_user=current_user,
        payload=payload,
    )
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.get("/{assessment_id}/my-result", status_code=status.HTTP_200_OK, tags=["Student Assessments"])
async def get_my_result(
    assessment_id: str,
    current_user: UserRead = Depends(require_student),
    service: AssessmentService = Depends(get_assessment_service),
) -> JSONResponse:
    """
    View individual student attempt score, evaluation status, and teacher remarks.
    """
    response = await service.get_student_submission_result(
        assessment_id=assessment_id,
        student_id=current_user.user_id,
    )
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)
