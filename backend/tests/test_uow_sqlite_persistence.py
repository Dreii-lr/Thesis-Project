"""Real SQLite transaction checks using an inline session adapter.

This verifies ORM persistence and rollback, not the async driver's scheduling.
The adapter keeps these tests independent of worker threads and external services.
"""
from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
import httpx
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import Session
from sqlmodel import SQLModel

from app.core import unit_of_work
from app.core.unit_of_work import SQLModelUnitOfWork
from app.features.assessments.models import Assessment, AssessmentCohortAnalysis, AssessmentSubmission, TaskStatus, TaskType
from app.features.assessments.models import AssessmentQuestions, SubmissionStatus
from app.features.assessments.analysis import service as analysis_service
from app.core.exceptions import DomainValidationDomainException
from app.features.assessments.schemas import AssessmentCreateSchema, AssessmentUpdateSchema, ManualGradePayload, SubmissionSubmitPayload
from app.features.assessments.service import AssessmentService
from app.features.attendance.models import AttendanceSession, AttendanceRecord
from app.features.attendance.schemas import AttendanceSessionCreate
from app.features.attendance.service import AttendanceService
from app.features.flashcards.models import FlashcardCard, FlashcardDeck
from app.features.flashcards.schemas import FlashcardDeckUpdatePayload
from app.features.flashcards.service import FlashcardService
from app.features.user_categories.models import UserCategoryModel
from app.features.user_categories.schemas import UserCategoryCreateSchema
from app.features.user_categories.service import UserCategoryService
from app.features.users import service as users_service
from app.features.users.models import User, UserRole, UserStatus, UserCategory
from app.features.users.schemas import ChangePasswordRequest


class InlineSession:
    """Only adapt awaitable I/O; all SQL/identity-map/transaction work is SQLAlchemy."""
    def __init__(self, engine):
        self.sync = Session(engine, expire_on_commit=False, autoflush=False)

    def __getattr__(self, name):
        return getattr(self.sync, name)

    async def execute(self, *args, **kwargs):
        return self.sync.execute(*args, **kwargs)

    async def flush(self):
        self.sync.flush()

    async def refresh(self, *args, **kwargs):
        self.sync.refresh(*args, **kwargs)

    async def delete(self, obj):
        self.sync.delete(obj)

    async def commit(self):
        self.sync.commit()

    async def rollback(self):
        self.sync.rollback()

    async def close(self):
        self.sync.close()


@pytest.fixture(autouse=True)
def setup_test_db(monkeypatch):
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    SQLModel.metadata.create_all(engine)
    monkeypatch.setattr(unit_of_work, "async_session_factory", lambda: InlineSession(engine))

    async def call_provider(func, *args, **kwargs):
        return func(*args, **kwargs)

    monkeypatch.setattr(users_service, "run_in_threadpool", call_provider)
    with Session(engine) as session:
        session.add_all([
            User(user_id="teacher", account_id="TCH-1", first_name="Test", last_name="Teacher", role=UserRole.TEACHER,
                 email="teacher@example.com", firebase_uid="firebase-teacher", password="old-hash", status=UserStatus.ACTIVE),
            User(user_id="student", account_id="STU-1", first_name="Test", last_name="Student", role=UserRole.STUDENT,
                 email="student@example.com", status=UserStatus.ACTIVE, user_category=UserCategory.SECONDARY),
        ])
        session.commit()
    yield engine
    engine.dispose()


@pytest.mark.parametrize("failure", [None, "body", "commit"])
async def test_flushed_category_is_committed_or_rolled_back(setup_test_db, failure):
    cleanup = AsyncMock()

    async def operation():
        async with SQLModelUnitOfWork() as uow:
            uow.on_rollback(cleanup)
            response = await UserCategoryService(uow).create_category(UserCategoryCreateSchema(code=" blp ", name="Basic Literacy Program"))
            saved = response.data.resources
            assert saved["code"] == "BLP"
            assert await uow.user_categories.get_by_id(saved["category_id"]) is not None
            if failure == "body":
                raise RuntimeError("body")
            if failure == "commit":
                uow.commit = AsyncMock(side_effect=RuntimeError("commit"))

    if failure:
        with pytest.raises(RuntimeError):
            await operation()
        cleanup.assert_awaited_once()
    else:
        await operation()
        cleanup.assert_not_awaited()
    with Session(setup_test_db) as fresh:
        categories = fresh.scalars(select(UserCategoryModel)).all()
        assert len(categories) == (0 if failure else 1)
        if categories:
            assert categories[0].name == "Basic Literacy Program"


