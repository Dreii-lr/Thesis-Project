import {
  createCuratedCardId,
  getLearningProgramInfo,
  validateCuratedDeckInput,
  type CuratedFlashcardInput,
  type CuratedStudyDeck,
} from "./curated-flashcards";

export interface FlashcardDraft extends Omit<CuratedFlashcardInput, "id"> {
  id: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  sourceDeckId?: string;
  moduleTitle?: string;
  topicTitle?: string;
  requestedCardCount?: number;
  generationNote?: string;
}

export type FlashcardDraftInput = Omit<
  FlashcardDraft,
  "id" | "ownerId" | "createdAt" | "updatedAt"
>;
export const FLASHCARD_DRAFTS_UPDATED = "als-flashcard-drafts-updated";

export function flashcardDraftsKey(ownerId: string) {
  if (!ownerId.trim()) throw new Error("Sign in again before saving a draft.");
  return `als_flashcard_drafts_v1:${encodeURIComponent(ownerId)}`;
}

function storageOrDefault(storage?: Storage): Storage {
  if (storage) return storage;
  if (typeof window === "undefined")
    throw new Error("Drafts are available in your browser.");
  return window.localStorage;
}

export function readFlashcardDrafts(
  ownerId: string,
  storage?: Storage,
): FlashcardDraft[] {
  const raw = storageOrDefault(storage).getItem(flashcardDraftsKey(ownerId));
  if (!raw) return [];
  let records: unknown;
  try {
    records = JSON.parse(raw);
  } catch {
    throw new Error(
      "Saved drafts could not be read. Browser storage has not been changed.",
    );
  }
  if (
    !Array.isArray(records) ||
    records.some((value: unknown) => {
      if (!value || typeof value !== "object") return true;
      const draft = value as FlashcardDraft;
      return (
        draft.ownerId !== ownerId ||
        typeof draft.id !== "string" ||
        !draft.id.startsWith("draft-") ||
        typeof draft.title !== "string" ||
        typeof draft.description !== "string" ||
        typeof draft.programCode !== "string" ||
        typeof draft.programName !== "string" ||
        typeof draft.subjectId !== "string" ||
        typeof draft.subject !== "string" ||
        typeof draft.createdAt !== "string" ||
        typeof draft.updatedAt !== "string" ||
        !Array.isArray(draft.cards) ||
        draft.cards.some(
          (card) =>
            !card ||
            typeof card.id !== "string" ||
            typeof card.term !== "string" ||
            typeof card.definition !== "string",
        )
      );
    })
  )
    throw new Error(
      "Saved drafts could not be read. Browser storage has not been changed.",
    );
  return (records as FlashcardDraft[]).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

function persist(
  ownerId: string,
  records: FlashcardDraft[],
  storage?: Storage,
) {
  storageOrDefault(storage).setItem(
    flashcardDraftsKey(ownerId),
    JSON.stringify(records),
  );
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(FLASHCARD_DRAFTS_UPDATED));
}

export function saveFlashcardDraft(
  ownerId: string,
  draft: FlashcardDraft,
  storage?: Storage,
): FlashcardDraft {
  if (draft.ownerId !== ownerId || !draft.id.startsWith("draft-"))
    throw new Error("This draft does not belong to your account.");
  const records = readFlashcardDrafts(ownerId, storage);
  const saved = {
    ...draft,
    updatedAt: new Date().toISOString(),
    cards: draft.cards.map((card) => ({ ...card })),
  };
  persist(
    ownerId,
    [saved, ...records.filter((item) => item.id !== saved.id)],
    storage,
  );
  return saved;
}

export function createFlashcardDraft(
  ownerId: string,
  input: FlashcardDraftInput,
  storage?: Storage,
): FlashcardDraft {
  const now = new Date().toISOString();
  return saveFlashcardDraft(
    ownerId,
    {
      ...input,
      id: `draft-${createCuratedCardId()}`,
      ownerId,
      createdAt: now,
      updatedAt: now,
    },
    storage,
  );
}

export function deleteFlashcardDraft(
  ownerId: string,
  draftId: string,
  storage?: Storage,
) {
  const records = readFlashcardDrafts(ownerId, storage);
  persist(
    ownerId,
    records.filter((draft) => draft.id !== draftId),
    storage,
  );
}

export function draftFromPublishedDeck(
  deck: CuratedStudyDeck,
  subjectId = "",
): FlashcardDraftInput {
  return {
    title: deck.title,
    description: deck.description,
    categoryId: deck.categoryId,
    programCode: getLearningProgramInfo(deck.programCode).code,
    programName: deck.programName,
    subjectId: deck.subjectId || subjectId,
    subject: deck.subject,
    cards: deck.cards.map((card) => ({ ...card })),
    materialId: deck.materialId,
    lessonId: deck.lessonId,
    generationScope: deck.generationScope,
    sourceDeckId: deck.id,
  };
}

export function draftPublicationInput(
  draft: FlashcardDraft,
  targetId = draft.sourceDeckId,
): CuratedFlashcardInput {
  const input: CuratedFlashcardInput = {
    id: targetId,
    title: draft.title.trim(),
    description: draft.description.trim(),
    categoryId: draft.categoryId,
    programCode: getLearningProgramInfo(draft.programCode).code,
    programName: draft.programName,
    subjectId: draft.subjectId,
    subject: draft.subject.trim(),
    cards: draft.cards.map((card) => ({
      ...card,
      term: card.term.trim(),
      definition: card.definition.trim(),
      example: card.example?.trim(),
    })),
    materialId: draft.materialId,
    lessonId: draft.lessonId,
    generationScope: draft.generationScope,
  };
  if (!input.subjectId || !input.subject)
    throw new Error("Choose a subject before publishing.");
  if (!input.programCode || input.programCode === "GENERAL")
    throw new Error("Choose a learning program before publishing.");
  if (input.generationScope === "SINGLE_TOPIC" && !input.lessonId)
    throw new Error(
      "This draft is missing its source topic. Generate it again from the module.",
    );
  if (input.generationScope && !input.materialId)
    throw new Error("This draft is missing its source module.");
  validateCuratedDeckInput(input);
  return input;
}

// Match the backend's existing module/topic/title upsert before asking to publish.
export function findDraftPublicationTarget(
  draft: FlashcardDraft,
  decks: CuratedStudyDeck[],
) {
  if (draft.sourceDeckId)
    return decks.find((deck) => deck.id === draft.sourceDeckId);
  if (draft.lessonId) {
    const match = decks.find(
      (deck) => deck.lessonId?.toLowerCase() === draft.lessonId?.toLowerCase(),
    );
    if (match) return match;
  }
  if (draft.materialId && draft.generationScope === "FULL_MODULE") {
    const match = decks.find(
      (deck) =>
        deck.materialId?.toLowerCase() === draft.materialId?.toLowerCase() &&
        deck.generationScope === "FULL_MODULE",
    );
    if (match) return match;
  }
  const normalizeTitle = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/^(?:topic|aralin|lesson)\s*\d+[\s:\-–—]+/, "")
      .replace(/\s*(?:flashcards?|study\s*sets?|cards?|set)\s*$/, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return decks.find(
    (deck) =>
      getLearningProgramInfo(deck.programCode).code ===
        getLearningProgramInfo(draft.programCode).code &&
      (deck.title.trim().toLowerCase() === draft.title.trim().toLowerCase() ||
        (Boolean(normalizeTitle(draft.title)) &&
          normalizeTitle(deck.title) === normalizeTitle(draft.title))),
  );
}
