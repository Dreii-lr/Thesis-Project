"""
service.py — Business domain orchestrator for the Requirements Master Catalog.
Strictly respects the Unit of Work pattern: never calls uow.commit() or uow.rollback().
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
from app.features.requirements.models import Requirement, utc_now
from app.features.requirements.schemas import (
    RequirementCreateSchema,
    RequirementListResponseSchema,
    RequirementReadSchema,
    RequirementReorderSchema,
    RequirementStatsSchema,
    RequirementUpdateSchema,
)
from app.shared.schema import AdditionalData, SuccessfulResponseSchema

logger = logging.getLogger(__name__)

class RequirementService:
    def __init__(self, uow: AbstractUnitOfWork) -> None:
        self.uow = uow

    async def create_requirement(self, data: RequirementCreateSchema) -> SuccessfulResponseSchema:
        clean_code = data.code.strip().lower()

        existing = await self.uow.requirements.get_by_code(clean_code)
        if existing:
            raise DomainEntityAlreadyExistsException(f"Requirement with code '{clean_code}' already exists.")

        requirement = Requirement(
            code=clean_code,
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            guidance=data.guidance.strip() if data.guidance else None,
            accepted_document_types=data.accepted_document_types,
            allowed_extensions=data.allowed_extensions,
            is_required=data.is_required,
            is_conditional=data.is_conditional,
            allow_assistance=data.allow_assistance,
            max_file_size_mb=data.max_file_size_mb,
            sample_document_url=data.sample_document_url,
            order_index=data.order_index,
            is_active=data.is_active,
        )

        await self.uow.requirements.create(requirement)
        read_dto = RequirementReadSchema.model_validate(requirement)

        return SuccessfulResponseSchema(
            message="Requirement created successfully.",
            message_status="SUCCESS_CREATED",
            status_code=201,
            data=AdditionalData(resources=jsonable_encoder(read_dto)),
        )

    async def get_requirement(self, id_or_code: str) -> SuccessfulResponseSchema:
        req = await self.uow.requirements.get_by_id_or_code(id_or_code)
        if not req:
            raise DomainEntityNotFoundException(f"Requirement '{id_or_code}' not found.")

        read_dto = RequirementReadSchema.model_validate(req)
        return SuccessfulResponseSchema(
            message="Successfully retrieved requirement.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=jsonable_encoder(read_dto)),
        )

    async def list_requirements(
        self,
        is_required: Optional[bool] = None,
        include_inactive: bool = False,
        offset: int = 0,
        limit: int = 100,
    ) -> SuccessfulResponseSchema:
        items, total = await self.uow.requirements.list(
            is_required=is_required,
            include_inactive=include_inactive,
            offset=offset,
            limit=limit,
        )

        dtos = [RequirementReadSchema.model_validate(item) for item in items]
        response_dto = RequirementListResponseSchema(
            requirements=dtos,
            total=total,
            offset=offset,
            limit=limit,
        )

        return SuccessfulResponseSchema(
            message="Successfully retrieved requirements.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=jsonable_encoder(response_dto)),
        )

    async def update_requirement(
        self,
        requirement_id: str,
        data: RequirementUpdateSchema,
    ) -> SuccessfulResponseSchema:
        req = await self.uow.requirements.get_by_id(requirement_id)
        if not req:
            raise DomainEntityNotFoundException(f"Requirement '{requirement_id}' not found.")

        # Check code uniqueness if changing code
        if data.code is not None:
            clean_code = data.code.strip().lower()
            if clean_code != req.code:
                existing = await self.uow.requirements.get_by_code(clean_code)
                if existing and existing.requirement_id != req.requirement_id:
                    raise DomainEntityAlreadyExistsException(f"Requirement with code '{clean_code}' already exists.")
                req.code = clean_code

        if data.title is not None:
            req.title = data.title.strip()
        if data.description is not None:
            req.description = data.description.strip() if data.description else None
        if data.guidance is not None:
            req.guidance = data.guidance.strip() if data.guidance else None
        if data.accepted_document_types is not None:
            req.accepted_document_types = data.accepted_document_types
        if data.allowed_extensions is not None:
            req.allowed_extensions = data.allowed_extensions
        if data.is_required is not None:
            req.is_required = data.is_required
        if data.is_conditional is not None:
            req.is_conditional = data.is_conditional
        if data.allow_assistance is not None:
            req.allow_assistance = data.allow_assistance
        if data.max_file_size_mb is not None:
            req.max_file_size_mb = data.max_file_size_mb
        if data.sample_document_url is not None:
            req.sample_document_url = data.sample_document_url.strip() if data.sample_document_url else None
        if data.order_index is not None:
            req.order_index = data.order_index
        if data.is_active is not None:
            req.is_active = data.is_active

        req.updated_at = utc_now()
        read_dto = RequirementReadSchema.model_validate(req)

        return SuccessfulResponseSchema(
            message="Requirement updated successfully.",
            message_status="SUCCESS_UPDATED",
            status_code=200,
            data=AdditionalData(resources=jsonable_encoder(read_dto)),
        )

    async def delete_requirement(
        self,
        requirement_id: str,
        permanent: bool = False,
    ) -> SuccessfulResponseSchema:
        req = await self.uow.requirements.get_by_id(requirement_id)
        if not req:
            raise DomainEntityNotFoundException(f"Requirement '{requirement_id}' not found.")

        if permanent:
            await self.uow.requirements.delete(req)
            msg = "Requirement permanently deleted."
        else:
            req.is_active = False
            req.updated_at = utc_now()
            msg = "Requirement archived successfully."

        return SuccessfulResponseSchema(
            message=msg,
            message_status="SUCCESS_DELETED",
            status_code=200,
        )

    async def toggle_status(self, requirement_id: str) -> SuccessfulResponseSchema:
        req = await self.uow.requirements.get_by_id(requirement_id)
        if not req:
            raise DomainEntityNotFoundException(f"Requirement '{requirement_id}' not found.")

        req.is_active = not req.is_active
        req.updated_at = utc_now()
        action_word = "activated" if req.is_active else "deactivated"
        read_dto = RequirementReadSchema.model_validate(req)

        return SuccessfulResponseSchema(
            message=f"Requirement {action_word} successfully.",
            message_status="SUCCESS_UPDATED",
            status_code=200,
            data=AdditionalData(resources=jsonable_encoder(read_dto)),
        )

    async def reorder_requirements(self, data: RequirementReorderSchema) -> SuccessfulResponseSchema:
        tuples = [(item.requirement_id, item.order_index) for item in data.items]
        await self.uow.requirements.bulk_update_order(tuples)

        return SuccessfulResponseSchema(
            message="Requirements reordered successfully.",
            message_status="SUCCESS_UPDATED",
            status_code=200,
        )

    async def get_default_requirements(self) -> SuccessfulResponseSchema:
        """
        Publicly retrieve active default student requirements directly from the database.
        Zero hardcoded or static data.
        """
        items, total = await self.uow.requirements.list(include_inactive=False)
        dtos = [RequirementReadSchema.model_validate(item) for item in items]
        response_dto = RequirementListResponseSchema(
            requirements=dtos,
            total=total,
            offset=0,
            limit=len(dtos),
        )

        return SuccessfulResponseSchema(
            message="Successfully retrieved default requirements from database.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=jsonable_encoder(response_dto)),
        )

    async def seed_default_requirements(self) -> SuccessfulResponseSchema:
        """
        Validates default requirements in the database.
        Queries the database directly without hardcoded static data.
        """
        items, total = await self.uow.requirements.list(include_inactive=False)
        return SuccessfulResponseSchema(
            message=f"Default requirements verified from database ({total} active).",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources={"active_count": total}),
        )

    async def get_requirements_stats(self) -> SuccessfulResponseSchema:
        stats = await self.uow.requirements.get_stats()
        dto = RequirementStatsSchema(**stats)

        return SuccessfulResponseSchema(
            message="Requirements statistics retrieved successfully.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=jsonable_encoder(dto)),
        )