@pytest.mark.parametrize("commit_fails", [False, True])
async def test_password_entity_is_tracked_and_response_redaction_is_detached(monkeypatch, setup_test_db, commit_fails):
    monkeypatch.setattr(users_service, "sign_in_with_password", AsyncMock(return_value={"localId": "firebase-teacher"}))
    monkeypatch.setattr(users_service, "hash_password", Mock(return_value="new-hash"))
    monkeypatch.setattr(users_service, "update_firebase_user_password", Mock(return_value=True))
    monkeypatch.setattr(users_service, "revoke_firebase_user_tokens", Mock(return_value=True))

    async def operation():
        async with SQLModelUnitOfWork() as uow:
            entity = await uow.users.get_entity_with_details("teacher")
            assert isinstance(entity, User) and entity.password == "old-hash"
            await users_service.UserService.change_password(uow, "teacher", ChangePasswordRequest(current_password="old-password", new_password="new-password"))
            response = await uow.users.get_by_id_with_details("teacher")
            assert response.password is None
            assert entity.password == "new-hash"
            if commit_fails:
                uow.commit = AsyncMock(side_effect=RuntimeError("commit"))

    if commit_fails:
        with pytest.raises(RuntimeError):
            await operation()
    else:
        await operation()
    with Session(setup_test_db) as fresh:
        assert fresh.get(User, "teacher").password == ("old-hash" if commit_fails else "new-hash")


async def test_status_and_image_updates_persist_without_erasing_password(monkeypatch, setup_test_db):
    monkeypatch.setattr(users_service.cloudinary_service, "upload_image", AsyncMock(return_value=SimpleNamespace(public_id="new", secure_url="https://example.com/new")))
    monkeypatch.setattr(users_service.cloudinary_service, "delete_image", AsyncMock(return_value=True))
    async with SQLModelUnitOfWork() as uow:
        response = await users_service.UserService.update_profile_picture(uow, "teacher", b"image", "file.png")
        assert response.data.resources["password"] is None
        await users_service.UserService.soft_delete_user(uow, "teacher")
    with Session(setup_test_db) as fresh:
        user = fresh.get(User, "teacher")
        assert user.password == "old-hash"
        assert user.profile_url["public_id"] == "new"
        assert user.status == UserStatus.INACTIVE


async def test_assessment_response_sees_new_questions_and_commits_once(setup_test_db):
    async with SQLModelUnitOfWork() as uow:
        service = AssessmentService(uow)
        created = await service.create_assessment("teacher", AssessmentCreateSchema(
            title="Draft quiz", subject_code="LS1", target_category="SECONDARY", assessment_type="QUIZ"
        ))
        assessment_id = created.data.resources["assessment_id"]
        updated = await service.update_assessment(assessment_id, "teacher", AssessmentUpdateSchema(categories_data=[{
            "category_id": "one", "type": "Multiple Choice", "required_count": 1, "points_per_item": 5,
            "questions": [{"id": "q1", "text": "Question", "options": ["Yes", "No"], "correct_answer": "Yes"}],
        }]))
        assert len(updated.data.resources["categories_data"]) == 1
        assert (await uow.assessments.get_assessment_by_id(assessment_id)).questions is not None
    with Session(setup_test_db) as fresh:
        saved = fresh.get(Assessment, assessment_id)
        assert saved.max_score == 5
        assert saved.questions.total_pool_items == 1


async def test_activity_submission_and_grading_persist(setup_test_db):
    async with SQLModelUnitOfWork() as uow:
        created = await AssessmentService(uow).create_assessment("teacher", AssessmentCreateSchema(
            title="Activity", subject_code="LS1", target_category="SECONDARY", assessment_type="ACTIVITY", status="ACTIVE"
        ))
        assessment_id = created.data.resources["assessment_id"]
    async with SQLModelUnitOfWork() as uow:
        student = await uow.users.get_by_id("student")
        submitted = await AssessmentService(uow).submit_student_attempt(assessment_id, student, SubmissionSubmitPayload(attachments=[]))
        submission_id = submitted.data.resources["submission_id"]
        assert submitted.data.resources["account_id"] == "STU-1"
    async with SQLModelUnitOfWork() as uow:
        graded = await AssessmentService(uow).grade_submission(assessment_id, submission_id, "teacher", ManualGradePayload(manual_score=9))
        assert graded.data.resources["final_score"] == 9
    with Session(setup_test_db) as fresh:
        assert fresh.get(AssessmentSubmission, submission_id).final_score == 9


async def test_flashcard_replacement_response_has_new_cards(setup_test_db):
    async with SQLModelUnitOfWork() as uow:
        deck = FlashcardDeck(title="Words", program="Secondary", subject="English", created_by_user_id="teacher")
        deck.cards = [FlashcardCard(front="Old", back="Old definition", deck_id=deck.id)]
        await uow.flashcards.create_deck(deck)
        deck_id = deck.id
    async with SQLModelUnitOfWork() as uow:
        teacher = await uow.users.get_by_id("teacher")
        updated = await FlashcardService(uow).update_deck(deck_id, FlashcardDeckUpdatePayload(cards=[{"front": "New", "back": "New definition"}]), teacher)
        assert updated.data.resources["cards"][0]["front"] == "New"
    with Session(setup_test_db) as fresh:
        assert [card.front for card in fresh.get(FlashcardDeck, deck_id).cards] == ["New"]


