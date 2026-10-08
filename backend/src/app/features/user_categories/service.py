"""
service.py — Business logic orchestrator for User Categories.
Follows clean domain service architecture using AbstractUnitOfWork.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi.encoders import jsonable_encoder

from app.core.exceptions import (
    EntityAlreadyExistsException,
    EntityNotFoundException,
    ValidationDomainException,
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

# Default DepEd ALS Curriculum Seed Configuration
DEFAULT_CURRICULUM_DATA = [
    {
        "code": "ELEMENTARY",
        "name": "Elementary",
        "description": "DepEd Alternative Learning System (ALS) Elementary Level",
        "subjects": [
            {"code": "ALS-E-LS1-ENG", "name": "LS1 - ENGLISH", "description": "Communication Skills (English)"},
            {"code": "ALS-E-LS1-FIL", "name": "LS1 - FILIPINO", "description": "Communication Skills (Filipino)"},
            {"code": "ALS-E-LS2-SCI", "name": "LS2 - SCIENCE", "description": "Scientific Literacy and Critical Thinking Skills"},
            {"code": "ALS-E-LS3-MATH", "name": "LS3 - MATH", "description": "Mathematical and Problem Solving Skills (Image-Enabled)", "image_url": None},
            {"code": "ALS-E-LS4-LCS", "name": "LS4 - LIFE AND CAREER SKILLS", "description": "Life and Career Skills"},
            {"code": "ALS-E-LS5-PSL", "name": "LS5 - PAG-UNAWA SA SARILI AT LIPUNAN", "description": "Pag-unawa sa Sarili at Lipunan (Understanding the Self and Society)"},
            {"code": "ALS-E-LS6-DC", "name": "LS6 - DIGITAL CITIZENSHIP", "description": "Digital Literacy and Citizenship (Image-Enabled)", "image_url": None},
        ],
    },
    {
        "code": "SECONDARY",
        "name": "Secondary",
        "description": "DepEd Alternative Learning System (ALS) Junior High School / Secondary Level",
        "subjects": [
            {"code": "ALS-S-LS1-ENG", "name": "LS1 - ENGLISH", "description": "Communication Skills (English)"},
            {"code": "ALS-S-LS1-FIL", "name": "LS1 - FILIPINO", "description": "Communication Skills (Filipino)"},
            {"code": "ALS-S-LS2-SCI", "name": "LS2 - SCIENCE", "description": "Scientific Literacy and Critical Thinking Skills"},
            {"code": "ALS-S-LS3-MATH", "name": "LS3 - MATH", "description": "Mathematical and Problem Solving Skills (Image-Enabled)", "image_url": None},
            {"code": "ALS-S-LS4-LCS", "name": "LS4 - LIFE AND CAREER SKILLS", "description": "Life and Career Skills"},
            {"code": "ALS-S-LS5-PSL", "name": "LS5 - PAG-UNAWA SA SARILI AT LIPUNAN", "description": "Pag-unawa sa Sarili at Lipunan (Understanding the Self and Society)"},
            {"code": "ALS-S-LS6-DC", "name": "LS6 - DIGITAL CITIZENSHIP", "description": "Digital Literacy and Citizenship (Image-Enabled)", "image_url": None},
        ],
    },
    {
        "code": "BLP",
        "name": "Basic Literacy Program",
        "description": "DepEd Alternative Learning System (ALS) Basic Literacy Program (BLP)",
        "subjects": [
            {"code": "ALS-BLP-ENG", "name": "ENGLISH", "description": "Basic Literacy English"},
            {"code": "ALS-BLP-FIL", "name": "FILIPINO", "description": "Basic Literacy Filipino"},
            {"code": "ALS-BLP-MATH", "name": "MATH", "description": "Basic Literacy Numeracy and Mathematics"},
        ],
    },
]


class UserCategoryService:
    def __init__(self, uow: AbstractUnitOfWork) -> None:
        self.uow = uow

    async def create_category(self, data: UserCategoryCreateSchema) -> SuccessfulResponseSchema:
        code_clean = data.code.strip().upper()
        name_clean = data.name.strip()

        existing_code = await self.uow.user_categories.get_by_code(code_clean)
        if existing_code:
            raise EntityAlreadyExistsException(f"User category with code '{code_clean}' already exists.")

        existing_name = await self.uow.user_categories.get_by_name(name_clean)
        if existing_name:
            raise EntityAlreadyExistsException(f"User category with name '{name_clean}' already exists.")

        category = UserCategoryModel(
            code=code_clean,
            name=name_clean,
            description=data.description.strip() if data.description else None,
        )

        await self.uow.user_categories.create(category)
        await self.uow.commit()

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
            raise EntityNotFoundException(f"User category '{category_id}' not found.")

        detail_dto = UserCategoryWithSubjectsSchema.model_validate(category)
        return SuccessfulResponseSchema(
            message="Successfully retrieved user category.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=jsonable_encoder(detail_dto)),
        )

    async def list_categories(
        self,
        load_subjects: bool = False,
        offset: int = 0,
        limit: int = 100,
    ) -> SuccessfulResponseSchema:
        categories, total = await self.uow.user_categories.list(
            load_subjects=load_subjects,
            offset=offset,
            limit=limit,
        )

        if load_subjects:
            items = [UserCategoryWithSubjectsSchema.model_validate(c) for c in categories]
        else:
            items = [UserCategoryReadSchema.model_validate(c) for c in categories]

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
            raise EntityNotFoundException(f"User category '{category_id}' not found.")

        if data.code is not None:
            new_code = data.code.strip().upper()
            if new_code != category.code:
                existing = await self.uow.user_categories.get_by_code(new_code)
                if existing and existing.category_id != category.category_id:
                    raise EntityAlreadyExistsException(f"User category with code '{new_code}' already exists.")
                category.code = new_code

        if data.name is not None:
            new_name = data.name.strip()
            if new_name != category.name:
                existing = await self.uow.user_categories.get_by_name(new_name)
                if existing and existing.category_id != category.category_id:
                    raise EntityAlreadyExistsException(f"User category with name '{new_name}' already exists.")
                category.name = new_name

        if data.description is not None:
            category.description = data.description.strip() if data.description else None

        category.updated_at = utc_now()
        await self.uow.commit()

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
            raise EntityNotFoundException(f"User category '{category_id}' not found.")

        await self.uow.user_categories.delete(category)
        await self.uow.commit()

        return SuccessfulResponseSchema(
            message="User category and associated subjects deleted successfully.",
            message_status="SUCCESS_DELETED",
            status_code=200,
        )

    async def seed_default_curriculum(self) -> SuccessfulResponseSchema:
        """
        Idempotently seeds Elementary, Secondary, and BLP categories along with
        their respective DepEd ALS subjects.
        """
        created_categories = 0
        created_subjects = 0

        for cat_data in DEFAULT_CURRICULUM_DATA:
            category = await self.uow.user_categories.get_by_code(cat_data["code"])
            if not category:
                category = UserCategoryModel(
                    code=cat_data["code"],
                    name=cat_data["name"],
                    description=cat_data["description"],
                )
                await self.uow.user_categories.create(category)
                await self.uow.commit()
                created_categories += 1

            for subj_data in cat_data["subjects"]:
                existing_subj = await self.uow.subjects.get_by_category_and_code(
                    category_id=category.category_id,
                    code=subj_data["code"],
                )
                if not existing_subj:
                    new_subject = Subject(
                        category_id=category.category_id,
                        code=subj_data["code"],
                        name=subj_data["name"],
                        description=subj_data.get("description"),
                        image_url=subj_data.get("image_url"),
                        is_active=True,
                    )
                    await self.uow.subjects.create(new_subject)
                    created_subjects += 1

        await self.uow.commit()

        categories, total = await self.uow.user_categories.list(load_subjects=True)
        items = [UserCategoryWithSubjectsSchema.model_validate(c) for c in categories]

        return SuccessfulResponseSchema(
            message=f"Curriculum seeded successfully. Created {created_categories} categories and {created_subjects} subjects.",
            message_status="SUCCESS_SEEDED",
            status_code=201 if (created_categories > 0 or created_subjects > 0) else 200,
            data=AdditionalData(resources=jsonable_encoder(items)),
        )
