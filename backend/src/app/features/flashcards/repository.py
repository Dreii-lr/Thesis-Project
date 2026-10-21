"""
repository.py — Data access layer for Flashcard decks and cards.
Implements transactional persistence using SQLAlchemy AsyncSession.
"""
from __future__ import annotations

import re
from typing import List, Optional, Tuple
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.flashcards.models import FlashcardCard, FlashcardDeck


def normalize_program_keyword(prog: Optional[str]) -> str:
    """Normalize program names like 'Secondary (JHS)', 'SECONDARY', 'sec' to canonical prefix."""
    if not prog:
        return ""
    p = prog.strip().lower()
    if "elem" in p:
        return "elem"
    if "sec" in p or "jhs" in p:
        return "sec"
    if "blp" in p or "basic" in p:
        return "blp"
    return p


def normalize_text_tokens(text: Optional[str]) -> str:
    """
    Case-insensitive, punctuation-stripped, prefix/suffix-normalized token string.
    Normalizes 'Topic 1: Pangngalan Flashcards' and 'pangngalan' to identical matching string 'pangngalan'.
    """
    if not text:
        return ""
    s = text.strip().lower()
    # Strip leading curriculum prefixes like "Topic 1:", "Aralin 2 -", "Lesson 3:"
    s = re.sub(r'^(?:topic|aralin|lesson)\s*\d+[\s:\-–—]+', '', s)
    # Strip common trailing set suffixes like "flashcards", "study set", "cards"
    s = re.sub(r'\s*(?:flashcards?|study\s*sets?|cards?|set)\s*$', '', s)
    # Remove punctuation
    s = re.sub(r'[^a-z0-9\s]', ' ', s)
    # Collapse multiple whitespaces
    s = re.sub(r'\s+', ' ', s).strip()
    return s


class FlashcardRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_deck(self, deck: FlashcardDeck) -> FlashcardDeck:
        """Persist a new deck (and its associated cards via relationship)."""
        self._session.add(deck)
        await self._session.flush()
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

    async def find_existing_deck(
        self,
        lesson_id: Optional[str] = None,
        material_id: Optional[str] = None,
        generation_scope: Optional[str] = None,
        topic: Optional[str] = None,
        program: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> Optional[FlashcardDeck]:
        """
        Hierarchical 2-tier check for an existing flashcard deck:
        Tier 1 (Grounding ID): Match by lesson_id or material_id (FULL_MODULE).
        Tier 2 (Fallback): Match by program + subject + normalized topic (case-insensitive).
        """
        # 1. Tier 1: Exact Lesson UUID (Primary grounding for single topic generation)
        if lesson_id:
            lid = str(lesson_id).strip().lower()
            if lid:
                stmt = (
                    select(FlashcardDeck)
                    .where(func.lower(FlashcardDeck.lesson_id) == lid)
                    .options(selectinload(FlashcardDeck.cards))
                    .limit(1)
                )
                res = await self._session.execute(stmt)
                deck = res.scalar_one_or_none()
                if deck:
                    return deck

        # 2. Tier 1: Module Grounding (When generating full module study sets)
        if material_id and generation_scope == "FULL_MODULE":
            mid = str(material_id).strip().lower()
            if mid:
                stmt = (
                    select(FlashcardDeck)
                    .where(
                        func.lower(FlashcardDeck.material_id) == mid,
                        FlashcardDeck.generation_scope == "FULL_MODULE",
                    )
                    .options(selectinload(FlashcardDeck.cards))
                    .limit(1)
                )
                res = await self._session.execute(stmt)
                deck = res.scalar_one_or_none()
                if deck:
                    return deck

        # 3. Tier 2: Normalized Topic Fallback within Program + Subject
        # Executed if Tier 1 did not find a deck, or when lesson_id/material_id is absent.
        if topic:
            target_norm = normalize_text_tokens(topic)
            topic_raw = topic.strip().lower()
            prog_kw = normalize_program_keyword(program)

            # Check 1: Exact case-insensitive title match
            stmt_exact = (
                select(FlashcardDeck)
                .where(func.lower(FlashcardDeck.title) == topic_raw)
                .options(selectinload(FlashcardDeck.cards))
            )
            res = await self._session.execute(stmt_exact)
            for d in res.scalars().all():
                if prog_kw and d.program:
                    d_kw = normalize_program_keyword(d.program)
                    if d_kw and d_kw != prog_kw:
                        continue
                return d

            # Check 2: Normalized title match via substring ILIKE
            if target_norm:
                stmt_like = (
                    select(FlashcardDeck)
                    .where(FlashcardDeck.title.ilike(f"%{target_norm}%"))
                    .options(selectinload(FlashcardDeck.cards))
                )
                res = await self._session.execute(stmt_like)
                for d in res.scalars().all():
                    if prog_kw and d.program:
                        d_kw = normalize_program_keyword(d.program)
                        if d_kw and d_kw != prog_kw:
                            continue
                    if normalize_text_tokens(d.title) == target_norm or d.title.strip().lower() == topic_raw:
                        return d

            # Check 3: Normalized scan of recent decks
            stmt_recent = (
                select(FlashcardDeck)
                .order_by(FlashcardDeck.created_at.desc())
                .limit(100)
                .options(selectinload(FlashcardDeck.cards))
            )
            res = await self._session.execute(stmt_recent)
            for d in res.scalars().all():
                if prog_kw and d.program:
                    d_kw = normalize_program_keyword(d.program)
                    if d_kw and d_kw != prog_kw:
                        continue
                if target_norm and normalize_text_tokens(d.title) == target_norm:
                    return d

        return None

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
            prog_kw = normalize_program_keyword(p)
            prog_conditions = [
                func.lower(FlashcardDeck.program) == p,
                func.lower(FlashcardDeck.program).contains(p),
            ]
            if prog_kw:
                prog_conditions.append(func.lower(FlashcardDeck.program).contains(prog_kw))
                if prog_kw == "sec":
                    prog_conditions.append(func.lower(FlashcardDeck.program).contains("jhs"))
                elif prog_kw == "elem":
                    prog_conditions.append(func.lower(FlashcardDeck.program).contains("elementary"))
                elif prog_kw == "blp":
                    prog_conditions.append(func.lower(FlashcardDeck.program).contains("basic"))
            filters.append(or_(*prog_conditions))

        target_subject = subject or subject_name
        if target_subject:
            s = target_subject.strip().lower()
            sub_clean = re.sub(r'^(?:ls\s*\d+[\s:\-–—]+|learning\s*strand\s*\d+[\s:\-–—]+)', '', s).strip()
            sub_conditions = [
                func.lower(FlashcardDeck.subject) == s,
                func.lower(FlashcardDeck.subject).contains(s),
            ]
            if sub_clean and sub_clean != s:
                sub_conditions.append(func.lower(FlashcardDeck.subject).contains(sub_clean))
            filters.append(or_(*sub_conditions))

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
        await self._session.flush()
        return deck

    async def delete_deck(self, deck: FlashcardDeck) -> None:
        """Delete deck and cascade all child cards."""
        await self._session.delete(deck)
        await self._session.flush()

    async def delete_cards_by_deck_id(self, deck_id: str) -> None:
        """Remove all cards associated with a specific deck."""
        stmt = select(FlashcardCard).where(FlashcardCard.deck_id == deck_id)
        result = await self._session.execute(stmt)
        cards = result.scalars().all()
        for card in cards:
            await self._session.delete(card)
        await self._session.flush()

    async def bulk_create_cards(self, cards: List[FlashcardCard]) -> List[FlashcardCard]:
        """Bulk add cards."""
        self._session.add_all(cards)
        await self._session.flush()
        return cards
