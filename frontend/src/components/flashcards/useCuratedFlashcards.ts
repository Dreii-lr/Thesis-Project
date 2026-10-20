'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  readCuratedFlashcards,
  saveCuratedFlashcard,
  deleteCuratedFlashcard,
  CURATED_FLASHCARDS_STORAGE_KEY,
  type CuratedStudyDeck,
  type CuratedFlashcardInput,
  type AuthorInfo,
} from '@/src/lib/curated-flashcards';
import {
  listFlashcardsApi,
  createFlashcardDeckApi,
  updateFlashcardDeckApi,
  deleteFlashcardDeckApi,
} from '@/src/lib/curated-flashcards-api';

export function useCuratedFlashcards(programFilter?: string) {
  const [allDecks, setAllDecks] = useState<CuratedStudyDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    // 1. Immediately populate from local cache to avoid visual flash
    try {
      const localData = readCuratedFlashcards();
      if (localData && localData.length > 0) {
        setAllDecks(localData);
      }
    } catch {
      // ignore
    }

    // 2. Fetch live decks from backend
    try {
      const result = await listFlashcardsApi({
        program: programFilter || undefined,
        program_code: programFilter || undefined,
      });

      if (result && Array.isArray(result.items)) {
        setAllDecks(result.items);
        // Persist silently into local cache without triggering recursive update events
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(
              CURATED_FLASHCARDS_STORAGE_KEY,
              JSON.stringify(result.items),
            );
          }
        } catch {
          // ignore cache write error
        }
      }
      setError('');
    } catch (err) {
      // Gracefully fall back to local storage
      try {
        const local = readCuratedFlashcards();
        setAllDecks(local);
      } catch {
        setError(err instanceof Error ? err.message : 'Could not load flashcard study sets.');
      }
    } finally {
      setLoading(false);
    }
  }, [programFilter]);

  useEffect(() => {
    load();

    const onStorage = (event: StorageEvent) => {
      if (event.key === CURATED_FLASHCARDS_STORAGE_KEY || event.key === null) {
        load();
      }
    };

    const onCustomUpdate = () => {
      load();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('als-flashcards-updated', onCustomUpdate);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('als-flashcards-updated', onCustomUpdate);
    };
  }, [load, version]);

  const save = useCallback(
    async (input: CuratedFlashcardInput, author: AuthorInfo) => {
      try {
        let savedDeck: CuratedStudyDeck;
        try {
          if (input.id && !input.id.startsWith('curated-') && !input.id.startsWith('custom-')) {
            savedDeck = await updateFlashcardDeckApi(input.id, input, author);
          } else {
            savedDeck = await createFlashcardDeckApi(input, author);
          }
          // Quietly sync successful backend deck to local storage
          try {
            saveCuratedFlashcard({ ...input, id: savedDeck.id }, author);
          } catch {
            // ignore
          }
        } catch {
          // If backend call fails, save to local cache
          const localUpdated = saveCuratedFlashcard(input, author);
          savedDeck = localUpdated.find((d) => d.title === input.title) || localUpdated[0];
        }

        setAllDecks((prev) => {
          const index = prev.findIndex((d) => d.id === savedDeck.id || d.title === savedDeck.title);
          if (index >= 0) {
            const next = [...prev];
            next[index] = savedDeck;
            return next;
          }
          return [savedDeck, ...prev];
        });
        setError('');
        return savedDeck;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to save flashcard set.';
        setError(msg);
        throw err;
      }
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    try {
      try {
        if (!id.startsWith('curated-') && !id.startsWith('custom-')) {
          await deleteFlashcardDeckApi(id);
        }
      } catch {
        // Backend delete failed or offline; continue to local delete
      }

      deleteCuratedFlashcard(id);
      setAllDecks((prev) => prev.filter((d) => d.id !== id));
      setError('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete flashcard set.';
      setError(msg);
      throw err;
    }
  }, []);

  const reload = useCallback(() => {
    setLoading(true);
    setError('');
    setVersion((v) => v + 1);
  }, []);

  // Program filtered decks (matches categoryId or programCode case-insensitively)
  const filteredDecks = programFilter
    ? allDecks.filter((deck) => {
        const filterUpper = (programFilter || '').toUpperCase();
        const filterLower = (programFilter || '').toLowerCase();
        const deckProgUpper = (deck.programCode || deck.programName || '').toUpperCase();
        const deckProgLower = (deck.programCode || deck.programName || '').toLowerCase();
        return (
          deck.categoryId === programFilter ||
          deckProgUpper === filterUpper ||
          (deckProgUpper && filterUpper && (deckProgUpper.includes(filterUpper) || filterUpper.includes(deckProgUpper))) ||
          deckProgLower === filterLower ||
          (deckProgLower && filterLower && (deckProgLower.includes(filterLower) || filterLower.includes(deckProgLower)))
        );
      })
    : allDecks;

  return {
    allDecks,
    decks: filteredDecks,
    loading,
    error,
    save,
    remove,
    reload,
  };
}
