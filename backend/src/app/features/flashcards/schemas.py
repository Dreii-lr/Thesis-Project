"""
schemas.py — Pydantic DTOs for the Flashcard subsystem.
Provides bidirectional compatibility for both camelCase and snake_case clients.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional, Union
from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    computed_field,
    model_validator,
)


class FlashcardAIGenerateRequest(BaseModel):
    """Payload to trigger AI flashcard generation via document-processing-ms."""
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    topic: Optional[str] = Field(default=None, description="Topic or prompt for generating cards")
    lesson_id: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("lesson_id", "lessonId"),
        description="Optional UUID of GeneratedLesson in document-processing-ms",
    )
    material_id: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("material_id", "materialId"),
        description="Optional material UUID",
    )
    program: str = Field(
        default="Elementary",
        validation_alias=AliasChoices("program", "program_code", "programCode", "program_name", "programName"),
        description="Learning program e.g. 'Elementary' or 'elem', 'Secondary', 'BLP'",
    )
    subject: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("subject", "subject_name", "subjectName"),
        description="Subject name e.g. 'Filipino'",
    )
    learning_level: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("learning_level", "learningLevel"),
    )
    num_cards: int = Field(
        default=5,
        ge=1,
        le=20,
        validation_alias=AliasChoices("num_cards", "numCards"),
    )
    difficulty: Optional[str] = Field(default="medium")
    curriculum_context: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("curriculum_context", "curriculumContext"),
    )
    generation_scope: Optional[str] = Field(
        default="SINGLE_TOPIC",
        validation_alias=AliasChoices("generation_scope", "generationScope", "scope"),
        description="'FULL_MODULE' or 'SINGLE_TOPIC'",
    )

    @model_validator(mode="before")
    @classmethod
    def validate_request_inputs(cls, data: Any) -> Any:
        if isinstance(data, dict):
            topic = data.get("topic")
            lesson_id = data.get("lesson_id") or data.get("lessonId")
            material_id = data.get("material_id") or data.get("materialId")
            if not topic and not lesson_id and not material_id:
                raise ValueError("Either 'topic', 'lesson_id', or 'material_id' must be provided.")
        return data


class FlashcardCardCreatePayload(BaseModel):
    """Payload for creating or updating a single flashcard."""
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: Optional[str] = None
    front: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("front", "term"),
    )
    back: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("back", "definition"),
    )
    hint: Optional[str] = None
    explanation: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("explanation", "example"),
    )
    display_order: int = Field(
        default=0,
        validation_alias=AliasChoices("display_order", "displayOrder"),
    )

    @model_validator(mode="before")
    @classmethod
    def reconcile_card_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Resolve front / term
            front = data.get("front") or data.get("term") or ""
            # Resolve back / definition
            back = data.get("back") or data.get("definition") or ""
            # Resolve explanation / example
            explanation = data.get("explanation") or data.get("example")
            data["front"] = str(front).strip()
            data["back"] = str(back).strip()
            if explanation is not None:
                data["explanation"] = str(explanation).strip()
        return data


class FlashcardDeckCreatePayload(BaseModel):
    """Payload for creating a flashcard deck with nested cards."""
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: Optional[str] = None
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    program: str = Field(
        ...,
        validation_alias=AliasChoices("program", "program_code", "programCode", "program_name", "programName"),
        description="Actual learning program e.g. 'Elementary', 'elem', 'Secondary', 'BLP'",
    )
    subject: str = Field(
        ...,
        validation_alias=AliasChoices("subject", "subject_name", "subjectName"),
        description="Actual subject name e.g. 'Filipino', 'Everyday Mathematics'",
    )
    tags: List[str] = Field(default_factory=list)
    difficulty: str = Field(default="medium")
    is_system_curated: bool = Field(
        default=False,
        validation_alias=AliasChoices("is_system_curated", "isSystemCurated"),
    )
    author_name: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("author_name", "author"),
    )
    author_role: Optional[str] = Field(
        default="teacher",
        validation_alias=AliasChoices("author_role", "authorRole"),
    )
    cards: List[FlashcardCardCreatePayload] = Field(default_factory=list)


class FlashcardDeckUpdatePayload(BaseModel):
    """Payload for updating an existing deck and optionally replacing its cards."""
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    title: Optional[str] = None
    description: Optional[str] = None
    program: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("program", "program_code", "programCode", "program_name", "programName"),
    )
    subject: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("subject", "subject_name", "subjectName"),
    )
    tags: Optional[List[str]] = None
    difficulty: Optional[str] = None
    cards: Optional[List[FlashcardCardCreatePayload]] = None


# ── Response / Read DTOs with Dual Field Emittance ─────────────────────────────

class FlashcardCardRead(BaseModel):
    """DTO for a single flashcard exposing both terminology conventions."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    deck_id: str
    front: str
    back: str
    hint: Optional[str] = None
    explanation: Optional[str] = None
    display_order: int = 0
    created_at: Optional[datetime] = None

    @computed_field
    @property
    def deckId(self) -> str:
        return self.deck_id

    @computed_field
    @property
    def term(self) -> str:
        return self.front

    @computed_field
    @property
    def definition(self) -> str:
        return self.back

    @computed_field
    @property
    def example(self) -> str:
        return self.explanation or ""

    @computed_field
    @property
    def displayOrder(self) -> int:
        return self.display_order

    @computed_field
    @property
    def createdAt(self) -> Optional[str]:
        return self.created_at.isoformat() if self.created_at else None


