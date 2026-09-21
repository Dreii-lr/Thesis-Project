"""
router.py — User management API endpoints.
"""
from __future__ import annotations

from typing import Sequence
import uuid

from fastapi import APIRouter, Depends, Query, status

from app.core.unit_of_work import AbstractUnitOfWork, get_uow
from app.features.users.schemas import UserCreate, UserRead, UserUpdate
from app.features.users.service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> UserRead:
    return await UserService.create_user(uow, data)


@router.get("/", response_model=list[UserRead])
async def list_users(
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> Sequence[UserRead]:
    return await UserService.list_users(uow, offset=offset, limit=limit)


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: uuid.UUID,
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> UserRead:
    return await UserService.get_user_by_id(uow, user_id)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: uuid.UUID,
    data: UserUpdate,
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> UserRead:
    return await UserService.update_user(uow, user_id, data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> None:
    await UserService.delete_user(uow, user_id)
