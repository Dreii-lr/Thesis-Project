"""
service.py — User management business logic consuming Unit of Work.
"""
from __future__ import annotations

from typing import Sequence
import uuid

from app.core.exceptions import EntityAlreadyExistsException, EntityNotFoundException
from app.core.security import hash_password
from app.core.unit_of_work import AbstractUnitOfWork
from app.features.users.models import User
from app.features.users.schemas import UserCreate, UserUpdate


class UserService:
    @staticmethod
    async def create_user(uow: AbstractUnitOfWork, data: UserCreate) -> User:
        async with uow:
            existing = await uow.users.get_by_email(data.email)
            if existing:
                raise EntityAlreadyExistsException("A user with this email already exists.")

            hashed_pwd = hash_password(data.password)
            user = User(
                email=data.email.lower(),
                password=hashed_pwd,
                first_name=data.first_name,
                last_name=data.last_name,
                middle_name=data.middle_name,
                student_id=data.student_id,
                employee_id=data.employee_id,
                role=data.role,
            )
            created_user = await uow.users.create(user)
            await uow.commit()
            return created_user

    @staticmethod
    async def get_user_by_id(uow: AbstractUnitOfWork, user_id: uuid.UUID) -> User:
        async with uow:
            user = await uow.users.get_by_id(user_id)
            if not user:
                raise EntityNotFoundException("User not found.")
            return user

    @staticmethod
    async def list_users(
        uow: AbstractUnitOfWork,
        offset: int = 0,
        limit: int = 100,
    ) -> Sequence[User]:
        async with uow:
            return await uow.users.list(offset=offset, limit=limit)

    @staticmethod
    async def update_user(
        uow: AbstractUnitOfWork,
        user_id: uuid.UUID,
        data: UserUpdate,
    ) -> User:
        async with uow:
            user = await uow.users.get_by_id(user_id)
            if not user:
                raise EntityNotFoundException("User not found.")

            update_data = data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(user, field, value)

            updated_user = await uow.users.update(user)
            await uow.commit()
            return updated_user

    @staticmethod
    async def delete_user(uow: AbstractUnitOfWork, user_id: uuid.UUID) -> None:
        async with uow:
            user = await uow.users.get_by_id(user_id)
            if not user:
                raise EntityNotFoundException("User not found.")
            await uow.users.delete(user)
            await uow.commit()
