"""Authentication services; Firebase is the password authority for every login."""
from __future__ import annotations

from starlette.concurrency import run_in_threadpool

from app.core.exceptions import (
    ForbiddenDomainException,
    InvalidCredentialsException,
    UnauthorizedDomainException,
)
from app.core.firebase import (
    logout,
    refresh_firebase_token,
    send_password_reset_email,
    sign_in_with_password,
)
from app.core.unit_of_work import AbstractUnitOfWork
from app.features.auth.schemas import AccountRecoveryRequest, LoginRequest, TokenResponse
from app.features.users.models import UserStatus
from app.features.users.schemas import UserRead
from app.shared import retry_on_transient
from app.shared.schema import SuccessfulResponseSchema, AdditionalData


def _check_login_role(user: UserRead, expected_role: str | None) -> None:
    if expected_role and user.role != expected_role:
        role = getattr(user.role, "value", user.role)
        raise ForbiddenDomainException(f"This account is registered as a {role}, not a {expected_role}.")


class AuthService:
    @staticmethod
    @retry_on_transient
    async def login_with_password(
        uow: AbstractUnitOfWork,
        data: LoginRequest,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> SuccessfulResponseSchema:
        identity = data.email.strip()
        user = None
        if "@" in identity:
            email = identity.lower()
        else:
            user = await uow.users.get_by_student_id(identity)
            if not user:
                user = await uow.users.get_by_teacher_id(identity)
            if not user or not user.email or not user.firebase_uid:
                raise InvalidCredentialsException("Invalid email/ID or password.")
            email = user.email

        # A local hash can be stale after an email reset. Never use it to bypass
        # Firebase's current password, disabled-account checks, or reset flow.
        firebase_data = await sign_in_with_password(email, data.password)
        if not firebase_data:
            raise InvalidCredentialsException("Invalid email/ID or password.")
        firebase_uid = firebase_data["localId"]
        if user is not None and user.firebase_uid != firebase_uid:
            raise InvalidCredentialsException("Invalid email/ID or password.")
        if user is None:
            user = await uow.users.get_by_firebase_uid(firebase_uid)
        if not user:
            raise UnauthorizedDomainException("Your account is not registered in this application. Please contact your administrator.")
        if user.status != UserStatus.ACTIVE:
            raise UnauthorizedDomainException("User account is inactive.")
        _check_login_role(user, data.role)

        tokens = TokenResponse(idToken=firebase_data["idToken"], refreshToken=firebase_data["refreshToken"])
        return SuccessfulResponseSchema(message="Successfully logged in.", data=AdditionalData(token=tokens))

    @staticmethod
    async def recover_account(
        uow: AbstractUnitOfWork, data: AccountRecoveryRequest,
    ) -> SuccessfulResponseSchema:
        identity = data.email
        if "@" in identity:
            user = await uow.users.get_by_email(identity.lower())
        else:
            user = await uow.users.get_by_student_id(identity)
            if not user:
                user = await uow.users.get_by_teacher_id(identity)

        if user and user.status == UserStatus.ACTIVE and user.firebase_uid:
            await send_password_reset_email(user.firebase_uid)

        # Never disclose existence, account status, or the destination address.
        return SuccessfulResponseSchema(
            message="If an active account matches those details, a password reset link will be sent to its registered email address.",
        )

    @staticmethod
    async def refresh_firebase_token(refresh_token: str) -> SuccessfulResponseSchema:
        if not refresh_token:
            raise UnauthorizedDomainException("Please sign in to continue.", "TOKEN_MISSING")
        tokens = await refresh_firebase_token(refresh_token)
        if not tokens:
            raise UnauthorizedDomainException("Your session has ended. Please sign in again.", "TOKEN_REVOKED")
        return SuccessfulResponseSchema(
            message="Successfully refreshed token.", data=AdditionalData(token=tokens),
        )

    @staticmethod
    async def logout(access_token: str) -> SuccessfulResponseSchema:
        response = SuccessfulResponseSchema(
            message="Successfully logged out.", message_status="LOGGED_OUT",
        )
        if not access_token:
            response.message = "Already logged out. Back to log in."
            return response
        await run_in_threadpool(logout, access_token)
        return response
