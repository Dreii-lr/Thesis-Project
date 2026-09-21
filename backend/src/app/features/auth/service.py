"""
service.py — Authentication business logic consuming Unit of Work.
"""
from app.core.exceptions import DomainException
\
from datetime import datetime, timedelta, timezone
import hashlib

from app.core.exceptions import (
    InvalidCredentialsException,
    SessionExpiredException,
    SessionRevokedException,
    UnauthorizedDomainException,
    ValidationDomainException,
)
from app.core.firebase import verify_firebase_id_token
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
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


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class AuthService:
    @staticmethod
    async def login_with_password(
        uow: AbstractUnitOfWork,
        data: LoginRequest,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> TokenResponse:
        async with uow:
            user = await uow.users.get_by_email(data.email)
            if not user or not verify_password(data.password, user.password):
                raise InvalidCredentialsException("Invalid email or password.")

            if user.status != UserStatus.ACTIVE:
                raise UnauthorizedDomainException("User account is inactive or pending.")

            # Create tokens
            access_token = create_access_token(
                {"sub": str(user.user_id), "role": user.role.value}
            )
            refresh_token = create_refresh_token({"sub": str(user.user_id)})

            # Store session
            refresh_hash = _hash_token(refresh_token)
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)

            session = UserSession(
                user_id=user.user_id,
                refresh_token_hash=refresh_hash,
                user_agent=user_agent,
                ip_address=ip_address,
                expires_at=expires_at,
            )
            await uow.sessions.create(session)
            await uow.commit()

            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                user=UserRead.model_validate(user),
            )

    @staticmethod
    async def login_with_firebase(
        uow: AbstractUnitOfWork,
        data: FirebaseLoginRequest,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> TokenResponse:
        decoded_fb = verify_firebase_id_token(data.id_token)
        if not decoded_fb:
            raise InvalidCredentialsException("Invalid Firebase ID token.")

        email = decoded_fb.get("email")
        if not email:
            raise ValidationDomainException("Firebase token has no associated email.")

        async with uow:
            user = await uow.users.get_by_email(email)
            if not user:
                # Auto-create user from Firebase SSO details if first login
                name_parts = decoded_fb.get("name", "Firebase User").split(" ", 1)
                first_name = name_parts[0]
                last_name = name_parts[1] if len(name_parts) > 1 else ""

                user = User(
                    email=email.lower(),
                    password="",  # Managed via Firebase
                    first_name=first_name,
                    last_name=last_name,
                    role=UserRole.STUDENT,
                    status=UserStatus.ACTIVE,
                    is_verified=bool(decoded_fb.get("email_verified", True)),
                )
                user = await uow.users.create(user)

            access_token = create_access_token(
                {"sub": str(user.user_id), "role": user.role.value}
            )
            refresh_token = create_refresh_token({"sub": str(user.user_id)})

            refresh_hash = _hash_token(refresh_token)
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)

            session = UserSession(
                user_id=user.user_id,
                refresh_token_hash=refresh_hash,
                user_agent=user_agent,
                ip_address=ip_address,
                expires_at=expires_at,
            )
            await uow.sessions.create(session)
            await uow.commit()

            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                user=UserRead.model_validate(user),
            )

    @staticmethod
    async def refresh_tokens(
        uow: AbstractUnitOfWork,
        refresh_token: str,
    ) -> RefreshTokenResponse:
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise InvalidCredentialsException("Invalid token type.")
            user_id_str = payload.get("sub")
            if not user_id_str:
                raise InvalidCredentialsException("Invalid refresh token payload.")
        except DomainException:
            raise
        except Exception as e:
            raise SessionExpiredException(f"Invalid or expired refresh token: {e}")

        refresh_hash = _hash_token(refresh_token)

        async with uow:
            session = await uow.sessions.get_by_token_hash(refresh_hash)
            if not session or session.is_revoked:
                raise SessionRevokedException("Refresh session is invalid or revoked.")

            if session.expires_at.tzinfo is None:
                expires_at = session.expires_at.replace(tzinfo=timezone.utc)
            else:
                expires_at = session.expires_at

            if expires_at < datetime.now(timezone.utc):
                raise SessionExpiredException("Refresh token expired.")

            user = await uow.users.get_by_id(session.user_id)
            if not user or user.status != UserStatus.ACTIVE:
                raise UnauthorizedDomainException("User inactive or missing.")

            # Issue new access and refresh token pair
            new_access_token = create_access_token(
                {"sub": str(user.user_id), "role": user.role.value}
            )
            new_refresh_token = create_refresh_token({"sub": str(user.user_id)})

            # Revoke old session and issue new session
            session.is_revoked = True

            new_session = UserSession(
                user_id=user.user_id,
                refresh_token_hash=_hash_token(new_refresh_token),
                user_agent=session.user_agent,
                ip_address=session.ip_address,
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
            await uow.sessions.create(new_session)
            await uow.commit()

            return RefreshTokenResponse(
                access_token=new_access_token,
                refresh_token=new_refresh_token,
            )

    @staticmethod
    async def logout(uow: AbstractUnitOfWork, refresh_token: str) -> None:
        refresh_hash = _hash_token(refresh_token)
        async with uow:
            session = await uow.sessions.get_by_token_hash(refresh_hash)
            if session:
                session.is_revoked = True
                await uow.commit()
