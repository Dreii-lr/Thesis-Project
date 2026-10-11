"""
service.py — Business logic orchestrator for Subjects.
Follows clean domain service architecture using AbstractUnitOfWork.
Provides image upload support for LS3 Math, LS6 Digital Citizenship, and all subjects.
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
from app.features.subjects.models import Subject, utc_now
from app.features.subjects.schemas import (
    SubjectCopyResultSchema,
    SubjectCreateSchema,
    SubjectDetailSchema,
    SubjectReadSchema,
    SubjectUpdateSchema,
)
from app.shared.schema import AdditionalData, SuccessfulResponseSchema

logger = logging.getLogger(__name__)


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

        name_clean = data.name.strip()

        # 2. Check for duplicate name within the same category
        existing = await self.uow.subjects.get_by_category_and_name(
            category_id=category.category_id,
            name=name_clean,
        )
        if existing:
            raise DomainEntityAlreadyExistsException(
                f"Subject with name '{name_clean}' already exists in category '{category.name}'."
            )

        subject = Subject(
            category_id=category.category_id,
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

        if data.name is not None or (data.category_id is not None and target_cat_id != subject.category_id):
            new_name = data.name.strip() if data.name is not None else subject.name
            if new_name.upper() != subject.name.upper() or target_cat_id != subject.category_id:
                existing = await self.uow.subjects.get_by_category_and_name(
                    category_id=target_cat_id,
                    name=new_name,
                )
                if existing and existing.subject_id != subject.subject_id:
                    raise DomainEntityAlreadyExistsException(
                        f"Subject with name '{new_name}' already exists in this category."
                    )
            subject.name = new_name

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

    async def copy_subjects_between_categories(
        self,
        source_category: str,
        target_category: str,
    ) -> SuccessfulResponseSchema:
        # 1. Resolve source category
        source_cat = await self.uow.user_categories.get_by_id(source_category)
        if not source_cat:
            source_cat = await self.uow.user_categories.get_by_code(source_category)
        if not source_cat:
            raise DomainEntityNotFoundException(f"Source user category '{source_category}' not found.")

        # 2. Resolve target category
        target_cat = await self.uow.user_categories.get_by_id(target_category)
        if not target_cat:
            target_cat = await self.uow.user_categories.get_by_code(target_category)
        if not target_cat:
            raise DomainEntityNotFoundException(f"Target user category '{target_category}' not found.")

        if source_cat.category_id == target_cat.category_id:
            raise DomainValidationDomainException("Source and target categories must be different.")

        # 3. Fetch source subjects
        source_subjects = await self.uow.subjects.get_all_by_category(source_cat.category_id)
        if not source_subjects:
            raise DomainValidationDomainException(f"Source category '{source_cat.name}' has no subjects to copy.")

        # 4. Fetch target existing subjects to prevent duplicate names
        target_subjects = await self.uow.subjects.get_all_by_category(target_cat.category_id)
        existing_names = {s.name.strip().upper() for s in target_subjects}

        new_subjects: list[Subject] = []
        skipped_names: list[str] = []

        for s in source_subjects:
            cleaned_name = s.name.strip()
            if cleaned_name.upper() in existing_names:
                skipped_names.append(cleaned_name)
            else:
                new_sub = Subject(
                    category_id=target_cat.category_id,
                    name=cleaned_name,
                    description=s.description,
                    is_active=s.is_active,
                )
                new_subjects.append(new_sub)
                existing_names.add(cleaned_name.upper())

        # 5. Bulk insert newly created subjects
        if new_subjects:
            await self.uow.subjects.bulk_create(new_subjects)

        read_dtos = [SubjectReadSchema.model_validate(ns) for ns in new_subjects]
        result_payload = SubjectCopyResultSchema(
            source_category_id=source_cat.category_id,
            source_category_name=source_cat.name,
            target_category_id=target_cat.category_id,
            target_category_name=target_cat.name,
            copied_count=len(new_subjects),
            skipped_count=len(skipped_names),
            copied_subjects=read_dtos,
            skipped_subjects=skipped_names,
        )

        return SuccessfulResponseSchema(
            message=f"Copied {len(new_subjects)} subject(s) from '{source_cat.name}' to '{target_cat.name}'. {len(skipped_names)} already existed.",
            message_status="SUCCESS_COPIED",
            status_code=201 if new_subjects else 200,
            data=AdditionalData(resources=jsonable_encoder(result_payload)),
        )
