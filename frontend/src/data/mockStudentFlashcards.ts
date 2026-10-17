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

// Sample study sets for the student flashcard preview.
export const mockStudentFlashcards: StudyDeck[] = [
  {
    id: 'everyday-math',
    title: 'Everyday mathematics',
    subject: 'Mathematics',
    strand: 'Learning Strand 3',
    description: 'Small concepts that make everyday calculations easier.',
    author: 'Example study set',
    cards: [
      { id: 'math-1', term: 'Numerator', definition: 'The top number in a fraction. It tells you how many equal parts are being considered.', example: 'In 3/4, the numerator is 3.' },
      { id: 'math-2', term: 'Denominator', definition: 'The bottom number in a fraction. It tells you how many equal parts make one whole.', example: 'In 3/4, the denominator is 4.' },
      { id: 'math-3', term: 'Equivalent fractions', definition: 'Fractions that represent the same value, even when their numerators and denominators differ.', example: '1/2, 2/4, and 3/6 all represent one half.' },
      { id: 'math-4', term: 'Percentage', definition: 'A way of expressing a number as a share out of one hundred.', example: '25% is 25 out of 100, or one quarter.' },
      { id: 'math-5', term: 'Decimal', definition: 'A way of writing numbers using place values, with a point separating whole and fractional parts.', example: '0.75 is the same value as 3/4.' },
      { id: 'math-6', term: 'Ratio', definition: 'A comparison of two quantities using division.', example: 'Two cups of rice to three cups of water is a ratio of 2:3.' },
      { id: 'math-7', term: 'Perimeter', definition: 'The total distance around the outside of a two-dimensional shape.', example: 'A rectangle measuring 5 m by 3 m has a perimeter of 16 m.' },
      { id: 'math-8', term: 'Area', definition: 'The amount of surface inside a two-dimensional shape, measured in square units.', example: 'A rectangle measuring 5 m by 3 m has an area of 15 square metres.' },
    ],
  },
  {
    id: 'digital-basics',
    title: 'Your digital essentials',
    subject: 'Digital Literacy',
    strand: 'Learning Strand 6',
    description: 'Get comfortable with devices, information, and online safety.',
    author: 'Example study set',
    cards: [
      { id: 'digital-1', term: 'Operating system', definition: 'System software that manages a device and allows its applications to run.', example: 'Windows and Android are operating systems.' },
      { id: 'digital-2', term: 'Input device', definition: 'A piece of hardware used to send information or instructions to a computer.', example: 'A keyboard enters text; a microphone records sound.' },
      { id: 'digital-3', term: 'Web browser', definition: 'An application used to open and interact with websites.', example: 'You can open a learning website in Chrome or Firefox.' },
      { id: 'digital-4', term: 'Phishing', definition: 'A deceptive message or website designed to trick someone into sharing sensitive information.', example: 'An unexpected message asking you to enter your password through a link may be phishing.' },
      { id: 'digital-5', term: 'Backup', definition: 'An extra copy of a file that can be used if the original is lost or damaged.', example: 'Keep a copy of your schoolwork on another drive or a trusted cloud service.' },
      { id: 'digital-6', term: 'Digital footprint', definition: 'The trail of information left by your activities on the internet.', example: 'Public posts and comments can become part of your digital footprint.' },
    ],
  },
  {
    id: 'communication',
    title: 'Communicate with confidence',
    subject: 'Communication Skills',
    strand: 'Learning Strand 1',
    description: 'Build a stronger foundation for reading, listening, and sharing ideas.',
    author: 'Example study set',
    cards: [
      { id: 'communication-1', term: 'Main idea', definition: 'The central point that a paragraph or passage communicates.', example: 'A paragraph about saving water may have the main idea that small habits conserve resources.' },
      { id: 'communication-2', term: 'Supporting detail', definition: 'A fact, example, or explanation that develops the main idea.', example: 'Turning off the tap while brushing is a detail that supports a passage about saving water.' },
      { id: 'communication-3', term: 'Active listening', definition: 'Giving a speaker your attention and responding to understand their message.', example: 'Listen without interrupting, then ask a question to clarify what you heard.' },
      { id: 'communication-4', term: 'Context clues', definition: 'Words or ideas around an unfamiliar word that help explain its meaning.', example: 'In "The arid land had no rain," the phrase "no rain" helps explain "arid."' },
      { id: 'communication-5', term: 'Inference', definition: 'A conclusion drawn by combining information in a text with what you already know.', example: 'Wet umbrellas near a door suggest that it has been raining.' },
      { id: 'communication-6', term: 'Summary', definition: 'A short account of the most important ideas in a longer text.', example: 'Retell the key events of a story without including every detail.' },
    ],
  },
];
