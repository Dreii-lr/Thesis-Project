'use client';

import { useEffect, useState } from 'react';
import {
  deletePersonalFlashcards, personalFlashcardsKey, readPersonalFlashcards,
  savePersonalFlashcards, type FlashcardSetInput, type PersonalStudyDeck,
} from '@/src/lib/personal-flashcards';

export function usePersonalFlashcards(ownerId: string) {
  const [sets, setSets] = useState<PersonalStudyDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const load = () => {
      if (!active) return;
      try {
        setSets(readPersonalFlashcards(window.localStorage, ownerId));
        setError('');
      } catch (err) {
        setSets([]);
        setError(err instanceof Error ? err.message : 'Your study sets could not be loaded.');
      } finally {
        setLoading(false);
      }
    };
    void Promise.resolve().then(load);
    const onStorage = (event: StorageEvent) => {
      if (event.key === personalFlashcardsKey(ownerId) || event.key === null) load();
    };
    window.addEventListener('storage', onStorage);
    return () => { active = false; window.removeEventListener('storage', onStorage); };
  }, [ownerId, version]);

  const save = (input: FlashcardSetInput) => {
    const updated = savePersonalFlashcards(window.localStorage, ownerId, input);
    setSets(updated);
    setError('');
    return updated[0];
  };
  const remove = (id: string) => {
    setSets(deletePersonalFlashcards(window.localStorage, ownerId, id));
    setError('');
  };
  const reload = () => { setLoading(true); setError(''); setVersion(value => value + 1); };
  return { sets, loading, error, save, remove, reload };
}
