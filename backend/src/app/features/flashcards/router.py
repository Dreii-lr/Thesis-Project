"""
router.py — REST API endpoints for the Flashcard Subsystem.
Follows clean router architecture: zero business logic, service dependency injection,
and response formatting via SharedUtils.SuccessfulResponse.
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from starlette.responses import JSONResponse

from app.core.dependencies import (
    get_current_active_user,
    get_flashcard_service,
    require_admin_teacher,
)
from app.features.flashcards.schemas import (
    FlashcardAIGenerateRequest,
    FlashcardDeckCreatePayload,
    FlashcardDeckUpdatePayload,
)
from app.features.flashcards.service import FlashcardService
from app.features.users.schemas import UserRead
from app.shared.utils import SharedUtils

router = APIRouter(prefix="/flashcards", tags=["Flashcards"])


@router.post("/generate", status_code=status.HTTP_200_OK)
async def generate_flashcards(
    data: FlashcardAIGenerateRequest,
    current_user: UserRead = Depends(require_admin_teacher),
    service: FlashcardService = Depends(get_flashcard_service),
) -> JSONResponse:
    """
    Generate study flashcards from an ALS topic using document-processing-ms.
    Restricted to Teachers and Admins.
    """
    response = await service.generate_flashcards(data, current_user)
    return SharedUtils.SuccessfulResponse(response)


@router.get("", status_code=status.HTTP_200_OK)
@router.get("/", status_code=status.HTTP_200_OK)
async def list_flashcards(
    program: Optional[str] = Query(default=None, description="Filter by actual ALS program (e.g. 'Elementary', 'elem', 'Secondary', 'BLP')"),
    subject: Optional[str] = Query(default=None, description="Filter by actual subject name (e.g. 'Filipino')"),
    search: Optional[str] = Query(default=None, description="Search by title, description, or subject"),
    is_curated: Optional[bool] = Query(default=None, description="Filter system curated decks"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    program_code: Optional[str] = Query(default=None, include_in_schema=False),
    subject_id: Optional[str] = Query(default=None, include_in_schema=False),
    subject_name: Optional[str] = Query(default=None, include_in_schema=False),
    current_user: UserRead = Depends(get_current_active_user),
    service: FlashcardService = Depends(get_flashcard_service),
) -> JSONResponse:
    """
    List flashcard decks.
    Students are automatically scoped to their enrolled learning program.
    """
    response = await service.list_decks_for_user(
        current_user=current_user,
        program=program or program_code,
        subject=subject or subject_name,
        search=search,
        is_curated=is_curated,
        offset=offset,
        limit=limit,
    )
    return SharedUtils.SuccessfulResponse(response)


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_flashcard_deck(
    data: FlashcardDeckCreatePayload,
    current_user: UserRead = Depends(require_admin_teacher),
    service: FlashcardService = Depends(get_flashcard_service),
) -> JSONResponse:
    """
    Create a new flashcard deck and its cards.
    Restricted to Teachers and Admins.
    """
    response = await service.create_deck(data, current_user)
    if not response.status_code:
        response.status_code = status.HTTP_201_CREATED
    return SharedUtils.SuccessfulResponse(response)


@router.get("/{deck_id}", status_code=status.HTTP_200_OK)
async def get_flashcard_deck(
    deck_id: str,
    current_user: UserRead = Depends(get_current_active_user),
    service: FlashcardService = Depends(get_flashcard_service),
) -> JSONResponse:
    """
    Fetch a single flashcard deck by ID with all cards included.
    """
    response = await service.get_deck_by_id(deck_id, current_user)
    return SharedUtils.SuccessfulResponse(response)


@router.put("/{deck_id}", status_code=status.HTTP_200_OK)
async def update_flashcard_deck(
    deck_id: str,
    data: FlashcardDeckUpdatePayload,
    current_user: UserRead = Depends(require_admin_teacher),
    service: FlashcardService = Depends(get_flashcard_service),
) -> JSONResponse:
    """
    Update an existing flashcard deck and optionally replace its card set.
    Restricted to Teachers and Admins.
    """
    response = await service.update_deck(deck_id, data, current_user)
    return SharedUtils.SuccessfulResponse(response)


@router.delete("/{deck_id}", status_code=status.HTTP_200_OK)
async def delete_flashcard_deck(
    deck_id: str,
    current_user: UserRead = Depends(require_admin_teacher),
    service: FlashcardService = Depends(get_flashcard_service),
) -> JSONResponse:
    """
    Delete a flashcard deck and its cards.
    Restricted to Teachers and Admins.
    """
    response = await service.delete_deck(deck_id, current_user)
    return SharedUtils.SuccessfulResponse(response)
