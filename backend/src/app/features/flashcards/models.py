"""
models.py — SQLModel definitions for Flashcard deck and card entities.
Part of the isolated Flashcard Feature Subsystem.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Text, func, JSON
from sqlalchemy.orm import relationship
from sqlmodel import Field, Relationship, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class FlashcardDeck(SQLModel, table=True):
    __tablename__ = "flashcard_decks"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        nullable=False,
    )
    title: str = Field(nullable=False, index=True)
    description: Optional[str] = Field(default=None, nullable=True)
    program: str = Field(nullable=False, index=True)  # Actual program: e.g. "Elementary", "elem", "Secondary", "BLP"
    subject: str = Field(nullable=False, index=True)  # Actual subject: e.g. "Filipino", "Everyday Mathematics"
    tags: List[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False, default=[]))
    difficulty: str = Field(default="medium", nullable=False)
    is_system_curated: bool = Field(default=False, index=True, nullable=False)
    created_by_user_id: Optional[str] = Field(default=None, index=True, nullable=True)
    author_name: Optional[str] = Field(default=None, nullable=True)
    author_role: Optional[str] = Field(default="teacher", nullable=True)
    material_id: Optional[str] = Field(default=None, index=True, nullable=True)
    lesson_id: Optional[str] = Field(default=None, index=True, nullable=True)
    generation_scope: Optional[str] = Field(default=None, index=True, nullable=True)

    @property
    def program_code(self) -> str:
        return self.program

    @property
    def program_name(self) -> str:
        return self.program

    @property
    def subject_name(self) -> str:
        return self.subject

    @property
    def strand(self) -> str:
        return self.subject
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    cards: List["FlashcardCard"] = Relationship(
        sa_relationship=relationship(
            "FlashcardCard",
            back_populates="deck",
            cascade="all, delete-orphan",
            lazy="selectin",
            order_by="FlashcardCard.display_order",
        )
    )


class FlashcardCard(SQLModel, table=True):
    __tablename__ = "flashcard_cards"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        nullable=False,
    )
    deck_id: str = Field(
        foreign_key="flashcard_decks.id",
        index=True,
        nullable=False,
        ondelete="CASCADE",
    )
    front: str = Field(sa_column=Column(Text, nullable=False))  # term
    back: str = Field(sa_column=Column(Text, nullable=False))   # definition
    hint: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    explanation: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))  # example
    display_order: int = Field(default=0, nullable=False)
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )

    deck: Optional[FlashcardDeck] = Relationship(
        sa_relationship=relationship(
            "FlashcardDeck",
            back_populates="cards",
        )
    )
