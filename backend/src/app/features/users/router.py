"""
router.py — User management API endpoints.
"""
from __future__ import annotations

from typing import Sequence
import uuid

from fastapi import APIRouter, Depends, Query, status
from starlette.responses import JSONResponse

from app.core.unit_of_work import AbstractUnitOfWork, get_uow
from app.features.users.schemas import UserCreate, UserRead, UserUpdate, ListUserRead
from app.features.users.service import UserService
from app.shared.schema import SuccessfulResponseSchema
from app.shared.utils import SharedUtils

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> UserRead:
    try:
        response = await UserService.create_user(uow, data)
        response.status_code = status.HTTP_201_CREATED
        return SharedUtils.SuccessfulResponse(response)

    except Exception as e:
        raise e


@router.get("/", response_model=ListUserRead)
async def list_users(
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> ListUserRead:
    response = await UserService.list_users(uow, offset=offset, limit=limit)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: str,
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> JSONResponse:
    response = await UserService.get_user_by_id(uow, user_id)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: str,
    data: UserUpdate,
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> JSONResponse:
    response = await UserService.update_user(uow, user_id, data)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> JSONResponse:
    response = await UserService.delete_user(uow, user_id)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)

