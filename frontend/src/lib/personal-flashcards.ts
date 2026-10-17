import type { StudyCard, StudyDeck } from '../data/mockStudentFlashcards';

export interface PersonalStudyDeck extends StudyDeck {
  ownerId: string;
  subjectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardSetInput {
  id?: string;
  title: string;
  description: string;
  subjectId: string;
  subject: string;
  cards: StudyCard[];
}

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function personalFlashcardsKey(ownerId: string) {
  if (!ownerId.trim()) throw new Error('Your student profile is unavailable. Reload the page and try again.');
  return `als_personal_flashcards_v1:${encodeURIComponent(ownerId)}`;
}

export function createFlashcardId() {
  return globalThis.crypto?.randomUUID?.() || `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function readPersonalFlashcards(storage: BrowserStorage, ownerId: string): PersonalStudyDeck[] {
  const saved = storage.getItem(personalFlashcardsKey(ownerId));
  if (!saved) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(saved); } catch {
    throw new Error('Your saved study sets could not be read. Existing data has been kept.');
  }
  if (!parsed || typeof parsed !== 'object' || !('version' in parsed) || parsed.version !== 1 || !('sets' in parsed) || !Array.isArray(parsed.sets)) {
    throw new Error('Your saved study sets could not be read. Existing data has been kept.');
  }
  const valid = parsed.sets.every((set: unknown) => {
    if (!set || typeof set !== 'object') return false;
    const item = set as Partial<PersonalStudyDeck>;
    return item.ownerId === ownerId && typeof item.id === 'string' && !!item.id &&
      typeof item.title === 'string' && !!item.title.trim() && typeof item.subject === 'string' && typeof item.subjectId === 'string' &&
      typeof item.description === 'string' && typeof item.createdAt === 'string' && typeof item.updatedAt === 'string' &&
      Array.isArray(item.cards) && item.cards.length >= 2 && item.cards.every(card =>
        !!card && typeof card.id === 'string' && !!card.id && typeof card.term === 'string' && !!card.term.trim() && typeof card.definition === 'string' && !!card.definition.trim() && typeof card.example === 'string',
      ) && new Set(item.cards.map(card => card.id)).size === item.cards.length;
  });
  if (!valid || new Set(parsed.sets.map(set => set.id)).size !== parsed.sets.length) {
    throw new Error('Your saved study sets could not be read. Existing data has been kept.');
  }
  return (parsed.sets as PersonalStudyDeck[]).map(set => ({ ...set, author: 'Created by you', strand: set.subject }));
}

function persistSets(storage: BrowserStorage, ownerId: string, sets: PersonalStudyDeck[]) {
  try {
    storage.setItem(personalFlashcardsKey(ownerId), JSON.stringify({ version: 1, sets }));
  } catch {
    throw new Error('This browser could not save your changes. Check that site storage is allowed and has enough space, then try again.');
  }
}

export function validateFlashcardSet(input: FlashcardSetInput) {
  if (!input.title.trim()) throw new Error('Give your study set a title.');
  if (input.title.trim().length > 100) throw new Error('Keep the title under 100 characters.');
  if (input.description.length > 300) throw new Error('Keep the description under 300 characters.');
  if (input.cards.length < 2) throw new Error('Add at least two cards to your study set.');
  if (input.cards.length > 100) throw new Error('A study set can contain up to 100 cards.');
  input.cards.forEach((card, index) => {
    if (!card.term.trim() || !card.definition.trim()) throw new Error(`Add a term and definition for card ${index + 1}.`);
    if (card.term.length > 160 || card.definition.length > 2000 || card.example.length > 500) {
      throw new Error(`Card ${index + 1} is too long. Shorten its term, definition, or example.`);
    }
  });
  if (new Set(input.cards.map(card => card.id)).size !== input.cards.length || input.cards.some(card => !card.id)) {
    throw new Error('The cards could not be saved. Close the editor and try again.');
  }
}

export function savePersonalFlashcards(storage: BrowserStorage, ownerId: string, input: FlashcardSetInput): PersonalStudyDeck[] {
  validateFlashcardSet(input);
  const sets = readPersonalFlashcards(storage, ownerId);
  const existing = input.id ? sets.find(set => set.id === input.id) : null;
  if (input.id && !existing) throw new Error('This study set is no longer available. Reload your library and try again.');
  const now = new Date().toISOString();
  const saved: PersonalStudyDeck = {
    id: existing?.id || `personal-${createFlashcardId()}`,
    ownerId,
    title: input.title.trim(),
    description: input.description.trim(),
    subjectId: input.subjectId,
    subject: input.subject.trim() || 'Personal study',
    strand: input.subject.trim() || 'Personal study',
    author: 'Created by you',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    cards: input.cards.map(card => ({ id: card.id, term: card.term.trim(), definition: card.definition.trim(), example: card.example.trim() })),
  };
  const updated = [saved, ...sets.filter(set => set.id !== saved.id)];
  persistSets(storage, ownerId, updated);
  return updated;
}

export function deletePersonalFlashcards(storage: BrowserStorage, ownerId: string, id: string): PersonalStudyDeck[] {
  const sets = readPersonalFlashcards(storage, ownerId);
  const updated = sets.filter(set => set.id !== id);
  persistSets(storage, ownerId, updated);
  return updated;
}
