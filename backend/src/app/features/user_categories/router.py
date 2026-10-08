"""
router.py — REST API endpoints for the User Categories Subsystem.
Follows clean router architecture: zero business logic, service dependency injection,
and response formatting via SharedUtils.SuccessfulResponse.
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from starlette.responses import JSONResponse

from app.core.dependencies import (
    get_current_active_user,
    get_user_category_service,
    require_teacher,
)
from app.features.user_categories.schemas import (
    UserCategoryCreateSchema,
    UserCategoryUpdateSchema,
)
from app.features.user_categories.service import UserCategoryService
from app.features.users.schemas import UserRead
from app.shared.utils import SharedUtils

router = APIRouter(prefix="/user-categories", tags=["User Categories"])


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user_category(
    data: UserCategoryCreateSchema,
    current_user: UserRead = Depends(require_teacher),
    service: UserCategoryService = Depends(get_user_category_service),
) -> JSONResponse:
    """
    Create a new user category (e.g. Elementary, Secondary, BLP).
    Restricted to Teachers and Admins.
    """
    response = await service.create_category(data)
    response.status_code = status.HTTP_201_CREATED
    return SharedUtils.SuccessfulResponse(response)


@router.post("/seed", status_code=status.HTTP_200_OK)
async def seed_curriculum(
    current_user: UserRead = Depends(require_teacher),
    service: UserCategoryService = Depends(get_user_category_service),
) -> JSONResponse:
    """
    Idempotently seeds standard DepEd ALS categories (Elementary, Secondary, BLP)
    and their complete sets of subjects.
    Restricted to Teachers and Admins.
    """
    response = await service.seed_default_curriculum()
    return SharedUtils.SuccessfulResponse(response)


@router.get("/", status_code=status.HTTP_200_OK)
async def list_user_categories(
    include_subjects: bool = Query(default=False, description="Whether to include related subjects"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: UserRead = Depends(get_current_active_user),
    service: UserCategoryService = Depends(get_user_category_service),
) -> JSONResponse:
    """
    List user categories with optional nested subjects.
    Accessible to all active users.
    """
    response = await service.list_categories(
        load_subjects=include_subjects,
        offset=offset,
        limit=limit,
    )
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.get("/{category_id}", status_code=status.HTTP_200_OK)
async def get_user_category_details(
    category_id: str,
    current_user: UserRead = Depends(get_current_active_user),
    service: UserCategoryService = Depends(get_user_category_service),
) -> JSONResponse:
    """
    Retrieve user category details by ID or code, including its subjects.
    Accessible to all active users.
    """
    response = await service.get_category_by_id(category_id)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.put("/{category_id}", status_code=status.HTTP_200_OK)
async def update_user_category(
    category_id: str,
    data: UserCategoryUpdateSchema,
    current_user: UserRead = Depends(require_teacher),
    service: UserCategoryService = Depends(get_user_category_service),
) -> JSONResponse:
    """
    Update user category metadata.
    Restricted to Teachers and Admins.
    """
    response = await service.update_category(category_id, data)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.delete("/{category_id}", status_code=status.HTTP_200_OK)
async def delete_user_category(
    category_id: str,
    current_user: UserRead = Depends(require_teacher),
    service: UserCategoryService = Depends(get_user_category_service),
) -> JSONResponse:
    """
    Delete a user category and its associated subjects.
    Restricted to Teachers and Admins.
    """
    response = await service.delete_category(category_id)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)
