"""
service.py — Business logic orchestrator for User Categories.
Follows clean domain service architecture using AbstractUnitOfWork.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi.encoders import jsonable_encoder

from app.core.exceptions import (
    DomainEntityAlreadyExistsException,
    DomainEntityNotFoundException,
    DomainValidationDomainException,
)
from app.core.unit_of_work import AbstractUnitOfWork
from app.features.subjects.models import Subject
from app.features.user_categories.models import UserCategoryModel, utc_now
from app.features.user_categories.schemas import (
    UserCategoryCreateSchema,
    UserCategoryReadSchema,
    UserCategoryUpdateSchema,
    UserCategoryWithSubjectsSchema,
)
from app.shared.schema import AdditionalData, SuccessfulResponseSchema

logger = logging.getLogger(__name__)


class UserCategoryService:
    def __init__(self, uow: AbstractUnitOfWork) -> None:
        self.uow = uow

    async def create_category(self, data: UserCategoryCreateSchema) -> SuccessfulResponseSchema:
        code_clean = data.code.strip().upper()
        name_clean = data.name.strip()

        existing_code = await self.uow.user_categories.get_by_code(code_clean)
        if existing_code:
            raise DomainEntityAlreadyExistsException(f"User category with code '{code_clean}' already exists.")

        existing_name = await self.uow.user_categories.get_by_name(name_clean)
        if existing_name:
            raise DomainEntityAlreadyExistsException(f"User category with name '{name_clean}' already exists.")

        category = UserCategoryModel(
            code=code_clean,
            name=name_clean,
            description=data.description.strip() if data.description else None,
        )

        await self.uow.user_categories.create(category)

        read_dto = UserCategoryReadSchema.model_validate(category)
        return SuccessfulResponseSchema(
            message="User category created successfully.",
            message_status="SUCCESS_CREATED",
            status_code=201,
            data=AdditionalData(resources=jsonable_encoder(read_dto)),
        )

    async def get_category_by_id(self, category_id: str) -> SuccessfulResponseSchema:
        category = await self.uow.user_categories.get_by_id(category_id, load_subjects=True)
        if not category:
            # Also check by code in case caller provided code (e.g. "ELEMENTARY")
            category = await self.uow.user_categories.get_by_code(category_id, load_subjects=True)

        if not category:
            raise DomainEntityNotFoundException(f"User category '{category_id}' not found.")

        detail_dto = UserCategoryWithSubjectsSchema.model_validate(category)
        return SuccessfulResponseSchema(
            message="Successfully retrieved user category.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=jsonable_encoder(detail_dto)),
        )

    async def list_categories(
        self,
        load_subjects: bool = True,
        offset: int = 0,
        limit: int = 100,
    ) -> SuccessfulResponseSchema:
        categories, total = await self.uow.user_categories.list(
            load_subjects=load_subjects,
            offset=offset,
            limit=limit,
        )

        items = [UserCategoryWithSubjectsSchema.model_validate(c) for c in categories]

        response_payload = {
            "categories": jsonable_encoder(items),
            "total": total,
            "offset": offset,
            "limit": limit,
        }

        return SuccessfulResponseSchema(
            message="Successfully retrieved user categories.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=response_payload),
        )

    async def update_category(
        self,
        category_id: str,
        data: UserCategoryUpdateSchema,
    ) -> SuccessfulResponseSchema:
        category = await self.uow.user_categories.get_by_id(category_id)
        if not category:
            raise DomainEntityNotFoundException(f"User category '{category_id}' not found.")

        if data.code is not None:
            new_code = data.code.strip().upper()
            if new_code != category.code:
                existing = await self.uow.user_categories.get_by_code(new_code)
                if existing and existing.category_id != category.category_id:
                    raise DomainEntityAlreadyExistsException(f"User category with code '{new_code}' already exists.")
                category.code = new_code

        if data.name is not None:
            new_name = data.name.strip()
            if new_name != category.name:
                existing = await self.uow.user_categories.get_by_name(new_name)
                if existing and existing.category_id != category.category_id:
                    raise DomainEntityAlreadyExistsException(f"User category with name '{new_name}' already exists.")
                category.name = new_name

        if data.description is not None:
            category.description = data.description.strip() if data.description else None

        category.updated_at = utc_now()
        read_dto = UserCategoryReadSchema.model_validate(category)
        return SuccessfulResponseSchema(
            message="User category updated successfully.",
            message_status="SUCCESS_UPDATED",
            status_code=200,
            data=AdditionalData(resources=jsonable_encoder(read_dto)),
        )

    async def delete_category(self, category_id: str) -> SuccessfulResponseSchema:
        category = await self.uow.user_categories.get_by_id(category_id)
        if not category:
            raise DomainEntityNotFoundException(f"User category '{category_id}' not found.")

        await self.uow.user_categories.delete(category)

        return SuccessfulResponseSchema(
            message="User category and associated subjects deleted successfully.",
            message_status="SUCCESS_DELETED",
            status_code=200,
        )