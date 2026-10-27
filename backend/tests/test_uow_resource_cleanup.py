"""Use-case compensation must also cover the deferred database commit."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, call

import pytest

from app.core.exceptions import DomainEntityAlreadyExistsException
from app.features.users import service
from app.features.users.models import User
from app.features.users.schemas import TeacherCreate, UserRead
from test_uow_ownership import MemoryUnitOfWork


@pytest.fixture(autouse=True)
def setup_test_db(monkeypatch):
    async def call_provider(func, *args, **kwargs):
        return func(*args, **kwargs)

    monkeypatch.setattr(service, "run_in_threadpool", call_provider)
    yield


@pytest.mark.parametrize("kind", ["student", "teacher"])
@pytest.mark.parametrize("failure", [None, "service", "commit"])
async def test_created_firebase_account_cleanup(monkeypatch, kind, failure):
    uow = MemoryUnitOfWork()
    error = RuntimeError("database failed")
    existing = UserRead(user_id="user-1", account_id="STU-1", email="user@example.com", password="old-password")
    uow.users = SimpleNamespace(
        get_by_id=AsyncMock(return_value=existing),
        get_by_account_id=AsyncMock(return_value=None),
        create=AsyncMock(), update=AsyncMock(),
        get_by_id_with_details=AsyncMock(return_value=existing),
    )
    if failure == "service":
        getattr(uow.users, "create" if kind == "teacher" else "update").side_effect = error
    if failure == "commit":
        uow.commit.side_effect = error
    monkeypatch.setattr(service, "check_email_in_firebase", Mock(return_value=None))
    create = Mock(return_value=SimpleNamespace(uid="new-firebase-id"))
    delete = Mock()
    monkeypatch.setattr(service, "create_firebase_new_user", create)
    monkeypatch.setattr(service, "delete_firebase_user", delete)
    monkeypatch.setattr(service, "hash_password", Mock(return_value="hash"))

    async def operation():
        async with uow:
            if kind == "student":
                await service.UserService.create_user(uow, "user-1")
            else:
                await service.UserService.create_teacher_account(uow, TeacherCreate(
                    account_id="TCH-1", first_name="Test", last_name="Teacher", password="password"
                ))
            delete.assert_not_called()

    if failure:
        with pytest.raises(RuntimeError) as caught:
            await operation()
        assert caught.value is error
        delete.assert_called_once_with("new-firebase-id")
    else:
        await operation()
        delete.assert_not_called()
    create.assert_called_once()


@pytest.mark.parametrize("kind", ["student", "teacher"])
async def test_existing_firebase_account_is_never_deleted(monkeypatch, kind):
    uow = MemoryUnitOfWork()
    uow.users = SimpleNamespace(
        get_by_id=AsyncMock(return_value=UserRead(account_id="STU-1", email="user@example.com")),
        get_by_account_id=AsyncMock(return_value=None),
    )
    monkeypatch.setattr(service, "check_email_in_firebase", Mock(return_value=True))
    create, delete = Mock(), Mock()
    monkeypatch.setattr(service, "create_firebase_new_user", create)
    monkeypatch.setattr(service, "delete_firebase_user", delete)
    with pytest.raises(DomainEntityAlreadyExistsException):
        async with uow:
            if kind == "student":
                await service.UserService.create_user(uow, "user-1")
            else:
                await service.UserService.create_teacher_account(uow, TeacherCreate(
                    account_id="TCH-1", first_name="Test", last_name="Teacher"
                ))
    create.assert_not_called()
    delete.assert_not_called()


def picture_uow():
    uow = MemoryUnitOfWork()
    user = User(user_id="user-1", email="user@example.com", first_name="Test", last_name="User",
                password="stored-hash", profile_url={"public_id": "old-image", "public_url": "https://example.com/old"})

    async def read_response(_):
        dto = UserRead.model_validate(user)
        dto.password = None
        return dto

    uow.users = SimpleNamespace(
        get_entity_with_details=AsyncMock(return_value=user),
        get_by_id_with_details=AsyncMock(side_effect=read_response),
    )
    return uow, user


@pytest.mark.parametrize("failure", [None, "service", "commit"])
async def test_profile_upload_cleans_only_the_correct_image(monkeypatch, failure):
    uow, user = picture_uow()
    error = RuntimeError("database")
    if failure == "service":
        uow.users.get_by_id_with_details.side_effect = error
    if failure == "commit":
        uow.commit.side_effect = error
    monkeypatch.setattr(service.cloudinary_service, "upload_image", AsyncMock(return_value=SimpleNamespace(
        public_id="new-image", secure_url="https://example.com/new"
    )))
    delete = AsyncMock(return_value=True)
    monkeypatch.setattr(service.cloudinary_service, "delete_image", delete)

    async def operation():
        async with uow:
            response = await service.UserService.update_profile_picture(uow, user.user_id, b"image", "photo.png")
            delete.assert_not_awaited()
            assert response.data.resources["password"] is None
            assert user.password == "stored-hash"

    if failure:
        with pytest.raises(RuntimeError) as caught:
            await operation()
        assert caught.value is error
        delete.assert_awaited_once_with("new-image")
    else:
        await operation()
        delete.assert_awaited_once_with("old-image")


@pytest.mark.parametrize("commit_fails", [False, True])
async def test_removing_profile_image_waits_for_commit(monkeypatch, commit_fails):
    uow, user = picture_uow()
    if commit_fails:
        uow.commit.side_effect = RuntimeError("database")
    delete = AsyncMock(return_value=True)
    monkeypatch.setattr(service.cloudinary_service, "delete_image", delete)

    async def operation():
        async with uow:
            await service.UserService.delete_profile_picture(uow, user.user_id)
            delete.assert_not_awaited()

    if commit_fails:
        with pytest.raises(RuntimeError):
            await operation()
        delete.assert_not_awaited()
    else:
        await operation()
        delete.assert_awaited_once_with("old-image")


async def test_old_image_cleanup_failure_does_not_undo_saved_profile(monkeypatch):
    uow, user = picture_uow()
    delete = AsyncMock(side_effect=RuntimeError("provider"))
    monkeypatch.setattr(service.cloudinary_service, "delete_image", delete)
    async with uow:
        await service.UserService.delete_profile_picture(uow, user.user_id)
    assert user.profile_url is None
    uow.commit.assert_awaited_once()
    uow.rollback.assert_not_awaited()
