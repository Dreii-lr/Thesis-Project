"""
service.py — Authentication business logic consuming Unit of Work.
"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
import hashlib

from app.core.exceptions import (
    InvalidCredentialsException,
    SessionExpiredException,
    SessionRevokedException,
    UnauthorizedDomainException,
    ValidationDomainException, DomainException,
)
from app.core.firebase import verify_firebase_id_token, check_email_in_firebase, sign_in_with_password, \
    create_custom_token, exchange_custom_token_for_id_tokens, refresh_firebase_token, logout
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password, hash_password,
)
from app.core.unit_of_work import AbstractUnitOfWork
from app.features.auth.models import UserSession
from app.features.auth.schemas import (
    FirebaseLoginRequest,
    LoginRequest,
    RefreshTokenResponse,
    TokenResponse,
)
from app.features.users.models import User, UserRole, UserStatus
from app.features.users.schemas import UserRead
from app.shared import retry_on_transient
from app.shared.schema import SuccessfulResponseSchema, AdditionalData


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class AuthService:
    @staticmethod
    @retry_on_transient
    async def login_with_password(
            uow: AbstractUnitOfWork,
            data: LoginRequest,
            user_agent: str | None = None,
            ip_address: str | None = None,
    ) -> SuccessfulResponseSchema:
        #check first if login using email

        if "@" in data.email: #checking if the user used email as login method, then use firebase
            firebase_data = await sign_in_with_password(data.email, data.password)

            #handling firebase login if it type email
            if firebase_data:
                #store access token and refresh token on Cookies
                response_schema = SuccessfulResponseSchema(message="Successfully logged in.",
                                                           message_status="OK")
                response_token = TokenResponse(idToken=firebase_data.get("idToken", ""), refreshToken=firebase_data.get("refreshToken", ""))
                response_schema.data = AdditionalData(token=response_token)

                return response_schema

        #login using the student number
        user = await uow.users.get_by_student_id(data.email)
        if not user or not verify_password(data.password, user.password):
            raise InvalidCredentialsException("Invalid email or password.")

        if user.status != UserStatus.ENROLLED:
            raise UnauthorizedDomainException("User account is not enrolled.")

        # Create tokens
        claims = {"user_role": user.role, "user_uid": user.user_id}
        custom_token = create_custom_token(user.firebase_uid, developer_claims=claims)
        tokens = await exchange_custom_token_for_id_tokens(custom_token)
        # access_token = create_access_token(
        #     {"sub": str(user.user_id), "role": user.role.value}
        # )
        # refresh_token = create_refresh_token({"sub": str(user.user_id)})
        #
        # # Store session
        # refresh_hash = _hash_token(refresh_token)
        # expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        #
        # session = UserSession(
        #     user_id=user.user_id,
        #     refresh_token_hash=refresh_hash,
        #     user_agent=user_agent,
        #     ip_address=ip_address,
        #     expires_at=expires_at,
        # )
        # await uow.sessions.create(session)

        response_schema = SuccessfulResponseSchema(message="Successfully logged in.", message_status="OK")
        response_schema.data = AdditionalData(token=tokens)
        return response_schema

    @staticmethod
    @retry_on_transient
    # app/core/firebase.py (already have this — no change needed)
    async def refresh_firebase_token(refresh_token: str) -> SuccessfulResponseSchema:
        if not refresh_token:
            raise UnauthorizedDomainException("No refresh token.")


        tokens = await refresh_firebase_token(refresh_token)
        if not tokens:
            raise UnauthorizedDomainException("Session expired or revoked.")

        success_schema = SuccessfulResponseSchema(message="Successfully refreshed token.",message_status="OK")
        success_schema.data =  AdditionalData(token=tokens)

        return success_schema
    @staticmethod
    @retry_on_transient
    async def logout(access_token: str) -> SuccessfulResponseSchema:
        response = SuccessfulResponseSchema(message="Successfully logged out.",
                                            message_status="LOGGED_OUT",
                                            )
        if not access_token:
            response.message = "Already logged out. Back to log in."
            return response

        logout(access_token)

        return response
