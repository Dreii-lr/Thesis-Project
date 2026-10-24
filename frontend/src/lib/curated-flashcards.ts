import type { StudyCard, StudyDeck } from '../data/mockStudentFlashcards';

export type LearningProgramCode = 'SECONDARY' | 'ELEMENTARY' | 'BLP' | string;

export interface LearningProgramInfo {
  code: string;
  label: string;
  sublabel: string;
  badgeClass: string;
}

export function getProgramBadgeClass(code = ''): string {
  const c = (code || '').toUpperCase();
  if (c.includes('ELEM')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (c.includes('BLP') || c.includes('BASIC')) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
}

const STATIC_PROGRAMS: Record<string, LearningProgramInfo> = {
  SECONDARY: {
    code: 'SECONDARY',
    label: 'Secondary (JHS)',
    sublabel: 'Junior High Level',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  ELEMENTARY: {
    code: 'ELEMENTARY',
    label: 'Elementary',
    sublabel: 'Elementary Level',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  BLP: {
    code: 'BLP',
    label: 'Basic Literacy (BLP)',
    sublabel: 'Foundational Program',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

export function getLearningProgramInfo(code = ''): LearningProgramInfo {
  const upper = (code || '').toUpperCase();
  if (upper.includes('ELEM')) return STATIC_PROGRAMS.ELEMENTARY;
  if (upper.includes('BLP') || upper.includes('BASIC')) return STATIC_PROGRAMS.BLP;
  if (upper.includes('SEC') || upper.includes('JHS') || upper.includes('JUNIOR')) return STATIC_PROGRAMS.SECONDARY;
  if (STATIC_PROGRAMS[upper]) return STATIC_PROGRAMS[upper];
  return {
    code: code || 'GENERAL',
    label: code || 'Learning Program',
    sublabel: 'Program Study',
    badgeClass: getProgramBadgeClass(code),
  };
}

export const LEARNING_PROGRAMS: Record<string, LearningProgramInfo> = new Proxy(STATIC_PROGRAMS, {
  get(target, prop: string) {
    if (typeof prop === 'string') {
      const upper = prop.toUpperCase();
      if (upper in target) return target[upper];
      return getLearningProgramInfo(prop);
    }
    return undefined;
  },
});

export interface CuratedStudyDeck extends StudyDeck {
  categoryId?: string;
  programCode: string;
  programName: string;
  subjectId?: string;
  authorId?: string;
  authorRole: 'teacher' | 'admin' | 'system';
  createdAt: string;
  updatedAt: string;
  materialId?: string | null;
  lessonId?: string | null;
  generationScope?: 'FULL_MODULE' | 'SINGLE_TOPIC' | null;
}

export interface CuratedFlashcardInput {
  id?: string;
  title: string;
  description: string;
  categoryId?: string;
  programCode: string;
  programName: string;
  subjectId: string;
  subject: string;
  cards: StudyCard[];
  materialId?: string | null;
  lessonId?: string | null;
  generationScope?: 'FULL_MODULE' | 'SINGLE_TOPIC' | null;
}

export interface AuthorInfo {
  authorId?: string;
  authorName: string;
  authorRole: 'teacher' | 'admin' | 'system';
}

export const CURATED_FLASHCARDS_STORAGE_KEY = 'als_curated_flashcards_v2';

export const INITIAL_CURATED_DECKS: CuratedStudyDeck[] = [];

const LEGACY_MOCK_IDS = new Set([
  'deck-sec-math-01',
  'deck-sec-digital-01',
  'deck-elem-comm-01',
  'deck-blp-foundational-01',
  'everyday-math',
  'digital-basics',
  'communication',
]);

export function createCuratedCardId(): string {
  return globalThis.crypto?.randomUUID?.() || `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readCuratedFlashcards(storage?: Storage): CuratedStudyDeck[] {
  if (typeof window === 'undefined') return [];
  const store = storage || window.localStorage;
  const raw = store.getItem(CURATED_FLASHCARDS_STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((deck: unknown) => deck && typeof deck === 'object' && 'id' in deck && typeof deck.id === 'string' && !LEGACY_MOCK_IDS.has(deck.id)) as CuratedStudyDeck[];
    }
    return [];
  } catch {
    return [];
  }
}

export function persistCuratedFlashcards(decks: CuratedStudyDeck[], storage?: Storage): void {
  if (typeof window === 'undefined') return;
  const store = storage || window.localStorage;
  store.setItem(CURATED_FLASHCARDS_STORAGE_KEY, JSON.stringify(decks));
  window.dispatchEvent(new Event('als-flashcards-updated'));
}

export function writeCuratedFlashcards(decks: CuratedStudyDeck[], storage?: Storage): void {
  persistCuratedFlashcards(decks, storage);
}

export function validateCuratedDeckInput(input: CuratedFlashcardInput): void {
  if (!input.title.trim()) throw new Error('Give your study set a title.');
  if (input.title.trim().length > 100) throw new Error('Keep the title under 100 characters.');
  if (input.description.length > 300) throw new Error('Keep the description under 300 characters.');
  if (!input.programCode && !input.categoryId) {
    throw new Error('Please select a target Learning Program.');
  }
  if (input.cards.length < 2) throw new Error('Add at least two cards to your study set.');
  if (input.cards.length > 100) throw new Error('A study set can contain up to 100 cards.');

  input.cards.forEach((card, index) => {
    if (!card.term.trim() || !card.definition.trim()) {
      throw new Error(`Add a term and definition for card ${index + 1}.`);
    }
    if (card.term.length > 160 || card.definition.length > 2000 || (card.example && card.example.length > 500)) {
      throw new Error(`Card ${index + 1} is too long. Shorten its term, definition, or example.`);
    }
  });

  if (new Set(input.cards.map((c) => c.id)).size !== input.cards.length || input.cards.some((c) => !c.id)) {
    throw new Error('The cards could not be saved. Please refresh and try again.');
  }
}

export function saveCuratedFlashcard(
  input: CuratedFlashcardInput,
  author: AuthorInfo,
  storage?: Storage,
): CuratedStudyDeck[] {
  validateCuratedDeckInput(input);
  const decks = readCuratedFlashcards(storage);
  const now = new Date().toISOString();
  const existing = input.id ? decks.find((d) => d.id === input.id) : null;

  const savedDeck: CuratedStudyDeck = {
    id: existing?.id || `deck-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: input.title.trim(),
    description: input.description.trim(),
    categoryId: input.categoryId || existing?.categoryId,
    programCode: input.programCode || existing?.programCode || 'GENERAL',
    programName: input.programName || existing?.programName || 'Learning Program',
    subject: input.subject.trim() || 'General Study',
    subjectId: input.subjectId || '',
    strand: input.subject.trim() || 'General Study',
    author: author.authorName || 'Teacher',
    authorRole: author.authorRole || 'teacher',
    authorId: author.authorId || '',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    cards: input.cards.map((card) => ({
      id: card.id,
      term: card.term.trim(),
      definition: card.definition.trim(),
      example: (card.example || '').trim(),
    })),
  };

  const updated = [savedDeck, ...decks.filter((d) => d.id !== savedDeck.id)];
  persistCuratedFlashcards(updated, storage);
  return updated;
}

export function deleteCuratedFlashcard(id: string, storage?: Storage): CuratedStudyDeck[] {
  const decks = readCuratedFlashcards(storage);
  const updated = decks.filter((d) => d.id !== id);
  persistCuratedFlashcards(updated, storage);
  return updated;
}

/**
 * Intelligent topic card generator tailored dynamically to ALS concepts.
 */
export function generateCuratedFlashcardsFromTopic(
  topic: string,
  subjectName: string,
  programCode: string,
  count = 5,
): StudyCard[] {
  const cleanTopic = topic.trim();
  const lowerTopic = cleanTopic.toLowerCase();
  const prog = (programCode || '').toUpperCase();

  const topicDatabase: Record<string, StudyCard[]> = {
    math: [
      { id: createCuratedCardId(), term: 'Numerator', definition: 'The number above the line in a fraction showing how many parts are being considered.', example: 'In 2/5, the numerator is 2.' },
      { id: createCuratedCardId(), term: 'Denominator', definition: 'The bottom number in a fraction that shows the total number of equal parts in a whole.', example: 'In 2/5, the denominator is 5.' },
      { id: createCuratedCardId(), term: 'Ratio', definition: 'A relationship between two numbers showing how many times one contains or is contained within the other.', example: 'A mixture of 1 cup milk to 3 cups flour is a ratio of 1:3.' },
      { id: createCuratedCardId(), term: 'Percentage', definition: 'A number or ratio expressed as a fraction of 100.', example: '50% means 50 out of 100, which is equal to one-half.' },
      { id: createCuratedCardId(), term: 'Simple Interest', definition: 'Money earned or paid on an original principal investment or loan over a set time.', example: 'Earning 5% annual interest on 1,000 pesos equals 50 pesos per year.' },
    ],
    science: [
      { id: createCuratedCardId(), term: 'Photosynthesis', definition: 'The biological process by which green plants use sunlight to synthesize food from carbon dioxide and water.', example: 'Plants produce oxygen and glucose during photosynthesis.' },
      { id: createCuratedCardId(), term: 'Chlorophyll', definition: 'The green pigment in plants that absorbs light energy used in photosynthesis.', example: 'Leaves turn green due to chlorophyll.' },
      { id: createCuratedCardId(), term: 'Ecosystem', definition: 'A biological community of interacting organisms and their physical environment.', example: 'A mangrove forest is a vital coastal ecosystem.' },
      { id: createCuratedCardId(), term: 'Biodiversity', definition: 'The variety of plant and animal life in a particular habitat or ecosystem.', example: 'Rainforests feature high biodiversity with thousands of species.' },
      { id: createCuratedCardId(), term: 'Pollination', definition: 'The transfer of pollen from a male part of a plant to a female part, enabling fertilization.', example: 'Bees and butterflies carry pollen between flowers.' },
    ],
    communication: [
      { id: createCuratedCardId(), term: 'Main Idea', definition: 'The most important thought or central message of a paragraph or text.', example: 'The main idea summarizes what the whole story is about.' },
      { id: createCuratedCardId(), term: 'Supporting Details', definition: 'Specific facts, examples, and descriptions that elaborate and prove the main idea.', example: 'Statistics and quotes serve as supporting details.' },
      { id: createCuratedCardId(), term: 'Context Clues', definition: 'Hints found within a sentence, paragraph, or passage that a reader can use to understand the meanings of new or unfamiliar words.', example: 'Using the words around an unknown word to guess its definition.' },
      { id: createCuratedCardId(), term: 'Inference', definition: 'A conclusion reached on the basis of evidence and logical reasoning rather than direct statement.', example: 'Seeing wet coats in the hallway implies it was raining outside.' },
      { id: createCuratedCardId(), term: 'Active Listening', definition: 'Paying close attention to a speaker, understanding their message, and responding thoughtfully without premature judgment.', example: 'Nodding and asking clarifying questions shows active listening.' },
    ],
    digital: [
      { id: createCuratedCardId(), term: 'Operating System', definition: 'Software that supports a computer’s basic functions, such as scheduling tasks and controlling peripherals.', example: 'Android, Windows, and macOS are operating systems.' },
      { id: createCuratedCardId(), term: 'Phishing', definition: 'A fraudulent attempt to obtain sensitive information like usernames and passwords by disguising as a trustworthy entity.', example: 'A fake bank email asking for your password.' },
      { id: createCuratedCardId(), term: 'Digital Footprint', definition: 'The information about a particular person that exists on the internet as a result of their online activity.', example: 'Comments, posts, and search history form your digital footprint.' },
      { id: createCuratedCardId(), term: 'Two-Factor Authentication', definition: 'A security system requiring two separate forms of identification to access an account.', example: 'Entering your password and a code sent via SMS.' },
      { id: createCuratedCardId(), term: 'Web Browser', definition: 'An application used to access and view websites across the World Wide Web.', example: 'Chrome, Edge, and Firefox are web browsers.' },
    ],
    filipino: [
      { id: createCuratedCardId(), term: 'Pangunahing Kaisipan', definition: 'Ang sentral o pinakamahalagang mensahe at ideya na nais iparating ng isang talata o teksto.', example: 'Ipinapahayag ng pangunahing kaisipan ang buod ng buong talata.' },
      { id: createCuratedCardId(), term: 'Mga Pantulong na Detalye', definition: 'Mga tiyak na impormasyon, halimbawa, at patunay na nagpapaliwanag at sumusuporta sa pangunahing kaisipan.', example: 'Ang mga datos at sipi ay nagsisilbing mga pantulong na detalye.' },
      { id: createCuratedCardId(), term: 'Pahiwatig ng Konteksto', definition: 'Mga pahiwatig sa loob ng pangungusap o talata na tumutulong upang maunawaan ang kahulugan ng mga hindi pamilyar na salita.', example: 'Paggamit ng mga katabing salita upang tukuyin ang ibig sabihin ng mahirap na salita.' },
      { id: createCuratedCardId(), term: 'Tekstong Naratibo', definition: 'Uri ng teksto na naglalayong magsalaysay o magkuwento ng mga magkakaugnay na pangyayari sa isang maayos na pagkakasunod-sunod.', example: 'Ang mga maikling kuwento, pabula, at alamat ay halimbawa ng tekstong naratibo.' },
      { id: createCuratedCardId(), term: 'Banghay ng Kuwento', definition: 'Ang maayos at lohikal na pagkakasunod-sunod ng mga pangyayari mula sa simula, tunggalian, kasukdulan, hanggang wakas.', example: 'Ang banghay ay nagpapakita kung paano nalutas ang suliranin ng pangunahing tauhan.' },
    ],
    blp: [
      { id: createCuratedCardId(), term: 'Patinig (Vowel)', definition: 'Tunog sa pagsasalita na may bukas na bibig (A, E, I, O, U).', example: 'Ang mga patinig ay a, e, i, o, u.' },
      { id: createCuratedCardId(), term: 'Katinig (Consonant)', definition: 'Tunog sa pagsasalita na nabubuo sa pamamagitan ng pagpigil o pagharang ng hangin.', example: 'B, K, D, G, M, N, P, S, T.' },
      { id: createCuratedCardId(), term: 'Pantig (Syllable)', definition: 'Bawat saltik ng dila o walang antalang bugso ng tinig sa pagbigkas ng salita.', example: 'Ang salitang "ba-hay" ay may dalawang pantig.' },
      { id: createCuratedCardId(), term: 'Alpabeto (Alphabet)', definition: 'Ang kabuuan ng mga titik sa isang wika.', example: 'May 28 titik ang Alpabetong Filipino.' },
      { id: createCuratedCardId(), term: 'Salita (Word)', definition: 'Kombinasyon ng mga pantig na may tiyak na kahulugan.', example: '"Tubig", "Pagkain", "Pamilya".' },
    ],
  };

  const lowerSub = (subjectName || '').toLowerCase();
  const isFilipino =
    lowerSub.includes('filipino') ||
    lowerSub.includes('tagalog') ||
    lowerSub.includes('wika') ||
    lowerSub.includes('panitikan') ||
    lowerTopic.includes('teksto') ||
    lowerTopic.includes('naratibo') ||
    lowerTopic.includes('pag-unawa') ||
    lowerTopic.includes('kuwento') ||
    lowerTopic.includes('pangyayari') ||
    lowerTopic.includes('pangngalan') ||
    lowerTopic.includes('pandiwa') ||
    lowerTopic.includes('sanaysay');

  let pool: StudyCard[] = [];
  if (prog.includes('BLP') || prog.includes('BASIC') || lowerTopic.includes('patinig') || lowerTopic.includes('katinig')) {
    pool = topicDatabase.blp;
  } else if (isFilipino) {
    pool = topicDatabase.filipino;
  } else if (lowerTopic.includes('math') || lowerTopic.includes('fraction') || lowerTopic.includes('number') || lowerTopic.includes('ratio')) {
    pool = topicDatabase.math;
  } else if (lowerTopic.includes('science') || lowerTopic.includes('plant') || lowerTopic.includes('bio') || lowerTopic.includes('photo')) {
    pool = topicDatabase.science;
  } else if (lowerTopic.includes('digital') || lowerTopic.includes('computer') || lowerTopic.includes('security') || lowerTopic.includes('internet')) {
    pool = topicDatabase.digital;
  } else if (lowerTopic.includes('read') || lowerTopic.includes('comm') || lowerTopic.includes('listen') || lowerTopic.includes('infer')) {
    pool = topicDatabase.communication;
  } else {
    if (lowerSub.includes('math')) pool = topicDatabase.math;
    else if (lowerSub.includes('sci')) pool = topicDatabase.science;
    else if (lowerSub.includes('dig')) pool = topicDatabase.digital;
    else if (isFilipino) pool = topicDatabase.filipino;
    else pool = topicDatabase.communication;
  }

  return pool.slice(0, count).map((card) => ({
    id: createCuratedCardId(),
    term: card.term,
    definition: card.definition,
    example: card.example,
  }));
}
