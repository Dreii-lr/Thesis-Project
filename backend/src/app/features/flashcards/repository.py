"""
repository.py — Data access layer for Flashcard decks and cards.
Implements transactional persistence using SQLAlchemy AsyncSession.
"""
from __future__ import annotations

from typing import List, Optional, Tuple
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.flashcards.models import FlashcardCard, FlashcardDeck


class FlashcardRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_deck(self, deck: FlashcardDeck) -> FlashcardDeck:
        """Persist a new deck (and its associated cards via relationship)."""
        self._session.add(deck)
        self._session.refresh(deck)
        return deck

    async def get_deck_by_id(self, deck_id: str) -> Optional[FlashcardDeck]:
        """Fetch a single deck with all cards loaded."""
        stmt = (
            select(FlashcardDeck)
            .where(FlashcardDeck.id == deck_id)
            .options(selectinload(FlashcardDeck.cards))
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_decks(
        self,
        program: Optional[str] = None,
        subject: Optional[str] = None,
        search: Optional[str] = None,
        is_curated: Optional[bool] = None,
        offset: int = 0,
        limit: int = 100,
        program_code: Optional[str] = None,
        subject_id: Optional[str] = None,
        subject_name: Optional[str] = None,
    ) -> Tuple[List[FlashcardDeck], int]:
        """Query decks with optional filters and eager-loaded cards."""
        count_stmt = select(func.count(FlashcardDeck.id))
        stmt = select(FlashcardDeck).options(selectinload(FlashcardDeck.cards))

        filters = []
        target_program = program or program_code
        if target_program:
            p = target_program.strip().lower()
            filters.append(
                or_(
                    func.lower(FlashcardDeck.program) == p,
                    func.lower(FlashcardDeck.program).contains(p),
                )
            )

        target_subject = subject or subject_name
        if target_subject:
            s = target_subject.strip().lower()
            filters.append(
                or_(
                    func.lower(FlashcardDeck.subject) == s,
                    func.lower(FlashcardDeck.subject).contains(s),
                )
            )

        if search:
            search_pattern = f"%{search.strip()}%"
            filters.append(
                or_(
                    FlashcardDeck.title.ilike(search_pattern),
                    FlashcardDeck.description.ilike(search_pattern),
                    FlashcardDeck.subject.ilike(search_pattern),
                    FlashcardDeck.program.ilike(search_pattern),
                )
            )
        if is_curated is not None:
            filters.append(FlashcardDeck.is_system_curated == is_curated)

        for f in filters:
            count_stmt = count_stmt.where(f)
            stmt = stmt.where(f)

        count_result = await self._session.execute(count_stmt)
        total = count_result.scalar_one()

        stmt = stmt.order_by(FlashcardDeck.created_at.desc()).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    async def update_deck(self, deck: FlashcardDeck) -> FlashcardDeck:
        """Add updated deck to session for persistence on commit."""
        self._session.add(deck)
        return deck

    async def delete_deck(self, deck: FlashcardDeck) -> None:
        """Delete deck and cascade all child cards."""
        await self._session.delete(deck)

    async def delete_cards_by_deck_id(self, deck_id: str) -> None:
        """Remove all cards associated with a specific deck."""
        stmt = select(FlashcardCard).where(FlashcardCard.deck_id == deck_id)
        result = await self._session.execute(stmt)
        cards = result.scalars().all()
        for card in cards:
            await self._session.delete(card)

    async def bulk_create_cards(self, cards: List[FlashcardCard]) -> List[FlashcardCard]:
        """Bulk add cards."""
        self._session.add_all(cards)
        return cards
