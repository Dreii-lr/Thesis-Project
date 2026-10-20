export interface StudyCard {
  id: string;
  term: string;
  definition: string;
  example: string;
}

export interface StudyDeck {
  id: string;
  title: string;
  subject: string;
  strand: string;
  description: string;
  author: string;
  cards: StudyCard[];
}

// Empty mock study sets; all flashcards are now fetched from the live backend.
export const mockStudentFlashcards: StudyDeck[] = [];

