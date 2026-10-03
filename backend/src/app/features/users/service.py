"""
service.py — User management business logic consuming Unit of Work.
"""
from __future__ import annotations

from fastapi.encoders import jsonable_encoder
from pycparser.c_ast import Return

from app.core.exceptions import EntityAlreadyExistsException, EntityNotFoundException
from app.core.security import hash_password
from app.core.unit_of_work import AbstractUnitOfWork
from app.features.users.models import User
from app.features.users.schemas import UserCreate, UserUpdate, UserRead, ListUserRead
from app.features.users.utils import UsersUtils
from app.shared.schema import SuccessfulResponseSchema, AdditionalData


class UserService:
    @staticmethod
    async def create_user(uow: AbstractUnitOfWork, data: UserCreate) -> SuccessfulResponseSchema:

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
                #check if sequence table has a value
        next_value = await uow.sequence_id_generator.get_next_value()
        if not next_value:
            await uow.sequence_id_generator.add()
            next_value = 1
        else:
            await uow.sequence_id_generator.update()
            next_value += 1

                #format student id Value
        user.student_id = UsersUtils.generate_student_id(next_value)
        created_user = await uow.users.create(user)
        read_user = UserRead.model_validate(created_user)
        read_user = jsonable_encoder(read_user)
        response = SuccessfulResponseSchema(message="Successfully created account.",message_status="CREATED", data=AdditionalData(resources=read_user))
        return response



    @staticmethod
    async def get_user_by_id(uow: AbstractUnitOfWork, user_id: str) -> SuccessfulResponseSchema:
        user = await uow.users.get_by_id_no_password(user_id)
        if not user:
            raise EntityNotFoundException("User not found.")
        user = jsonable_encoder(user)
        response = SuccessfulResponseSchema(message="Successfully retrieved user.",message_status="SUCCESS_RETRIEVED", data=AdditionalData(resources=user))

        return response

    @staticmethod
    async def list_users(
        uow: AbstractUnitOfWork,
        offset: int = 0,
        limit: int = 100,
    ) ->SuccessfulResponseSchema:
        data = await uow.users.list(offset=offset, limit=limit)
        data = jsonable_encoder(data)
        response = SuccessfulResponseSchema(message="Successfully retrieved user.",message_status="SUCCESS_RETRIEVED", data=AdditionalData(resources=data))

        return response

    @staticmethod
    async def update_user(
        uow: AbstractUnitOfWork,
        user_id: str,
        data: UserUpdate,
    ) -> SuccessfulResponseSchema:
        user = await uow.users.get_by_id_no_password(user_id)
        if not user:
            raise EntityNotFoundException("User not found.")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        updated_user = await uow.users.update(user.user_id,user.model_dump(exclude_unset=True,exclude_none=True))
        updated_user = jsonable_encoder(updated_user)
        response = SuccessfulResponseSchema(message="Successfully updated user.",message_status="SUCCESS_UPDATE", data=AdditionalData(resources=updated_user))
        return response

    @staticmethod
    async def delete_user(uow: AbstractUnitOfWork, user_id: str) -> SuccessfulResponseSchema:
        user = await uow.users.get_by_id(user_id)
        if not user:
            raise EntityNotFoundException("User not found.")
        await uow.users.delete(user)
        response = SuccessfulResponseSchema(message="Successfully deleted user.",message_status="SUCCESS_DELETE")
        return response
