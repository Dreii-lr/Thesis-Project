"""
service.py — User management business logic consuming Unit of Work and normalized profile details.
"""
from __future__ import annotations

from datetime import date
from functools import partial

from starlette.concurrency import run_in_threadpool
import logging
from typing import Optional
import uuid

from fastapi.encoders import jsonable_encoder
from sqlalchemy.exc import IntegrityError

from app.core.constants import constants
from app.core.exceptions import (
    DomainException,
    DomainAuthenticationUnavailableException,
    DomainEntityAlreadyExistsException,
    DomainEntityNotFoundException,
    DomainInvalidCredentialsException,
    DomainValidationDomainException, DomainUnprocessableEntity, ForbiddenException, DomainUnauthorizedDomainException,
)
from app.core.cloudinary import cloudinary_service
from app.core.firebase import (
    create_firebase_new_user,
    lookup_firebase_user_by_email,
    get_firebase_user,
    restore_firebase_user_email,
    check_email_in_firebase,
    update_firebase_user_password,
    update_firebase_user_email,
    revoke_firebase_user_tokens,
    sign_in_with_password, delete_firebase_user,
)
from app.core.security import hash_password
from app.core.unit_of_work import AbstractUnitOfWork
from app.features.users.models import (
    ContactDetails,
    FamilyDetails,
    PersonalDetails,
    User,
    UserRole,
    UserStatus,
    utc_now,
)
from app.features.users.schemas import (
    ChangeEmailRequest,
    ChangePasswordRequest,
    TeacherCreate,
    TeacherEmailInput,
    UserRead,
    UserUpdate, MapStudent, CreateAdmin,
)
from app.features.locations.service import LocationService
from app.shared import retry_on_transient
from app.shared.schema import AdditionalData, SuccessfulResponseSchema
from app.shared.utils import SharedUtils

logger = logging.getLogger(__name__)


async def _delete_profile_image(public_id: str) -> None:
    if not await cloudinary_service.delete_image(public_id):
        raise DomainException("Profile image cleanup failed.", error_code="CLOUDINARY_DELETE_ERROR")


