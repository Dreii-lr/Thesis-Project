"""
router.py — REST API endpoints for the Requirements Master Catalog subsystem.
Follows clean router architecture: zero business logic, dependency injection,
public read access, and role-based access control for administrative mutations.
"""
from __future__ import annotations

import json
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile, status
from starlette.responses import JSONResponse

from app.core.dependencies import (
    get_current_active_user,
    get_requirement_service,
    require_admin,
    require_admin_teacher,
)
from app.features.requirements.schemas import (
    RequirementCreateSchema,
    RequirementReorderSchema,
    RequirementUpdateSchema,
    StudentRequirementReviewSchema,
)
from app.features.requirements.service import RequirementService
from app.features.users.schemas import UserRead
from app.shared.utils import SharedUtils


router = APIRouter(prefix="/requirements", tags=["Requirements Master Catalog"])


# ─────────────────────────────────────────────────────────────────────────────
# 1. Public Read Operations (Zero Authentication Required)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", status_code=status.HTTP_200_OK)
async def list_requirements(
    is_required: Optional[bool] = Query(default=None, description="Filter by mandatory (true) or optional (false)"),
    include_inactive: bool = Query(default=False, description="Whether to include archived/inactive requirements"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    Publicly list active student requirements ordered by order_index.
    Accessible to anyone: prospective learners, guest enrollment checklists, and students.
    """
    response = await service.list_requirements(
        is_required=is_required,
        include_inactive=include_inactive,
        offset=offset,
        limit=limit,
    )
    return SharedUtils.SuccessfulResponse(response)


@router.get("/default", status_code=status.HTTP_200_OK, include_in_schema=False)
async def get_default_requirements(
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    Publicly retrieve default active student requirements directly from the database.
    Zero static or mock data.
    """
    response = await service.get_default_requirements()
    return SharedUtils.SuccessfulResponse(response)


# ─────────────────────────────────────────────────────────────────────────────
# 2. Administrative Operations & Fixed Subpaths (Must precede parameterized /{id})
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/admin/stats", status_code=status.HTTP_200_OK)
async def get_requirements_stats(
    current_user: UserRead = Depends(require_admin_teacher),
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    Retrieve statistics and overview metrics of defined requirements.
    Restricted to Teachers and Admins.
    """
    response = await service.get_requirements_stats()
    return SharedUtils.SuccessfulResponse(response)


@router.post("/seed-defaults", status_code=status.HTTP_200_OK)
async def seed_default_requirements(
    current_user: UserRead = Depends(require_admin),
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    Bootstrap standard DepEd ALS master requirements (Birth Proof, School Records, ID/Photo).
    Restricted to Admins.
    """
    response = await service.seed_default_requirements()
    return SharedUtils.SuccessfulResponse(response)


@router.patch("/reorder", status_code=status.HTTP_200_OK)
async def reorder_requirements(
    data: RequirementReorderSchema,
    current_user: UserRead = Depends(require_admin),
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    Bulk update requirement sequence and ordering indices.
    Restricted to Admins.
    """
    response = await service.reorder_requirements(data)
    return SharedUtils.SuccessfulResponse(response)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_requirement(
    data: RequirementCreateSchema,
    current_user: UserRead = Depends(require_admin),
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    Create a new requirement in the master catalog.
    Restricted to Admins.
    """
    response = await service.create_requirement(data)
    response.status_code = status.HTTP_201_CREATED
    return SharedUtils.SuccessfulResponse(response)


# ─────────────────────────────────────────────────────────────────────────────
# 3. Student Requirement Submissions Operations (Must precede /{id_or_code})
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/upload", status_code=status.HTTP_201_CREATED, summary="Upload requirement document and verify with AI")
async def upload_requirement_file(
    file: UploadFile = File(..., description="Document file: PDF, JPG, PNG, WEBP, max 10MB"),
    document_type: Optional[str] = Form(default=None, description="Document type (e.g. 'PSA Birth Certificate', 'Valid Government ID')"),
    requirement_code: Optional[str] = Form(default=None, description="Requirement slug/code (e.g. 'psa_police_clearance')"),
    current_user: UserRead = Depends(get_current_active_user),
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    Uploads a student requirement document to Cloudflare R2 via document-processing-ms,
    verifies identity against the student profile using Gemini Vision, and returns R2 metadata and verification results.
    Enforces a daily limit of 3 upload attempts on Gemini AI verified documents.
    """
    response = await service.upload_requirement_file(
        user_id=current_user.user_id,
        file=file,
        document_type=document_type,
        requirement_code=requirement_code,
    )
    response.status_code = status.HTTP_201_CREATED
    return SharedUtils.SuccessfulResponse(response)


@router.post("/submissions", status_code=status.HTTP_201_CREATED)
async def submit_student_requirement(
    requirement_code: str = Form(..., description="Requirement slug/code (e.g. 'rpl', 'af1')"),
    document_type: str = Form(..., description="Specific document type (e.g. 'PSA Birth Certificate')"),
    file_url: Optional[str] = Form(default=None, description="Pre-uploaded Cloudflare R2 file URL"),
    file_name: Optional[str] = Form(default=None, description="Pre-uploaded file name"),
    file_size_bytes: Optional[int] = Form(default=0, description="Pre-uploaded file size in bytes"),
    mime_type: Optional[str] = Form(default=None, description="Pre-uploaded MIME type"),
    storage_key: Optional[str] = Form(default=None, description="Pre-uploaded Cloudflare R2 storage key"),
    student_remarks: Optional[str] = Form(default=None),
    is_conditional: bool = Form(default=False),
    requested_assistance: bool = Form(default=False),
    file: Optional[UploadFile] = File(default=None, description="Document file (PDF, JPG, PNG, WEBP, max 10 MB)"),
    current_user: UserRead = Depends(get_current_active_user),
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    Submit or re-submit a student document requirement.
    Accepts multipart/form-data with optional file or pre-uploaded R2 metadata.
    """
    response = await service.submit_student_requirement(
        user_id=current_user.user_id,
        requirement_code=requirement_code,
        document_type=document_type,
        file=file,
        file_url=file_url,
        file_name=file_name,
        file_size_bytes=file_size_bytes,
        mime_type=mime_type,
        storage_key=storage_key,
        student_remarks=student_remarks,
        is_conditional=is_conditional,
        requested_assistance=requested_assistance,
        current_user=current_user,
    )
    return SharedUtils.SuccessfulResponse(response)


@router.get("/submissions/me", status_code=status.HTTP_200_OK)
async def get_my_submissions(
    current_user: UserRead = Depends(get_current_active_user),
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    List all submitted document requirements for the authenticated student.
    """
    response = await service.get_my_submissions(current_user.user_id)
    return SharedUtils.SuccessfulResponse(response)


@router.get("/submissions/attempts", status_code=status.HTTP_200_OK, summary="Get daily upload attempts for Gemini AI documents")
async def get_my_upload_attempts(
    current_user: UserRead = Depends(get_current_active_user),
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    Returns the student's daily upload attempts status (used, remaining, max limit)
    for Gemini AI verified documents (Valid ID, PSA, Police Clearance).
    """
    response = await service.get_my_upload_attempts(current_user.user_id)
    return SharedUtils.SuccessfulResponse(response)



@router.get("/submissions", status_code=status.HTTP_200_OK)
async def list_submissions(
    category: Optional[str] = Query(default=None, description="Filter by ALS Category (ELEMENTARY, SECONDARY, BLP)"),
    status: Optional[str] = Query(default=None, description="Filter by status ('review', 'verified', 'correction', 'exempted')"),
    requirement_code: Optional[str] = Query(default=None, description="Filter by requirement slug code"),
    search: Optional[str] = Query(default=None, description="Search term for student name, LRN/account ID, document type"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: UserRead = Depends(require_admin_teacher),
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    Teacher & Admin: List student submitted requirements with filtering and pagination.
    """
    response = await service.list_submissions(
        category=category,
        status=status,
        requirement_code=requirement_code,
        search=search,
        offset=offset,
        limit=limit,
    )
    return SharedUtils.SuccessfulResponse(response)


@router.get("/submissions/{submission_id}", status_code=status.HTTP_200_OK)
async def get_submission_by_id(
    submission_id: str,
    current_user: UserRead = Depends(get_current_active_user),
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    Get detailed information for a single student requirement submission.
    """
    response = await service.get_submission_by_id(submission_id, current_user)
    return SharedUtils.SuccessfulResponse(response)


@router.patch("/submissions/{submission_id}/review", status_code=status.HTTP_200_OK)
async def review_submission(
    submission_id: str,
    request: Request,
    current_user: UserRead = Depends(require_admin_teacher),
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    Teacher & Admin: Review a student requirement submission (verify, request correction, exempt).
    Accepts application/json, form data, or raw JSON payloads.
    """
    raw_body = await request.body()
    payload = {}
    if raw_body:
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception:
            try:
                form = await request.form()
                payload = dict(form)
            except Exception:
                payload = {}

    data = StudentRequirementReviewSchema.model_validate(payload)
    response = await service.review_submission(
        submission_id=submission_id,
        reviewer_user_id=current_user.user_id,
        data=data,
    )
    return SharedUtils.SuccessfulResponse(response)


@router.delete("/submissions/{submission_id}", status_code=status.HTTP_200_OK)
async def delete_submission(
    submission_id: str,
    current_user: UserRead = Depends(get_current_active_user),
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    Delete a requirement submission. Allowed for the submitting student or Admin.
    """
    response = await service.delete_submission(submission_id, current_user)
    return SharedUtils.SuccessfulResponse(response)


# ─────────────────────────────────────────────────────────────────────────────
# 4. Specific Requirement Lookups & Mutations by ID or Code
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/{id_or_code}", status_code=status.HTTP_200_OK)
async def get_requirement_by_id_or_code(
    id_or_code: str,
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    Publicly retrieve a requirement by its UUID or unique slug/code (e.g. 'birth', 'school').
    Accessible without authentication.
    """
    response = await service.get_requirement(id_or_code)
    return SharedUtils.SuccessfulResponse(response)


@router.patch("/{requirement_id}", status_code=status.HTTP_200_OK)
async def update_requirement(
    requirement_id: str,
    data: RequirementUpdateSchema,
    current_user: UserRead = Depends(require_admin),
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    Update requirement definition fields in the master catalog.
    Restricted to Admins.
    """
    response = await service.update_requirement(requirement_id, data)
    return SharedUtils.SuccessfulResponse(response)


@router.delete("/{requirement_id}", status_code=status.HTTP_200_OK)
async def delete_requirement(
    requirement_id: str,
    permanent: bool = Query(default=False, description="If true, permanently deletes; if false, soft archives"),
    current_user: UserRead = Depends(require_admin),
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    Delete or archive a requirement from the master catalog.
    Restricted to Admins.
    """
    response = await service.delete_requirement(requirement_id, permanent=permanent)
    return SharedUtils.SuccessfulResponse(response)


@router.patch("/{requirement_id}/toggle-status", status_code=status.HTTP_200_OK)
async def toggle_requirement_status(
    requirement_id: str,
    current_user: UserRead = Depends(require_admin),
    service: RequirementService = Depends(get_requirement_service),
) -> JSONResponse:
    """
    Quickly toggle a requirement between active and inactive states.
    Restricted to Admins.
    """
    response = await service.toggle_status(requirement_id)
    return SharedUtils.SuccessfulResponse(response)
