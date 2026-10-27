"""
repository.py — Data access layer for User entity.
"""
from __future__ import annotations

from sqlalchemy import Sequence, func, update, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.features.users import UserRole, PersonalDetails
from app.features.users.models import User, UserStatus, utc_now
from app.features.users.schemas import UserRead, ListUserRead


def _user_query():
    return select(User).options(
        selectinload(User.personal_details),
        selectinload(User.contact_details),
        selectinload(User.family_details),
    )


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: str) -> UserRead | None:
        """Retrieve user by ID including all normalized details (personal, contact, family)."""
        statement = _user_query().where(User.user_id == user_id)
        result = await self._session.execute(statement)
        data = result.scalar_one_or_none()
        return UserRead.model_validate(data) if data is not None else None

    async def get_by_lrn(self, lrn: str) -> UserRead | None:
        """Retrieve user by ID including all normalized details (personal, contact, family)."""
        statement = _user_query().join(PersonalDetails, PersonalDetails.user_id == User.user_id).where(PersonalDetails.lrn_number == lrn)
        result = await self._session.execute(statement)
        data = result.scalar_one_or_none()
        return UserRead.model_validate(data) if data is not None else None

    async def get_by_id_with_details(self, user_id: str) -> UserRead | None:
        """
        Get or select user including its other info (personal_details, contact_details, family_details)
        that matches the UserRead response schema.
        """
        # Services may have edited tracked entities with autoflush disabled.
        await self._session.flush()
        statement = _user_query().where(User.user_id == user_id).execution_options(populate_existing=True)
        result = await self._session.execute(statement)
        data = result.scalar_one_or_none()
        if data is not None:
            user_read = UserRead.model_validate(data)
            user_read.password = None
            return user_read
        return None

    async def get_user_with_details(self, user_id: str) -> UserRead | None:
        """Alias for get_by_id_with_details."""
        return await self.get_by_id_with_details(user_id)

    async def get_by_id_no_password(self, user_id: str) -> UserRead | None:
        """Retrieve user with all details and exclude sensitive password."""
        statement = _user_query().where(User.user_id == user_id)
        result = await self._session.execute(statement)
        data = result.scalar_one_or_none()
        if data is not None:
            user_read = UserRead.model_validate(data)
            user_read.password = None
            return user_read
        return None

    async def get_by_email(self, email: str) -> UserRead | None:
        statement = _user_query().where(User.email == email.lower())
        result = await self._session.execute(statement)
        data = result.scalar_one_or_none()
        return UserRead.model_validate(data) if data is not None else None

    async def select_user_with_details(self, user_id: str) -> UserRead | None:
        """Select user including its other info matching UserRead response schema."""
        return await self.get_by_id_with_details(user_id)

    async def get_entity_with_details(self, user_id: str) -> User | None:
        """Return the tracked entity; redact credentials only in response DTOs."""
        return await self.get_entity_by_id(user_id)

    async def get_by_account_id(self, account_id: str) -> UserRead | None:
        stmt = _user_query().where(User.account_id == account_id)
        result = await self._session.execute(stmt)
        data = result.scalar_one_or_none()

        if data is not None:
            user_read = UserRead.model_validate(data)
            return user_read
        return None

    async def get_entity_by_account_id(self, account_id: str) -> User | None:
        statement = _user_query().where(User.account_id == account_id)
        result = await self._session.execute(statement)
        return result.scalar_one_or_none()

    async def get_entity_by_id(self, user_id: str) -> User | None:
        """Return a tracked entity so nested profile edits are persisted."""
        result = await self._session.execute(_user_query().where(User.user_id == user_id))
        return result.scalar_one_or_none()

    async def get_by_firebase_uid(self, firebase_uid: str) -> UserRead | None:
        statement = _user_query().where(User.firebase_uid == firebase_uid)
        result = await self._session.execute(statement)
        data = result.scalar_one_or_none()
        if data is not None:
            user_read = UserRead.model_validate(data)
            user_read.password = None
            return user_read
        return None

    async def list(self, offset: int = 0, limit: int = 100, role: UserRole | None = UserRole.STUDENT) -> ListUserRead:
        """
        List users with pagination, including all normalized details (personal, contact, family)
        matching the ListUserRead response schema.
        """
        filter_role = role or UserRole.STUDENT
        if filter_role == UserRole.STUDENT:
            count_stmt = select(func.count(User.user_id)).where(and_(User.role == UserRole.STUDENT,
                                                                     or_(User.status == UserStatus.ACTIVE,
                                                                         User.status == UserStatus.COMPLETED)))
            statement = (
                _user_query().where(and_(User.role == UserRole.STUDENT))
                .order_by(User.created_at.desc())
                .offset(offset)
                .limit(limit)
            )
        else:
            count_stmt = select(func.count(User.user_id)).where(User.role == filter_role)
            statement = (
                _user_query().where(User.role == filter_role)
                .order_by(User.created_at.desc())
                .offset(offset)
                .limit(limit)
            )

        total_res = await self._session.execute(count_stmt)
        total = total_res.scalar_one()

        result = await self._session.execute(statement)
        users = result.scalars().all()

        user_reads = []
        for user in users:
            ur = UserRead.model_validate(user)
            ur.password = None
            user_reads.append(ur)

        return ListUserRead(
            users=user_reads,
            total=total,
            offset=offset,
            limit=limit,
        )

    async def list_users_with_details(self, offset: int = 0, limit: int = 100) -> ListUserRead:
        """Alias for list with pagination and normalized details."""
        return await self.list(offset=offset, limit=limit)

    async def create(self, user: User) -> User:
        self._session.add(user)
        await self._session.flush()
        return user

    async def update(self, user_id, data: dict):
        stmt = (update(User)
                .values(**data)
                .where(User.user_id == user_id))
        await self._session.execute(stmt)

    async def soft_delete(self, user_id: str) -> UserRead | None:
        """
        Soft delete user by setting status to UNENROLL (unenroll student).
        """
        user = await self.get_entity_with_details(user_id)
        if not user:
            return None
        user.status = UserStatus.INACTIVE
        user.updated_at = utc_now()
        await self._session.flush()
        return await self.get_by_id_with_details(user_id)

    async def delete(self, user: User | str) -> None:
        if isinstance(user, str):
            statement = select(User).where(User.user_id == user)
            result = await self._session.execute(statement)
            entity = result.scalar_one_or_none()
            if entity:
                await self._session.delete(entity)
        elif isinstance(user, User):
            await self._session.delete(user)
        else:
            u_id = getattr(user, "user_id", None)
            if u_id:
                statement = select(User).where(User.user_id == u_id)
                result = await self._session.execute(statement)
                entity = result.scalar_one_or_none()
                if entity:
                    await self._session.delete(entity)
