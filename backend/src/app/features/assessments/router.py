"""
router.py — REST API endpoints for the Assessment Subsystem.
Follows clean router architecture: zero business logic, service dependency injection,
and response formatting via SharedUtils.SuccessfulResponse.
"""
from __future__ import annotations

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from starlette.responses import JSONResponse

from app.core.cloudinary import cloudinary_service
from app.core.dependencies import (
    get_assessment_service,
    get_cohort_analysis_service,
    require_admin_teacher,
    require_student,
    require_teacher,
)
from app.core.exceptions import DomainValidationDomainException
from app.features.assessments.analysis.service import CohortAnalysisService
from app.features.assessments.models import TaskStatus
from app.features.assessments.schemas import (
    AssessmentCreateSchema,
    AssessmentUpdateSchema,
    ManualGradePayload,
    SubmissionSubmitPayload,
)
from app.features.assessments.service import AssessmentService
from app.features.users.models import UserCategory
from app.features.users.schemas import UserRead, UserRole
from app.shared.schema import SuccessfulResponseSchema, AdditionalData
from app.shared.utils import SharedUtils

router = APIRouter(prefix="/assessments", tags=["Assessments"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def _validate_image_file(file: UploadFile) -> None:
    if not file.content_type or file.content_type.lower() not in ALLOWED_IMAGE_TYPES:
        raise DomainValidationDomainException(
            "Only JPEG, PNG, and WebP image files are allowed for question images."
        )


# ══════════════════════════════════════════════════════════════════════════════
# TEACHER / ADMIN ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/question-image", status_code=status.HTTP_201_CREATED, tags=["Teacher Assessments"])
async def upload_question_image(
    file: UploadFile = File(...),
    current_user: UserRead = Depends(require_admin_teacher),
) -> JSONResponse:
    """
    Upload an optional question image directly to Cloudinary as-is.
    Used for True/False and Multiple Choice question illustrations.
    """
    _validate_image_file(file)
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise DomainValidationDomainException("Question image file size cannot exceed 5 MB.")

    upload_result = await cloudinary_service.upload_image(
        file_bytes=file_bytes,
        filename=file.filename or f"question_{uuid.uuid4().hex[:8]}.jpg",
        folder="assessments/questions",
    )

    response = SuccessfulResponseSchema(
        message="Question image uploaded successfully.",
        message_status="SUCCESS_UPLOAD",
        status_code=status.HTTP_201_CREATED,
        data=AdditionalData(resources={
            "image_url": upload_result.secure_url,
            "public_id": upload_result.public_id,
        }),
    )
    return SharedUtils.SuccessfulResponse(response)


@router.post("/", status_code=status.HTTP_201_CREATED, tags=["Teacher Assessments"])
async def create_assessment(
    data: AssessmentCreateSchema,
    current_user: UserRead = Depends(require_admin_teacher),
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
    current_user: UserRead = Depends(require_admin_teacher),
    service: AssessmentService = Depends(get_assessment_service),
) -> JSONResponse:
    """
    In-Place update of assessment metadata, schedule, and multi-category question pools.
    """
    response = await service.update_assessment(
        assessment_id,
        current_user.user_id,
        data,
        is_admin=(current_user.role == UserRole.ADMIN),
    )
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.get("/teacher/my-tasks", status_code=status.HTTP_200_OK, tags=["Teacher Assessments"])
async def list_teacher_assessments(
    status_filter: Optional[TaskStatus] = Query(default=None, alias="status"),
    target_category: Optional[UserCategory] = Query(default=None),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: UserRead = Depends(require_admin_teacher),
    service: AssessmentService = Depends(get_assessment_service),
) -> JSONResponse:
    """
    List assessments authored by teacher formatted for dashboard presentation.
    Supports both /teacher/list and /teacher/my-tasks endpoints.
    """
    response = await service.list_teacher_assessments(
        teacher_id=current_user.user_id if current_user.role != UserRole.ADMIN else None,
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
    current_user: UserRead = Depends(require_admin_teacher),
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
    current_user: UserRead = Depends(require_admin_teacher),
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
    current_user: UserRead = Depends(require_admin_teacher),
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
    current_user: UserRead = Depends(require_admin_teacher),
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


@router.get("/student/activity-metrics", status_code=status.HTTP_200_OK, tags=["Student Assessments"])
async def get_student_activity_metrics(
    current_user: UserRead = Depends(require_student),
    service: AssessmentService = Depends(get_assessment_service),
) -> JSONResponse:
    """
    Retrieve aggregate submission and pending counts for student activities.
    """
    response = await service.get_student_activity_metrics(current_user)
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


# ══════════════════════════════════════════════════════════════════════════════
# COHORT STRUGGLE ANALYSIS ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/cohort-analysis", status_code=status.HTTP_200_OK, tags=["Teacher Assessments"])
async def generate_cohort_struggle_analysis_query(
    assessment_id: str = Query(..., description="ID of the completed assessment to analyze"),
    user_category: str = Query(..., description="Target user category (case-insensitive, e.g. Elementary, Secondary, BLP)"),
    current_user: UserRead = Depends(require_teacher),
    service: CohortAnalysisService = Depends(get_cohort_analysis_service),
) -> JSONResponse:
    """
    Generate or refresh cohort-wide quiz struggle analysis using query parameters.
    Query parameters:
      - assessment_id: ID of the assessment (must be COMPLETED)
      - user_category: Category from user_categories table (case-insensitive)
    Workflow:
      1. Query category in database (case-insensitive).
      2. If valid, query assessment in database (must be COMPLETED).
      3. If valid, query submissions strictly for that category.
      4. Feed aggregated data to document-processing-ms via HTTP API and return diagnosis.
    """
    response = await service.generate_cohort_struggle_analysis(
        assessment_id=str(assessment_id).strip(),
        user_category=str(user_category).strip(),
        current_user=current_user,
    )
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.get("/cohort-analysis", status_code=status.HTTP_200_OK, tags=["Teacher Assessments"])
async def get_cohort_struggle_analysis_query(
    assessment_id: str = Query(..., description="ID of the assessment"),
    user_category: Optional[str] = Query(None, description="Optional user category filter"),
    current_user: UserRead = Depends(require_teacher),
    service: CohortAnalysisService = Depends(get_cohort_analysis_service),
) -> JSONResponse:
    """
    Retrieve previously generated and cached cohort struggle analysis using query parameters.
    """
    response = await service.get_cohort_struggle_analysis(
        assessment_id=str(assessment_id).strip(),
        current_user=current_user,
        user_category=str(user_category).strip() if user_category else None,
    )
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.post("/{assessment_id}/cohort-analysis", status_code=status.HTTP_200_OK, tags=["Teacher Assessments"])
async def generate_cohort_struggle_analysis_path(
    assessment_id: str,
    user_category: str = Query(..., alias="category", description="Target user category (case-insensitive)"),
    current_user: UserRead = Depends(require_teacher),
    service: CohortAnalysisService = Depends(get_cohort_analysis_service),
) -> JSONResponse:
    """Backward-compatible path-parameter alias for generating cohort struggle analysis."""
    response = await service.generate_cohort_struggle_analysis(
        assessment_id=str(assessment_id).strip(),
        user_category=str(user_category).strip(),
        current_user=current_user,
    )
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.get("/{assessment_id}/cohort-analysis", status_code=status.HTTP_200_OK, tags=["Teacher Assessments"])
async def get_cohort_struggle_analysis_path(
    assessment_id: str,
    user_category: Optional[str] = Query(None, alias="category", description="Optional user category filter"),
    current_user: UserRead = Depends(require_teacher),
    service: CohortAnalysisService = Depends(get_cohort_analysis_service),
) -> JSONResponse:
    """Backward-compatible path-parameter alias for retrieving cohort struggle analysis."""
    response = await service.get_cohort_struggle_analysis(
        assessment_id=str(assessment_id).strip(),
        current_user=current_user,
        user_category=str(user_category).strip() if user_category else None,
    )
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)

