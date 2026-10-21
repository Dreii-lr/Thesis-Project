import { authenticatedRequest } from '@/src/lib/auth-api';
import type { StudyCard } from '@/src/data/mockStudentFlashcards';
import { DEFAULT_USER_CATEGORIES } from '@/src/lib/user-categories-api';
import {
  type AuthorInfo,
  type CuratedFlashcardInput,
  type CuratedStudyDeck,
  getLearningProgramInfo,
} from '@/src/lib/curated-flashcards';

export interface BackendFlashcardCard {
  id: string;
  deck_id?: string;
  deckId?: string;
  front: string;
  back: string;
  hint?: string | null;
  explanation?: string | null;
  term?: string;
  definition?: string;
  example?: string;
  display_order?: number;
  displayOrder?: number;
}

export interface BackendFlashcardDeck {
  id: string;
  title: string;
  description?: string | null;
  program_code: string;
  programCode?: string;
  program_name?: string | null;
  programName?: string | null;
  subject_id?: string | null;
  subjectId?: string | null;
  subject_name?: string | null;
  subjectName?: string | null;
  subject?: string;
  strand?: string | null;
  tags?: string[];
  difficulty?: string;
  is_system_curated?: boolean;
  isSystemCurated?: boolean;
  created_by_user_id?: string | null;
  author_name?: string | null;
  author?: string;
  author_role?: string | null;
  authorRole?: 'teacher' | 'admin' | 'system';
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  material_id?: string | null;
  materialId?: string | null;
  lesson_id?: string | null;
  lessonId?: string | null;
  generation_scope?: string | null;
  generationScope?: string | null;
  cards: BackendFlashcardCard[];
}

export interface BackendDeckListEnvelope {
  items: BackendFlashcardDeck[];
  total: number;
  offset?: number;
  limit?: number;
}

/**
 * Adapt backend deck payload (whether camelCase or snake_case) to CuratedStudyDeck.
 */
export function adaptBackendDeckToCuratedDeck(deck: BackendFlashcardDeck | any): CuratedStudyDeck {
  const program = deck.program || deck.program_name || deck.program_code || deck.programCode || 'Elementary';
  const programMeta = getLearningProgramInfo(program);
  const subjectName = deck.subject || deck.subject_name || deck.subjectName || 'General Study';

  const matchedCategory = DEFAULT_USER_CATEGORIES.find(
    (c) =>
      (c.code || '').toUpperCase() === program.toUpperCase() ||
      (c.name || '').toLowerCase() === program.toLowerCase(),
  );

  const adaptedCards: StudyCard[] = (deck.cards || []).map((c: any, idx: number) => ({
    id: c.id || `card-${deck.id}-${idx}`,
    term: c.term || c.front || '',
    definition: c.definition || c.back || '',
    example: c.example || c.explanation || c.hint || '',
  }));

  const role = (deck.authorRole || deck.author_role || 'teacher').toLowerCase();
  const validRole: 'teacher' | 'admin' | 'system' =
    role === 'admin' ? 'admin' : role === 'system' ? 'system' : 'teacher';

  return {
    id: String(deck.id),
    title: deck.title,
    description: deck.description || '',
    subject: subjectName,
    strand: subjectName,
    author: deck.author || deck.author_name || 'ALS Teacher',
    authorId: deck.created_by_user_id || undefined,
    authorRole: validRole,
    categoryId: matchedCategory?.category_id,
    subjectId: undefined,
    programCode: program,
    programName: programMeta.label || program,
    createdAt: deck.createdAt || deck.created_at || new Date().toISOString(),
    updatedAt: deck.updatedAt || deck.updated_at || new Date().toISOString(),
    materialId: deck.materialId || deck.material_id || undefined,
    lessonId: deck.lessonId || deck.lesson_id || undefined,
    generationScope: deck.generationScope || deck.generation_scope || undefined,
    cards: adaptedCards,
  };
}

/**
 * Query decks from backend with optional filters.
 */
export async function listFlashcardsApi(params: {
  program?: string;
  program_code?: string;
  subject?: string;
  search?: string;
  is_curated?: boolean;
  offset?: number;
  limit?: number;
} = {}): Promise<{ items: CuratedStudyDeck[]; total: number }> {
  const q = new URLSearchParams();
  const prog = params.program || params.program_code;
  if (prog) q.set('program', prog);
  if (params.subject) q.set('subject', params.subject);
  if (params.search) q.set('search', params.search);
  if (params.is_curated !== undefined) q.set('is_curated', String(params.is_curated));
  if (params.offset !== undefined) q.set('offset', String(params.offset));
  if (params.limit !== undefined) q.set('limit', String(params.limit));

  const path = `/flashcards${q.toString() ? `?${q.toString()}` : ''}`;
  const raw = await authenticatedRequest<BackendDeckListEnvelope | BackendFlashcardDeck[]>(path);

  if (Array.isArray(raw)) {
    return {
      items: raw.map(adaptBackendDeckToCuratedDeck),
      total: raw.length,
    };
  }

  const items = Array.isArray(raw?.items) ? raw.items.map(adaptBackendDeckToCuratedDeck) : [];
  const total = typeof raw?.total === 'number' ? raw.total : items.length;
  return { items, total };
}

