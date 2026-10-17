import type { StudyCard } from '../data/mockStudentFlashcards';

export type CardRating = 'learning' | 'known';
export type StudyScope = 'all' | 'starred' | 'review';

export interface FlashcardSession {
  order: string[];
  position: number;
  flipped: boolean;
  starred: string[];
  ratings: Record<string, CardRating>;
  scope: StudyScope;
  completed: boolean;
  shuffled: boolean;
}

export type StudyAction =
  | { type: 'flip' }
  | { type: 'move'; direction: -1 | 1 }
  | { type: 'rate'; rating: CardRating }
  | { type: 'star'; id: string }
  | { type: 'round'; ids: string[]; scope: StudyScope; reset?: boolean }
  | { type: 'shuffle'; ids: string[]; shuffled: boolean };

export function createFlashcardSession(cards: StudyCard[]): FlashcardSession {
  return { order: cards.map(card => card.id), position: 0, flipped: false, starred: [], ratings: {}, scope: 'all', completed: false, shuffled: false };
}

function moveForward(state: FlashcardSession): FlashcardSession {
  if (state.position >= state.order.length - 1) return { ...state, completed: true, flipped: false };
  return { ...state, position: state.position + 1, flipped: false };
}

export function flashcardStudyReducer(state: FlashcardSession, action: StudyAction): FlashcardSession {
  switch (action.type) {
    case 'flip':
      return state.completed || !state.order.length ? state : { ...state, flipped: !state.flipped };
    case 'move':
      if (state.completed || !state.order.length) return state;
      return action.direction === 1 ? moveForward(state) : { ...state, position: Math.max(0, state.position - 1), flipped: false };
    case 'rate': {
      const id = state.order[state.position];
      if (state.completed || !id) return state;
      return moveForward({ ...state, ratings: { ...state.ratings, [id]: action.rating } });
    }
    case 'star': {
      const starred = state.starred.includes(action.id) ? state.starred.filter(id => id !== action.id) : [...state.starred, action.id];
      const order = state.scope === 'starred' ? state.order.filter(id => starred.includes(id)) : state.order;
      const currentPosition = order.indexOf(state.order[state.position]);
      return { ...state, starred, order, position: currentPosition >= 0 ? currentPosition : Math.min(state.position, Math.max(0, order.length - 1)), completed: order.length ? state.completed : false, flipped: state.scope === 'starred' ? false : state.flipped };
    }
    case 'round': {
      const ratings = action.reset ? {} : { ...state.ratings };
      action.ids.forEach(id => { delete ratings[id]; });
      return { ...state, order: action.ids, scope: action.scope, ratings, position: 0, flipped: false, completed: false, shuffled: false };
    }
    case 'shuffle':
      return { ...state, order: action.ids, shuffled: action.shuffled, position: 0, flipped: false, completed: false };
  }
}

export function shuffleFlashcards(ids: string[]): string[] {
  const result = [...ids];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}