async def test_attendance_flush_does_not_commit_early(setup_test_db):
    with pytest.raises(RuntimeError, match="later failure"):
        async with SQLModelUnitOfWork() as uow:
            response = await AttendanceService.record_session(uow, "teacher", AttendanceSessionCreate(
                session_date=date(2026, 10, 26), category_code="SECONDARY", subject_code="LS1",
                records=[{"account_id": "STU-1", "status": "Present"}]
            ))
            assert response.data.resources["present_count"] == 1
            raise RuntimeError("later failure")
    with Session(setup_test_db) as fresh:
        assert fresh.scalars(select(AttendanceSession)).all() == []
        assert fresh.scalars(select(AttendanceRecord)).all() == []


@pytest.mark.parametrize("commit_fails", [False, True])
async def test_quiz_attempt_and_auto_grading_respect_final_commit(setup_test_db, commit_fails):
    async with SQLModelUnitOfWork() as uow:
        created = await AssessmentService(uow).create_assessment("teacher", AssessmentCreateSchema(
            title="Quiz", subject_code="LS1", target_category="SECONDARY", assessment_type="QUIZ", status="ACTIVE",
            categories_data=[{"category_id": "one", "type": "Multiple Choice", "required_count": 1, "points_per_item": 5,
                              "questions": [{"id": "q1", "text": "Question", "options": ["Yes", "No"], "correct_answer": "Yes"}]}]
        ))
        assessment_id = created.data.resources["assessment_id"]

    async def operation():
        async with SQLModelUnitOfWork() as uow:
            student = await uow.users.get_by_id("student")
            service = AssessmentService(uow)
            attempt = await service.start_student_attempt(assessment_id, student)
            assert len(attempt.data.resources["questions"]) == 1
            result = await service.submit_student_attempt(assessment_id, student, SubmissionSubmitPayload(
                answers=[{"question_id": "q1", "student_answer": "Yes"}]
            ))
            assert result.data.resources["auto_score"] == 5
            if commit_fails:
                uow.commit = AsyncMock(side_effect=RuntimeError("commit"))

    if commit_fails:
        with pytest.raises(RuntimeError, match="commit"):
            await operation()
    else:
        await operation()
    with Session(setup_test_db) as fresh:
        submissions = fresh.scalars(select(AssessmentSubmission)).all()
        assert len(submissions) == (0 if commit_fails else 1)
        if submissions:
            assert submissions[0].final_score == 5


@pytest.mark.parametrize("failure", [None, "remote", "commit"])
async def test_analysis_status_and_cache_share_the_transaction(monkeypatch, setup_test_db, failure):
    async with SQLModelUnitOfWork() as uow:
        await uow.user_categories.create(UserCategoryModel(code="SECONDARY", name="Secondary"))
        assessment = Assessment(teacher_id="teacher", title="Quiz", subject_code="LS1", target_category=UserCategory.SECONDARY,
                                assessment_type=TaskType.QUIZ, status=TaskStatus.ACTIVE,
                                end_date=datetime.now(timezone.utc) - timedelta(days=1))
        assessment_id = assessment.assessment_id
        await uow.assessments.create_assessment(assessment, AssessmentQuestions(assessment_id=assessment_id, categories_data=[{
            "category_id": "one", "type": "Multiple Choice", "questions": [{"id": "q1", "text": "Question"}]
        }]))
        await uow.assessments.create_submission(AssessmentSubmission(
            assessment_id=assessment_id, student_id="student", student_category=UserCategory.SECONDARY,
            status=SubmissionStatus.GRADED, final_score=5, answers_payload={"answers": []}
        ))
    remote = AsyncMock()
    remote.__aenter__.return_value = remote
    remote.post.return_value = httpx.Response(200, json={"struggling_topics": [], "topic_found": True})
    if failure == "remote":
        remote.post.side_effect = httpx.ConnectError("unavailable")
    monkeypatch.setattr(analysis_service.httpx, "AsyncClient", Mock(return_value=remote))

    async def operation():
        async with SQLModelUnitOfWork() as uow:
            # Exercise the analysis service's own transition, not read reconciliation.
            monkeypatch.setattr(uow.assessments, "reconcile_assessment_statuses", AsyncMock())
            teacher = await uow.users.get_by_id("teacher")
            response = await analysis_service.CohortAnalysisService(uow).generate_cohort_struggle_analysis(assessment_id, "SECONDARY", teacher)
            assert response.data.resources["created_at"]
            if failure == "commit":
                uow.commit = AsyncMock(side_effect=RuntimeError("commit"))

    if failure:
        with pytest.raises(DomainValidationDomainException if failure == "remote" else RuntimeError):
            await operation()
    else:
        await operation()
    with Session(setup_test_db) as fresh:
        assert fresh.get(Assessment, assessment_id).status == (TaskStatus.ACTIVE if failure else TaskStatus.COMPLETED)
        assert len(fresh.scalars(select(AssessmentCohortAnalysis)).all()) == (0 if failure else 1)