class FlashcardDeckRead(BaseModel):
    """DTO for a deck exposing both camelCase and snake_case properties."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    title: str
    description: Optional[str] = None
    program: str
    subject: str
    tags: List[str] = Field(default_factory=list)
    difficulty: str = "medium"
    is_system_curated: bool = False
    created_by_user_id: Optional[str] = None
    author_name: Optional[str] = None
    author_role: Optional[str] = "teacher"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    cards: List[FlashcardCardRead] = Field(default_factory=list)

    @computed_field
    @property
    def programCode(self) -> str:
        return self.program

    @computed_field
    @property
    def program_code(self) -> str:
        return self.program

    @computed_field
    @property
    def programName(self) -> str:
        return self.program

    @computed_field
    @property
    def program_name(self) -> str:
        return self.program

    @computed_field
    @property
    def subjectName(self) -> Optional[str]:
        return self.subject

    @computed_field
    @property
    def subject_name(self) -> Optional[str]:
        return self.subject

    @computed_field
    @property
    def subjectId(self) -> Optional[str]:
        return None

    @computed_field
    @property
    def subject_id(self) -> Optional[str]:
        return None

    @computed_field
    @property
    def strand(self) -> str:
        return self.subject

    @computed_field
    @property
    def author(self) -> str:
        return self.author_name or "ALS Teacher"

    @computed_field
    @property
    def authorRole(self) -> str:
        return self.author_role or "teacher"

    @computed_field
    @property
    def isSystemCurated(self) -> bool:
        return self.is_system_curated

    @computed_field
    @property
    def card_count(self) -> int:
        return len(self.cards)

    @computed_field
    @property
    def cardCount(self) -> int:
        return len(self.cards)

    @computed_field
    @property
    def createdAt(self) -> Optional[str]:
        return self.created_at.isoformat() if self.created_at else None

    @computed_field
    @property
    def updatedAt(self) -> Optional[str]:
        return self.updated_at.isoformat() if self.updated_at else (
            self.created_at.isoformat() if self.created_at else None
        )


class FlashcardDeckListRead(BaseModel):
    """Paginated list envelope for decks."""
    items: List[FlashcardDeckRead]
    total: int
    offset: int = 0
    limit: int = 100


class FlashcardAIGenerateResponse(BaseModel):
    """Response returned when an AI deck is generated."""
    title: str
    description: str
    tags: List[str] = Field(default_factory=list)
    cards: List[FlashcardCardRead]
