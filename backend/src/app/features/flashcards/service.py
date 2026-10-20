"""
service.py — Business logic and orchestration for the Flashcard subsystem.
Coordinates persistence via UnitOfWork and calls document-processing-ms for AI generation.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional, Tuple
import uuid
import httpx

from app.core.constants import constants
from app.core.exceptions import (
    DomainEntityNotFoundException,
    DomainForbiddenDomainException,
    DomainUnprocessableEntity,
)
from app.core.unit_of_work import AbstractUnitOfWork
from app.features.flashcards.models import FlashcardCard, FlashcardDeck
from app.features.flashcards.schemas import (
    FlashcardAIGenerateRequest,
    FlashcardAIGenerateResponse,
    FlashcardCardRead,
    FlashcardDeckCreatePayload,
    FlashcardDeckListRead,
    FlashcardDeckRead,
    FlashcardDeckUpdatePayload,
)
from app.features.users.models import UserRole
from app.features.users.schemas import UserRead
from app.shared.schema import AdditionalData, SuccessfulResponseSchema


class FlashcardService:
    def __init__(self, uow: AbstractUnitOfWork) -> None:
        self._uow = uow

    async def generate_flashcards(
        self,
        payload: FlashcardAIGenerateRequest,
        current_user: UserRead,
    ) -> SuccessfulResponseSchema:
        """
        Request AI flashcard generation by invoking document-processing-ms (:9090).
        """
        service_url = f"{constants.DOCS_PROCESSING_SERVICE_URL.rstrip('/')}/api/v2/flashcard-generation/generate"
        req_body = {
            "topic": payload.topic,
            "lesson_id": payload.lesson_id,
            "material_id": payload.material_id,
            "scope": payload.generation_scope or "SINGLE_TOPIC",
            "subject_name": payload.subject or "",
            "program_code": payload.program,
            "learning_level": payload.learning_level,
            "count": payload.num_cards,
            "difficulty": payload.difficulty or "medium",
            "curriculum_context": payload.curriculum_context or None,
        }

        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                res = await client.post(service_url, json=req_body)
        except httpx.ConnectError:
            raise DomainUnprocessableEntity(
                f"AI Flashcard service is offline or unreachable at {service_url}. "
                "Please verify that document-processing-ms is running on port 9090."
            )
        except httpx.TimeoutException:
            raise DomainUnprocessableEntity(
                "AI generation timed out. Please try generating with fewer cards or a more specific topic."
            )
        except Exception as exc:
            raise DomainUnprocessableEntity(
                f"Failed to communicate with AI Flashcard microservice: {str(exc)}"
            )

        if res.status_code != 200:
            error_detail = "Unknown error"
            try:
                err_json = res.json()
                error_detail = err_json.get("detail") or err_json.get("message") or str(err_json)
            except Exception:
                error_detail = res.text
            raise DomainUnprocessableEntity(f"AI generation failed: {error_detail}")

        data = res.json()
        generated_cards = []
        for idx, card in enumerate(data.get("cards", [])):
            card_id = f"gen-{uuid.uuid4()}"
            generated_cards.append(
                FlashcardCardRead(
                    id=card_id,
                    deck_id="",
                    front=card.get("term") or card.get("front", ""),
                    back=card.get("definition") or card.get("back", ""),
                    hint=card.get("hint"),
                    explanation=card.get("example") or card.get("explanation"),
                    display_order=idx,
                    created_at=datetime.now(timezone.utc),
                )
            )

        fallback_title = f"{payload.topic} Flashcards" if payload.topic else "Lesson Study Set"
        fallback_desc = (
            f"AI-generated study set for {payload.topic}"
            if payload.topic
            else "AI-generated study set grounded in lesson content."
        )

        ai_response = FlashcardAIGenerateResponse(
            title=data.get("title", fallback_title),
            description=data.get("description", fallback_desc),
            tags=data.get("tags", []),
            cards=generated_cards,
        )

        return SuccessfulResponseSchema(
            status_code=200,
            message="AI Flashcards generated successfully",
            data=AdditionalData(resources=ai_response.model_dump(mode="json")),
        )

    async def create_deck(
        self,
        payload: FlashcardDeckCreatePayload,
        current_user: UserRead,
    ) -> SuccessfulResponseSchema:
        """Create a new flashcard deck with its cards."""
        deck_id = payload.id or str(uuid.uuid4())
        author_name = payload.author_name
        if not author_name and (current_user.first_name or current_user.last_name):
            author_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip()

        is_admin = current_user.role == UserRole.ADMIN
        if not author_name:
            author_name = "ALS Admin" if is_admin else "ALS Teacher"

        user_role_str = "admin" if is_admin else "teacher"
        if current_user.role and not is_admin:
            user_role_str = (
                current_user.role.value.lower()
                if hasattr(current_user.role, "value")
                else str(current_user.role).lower()
            )

        is_curated = payload.is_system_curated or is_admin
        author_role = "admin" if is_admin else (payload.author_role or user_role_str)

        deck = FlashcardDeck(
            id=deck_id,
            title=payload.title,
            description=payload.description,
            program=payload.program,
            subject=payload.subject,
            tags=payload.tags,
            difficulty=payload.difficulty or "medium",
            is_system_curated=is_curated,
            created_by_user_id=current_user.user_id,
            author_name=author_name,
            author_role=author_role,
            created_at=datetime.now(timezone.utc),
        )

        cards = []
        for idx, c in enumerate(payload.cards):
            card_obj = FlashcardCard(
                id=c.id or str(uuid.uuid4()),
                deck_id=deck.id,
                front=c.front or "",
                back=c.back or "",
                hint=c.hint,
                explanation=c.explanation,
                display_order=c.display_order if c.display_order is not None else idx,
                created_at=datetime.now(timezone.utc),
            )
            cards.append(card_obj)

        deck.cards = cards

        await self._uow.flashcards.create_deck(deck)
        persisted = await self._uow.flashcards.get_deck_by_id(deck.id)

        read_dto = FlashcardDeckRead.model_validate(persisted)
        return SuccessfulResponseSchema(
            status_code=201,
            message="Flashcard deck created successfully",
            data=AdditionalData(resources=read_dto.model_dump(mode="json")),
        )

    async def list_decks_for_user(
        self,
        current_user: UserRead,
        program: Optional[str] = None,
        subject: Optional[str] = None,
        search: Optional[str] = None,
        is_curated: Optional[bool] = None,
        offset: int = 0,
        limit: int = 100,
        program_code: Optional[str] = None,
        subject_id: Optional[str] = None,
        subject_name: Optional[str] = None,
    ) -> SuccessfulResponseSchema:
        """
        List flashcard decks.
        Enforces ALS student scoping: students only see decks matching their enrolled user_category.
        """
        scoped_program = program or program_code
        if current_user.role == UserRole.STUDENT and current_user.user_category:
            cat_val = (
                current_user.user_category.value
                if hasattr(current_user.user_category, "value")
                else str(current_user.user_category)
            )
            scoped_program = cat_val

        scoped_subject = subject or subject_name

        items, total = await self._uow.flashcards.list_decks(
                program=scoped_program,
                subject=scoped_subject,
                search=search,
                is_curated=is_curated,
                offset=offset,
                limit=limit)

        deck_reads = [FlashcardDeckRead.model_validate(d).model_dump(mode="json") for d in items]
        envelope = {
            "items": deck_reads,
            "total": total,
            "offset": offset,
            "limit": limit,
        }
        return SuccessfulResponseSchema(
            status_code=200,
            message="Flashcard decks retrieved successfully",
            data=AdditionalData(resources=envelope),
        )

    async def get_deck_by_id(
        self,
        deck_id: str,
        current_user: UserRead,
    ) -> SuccessfulResponseSchema:
        """Fetch a specific deck with permission checking."""
        deck = await self._uow.flashcards.get_deck_by_id(deck_id)
        if not deck:
            raise DomainEntityNotFoundException(f"Flashcard deck '{deck_id}' was not found.")

        if current_user.role == UserRole.STUDENT and current_user.user_category:
            cat_val = (
                    current_user.user_category.value
                    if hasattr(current_user.user_category, "value")
                    else str(current_user.user_category)
                )
            if (
                cat_val.lower() not in deck.program.lower()
                and deck.program.lower() not in cat_val.lower()
                and not deck.is_system_curated
            ):
                raise DomainForbiddenDomainException(
                        "You do not have access to study sets outside your learning program."
                    )

        read_dto = FlashcardDeckRead.model_validate(deck)
        return SuccessfulResponseSchema(
            status_code=200,
            message="Flashcard deck retrieved successfully",
            data=AdditionalData(resources=read_dto.model_dump()),
        )

    async def update_deck(
        self,
        deck_id: str,
        payload: FlashcardDeckUpdatePayload,
        current_user: UserRead,
    ) -> SuccessfulResponseSchema:
        """Update an existing deck and optionally replace its cards."""
        deck = await self._uow.flashcards.get_deck_by_id(deck_id)
        if not deck:
            raise DomainEntityNotFoundException(f"Flashcard deck '{deck_id}' was not found.")

        if payload.title is not None:
            deck.title = payload.title
        if payload.description is not None:
            deck.description = payload.description
        if payload.program is not None:
            deck.program = payload.program
        if payload.subject is not None:
            deck.subject = payload.subject
        if payload.tags is not None:
            deck.tags = payload.tags
        if payload.difficulty is not None:
            deck.difficulty = payload.difficulty

        deck.updated_at = datetime.now(timezone.utc)

        if payload.cards is not None:
            await self._uow.flashcards.delete_cards_by_deck_id(deck_id)
            new_cards = []
            for idx, c in enumerate(payload.cards):
                new_cards.append(
                    FlashcardCard(
                            id=c.id or str(uuid.uuid4()),
                            deck_id=deck.id,
                            front=c.front or "",
                            back=c.back or "",
                            hint=c.hint,
                            explanation=c.explanation,
                            display_order=c.display_order if c.display_order is not None else idx,
                            created_at=datetime.now(timezone.utc),
                        )
                    )
            await self._uow.flashcards.bulk_create_cards(new_cards)

        await self._uow.flashcards.update_deck(deck)

        refreshed = await self._uow.flashcards.get_deck_by_id(deck_id)

        read_dto = FlashcardDeckRead.model_validate(refreshed)
        return SuccessfulResponseSchema(
            status_code=200,
            message="Flashcard deck updated successfully",
            data=AdditionalData(resources=read_dto.model_dump(mode="json")),
        )

    async def delete_deck(
        self,
        deck_id: str,
        current_user: UserRead,
    ) -> SuccessfulResponseSchema:
        """Delete deck and cascade delete its cards."""
        deck = await self._uow.flashcards.get_deck_by_id(deck_id)
        if not deck:
            raise DomainEntityNotFoundException(f"Flashcard deck '{deck_id}' was not found.")

        await self._uow.flashcards.delete_deck(deck)
        return SuccessfulResponseSchema(
            status_code=200,
            message="Flashcard deck deleted successfully",
            data=AdditionalData(resources={"deleted_id": deck_id}),
        )
