"""
router.py — REST API endpoints for the Subjects Subsystem.
Follows clean router architecture: zero business logic, service dependency injection,
and response formatting via SharedUtils.SuccessfulResponse.
Provides image input support for LS3 Math, LS6 Digital Citizenship, and all subjects.
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from starlette.responses import JSONResponse

from app.core.dependencies import (
    get_current_active_user,
    get_subject_service,
    require_admin_teacher,
)
from app.features.subjects.schemas import (
    SubjectCopySchema,
    SubjectCreateSchema,
    SubjectUpdateSchema,
)
from app.features.subjects.service import SubjectService
from app.features.users.schemas import UserRead
from app.shared.utils import SharedUtils

router = APIRouter(prefix="/subjects", tags=["Subjects"])


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_subject(
    data: SubjectCreateSchema,
    current_user: UserRead = Depends(require_admin_teacher),
    service: SubjectService = Depends(get_subject_service),
) -> JSONResponse:
    """
    Create a new subject linked to a specific user category.
    Restricted to Teachers and Admins.
    """
    response = await service.create_subject(data)
    response.status_code = status.HTTP_201_CREATED
    return SharedUtils.SuccessfulResponse(response)


@router.post("/copy", status_code=status.HTTP_201_CREATED)
async def copy_subjects(
    data: SubjectCopySchema,
    current_user: UserRead = Depends(require_admin_teacher),
    service: SubjectService = Depends(get_subject_service),
) -> JSONResponse:
    """
    Copy all subjects from a source category to a target category (e.g. Elementary to Secondary or vice-versa).
    Automatically updates the category_id of each copied subject to the target category.
    Idempotent: skips any subjects that already exist by name in the target category.
    Restricted to Teachers and Admins.
    """
    response = await service.copy_subjects_between_categories(
        source_category=data.source_category_id,
        target_category=data.target_category_id,
    )
    return SharedUtils.SuccessfulResponse(response)


@router.get("/", status_code=status.HTTP_200_OK)
async def list_subjects(
    category_id: Optional[str] = Query(default=None, description="Filter subjects by category ID or code (e.g. ELEMENTARY)"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: UserRead = Depends(get_current_active_user),
    service: SubjectService = Depends(get_subject_service),
) -> JSONResponse:
    """
    List subjects with optional filtering by user category.
    Accessible to all active users.
    """
    response = await service.list_subjects(
        category_id=category_id,
        offset=offset,
        limit=limit,
    )
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.get("/{subject_id}", status_code=status.HTTP_200_OK)
async def get_subject_details(
    subject_id: str,
    current_user: UserRead = Depends(get_current_active_user),
    service: SubjectService = Depends(get_subject_service),
) -> JSONResponse:
    """
    Retrieve subject details by ID including parent category information.
    Accessible to all active users.
    """
    response = await service.get_subject_by_id(subject_id)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.put("/{subject_id}", status_code=status.HTTP_200_OK)
async def update_subject(
    subject_id: str,
    data: SubjectUpdateSchema,
    current_user: UserRead = Depends(require_admin_teacher),
    service: SubjectService = Depends(get_subject_service),
) -> JSONResponse:
    """
    Update subject information.
    Restricted to Teachers and Admins.
    """
    response = await service.update_subject(subject_id, data)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.delete("/{subject_id}", status_code=status.HTTP_200_OK)
async def delete_subject(
    subject_id: str,
    current_user: UserRead = Depends(require_admin_teacher),
    service: SubjectService = Depends(get_subject_service),
) -> JSONResponse:
    """
    Delete a subject.
    Restricted to Teachers and Admins.
    """
    response = await service.delete_subject(subject_id)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)

