"""
service.py — Business logic orchestrator for Subjects.
Follows clean domain service architecture using AbstractUnitOfWork.
Provides image upload support for LS3 Math, LS6 Digital Citizenship, and all subjects.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional
import uuid

from fastapi.encoders import jsonable_encoder

from app.core.exceptions import (
    DomainEntityAlreadyExistsException,
    DomainEntityNotFoundException,
    DomainValidationDomainException,
)
from app.core.unit_of_work import AbstractUnitOfWork
from app.features.subjects.models import Subject, utc_now
from app.features.subjects.schemas import (
    SubjectCreateSchema,
    SubjectDetailSchema,
    SubjectReadSchema,
    SubjectUpdateSchema,
)
from app.shared.schema import AdditionalData, SuccessfulResponseSchema

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"}
UPLOAD_DIR = Path("static/uploads/subjects")


class SubjectService:
    def __init__(self, uow: AbstractUnitOfWork) -> None:
        self.uow = uow

    async def create_subject(self, data: SubjectCreateSchema) -> SuccessfulResponseSchema:
        # 1. Verify parent user category exists
        category = await self.uow.user_categories.get_by_id(data.category_id)
        if not category:
            category = await self.uow.user_categories.get_by_code(data.category_id)

        if not category:
            raise DomainEntityNotFoundException(f"User category '{data.category_id}' does not exist.")

        code_clean = data.code.strip().upper()
        name_clean = data.name.strip()

        # 2. Check for duplicate code within the same category
        existing = await self.uow.subjects.get_by_category_and_code(
            category_id=category.category_id,
            code=code_clean,
        )
        if existing:
            raise DomainEntityAlreadyExistsException(
                f"Subject with code '{code_clean}' already exists in category '{category.name}'."
            )

        subject = Subject(
            category_id=category.category_id,
            code=code_clean,
            name=name_clean,
            description=data.description.strip() if data.description else None,
            is_active=data.is_active,
        )

        await self.uow.subjects.create(subject)

        read_dto = SubjectReadSchema.model_validate(subject)
        return SuccessfulResponseSchema(
            message="Subject created successfully.",
            message_status="SUCCESS_CREATED",
            status_code=201,
            data=AdditionalData(resources=jsonable_encoder(read_dto)),
        )

    async def get_subject_by_id(self, subject_id: str) -> SuccessfulResponseSchema:
        subject = await self.uow.subjects.get_by_id(subject_id, load_category=True)
        if not subject:
            raise DomainEntityNotFoundException(f"Subject '{subject_id}' not found.")

        detail_dto = SubjectDetailSchema(
            subject_id=subject.subject_id,
            category_id=subject.category_id,
            code=subject.code,
            name=subject.name,
            description=subject.description,
            is_active=subject.is_active,
            created_at=subject.created_at,
            updated_at=subject.updated_at,
            category_name=subject.category.name if subject.category else None,
            category_code=subject.category.code if subject.category else None,
        )

        return SuccessfulResponseSchema(
            message="Successfully retrieved subject.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=jsonable_encoder(detail_dto)),
        )

    async def list_subjects(
        self,
        category_id: Optional[str] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> SuccessfulResponseSchema:
        target_cat_id = None
        if category_id:
            # Can be UUID or category code (e.g. "ELEMENTARY")
            cat = await self.uow.user_categories.get_by_id(category_id)
            if not cat:
                cat = await self.uow.user_categories.get_by_code(category_id)
            if cat:
                target_cat_id = cat.category_id
            else:
                target_cat_id = category_id

        subjects, total = await self.uow.subjects.list(
            category_id=target_cat_id,
            offset=offset,
            limit=limit,
            load_category=True,
        )

        items = []
        for s in subjects:
            items.append(
                SubjectDetailSchema(
                    subject_id=s.subject_id,
                    category_id=s.category_id,
                    code=s.code,
                    name=s.name,
                    description=s.description,
                    is_active=s.is_active,
                    created_at=s.created_at,
                    updated_at=s.updated_at,
                    category_name=s.category.name if s.category else None,
                    category_code=s.category.code if s.category else None,
                )
            )

        response_payload = {
            "subjects": jsonable_encoder(items),
            "total": total,
            "offset": offset,
            "limit": limit,
        }

        return SuccessfulResponseSchema(
            message="Successfully retrieved subjects.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=response_payload),
        )

    async def update_subject(
        self,
        subject_id: str,
        data: SubjectUpdateSchema,
    ) -> SuccessfulResponseSchema:
        subject = await self.uow.subjects.get_by_id(subject_id, load_category=True)
        if not subject:
            raise DomainEntityNotFoundException(f"Subject '{subject_id}' not found.")

        target_cat_id = subject.category_id
        if data.category_id is not None:
            cat = await self.uow.user_categories.get_by_id(data.category_id)
            if not cat:
                cat = await self.uow.user_categories.get_by_code(data.category_id)
            if not cat:
                raise DomainEntityNotFoundException(f"Target user category '{data.category_id}' does not exist.")
            target_cat_id = cat.category_id
            subject.category_id = target_cat_id

        if data.code is not None:
            new_code = data.code.strip().upper()
            if new_code != subject.code or target_cat_id != subject.category_id:
                existing = await self.uow.subjects.get_by_category_and_code(
                    category_id=target_cat_id,
                    code=new_code,
                )
                if existing and existing.subject_id != subject.subject_id:
                    raise DomainEntityAlreadyExistsException(
                        f"Subject with code '{new_code}' already exists in this category."
                    )
                subject.code = new_code

        if data.name is not None:
            subject.name = data.name.strip()

        if data.description is not None:
            subject.description = data.description.strip() if data.description else None
        if data.is_active is not None:
            subject.is_active = data.is_active

        subject.updated_at = utc_now()

        read_dto = SubjectReadSchema.model_validate(subject)
        return SuccessfulResponseSchema(
            message="Subject updated successfully.",
            message_status="SUCCESS_UPDATED",
            status_code=200,
            data=AdditionalData(resources=jsonable_encoder(read_dto)),
        )

    async def delete_subject(self, subject_id: str) -> SuccessfulResponseSchema:
        subject = await self.uow.subjects.get_by_id(subject_id)
        if not subject:
            raise DomainEntityNotFoundException(f"Subject '{subject_id}' not found.")

        await self.uow.subjects.delete(subject)

        return SuccessfulResponseSchema(
            message="Subject deleted successfully.",
            message_status="SUCCESS_DELETED",
            status_code=200,
        )