/**
 * Fetch a single deck by ID.
 */
export async function getFlashcardDeckApi(id: string): Promise<CuratedStudyDeck> {
  const raw = await authenticatedRequest<BackendFlashcardDeck>(`/flashcards/${id}`);
  return adaptBackendDeckToCuratedDeck(raw);
}

/**
 * Create a new deck on the backend.
 */
export async function createFlashcardDeckApi(
  input: CuratedFlashcardInput,
  author: AuthorInfo,
): Promise<CuratedStudyDeck> {
  const payload = {
    ...(input.id ? { id: input.id } : {}),
    title: input.title,
    description: input.description,
    program: input.programName || input.programCode || 'Elementary',
    subject: input.subject || 'General Study',
    author_name: author.authorName,
    author_role: author.authorRole,
    material_id: input.materialId ?? null,
    lesson_id: input.lessonId ?? null,
    generation_scope: input.generationScope ?? null,
    cards: input.cards.map((c, idx) => ({
      front: c.term,
      back: c.definition,
      explanation: c.example || null,
      display_order: idx,
    })),
  };

  const raw = await authenticatedRequest<BackendFlashcardDeck>('/flashcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return adaptBackendDeckToCuratedDeck(raw);
}

/**
 * Update an existing deck on the backend.
 */
export async function updateFlashcardDeckApi(
  id: string,
  input: CuratedFlashcardInput,
  author: AuthorInfo,
): Promise<CuratedStudyDeck> {
  const payload = {
    title: input.title,
    description: input.description,
    program: input.programName || input.programCode || 'Elementary',
    subject: input.subject || 'General Study',
    author_name: author.authorName,
    author_role: author.authorRole,
    material_id: input.materialId !== undefined ? input.materialId : undefined,
    lesson_id: input.lessonId !== undefined ? input.lessonId : undefined,
    generation_scope: input.generationScope !== undefined ? input.generationScope : undefined,
    cards: input.cards.map((c, idx) => ({
      front: c.term,
      back: c.definition,
      explanation: c.example || null,
      display_order: idx,
    })),
  };

  const raw = await authenticatedRequest<BackendFlashcardDeck>(`/flashcards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return adaptBackendDeckToCuratedDeck(raw);
}

/**
 * Delete a deck on the backend.
 */
export async function deleteFlashcardDeckApi(id: string): Promise<void> {
  await authenticatedRequest<unknown>(`/flashcards/${id}`, {
    method: 'DELETE',
  }, false);
}

/**
 * Request AI flashcard generation from backend (which delegates to document-processing-ms).
 * Can be grounded either in an existing GeneratedLesson (via lessonId) or generated from a topic.
 */
export async function generateFlashcardsAIApi(params: {
  topic?: string;
  lessonId?: string;
  materialId?: string;
  programCode?: string;
  program?: string;
  subjectId?: string;
  subjectName?: string;
  subject?: string;
  numCards?: number;
  generationScope?: 'FULL_MODULE' | 'SINGLE_TOPIC';
  forceRegenerate?: boolean;
}): Promise<{
  title: string;
  description: string;
  tags: string[];
  cards: StudyCard[];
  isExisting?: boolean;
  existingDeckId?: string;
}> {
  const payload = {
    topic: params.topic || undefined,
    lesson_id: params.lessonId || undefined,
    material_id: params.materialId || undefined,
    generation_scope: params.generationScope || (params.materialId && !params.lessonId ? 'FULL_MODULE' : 'SINGLE_TOPIC'),
    program: params.program || params.programCode || 'Elementary',
    subject: params.subject || params.subjectName || undefined,
    num_cards: params.numCards || 5,
    force_regenerate: params.forceRegenerate || false,
  };

  const raw = await authenticatedRequest<{
    title: string;
    description: string;
    tags?: string[];
    cards: BackendFlashcardCard[];
    is_existing?: boolean;
    isExisting?: boolean;
    existing_deck_id?: string | null;
    existingDeckId?: string | null;
  }>('/flashcards/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const cards: StudyCard[] = (raw.cards || []).map((c, idx) => ({
    id: c.id || `gen-${Date.now()}-${idx}`,
    term: c.term || c.front || '',
    definition: c.definition || c.back || '',
    example: c.example || c.explanation || c.hint || '',
  }));

  return {
    title: raw.title,
    description: raw.description,
    tags: raw.tags || [],
    cards,
    isExisting: raw.is_existing ?? raw.isExisting ?? false,
    existingDeckId: raw.existing_deck_id ?? raw.existingDeckId ?? undefined,
  };
}
