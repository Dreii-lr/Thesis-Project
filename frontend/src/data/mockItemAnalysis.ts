import type { CategoryDataPayload, QuestionPayload } from '@/src/lib/assessments-api';
import type { AnalysisAssessment, AnalysisSubmission } from '@/src/lib/item-analysis';

// Isolated presentation fixtures. These IDs and answers never reach the assessment APIs.
function category(id: string, type: string, questions: Partial<QuestionPayload>[]): CategoryDataPayload {
  return { category_id: id, type, pool_size: questions.length, required_count: questions.length, points_per_item: 1, is_expanded: true, distractors: [], questions: questions.map(question => ({ id: '', text: '', options: [], correct_answer: '', premise: '', match: '', ...question })) };
}

const quiz: AnalysisAssessment = {
  assessment_id: 'demo-quiz-fractions', title: 'Fractions in Everyday Life', subject_code: 'MATH', subject_name: 'Mathematical and Problem Solving Skills',
  assessment_type: 'QUIZ', target_category: 'SECONDARY', status: 'COMPLETED', description: 'A sample quiz on fractions, equivalent values, and everyday applications.',
  start_date: '2026-10-12T01:00:00Z', end_date: '2026-10-12T01:30:00Z', duration_minutes: 30, grace_period_minutes: 5, max_score: 6, is_ai_generated: false, materials: [],
  categories_data: [category('demo-fractions', 'Multiple Choice', [
    { id: 'fraction-1', text: 'What is 1/2 + 1/4?', options: ['2/6', '3/4', '1/6', '2/4'], correct_answer: '3/4' },
    { id: 'fraction-2', text: 'Which fraction is equivalent to 3/4?', options: ['3/8', '4/5', '6/8', '6/4'], correct_answer: '6/8' },
    { id: 'fraction-3', text: 'What is 2/3 − 1/6?', options: ['1/3', '1/2', '1/6', '5/6'], correct_answer: '1/2' },
    { id: 'fraction-4', text: 'A recipe uses 3/4 cup of milk. How much is needed for half the recipe?', options: ['3/8 cup', '3/2 cups', '1/4 cup', '6/4 cups'], correct_answer: '3/8 cup' },
    { id: 'fraction-5', text: 'Which is greater: 2/3 or 3/5?', options: ['2/3', '3/5', 'They are equal'], correct_answer: '2/3' },
    { id: 'fraction-6', text: 'Simplify 6/9.', options: ['2/3', '3/4', '1/3', '6/3'], correct_answer: '2/3' },
  ])],
  topics: [
    { topic_name: 'Adding and subtracting fractions', affected_question_ids: ['fraction-1', 'fraction-3'], misconception: 'The sample answers suggest that some learners combine numerators and denominators directly instead of finding a common denominator.', recommendation: 'Model equivalent fractions with fraction strips, then practise two examples with unlike denominators.' },
    { topic_name: 'Fractions in word problems', affected_question_ids: ['fraction-4'], misconception: 'Several sample responses double the amount or subtract a fraction when the situation asks for half of a quantity.', recommendation: 'Use a recipe illustration to show one half of three quarters before translating it into multiplication.' },
    { topic_name: 'Equivalent fractions and comparison', affected_question_ids: ['fraction-2', 'fraction-5', 'fraction-6'], misconception: 'Some sample responses change only one part of a fraction or compare values using the denominator alone.', recommendation: 'Compare fractions on a number line and practise multiplying or dividing both parts by the same number.' },
  ],
};

