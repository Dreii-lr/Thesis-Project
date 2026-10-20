"""
Flashcard Feature Subsystem package.
Isolated feature for managing ALS study sets and AI flashcard generation.
"""
from app.features.flashcards.models import FlashcardCard, FlashcardDeck
from app.features.flashcards.repository import FlashcardRepository
from app.features.flashcards.router import router as flashcards_router
from app.features.flashcards.schemas import (
    FlashcardAIGenerateRequest,
    FlashcardAIGenerateResponse,
    FlashcardCardCreatePayload,
    FlashcardCardRead,
    FlashcardDeckCreatePayload,
    FlashcardDeckListRead,
    FlashcardDeckRead,
    FlashcardDeckUpdatePayload,
)
from app.features.flashcards.service import FlashcardService

__all__ = [
    "FlashcardDeck",
    "FlashcardCard",
    "FlashcardRepository",
    "FlashcardService",
    "flashcards_router",
    "FlashcardAIGenerateRequest",
    "FlashcardAIGenerateResponse",
    "FlashcardDeckCreatePayload",
    "FlashcardDeckUpdatePayload",
    "FlashcardDeckRead",
    "FlashcardCardRead",
    "FlashcardDeckListRead",
    "FlashcardCardCreatePayload",
]
