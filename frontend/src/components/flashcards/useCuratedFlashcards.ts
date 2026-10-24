"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getLearningProgramInfo,
  validateCuratedDeckInput,
  CURATED_FLASHCARDS_STORAGE_KEY,
  type CuratedStudyDeck,
  type CuratedFlashcardInput,
  type AuthorInfo,
} from "@/src/lib/curated-flashcards";
import {
  listAllFlashcardsApi,
  createFlashcardDeckApi,
  updateFlashcardDeckApi,
  deleteFlashcardDeckApi,
} from "@/src/lib/curated-flashcards-api";
import {
  FLASHCARD_DRAFTS_UPDATED,
  flashcardDraftsKey,
  readFlashcardDrafts,
  type FlashcardDraft,
} from "@/src/lib/flashcard-drafts";

const UPDATED_EVENT = "als-flashcards-updated";

function notifyPublishedSetsChanged() {
  window.dispatchEvent(new Event(UPDATED_EVENT));
  try {
    // Notify other tabs without sharing one account's decks through browser storage.
    window.localStorage.setItem(UPDATED_EVENT, String(Date.now()));
  } catch {
    // Storage is optional; the server has already confirmed the change.
  }
}

export function useFlashcardDrafts(ownerId?: string) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    ownerId: string;
    decks: FlashcardDraft[];
    error: string;
  } | null>(null);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    if (!ownerId) return;
    let active = true;
    Promise.resolve()
      .then(() => readFlashcardDrafts(ownerId))
      .then((decks) => {
        if (active) setResult({ ownerId, decks, error: "" });
      })
      .catch((err: unknown) => {
        if (active)
          setResult({
            ownerId,
            decks: [],
            error:
              err instanceof Error
                ? err.message
                : "Drafts could not be loaded.",
          });
      });
    const onStorage = (event: StorageEvent) => {
      if (event.key === flashcardDraftsKey(ownerId) || event.key === null)
        reload();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(FLASHCARD_DRAFTS_UPDATED, reload);
    return () => {
      active = false;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(FLASHCARD_DRAFTS_UPDATED, reload);
    };
  }, [ownerId, version, reload]);
  return {
    drafts: result && result.ownerId === ownerId ? result.decks : [],
    loading: Boolean(ownerId && result?.ownerId !== ownerId),
    error: result && result.ownerId === ownerId ? result.error : "",
    reload,
  };
}

export function useCuratedFlashcards(
  programFilter?: string,
  {
    enabled = true,
    scopeKey = "",
  }: { enabled?: boolean; scopeKey?: string } = {},
) {
  const programCode = programFilter
    ? getLearningProgramInfo(programFilter).code
    : undefined;
  const scope = JSON.stringify([scopeKey, programCode]);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    scope: string;
    version: number;
    decks: CuratedStudyDeck[];
    error: string;
  } | null>(null);

  const reload = useCallback(() => setVersion((previous) => previous + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    // Published sets always come from the shared API, never a browser-only fallback.
    listAllFlashcardsApi(programCode)
      .then((decks) => {
        if (active) setResult({ scope, version, decks, error: "" });
      })
      .catch((err: unknown) => {
        if (active)
          setResult({
            scope,
            version,
            decks: [],
            error:
              err instanceof Error
                ? err.message
                : "Could not load flashcard study sets.",
          });
      });

    return () => {
      active = false;
    };
  }, [enabled, programCode, scope, version]);

  useEffect(() => {
    if (!enabled) return;
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === UPDATED_EVENT ||
        event.key === CURATED_FLASHCARDS_STORAGE_KEY ||
        event.key === null
      )
        reload();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(UPDATED_EVENT, reload);
    window.addEventListener("focus", reload);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(UPDATED_EVENT, reload);
      window.removeEventListener("focus", reload);
    };
  }, [enabled, reload]);

  const save = useCallback(
    async (input: CuratedFlashcardInput, author: AuthorInfo) => {
      validateCuratedDeckInput(input);
      const savedDeck = input.id
        ? await updateFlashcardDeckApi(input.id, input, author)
        : await createFlashcardDeckApi(input, author);
      notifyPublishedSetsChanged();
      return savedDeck;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await deleteFlashcardDeckApi(id);
    notifyPublishedSetsChanged();
  }, []);

  const matchesScope = enabled && result?.scope === scope;
  const allDecks = matchesScope ? result.decks : [];
  const decks = programCode
    ? allDecks.filter(
        (deck) =>
          deck.categoryId === programFilter ||
          getLearningProgramInfo(
            deck.programCode || deck.programName,
          ).code.toUpperCase() === programCode.toUpperCase(),
      )
    : allDecks;

  return {
    allDecks,
    decks,
    loading: enabled && (!matchesScope || result.version !== version),
    error: matchesScope && result.version === version ? result.error : "",
    save,
    remove,
    reload,
  };
}
