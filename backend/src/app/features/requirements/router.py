"""
router.py — REST API endpoints for the Requirements Master Catalog subsystem.
Follows clean router architecture: zero business logic, dependency injection,
public read access, and role-based access control for administrative mutations.
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from starlette.responses import JSONResponse

from app.core.dependencies import (
    get_requirement_service,
    require_admin,
    require_admin_teacher,
)
from app.features.requirements.schemas import (
    RequirementCreateSchema,
    RequirementReorderSchema,
    RequirementUpdateSchema,
)
from app.features.requirements.service import RequirementService
from app.features.users.schemas import UserRead
from app.shared.utils import SharedUtils

router = APIRouter(prefix="/requirements", tags=["Requirements Master Catalog"])


# ─────────────────────────────────────────────────────────────────────────────
# 1. Public Read Operations (Zero Authentication Required)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", status_code=status.HTTP_200_OK)
@router.get("/", status_code=status.HTTP_200_OK, include_in_schema=False)
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


@router.get("/defaults", status_code=status.HTTP_200_OK)
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
@router.post("/", status_code=status.HTTP_201_CREATED, include_in_schema=False)
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
# 3. Specific Requirement Lookups & Mutations by ID or Code
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