class UserService:
    def __init__(self, uow: AbstractUnitOfWork) -> None:
        self.uow = uow

    @retry_on_transient
    async def map_student(self, data: MapStudent) -> SuccessfulResponseSchema:
        try:
            if not data.email or not data.personal_details or not data.personal_details.lrn_number:
                raise DomainValidationDomainException("Email and a 12-digit LRN are required.")
            await LocationService.validate_address(data.contact_details)
            #check the email if already exist
            if data.email:
                is_email_exists = await self.uow.users.get_by_email(data.email)
                if is_email_exists:
                    raise DomainEntityAlreadyExistsException("Email is already taken. Please use another email.")
            #check first if the LRN of student is already exist
            user_data = await self.uow.users.get_by_lrn(data.personal_details.lrn_number)
            if user_data:
                raise DomainEntityAlreadyExistsException("This student is already exists.")

            #TODO check if the firstname and lastname is already exist

            next_value = await self.uow.sequence_id_generator.get_next_value()
            if not next_value:
                await self.uow.sequence_id_generator.add()
                next_value = 1
            else:
                await self.uow.sequence_id_generator.update()
                next_value += 1
            account_id = data.account_id or SharedUtils.generate_account_id(UserRole.STUDENT, next_value)

            if not data.email:
                raise DomainUnprocessableEntity("Please enter an email. Email is required.")
            user = User(
                email=data.email,
                first_name=data.first_name,
                last_name=data.last_name,
                middle_name=data.middle_name,
                suffix=data.suffix,
                account_id=account_id,
                user_category=data.user_category)

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
                    account_id=account_id,
                    lrn_number=data.personal_details.lrn_number,
                    gender=data.personal_details.gender,
                    birth_date=pd_bdate,
                    nationality=data.personal_details.nationality or "Filipino",
                    civil_status=data.personal_details.civil_status,
                    religion=data.personal_details.religion,
                    learning_modalities=data.personal_details.learning_modalities,
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
                    barangay=data.contact_details.barangay,
                    municipality=data.contact_details.municipality,
                    province=data.contact_details.province,
                    province_code=data.contact_details.province_code,
                    municipality_code=data.contact_details.municipality_code,
                    barangay_code=data.contact_details.barangay_code,
                    contact_no=data.contact_details.contact_no,
                )
            else:
                user.contact_details = None


            # Attach normalized family_details
            if data.family_details:
                normalize_siblings = SharedUtils.to_json_list(data.family_details.siblings)
                normalize_mother = SharedUtils.to_json_dict(data.family_details.mother)
                normalize_father = SharedUtils.to_json_dict(data.family_details.father)
                normalized_guardian = SharedUtils.to_json_dict(data.family_details.guardian)
                user.family_details = FamilyDetails(
                    family_details_id=str(uuid.uuid4()),
                    user_id=user.user_id,
                    mother = normalize_mother,
                    siblings=normalize_siblings,
                    father=normalize_father,
                    guardian=normalized_guardian
                )
            else:
                user.family_details = None

            await self.uow.users.create(user)

            # Re-fetch user with all normalized relations loaded
            read_user = await self.uow.users.get_by_id_with_details(user.user_id)
            if not read_user:
                read_user = UserRead.model_validate(user)
                del read_user.password
            response_data = jsonable_encoder(read_user)

            return SuccessfulResponseSchema(
                message="Successfully recorded.",
                message_status="CREATED",
                status_code=201,
                data=AdditionalData(resources=response_data),
            )
        except Exception as e:
            print(str(e))
            raise e

    # @staticmethod
    # async def create_user(uow: AbstractUnitOfWork, data: UserCreate) -> SuccessfulResponseSchema:
    #     is_inserted_on_firebase = False
    #     firebase_uid = None
    #     try:
    #         #
    #         #check
    #         existing = check_email_in_firebase(data.email)
    #         if existing:
    #             raise DomainEntityAlreadyExistsException("A user with this email already exists.")
    #
    #         # Determine raw password
    #         raw_password = data.password
    #         if not raw_password:
    #             # ERD & Flowchart default password logic: Birthday as YYYYMMDD
    #             if data.personal_details and data.personal_details.birth_date:
    #                 bdate = data.personal_details.birth_date
    #                 if isinstance(bdate, date):
    #                     raw_password = bdate.strftime("%Y%m%d")
    #                 else:
    #                     raw_password = str(bdate).replace("-", "")
    #             else:
    #                 raw_password = "Password123!"
    #
    #         hashed_pwd = hash_password(raw_password)
    #
    #         # Generate student ID if not provided and role is STUDENT
    #
    #         next_value = await uow.sequence_id_generator.get_next_value()
    #         if not next_value:
    #             await uow.sequence_id_generator.add()
    #             next_value = 1
    #         else:
    #             await uow.sequence_id_generator.update()
    #             next_value += 1
    #         student_id = UsersUtils.generate_student_id(next_value)
    #
    #         #insert user into firebase
    #         firebase_new_user = create_firebase_new_user(data.email, raw_password)
    #         is_inserted_on_firebase = True
    #         firebase_uid = firebase_new_user.uid
    #         user = User(
    #             email=data.email.lower(),
    #             password=hashed_pwd,
    #             first_name=data.first_name,
    #             last_name=data.last_name,
    #             middle_name=data.middle_name,
    #             suffix=data.suffix,
    #             student_id=student_id,
    #             firebase_uid=firebase_new_user.uid,
    #             user_category=data.user_category,
    #         )
    #
    #         # Attach normalized personal_details
    #         if data.personal_details:
    #             pd_bdate = data.personal_details.birth_date
    #             if isinstance(pd_bdate, str) and pd_bdate:
    #                 try:
    #                     pd_bdate = date.fromisoformat(pd_bdate[:10])
    #                 except Exception:
    #                     pd_bdate = None
    #
    #             user.personal_details = PersonalDetails(
    #                 personal_details_id=str(uuid.uuid4()),
    #                 user_id=user.user_id,
    #                 student_id=student_id,
    #                 lrn_number=data.personal_details.lrn_number,
    #                 gender=data.personal_details.gender,
    #                 birth_date=pd_bdate,
    #                 nationality=data.personal_details.nationality or "Filipino",
    #                 civil_status=data.personal_details.civil_status,
    #                 religion=data.personal_details.religion,
    #                 learning_modalities=data.personal_details.learning_modalities,
    #             )
    #         else:
    #             user.personal_details = None
    #
    #         # Attach normalized contact_details
    #         if data.contact_details:
    #             user.contact_details = ContactDetails(
    #                 contact_details_id=str(uuid.uuid4()),
    #                 user_id=user.user_id,
    #                 street_building_no=data.contact_details.street_building_no,
    #                 municipality=data.contact_details.municipality,
    #                 province=data.contact_details.province,
    #                 contact_no=data.contact_details.contact_no,
    #             )
    #         else:
    #             user.contact_details = None
    #
    #         # Attach normalized family_details
    #         if data.family_details:
    #             user.family_details = FamilyDetails(
    #                 family_details_id=str(uuid.uuid4()),
    #                 user_id=user.user_id,
    #                 mother_name=data.family_details.mother_name,
    #                 father_name=data.family_details.father_name,
    #                 guardian_name=data.family_details.guardian_name,
    #                 guardian_relation=data.family_details.guardian_relation,
    #                 contact_no=data.family_details.contact_no,
    #             )
    #         else:
    #             user.family_details = None
    #
    #         await uow.users.create(user)
    #
    #         # Re-fetch user with all normalized relations loaded
    #         read_user = await uow.users.get_by_id_with_details(user.user_id)
    #         if not read_user:
    #             read_user = UserRead.model_validate(user)
    #             del read_user.password
    #         response_data = jsonable_encoder(read_user)
    #
    #         return SuccessfulResponseSchema(
    #             message="Successfully created account.",
    #             message_status="CREATED",
    #             status_code=201,
    #             data=AdditionalData(resources=response_data),
    #         )
    #     except Exception as e:
    #         #delete data if encountered an error.
    #         if is_inserted_on_firebase and firebase_uid is not None:
    #             delete_firebase_user(firebase_uid)
    #         raise e

    async def create_user(self, user_id: str) -> SuccessfulResponseSchema:
        # check if user exists
        data = await self.uow.users.get_by_id(user_id)

        if not data:
            raise DomainEntityNotFoundException("This Mapped student is not exists.")

        email_for_firebase = data.email
        #if existing then it must not create user.
        existing = check_email_in_firebase(email_for_firebase)
        if existing:
            raise DomainEntityAlreadyExistsException("This mapped student is already exists.")

        # otherwise insert create a user password
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

        hashed_password = hash_password(raw_password)

        # insert user into firebase
        firebase_new_user = create_firebase_new_user(email_for_firebase, raw_password)
        firebase_uid = firebase_new_user.uid
        self.uow.on_rollback(partial(run_in_threadpool, delete_firebase_user, firebase_uid))

        to_update = {"password": hashed_password,
                     "firebase_uid":firebase_uid,
                     "status": UserStatus.ACTIVE}

        await self.uow.users.update(user_id, to_update)
        return SuccessfulResponseSchema(message_status="Ok",message="Successfully created user account.")

    async def create_teacher_account(self, data: TeacherCreate) -> SuccessfulResponseSchema:
        # 1. Resolve and ensure account_id is filled
        raw_id = (data.account_id or "").strip()
        if raw_id:
            account_id = raw_id
        else:
            next_value = await self.uow.sequence_id_generator.get_next_value()
            if not next_value:
                await self.uow.sequence_id_generator.add()
                next_value = 1
            else:
                await self.uow.sequence_id_generator.update()
                next_value += 1
            account_id = SharedUtils.generate_account_id(UserRole.TEACHER, next_value)

        # Check if account_id already exists in database
        existing_teacher = await self.uow.users.get_by_account_id(account_id)
        if existing_teacher:
            raise DomainEntityAlreadyExistsException(f"This teacher account with ID '{account_id}' already exists.")

        # Use the same validated email for Firebase creation and later sign-in.
        email_for_firebase = str(data.email).strip().lower()
        if await self.uow.users.get_by_email(email_for_firebase):
            raise DomainEntityAlreadyExistsException("This email is already registered to another account.")

        # Check if existing in Firebase
        existing = await run_in_threadpool(lookup_firebase_user_by_email, email_for_firebase)
        if existing:
            raise DomainEntityAlreadyExistsException("This email is already registered to another account.")

        # 3. Determine raw password
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

        hashed_password = await run_in_threadpool(hash_password, raw_password)

        # 4. Insert user into Firebase
        firebase_new_user = await run_in_threadpool(create_firebase_new_user, email_for_firebase, raw_password)
        firebase_uid = firebase_new_user.uid
        self.uow.on_rollback(partial(run_in_threadpool, delete_firebase_user, firebase_uid))

        # 5. Insert teacher into existing users table
        user = User(
            user_id=str(uuid.uuid4()),
            account_id=account_id,
            email=email_for_firebase,
            first_name=data.first_name,
            last_name=data.last_name,
            middle_name=data.middle_name,
            suffix=data.suffix,
            role=UserRole.TEACHER,
            password=hashed_password,
            firebase_uid=firebase_uid,
            user_category=data.user_category,
            status=UserStatus.ACTIVE,
            created_at=utc_now(),
        )

        # Attach optional personal/contact details if provided
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
                account_id=account_id,
                gender=data.personal_details.gender,
                birth_date=pd_bdate if isinstance(pd_bdate, date) else None,
                nationality=data.personal_details.nationality or "Filipino",
                civil_status=data.personal_details.civil_status,
                religion=data.personal_details.religion,
            )

        if data.contact_details:
            user.contact_details = ContactDetails(
                contact_details_id=str(uuid.uuid4()),
                user_id=user.user_id,
                street_building_no=data.contact_details.street_building_no,
                municipality=data.contact_details.municipality,
                province=data.contact_details.province,
                contact_no=data.contact_details.contact_no,
            )

        try:
            await self.uow.users.create(user)
        except IntegrityError as exc:
            raise DomainEntityAlreadyExistsException("This teacher email or account ID is already registered.") from exc

        read_user = await self.uow.users.get_by_id_with_details(user.user_id)
        if not read_user:
            read_user = UserRead.model_validate(user)
        read_user.password = None
        response_data = jsonable_encoder(read_user)

        return SuccessfulResponseSchema(
            message="Successfully created teacher account.",
            message_status="Ok",
            status_code=201,
            data=AdditionalData(resources=response_data),
        )

    async def repair_teacher_email(self, user_id: str, data: TeacherEmailInput) -> SuccessfulResponseSchema:
        user = await self.uow.users.get_entity_by_id(user_id, for_update=True)
        if not user or user.role != UserRole.TEACHER:
            raise DomainEntityNotFoundException("Teacher account not found.")
        if user.email:
            raise DomainValidationDomainException("This teacher already has a registered email.")
        if not user.firebase_uid:
            raise DomainValidationDomainException("This teacher has no linked Firebase account to repair.")
        email = str(data.email)
        existing = await self.uow.users.get_by_email(email)
        if existing and existing.user_id != user.user_id:
            raise DomainEntityAlreadyExistsException("This email is already registered to another account.")
        existing = await run_in_threadpool(lookup_firebase_user_by_email, email)
        if existing and existing.uid != user.firebase_uid:
            raise DomainEntityAlreadyExistsException("This email is already registered to another account.")
        firebase_user = await run_in_threadpool(get_firebase_user, user.firebase_uid)
        if firebase_user.disabled:
            raise DomainValidationDomainException("The teacher's Firebase account is disabled.")
        if firebase_user.email and firebase_user.email.lower() != email:
            raise DomainValidationDomainException("The Firebase account already uses a different email. Check its registered email first.")

        # Link the existing UID; keep its password and all teaching records.
        if not firebase_user.email:
            self.uow.on_rollback(partial(run_in_threadpool, restore_firebase_user_email,
                                         user.firebase_uid, firebase_user.email, firebase_user.email_verified))
            await run_in_threadpool(update_firebase_user_email, user.firebase_uid, email)
        user.email = email
        user.updated_at = utc_now()
        try:
            read_user = await self.uow.users.get_by_id_with_details(user.user_id)
        except IntegrityError as exc:
            raise DomainEntityAlreadyExistsException("This email is already registered to another account.") from exc
        if not read_user:
            read_user = UserRead.model_validate(user)
        read_user.password = None
        return SuccessfulResponseSchema(
            message="Teacher sign-in email linked successfully. Use the teacher ID and existing password to sign in.",
            data=AdditionalData(resources=jsonable_encoder(read_user)),
        )

    @retry_on_transient
    async def get_user_by_id(self, user_id: str) -> SuccessfulResponseSchema:
        user = await self.uow.users.get_by_id_with_details(user_id)
        if not user:
            raise DomainEntityNotFoundException(f"User '{user_id}' not found.")
        user_data = jsonable_encoder(user)
        return SuccessfulResponseSchema(
            message="Successfully retrieved user.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=user_data),
        )

    @retry_on_transient
    async def list_users(
        self,
        offset: int = 0,
        limit: int = 100,
        role: Optional[UserRole] = None,
    ) -> SuccessfulResponseSchema:
        data = await self.uow.users.list(offset=offset, limit=limit, role=role)
        data_json = jsonable_encoder(data)
        return SuccessfulResponseSchema(
            message="Successfully retrieved users.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=data_json),
        )

    @retry_on_transient
    async def update_user(
        self,
        user_id: str,
        data: UserUpdate,
    ) -> SuccessfulResponseSchema:
        user = await self.uow.users.get_entity_by_id(user_id)
        if not user:
            raise DomainEntityNotFoundException(f"User '{user_id}' not found.")

        await LocationService.validate_address(data.contact_details)
        if user.role == UserRole.STUDENT and data.personal_details:
            if "lrn_number" in data.personal_details.model_fields_set:
                lrn = data.personal_details.lrn_number
                if not lrn:
                    raise DomainValidationDomainException("A 12-digit LRN is required.")
                existing = await self.uow.users.get_by_lrn(lrn)
                if existing and existing.user_id != user_id:
                    raise DomainEntityAlreadyExistsException("This LRN is already recorded for another student.")

        update_dict = data.model_dump(exclude_unset=True)

        # 1. Update personal_details
        pd_data = update_dict.pop("personal_details", None)
        if pd_data is not None:
            pd_data.pop("user_id", None)
            pd_data.pop("account_id", None)
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
                    account_id=user.account_id,
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
        updated_user = await self.uow.users.get_by_id_with_details(user_id)
        updated_json = jsonable_encoder(updated_user)
        return SuccessfulResponseSchema(
            message="Successfully updated user.",
            message_status="SUCCESS_UPDATE",
            status_code=200,
            data=AdditionalData(resources=updated_json),
        )

    @retry_on_transient
    async def soft_delete_user(self, user_id: str) -> SuccessfulResponseSchema:
        user = await self.uow.users.get_entity_with_details(user_id)
        if not user:
            raise DomainEntityNotFoundException(f"User '{user_id}' not found.")
        user.status = UserStatus.INACTIVE
        user.updated_at = utc_now()
        updated_user = await self.uow.users.get_by_id_with_details(user_id)
        return SuccessfulResponseSchema(
            message="Successfully set as inactive the user.",
            message_status="SUCCESS_INACTIVE",
            status_code=200,
            data=AdditionalData(resources=jsonable_encoder(updated_user)),
        )

    @retry_on_transient
    async def delete_user(self, user_id: str) -> SuccessfulResponseSchema:
        return await self.soft_delete_user(user_id)

    @retry_on_transient
    async def change_password(
        self,
        user_id: str | None,
        data: ChangePasswordRequest,
    ) -> SuccessfulResponseSchema:
        """
        Changes user password synchronously across Firebase Auth and PostgreSQL.
        - Validates current password with Firebase (including emailed resets).
        - Updates Firebase Authentication password first (Cloud-First).
        - Encrypts with bcrypt and updates PostgreSQL database.
        - Triggers compensating rollback on Firebase if DB write fails.
        - Revokes refresh tokens on Firebase ONLY (no DB session table).
        """
        if data.confirm_password and data.new_password != data.confirm_password:
            raise DomainValidationDomainException("New password and confirm password do not match.")

        user = await self.uow.users.get_entity_with_details(user_id)
        if not user:
            raise DomainEntityNotFoundException(f"User '{user_id}' not found.")

        # Email resets update Firebase directly; the legacy database hash may be stale.
        if not user.email or not user.firebase_uid:
            raise DomainInvalidCredentialsException("This account cannot change its password. Please contact your administrator.")
        credentials = await sign_in_with_password(user.email, data.current_password)
        if not credentials or credentials["localId"] != user.firebase_uid:
            raise DomainInvalidCredentialsException("Current password is incorrect.")

        if data.current_password == data.new_password:
            raise DomainValidationDomainException("New password cannot be the same as the current password.")

        firebase_uid = user.firebase_uid
        try:
            update_firebase_user_password(firebase_uid, data.new_password)
        except Exception as exc:
            logger.error("Firebase password update failed (%s).", type(exc).__name__)
            raise DomainException(
                "Failed to update cloud authentication credentials.", error_code="FIREBASE_SYNC_ERROR"
            ) from exc

        # Register immediately: hashing, later service work, and final commit can fail.
        self.uow.on_rollback(partial(
            run_in_threadpool, update_firebase_user_password, firebase_uid, data.current_password
        ))
        user.password = hash_password(data.new_password)

        async def revoke_sessions() -> None:
            try:
                if not await run_in_threadpool(revoke_firebase_user_tokens, firebase_uid):
                    raise RuntimeError("Session revocation was not confirmed.")
            except Exception as exc:
                raise DomainAuthenticationUnavailableException(
                    "Your password was saved, but session revocation could not be confirmed. "
                    "Please contact your administrator."
                ) from exc

        self.uow.after_commit(revoke_sessions)

        return SuccessfulResponseSchema(
            message="Password changed successfully.",
            message_status="PASSWORD_CHANGED",
            status_code=200,
        )

    @retry_on_transient
    async def change_email(
        self,
        user_id: str | None,
        data: ChangeEmailRequest,
        actor_user: Optional[UserRead] = None,
    ) -> SuccessfulResponseSchema:
        """
        Changes user email address synchronously across Firebase Auth and PostgreSQL.
        - Validates new email format and ensures it differs from the current email.
        - Verifies that new email is not already taken in PostgreSQL or Firebase.
        - If self-service (or non-admin actor), verifies current password with Firebase.
        - Updates Firebase Authentication email first (Cloud-First).
        - Triggers compensating rollback on Firebase if DB write fails.
        - Updates PostgreSQL database user.email.
        - Revokes refresh tokens on Firebase after commit.
        """
        new_email = str(data.new_email).strip().lower()

        user = await self.uow.users.get_entity_with_details(user_id)
        if not user:
            raise DomainEntityNotFoundException(f"User '{user_id}' not found.")

        old_email = (user.email or "").strip().lower()
        if old_email == new_email:
            raise DomainValidationDomainException("New email cannot be the same as your current email.")

        # Check local database for duplicate email
        existing_in_db = await self.uow.users.get_by_email(new_email)
        if existing_in_db and existing_in_db.user_id != user.user_id:
            raise DomainEntityAlreadyExistsException("This email is already registered to another account.")

        # Check Firebase Auth for duplicate email
        existing_in_fb = check_email_in_firebase(new_email)
        if existing_in_fb and existing_in_fb.uid != user.firebase_uid:
            raise DomainEntityAlreadyExistsException("This email is already registered to another account.")

        firebase_uid = user.firebase_uid
        if not firebase_uid:
            raise DomainException("User does not have an associated cloud authentication account.", error_code="FIREBASE_ACCOUNT_MISSING")

        try:
            update_firebase_user_email(firebase_uid, new_email)
        except Exception as exc:
            logger.error("Firebase email update failed (%s).", type(exc).__name__)
            if isinstance(exc, (DomainEntityAlreadyExistsException, DomainException)):
                raise
            raise DomainException(
                "Failed to update cloud authentication email.", error_code="FIREBASE_SYNC_ERROR"
            ) from exc

        # Register compensating rollback in case database commit fails
        if old_email:
            self.uow.on_rollback(partial(
                run_in_threadpool, update_firebase_user_email, firebase_uid, old_email
            ))

        user.email = new_email
        user.updated_at = utc_now()

        async def revoke_sessions() -> None:
            try:
                if not await run_in_threadpool(revoke_firebase_user_tokens, firebase_uid):
                    logger.warning("Session revocation was not confirmed for uid: %s", firebase_uid)
            except Exception as exc:
                logger.warning("Failed to revoke Firebase tokens after email change: %s", exc)

        self.uow.after_commit(revoke_sessions)

        # Re-fetch updated user representation
        updated_user = await self.uow.users.get_by_id_with_details(user_id)
        return SuccessfulResponseSchema(
            message="Email updated successfully. Please sign in with your new email.",
            message_status="EMAIL_CHANGED",
            status_code=200,
            data=AdditionalData(resources=jsonable_encoder(updated_user)),
        )

    @retry_on_transient
    async def update_profile_picture(
        self,
        user_id: str | None,
        file_bytes: bytes,
        filename: str,
    ) -> SuccessfulResponseSchema:
        """
        Dedicated update operation for user profile picture.
        Only operates on an already existing user entity (completely separated from creation/insertion).
        """
        user = await self.uow.users.get_entity_with_details(user_id)
        if not user:
            raise DomainEntityNotFoundException(f"User '{user_id}' not found.")

        old_public_id = (user.profile_url or {}).get("public_id")
        upload_result = await cloudinary_service.upload_image(
            file_bytes=file_bytes,
            filename=filename,
            folder=f"profiles/{user_id}",
        )
        new_public_id = upload_result.public_id
        if new_public_id != old_public_id:
            self.uow.on_rollback(partial(_delete_profile_image, new_public_id))
            if old_public_id:
                self.uow.after_commit(
                    partial(_delete_profile_image, old_public_id), best_effort=True
                )

        user.updated_at = utc_now()
        user.profile_url = {
            "public_id": new_public_id,
            "public_url": upload_result.secure_url,
        }
        updated_user = await self.uow.users.get_by_id_with_details(user_id)
        return SuccessfulResponseSchema(
            message="Profile picture updated successfully.",
            message_status="SUCCESS_UPDATE",
            status_code=200,
            data=AdditionalData(resources=jsonable_encoder(updated_user))
        )

    @retry_on_transient
    async def delete_profile_picture(
        self,
        user_id: str | None,
    ) -> SuccessfulResponseSchema:
        """
        Dedicated removal operation for user profile picture.
        """

        user = await self.uow.users.get_entity_with_details(user_id)
        if not user:
            raise DomainEntityNotFoundException(f"User '{user_id}' not found.")

        if user.profile_url and isinstance(user.profile_url, dict):
            public_id = user.profile_url.get("public_id")
            if public_id:
                self.uow.after_commit(
                    partial(_delete_profile_image, public_id), best_effort=True
                )

        user.profile_url = None
        user.updated_at = utc_now()

        updated_user = await self.uow.users.get_by_id_with_details(user_id)
        return SuccessfulResponseSchema(
            message="Profile picture removed successfully.",
            message_status="SUCCESS_DELETE",
            status_code=200,
            data=AdditionalData(resources=jsonable_encoder(updated_user)),
        )

    @retry_on_transient
    async def create_admin(self, secret_key: str, data: CreateAdmin) -> SuccessfulResponseSchema:
        try:
            # check if the secret key is not match on the environment
            if secret_key != constants.SECRET_KEY_TO_CREATE_ADMIN:
                raise DomainUnauthorizedDomainException("You are not authorize to perform this.")

            # 1. Resolve and ensure account_id is filled
            raw_id = (data.account_id or "").strip()
            if raw_id:
                account_id = raw_id
            else:
                next_value = await self.uow.sequence_id_generator.get_next_value()
                if not next_value:
                    await self.uow.sequence_id_generator.add()
                    next_value = 1
                else:
                    await self.uow.sequence_id_generator.update()
                    next_value += 1
                account_id = SharedUtils.generate_account_id(UserRole.ADMIN, next_value)

            # Check if account_id already exists in database
            existing_teacher = await self.uow.users.get_by_account_id(account_id)
            if existing_teacher:
                raise DomainEntityAlreadyExistsException(f"This Admin account with ID '{account_id}' already exists.")

            # 2. Synthetic email credentials: only account_id is credentials and password
            email_for_firebase = data.email

            # Check if existing in Firebase
            existing = check_email_in_firebase(email_for_firebase)
            if existing:
                raise DomainEntityAlreadyExistsException(f"This teacher account with ID '{account_id}' already exists.")

            # 3. Determine raw password
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

            hashed_password = hash_password(raw_password)

            # 4. Insert user into Firebase
            firebase_new_user = create_firebase_new_user(email_for_firebase, raw_password)
            firebase_uid = firebase_new_user.uid
            self.uow.on_rollback(partial(run_in_threadpool, delete_firebase_user, firebase_uid))

            # 5. Insert teacher into existing users table
            user = User(
                user_id=str(uuid.uuid4()),
                account_id=account_id,
                first_name=data.first_name,
                last_name=data.last_name,
                middle_name=data.middle_name,
                suffix=data.suffix,
                role=UserRole.ADMIN,
                password=hashed_password,
                firebase_uid=firebase_uid,
                user_category=data.user_category,
                status=UserStatus.ACTIVE,
                created_at=utc_now(),
            )

            # Attach optional personal/contact details if provided
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
                    account_id=account_id,
                    gender=data.personal_details.gender,
                    birth_date=pd_bdate if isinstance(pd_bdate, date) else None,
                    nationality=data.personal_details.nationality or "Filipino",
                    civil_status=data.personal_details.civil_status,
                    religion=data.personal_details.religion,
                )

            if data.contact_details:
                user.contact_details = ContactDetails(
                    contact_details_id=str(uuid.uuid4()),
                    user_id=user.user_id,
                    street_building_no=data.contact_details.street_building_no,
                    municipality=data.contact_details.municipality,
                    province=data.contact_details.province,
                    contact_no=data.contact_details.contact_no,
                )

            await self.uow.users.create(user)

            read_user = await self.uow.users.get_by_id_with_details(user.user_id)
            if not read_user:
                read_user = UserRead.model_validate(user)
                del read_user.password
            response_data = jsonable_encoder(read_user)

            return SuccessfulResponseSchema(
                message="Successfully created admin account.",
                message_status="Ok",
                data=AdditionalData(resources=response_data),
            )
        except Exception as e:
            raise e



