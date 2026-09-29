"""
service.py — User management business logic consuming Unit of Work and normalized profile details.
"""
from __future__ import annotations

from datetime import date
from typing import Any
import uuid

from fastapi.encoders import jsonable_encoder

from app.core.exceptions import EntityAlreadyExistsException, EntityNotFoundException
from app.core.firebase import create_firebase_new_user, check_email_in_firebase
from app.core.security import hash_password
from app.core.unit_of_work import AbstractUnitOfWork
from app.features.users.models import (
    ContactDetails,
    FamilyDetails,
    PersonalDetails,
    User,
    UserCategory,
    UserRole,
    UserStatus,
    utc_now,
)
from app.features.users.schemas import (
    ListUserRead,
    TeacherCreate,
    UserCreate,
    UserRead,
    UserUpdate,
)
from app.features.users.utils import UsersUtils
from app.shared.schema import AdditionalData, SuccessfulResponseSchema


class UserService:
    @staticmethod
    async def create_user(uow: AbstractUnitOfWork, data: UserCreate) -> SuccessfulResponseSchema:
        existing = check_email_in_firebase(data.email)
        if existing:
            raise EntityAlreadyExistsException("A user with this email already exists.")

        # Determine raw password
        raw_password = data.password
        if not raw_password:
            # ERD & Flowchart default password logic: Birthday as YYYYMMDD
            if data.personal_details and data.personal_details.birth_date:
                bdate = data.personal_details.birth_date
                if isinstance(bdate, date):
                    raw_password = bdate.strftime("%Y%m%d")
                else:
                    raw_password = str(bdate).replace("-", "")
            else:
                raw_password = "Password123!"

        hashed_pwd = hash_password(raw_password)

        # Generate student ID if not provided and role is STUDENT

        next_value = await uow.sequence_id_generator.get_next_value()
        if not next_value:
            await uow.sequence_id_generator.add()
            next_value = 1
        else:
            await uow.sequence_id_generator.update()
            next_value += 1
        student_id = UsersUtils.generate_student_id(next_value)

        firebase_new_user = create_firebase_new_user(data.email, raw_password)
        user = User(
            email=data.email.lower(),
            password=hashed_pwd,
            first_name=data.first_name,
            last_name=data.last_name,
            middle_name=data.middle_name,
            suffix=data.suffix,
            student_id=student_id,
            firebase_uid=firebase_new_user.uid,
            user_category=data.user_category,
        )

        # Attach normalized personal_details
        if data.personal_details:
            pd_bdate = data.personal_details.birth_date
            if isinstance(pd_bdate, str) and pd_bdate:
                try:
                    pd_bdate = date.fromisoformat(pd_bdate[:10])
                except Exception:
                    pd_bdate = None

            user.personal_details = PersonalDetails(
                personal_details_id=str(uuid.uuid4()),
                user_id=user.user_id,
                student_id=student_id,
                lrn_number=data.personal_details.lrn_number,
                gender=data.personal_details.gender,
                birth_date=pd_bdate,
                nationality=data.personal_details.nationality or "Filipino",
                civil_status=data.personal_details.civil_status,
                religion=data.personal_details.religion,
                place_of_birth=data.personal_details.place_of_birth,
            )
        else:
            user.personal_details = None

        # Attach normalized contact_details
        if data.contact_details:
            user.contact_details = ContactDetails(
                contact_details_id=str(uuid.uuid4()),
                user_id=user.user_id,
                street_building_no=data.contact_details.street_building_no,
                municipality=data.contact_details.municipality,
                province=data.contact_details.province,
                contact_no=data.contact_details.contact_no,
            )
        else:
            user.contact_details = None

        # Attach normalized family_details
        if data.family_details:
            user.family_details = FamilyDetails(
                family_details_id=str(uuid.uuid4()),
                user_id=user.user_id,
                mother_name=data.family_details.mother_name,
                father_name=data.family_details.father_name,
                guardian_name=data.family_details.guardian_name,
                guardian_relation=data.family_details.guardian_relation,
                contact_no=data.family_details.contact_no,
            )
        else:
            user.family_details = None

        await uow.users.create(user)

        # Re-fetch user with all normalized relations loaded
        read_user = await uow.users.get_by_id_with_details(user.user_id)
        if not read_user:
            read_user = UserRead.model_validate(user)
            del read_user.password
        response_data = jsonable_encoder(read_user)

        return SuccessfulResponseSchema(
            message="Successfully created account.",
            message_status="CREATED",
            status_code=201,
            data=AdditionalData(resources=response_data),
        )

    @staticmethod
    async def create_teacher(uow: AbstractUnitOfWork, data: TeacherCreate) -> SuccessfulResponseSchema:
        #check in the firebase first
        existing = check_email_in_firebase(data.email)
        if existing:
            raise EntityAlreadyExistsException("A user with this email already exists.")



        # Determine teacher_id
        teacher_id = data.teacher_id
        if teacher_id:
            existing_teacher = await uow.users.get_by_teacher_id(teacher_id)
            if existing_teacher:
                raise EntityAlreadyExistsException(f"A user with teacher ID '{teacher_id}' already exists.")
        else:
            try:
                next_value = await uow.sequence_id_generator.get_next_value()
                if not next_value:
                    await uow.sequence_id_generator.add()
                    next_value = 1
                else:
                    await uow.sequence_id_generator.update()
                    next_value += 1
                teacher_id = UsersUtils.generate_teacher_id(next_value)
            except Exception:
                teacher_id = UsersUtils.generate_teacher_id()

        # Determine raw password
        raw_password = data.password
        if not raw_password:
            if data.personal_details and data.personal_details.birth_date:
                bdate = data.personal_details.birth_date
                if isinstance(bdate, date):
                    raw_password = bdate.strftime("%Y%m%d")
                else:
                    raw_password = str(bdate).replace("-", "")
            else:
                raw_password = "Password123!"

        hashed_pwd = hash_password(raw_password)
        # Sync with Firebase Authentication (handles offline/test modes)

        firebase_new_user = create_firebase_new_user(data.email, raw_password)

        user = User(
            email=data.email.lower(),
            password=hashed_pwd,
            first_name=data.first_name,
            last_name=data.last_name,
            middle_name=data.middle_name,
            suffix=data.suffix,
            firebase_uid=firebase_new_user.uid,
            teacher_id=teacher_id,
            student_id=None,
            role=UserRole.TEACHER,
            user_category=None,
        )

        # Attach normalized personal_details
        if data.personal_details:
            pd_bdate = data.personal_details.birth_date
            if isinstance(pd_bdate, str) and pd_bdate:
                try:
                    pd_bdate = date.fromisoformat(pd_bdate[:10])
                except Exception:
                    pd_bdate = None

            user.personal_details = PersonalDetails(
                personal_details_id=str(uuid.uuid4()),
                user_id=user.user_id,
                student_id=None,
                lrn_number=data.personal_details.lrn_number,
                gender=data.personal_details.gender,
                birth_date=pd_bdate,
                nationality=data.personal_details.nationality or "Filipino",
                civil_status=data.personal_details.civil_status,
                religion=data.personal_details.religion,
                place_of_birth=data.personal_details.place_of_birth,
            )
        else:
            user.personal_details = None

        # Attach normalized contact_details
        if data.contact_details:
            user.contact_details = ContactDetails(
                contact_details_id=str(uuid.uuid4()),
                user_id=user.user_id,
                street_building_no=data.contact_details.street_building_no,
                municipality=data.contact_details.municipality,
                province=data.contact_details.province,
                contact_no=data.contact_details.contact_no,
            )
        else:
            user.contact_details = None

        # Attach normalized family_details
        if data.family_details:
            user.family_details = FamilyDetails(
                family_details_id=str(uuid.uuid4()),
                user_id=user.user_id,
                mother_name=data.family_details.mother_name,
                father_name=data.family_details.father_name,
                guardian_name=data.family_details.guardian_name,
                guardian_relation=data.family_details.guardian_relation,
                contact_no=data.family_details.contact_no,
            )
        else:
            user.family_details = None

        await uow.users.create(user)

        # Re-fetch user with all normalized relations loaded
        read_user = await uow.users.get_by_id_with_details(user.user_id,)
        if not read_user:
            read_user = UserRead.model_validate(user)
            del read_user.password
        response_data = jsonable_encoder(read_user)

        return SuccessfulResponseSchema(
            message="Successfully created teacher account.",
            message_status="CREATED",
            status_code=201,
            data=AdditionalData(resources=response_data),
        )

    @staticmethod
    async def get_user_by_id(uow: AbstractUnitOfWork, user_id: str) -> SuccessfulResponseSchema:
        user = await uow.users.get_by_id_with_details(user_id)
        if not user:
            raise EntityNotFoundException(f"User '{user_id}' not found.")
        user_data = jsonable_encoder(user)
        return SuccessfulResponseSchema(
            message="Successfully retrieved user.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=user_data),
        )

    @staticmethod
    async def list_users(
        uow: AbstractUnitOfWork,
        offset: int = 0,
        limit: int = 100,
    ) -> SuccessfulResponseSchema:
        data = await uow.users.list(offset=offset, limit=limit)
        data_json = jsonable_encoder(data)
        return SuccessfulResponseSchema(
            message="Successfully retrieved users.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=data_json),
        )

    @staticmethod
    async def update_user(
        uow: AbstractUnitOfWork,
        user_id: str,
        data: UserUpdate,
    ) -> SuccessfulResponseSchema:
        user = await uow.users.get_entity_with_details(user_id)
        if not user:
            raise EntityNotFoundException(f"User '{user_id}' not found.")

        update_dict = data.model_dump(exclude_unset=True)

        # 1. Update personal_details
        pd_data = update_dict.pop("personal_details", None)
        if pd_data is not None:
            if "birth_date" in pd_data and isinstance(pd_data["birth_date"], str) and pd_data["birth_date"]:
                try:
                    pd_data["birth_date"] = date.fromisoformat(pd_data["birth_date"][:10])
                except Exception:
                    pass

            if user.personal_details:
                for field, value in pd_data.items():
                    if value is not None and hasattr(user.personal_details, field):
                        setattr(user.personal_details, field, value)
                user.personal_details.updated_at = utc_now()
            else:
                user.personal_details = PersonalDetails(
                    personal_details_id=str(uuid.uuid4()),
                    user_id=user_id,
                    student_id=user.student_id,
                    created_at=utc_now(),
                    updated_at=utc_now(),
                    **pd_data,
                )

        # 2. Update contact_details
        cd_data = update_dict.pop("contact_details", None)
        if cd_data is not None:
            if user.contact_details:
                for field, value in cd_data.items():
                    if value is not None and hasattr(user.contact_details, field):
                        setattr(user.contact_details, field, value)
                user.contact_details.updated_at = utc_now()
            else:
                user.contact_details = ContactDetails(
                    contact_details_id=str(uuid.uuid4()),
                    user_id=user_id,
                    created_at=utc_now(),
                    updated_at=utc_now(),
                    **cd_data,
                )

        # 3. Update family_details
        fd_data = update_dict.pop("family_details", None)
        if fd_data is not None:
            if user.family_details:
                for field, value in fd_data.items():
                    if value is not None and hasattr(user.family_details, field):
                        setattr(user.family_details, field, value)
                user.family_details.updated_at = utc_now()
            else:
                user.family_details = FamilyDetails(
                    family_details_id=str(uuid.uuid4()),
                    user_id=user_id,
                    created_at=utc_now(),
                    updated_at=utc_now(),
                    **fd_data,
                )

        # 4. Update core user fields
        for field, value in update_dict.items():
            if value is not None and hasattr(user, field):
                setattr(user, field, value)
        user.updated_at = utc_now()

        # Re-fetch updated user with all details
        updated_user = await uow.users.get_by_id_with_details(user_id)
        updated_json = jsonable_encoder(updated_user)
        return SuccessfulResponseSchema(
            message="Successfully updated user.",
            message_status="SUCCESS_UPDATE",
            status_code=200,
            data=AdditionalData(resources=updated_json),
        )

    @staticmethod
    async def soft_delete_user(uow: AbstractUnitOfWork, user_id: str) -> SuccessfulResponseSchema:
        user = await uow.users.get_entity_with_details(user_id)
        if not user:
            raise EntityNotFoundException(f"User '{user_id}' not found.")
        user.status = UserStatus.INACTIVE
        user.updated_at = utc_now()
        updated_user = await uow.users.get_by_id_with_details(user_id)
        return SuccessfulResponseSchema(
            message="Successfully set as inactive the user.",
            message_status="SUCCESS_INACTIVE",
            status_code=200,
            data=AdditionalData(resources=jsonable_encoder(updated_user)),
        )

    @staticmethod
    async def delete_user(uow: AbstractUnitOfWork, user_id: str) -> SuccessfulResponseSchema:
        return await UserService.soft_delete_user(uow, user_id)