const exam: AnalysisAssessment = {
  ...quiz, assessment_id: 'demo-exam-reading', title: 'Reading for Meaning', subject_code: 'COMM', subject_name: 'Communication Skills', assessment_type: 'EXAM', target_category: 'ELEMENTARY',
  description: 'A sample exam on reading comprehension and evidence.', start_date: '2026-10-13T01:00:00Z', end_date: '2026-10-13T02:00:00Z', duration_minutes: 60,
  categories_data: [category('demo-reading', 'Multiple Choice', [
    { id: 'reading-1', text: 'Ana waters the plants each morning and removes weeds every weekend. What is the main idea?', options: ['Ana cares for her garden.', 'Ana dislikes mornings.', 'Weeds grow only on weekends.'], correct_answer: 'Ana cares for her garden.' },
    { id: 'reading-2', text: 'Leo picked up his umbrella after hearing thunder. What can you infer?', options: ['He expects rain.', 'He is going swimming.', 'It is very sunny.'], correct_answer: 'He expects rain.' },
    { id: 'reading-3', text: 'The room was dim, so Mila switched on a lamp. What does dim mean?', options: ['Not bright', 'Very noisy', 'Very large'], correct_answer: 'Not bright' },
    { id: 'reading-4', text: 'The ground was wet because it rained. What was the cause?', options: ['It rained.', 'The ground was wet.', 'The sun appeared.'], correct_answer: 'It rained.' },
  ]), category('demo-true-false', 'True or False', [
    { id: 'reading-5', text: 'An inference should be supported by clues in the text.', options: ['True', 'False'], correct_answer: 'True' },
  ]), category('demo-essay', 'Essay', [
    { id: 'reading-6', text: 'Lina shared her lunch with a classmate who had none. Describe a quality Lina shows and support it with evidence from the sentence.' },
  ])],
  topics: [
    { topic_name: 'Drawing inferences from evidence', affected_question_ids: ['reading-2', 'reading-5'], misconception: 'The sample responses suggest difficulty connecting text clues to a reasonable conclusion.', recommendation: 'Use a two-column chart: what the text says and what that clue helps us infer.' },
    { topic_name: 'Identifying the main idea', affected_question_ids: ['reading-1'], misconception: 'Some sample answers focus on a small detail rather than the idea that connects the whole passage.', recommendation: 'Ask learners to group supporting details, then write one sentence that covers them all.' },
    { topic_name: 'Context clues and cause and effect', affected_question_ids: ['reading-3', 'reading-4'], misconception: 'The sample answers mix up the reason an event happened with its result, or overlook nearby vocabulary clues.', recommendation: 'Highlight because and so, then connect each cause to its effect with an arrow.' },
  ],
};

const names = ['Aira Santos', 'Ben Cruz', 'Carla Reyes', 'Diego Ramos', 'Ella Garcia', 'Finn Lopez', 'Gia Mendoza', 'Hugo Torres'];
const quizAnswers = [
  ['2/6', '6/8', '1/3', '3/2 cups', '2/3', '2/3'],
  ['3/4', '6/8', '1/2', '3/8 cup', '2/3', '2/3'],
  ['2/6', '3/8', '1/3', '3/2 cups', '3/5', '1/3'],
  ['2/4', '6/8', '1/6', '', '2/3', '2/3'],
  ['3/4', '6/8', '1/2', '1/4 cup', '2/3', '2/3'],
  ['2/6', '6/8', '1/3', '3/2 cups', '3/5', '2/3'],
  ['3/4', '6/8', '1/2', '3/8 cup', '2/3', '2/3'],
  ['2/6', '4/5', '1/3', '1/4 cup', '', '3/4'],
];
const examAnswers = [
  ['Ana cares for her garden.', 'It is very sunny.', 'Not bright', 'The ground was wet.', 'False', 'Lina is kind because she shared her lunch.'],
  ['Ana cares for her garden.', 'He expects rain.', 'Not bright', 'It rained.', 'True', 'She is generous. She gave food to someone who had none.'],
  ['Weeds grow only on weekends.', 'He is going swimming.', 'Very large', 'The ground was wet.', 'False', 'She likes lunch.'],
  ['Ana cares for her garden.', '', 'Not bright', 'It rained.', 'True', 'She helps her classmate by sharing food.'],
  ['Ana cares for her garden.', 'He expects rain.', 'Not bright', 'It rained.', 'True', 'She is caring because her classmate had no lunch and she shared.'],
  ['Ana dislikes mornings.', 'It is very sunny.', 'Very noisy', 'The ground was wet.', 'False', 'She had lunch.'],
  ['Ana cares for her garden.', 'He expects rain.', 'Not bright', 'It rained.', 'True', 'She notices someone needs help and shares.'],
  ['Weeds grow only on weekends.', 'It is very sunny.', 'Not bright', 'It rained.', '', ''],
];

function submissions(assessment: AnalysisAssessment, rows: string[][]): AnalysisSubmission[] {
  const questions = assessment.categories_data.flatMap(group => group.questions.map(question => ({ ...question, type: group.type })));
  return rows.map((row, index) => {
    const answers = questions.map((question, position) => ({ question_id: question.id, student_answer: row[position], is_correct: question.type === 'Essay' ? null : row[position] === question.correct_answer, needs_teacher_review: question.type === 'Essay' }));
    const score = answers.filter(answer => answer.is_correct).length;
    return { submission_id: `${assessment.assessment_id}-submission-${index + 1}`, assessment_id: assessment.assessment_id, learner_id: `demo-learner-${index + 1}`, student_name: names[index], student_category: assessment.target_category, status: assessment.assessment_type === 'EXAM' ? 'SUBMITTED' : 'GRADED', auto_score: score, manual_score: 0, final_score: score, is_late: false, started_at: assessment.start_date!, submitted_at: assessment.end_date, time_spent_seconds: 1200, answers_payload: { answers } };
  });
}

export const demoAnalysisAssessments = [quiz, exam];
export const demoAnalysisSubmissions = [...submissions(quiz, quizAnswers), ...submissions(exam, examAnswers)];
