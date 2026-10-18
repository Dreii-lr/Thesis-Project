import type { AssessmentPayload, SubmissionDetail } from './assessments-api';

export interface AnalysisAnswer {
  question_id: string;
  student_answer: string;
  is_correct: boolean | null;
  needs_teacher_review?: boolean;
}
export type AnalysisSubmission = Omit<SubmissionDetail, 'answers_payload'> & {
  learner_id: string;
  answers_payload: { answers: AnalysisAnswer[] };
};
export interface AnalysisTopic {
  topic_name: string;
  affected_question_ids: string[];
  misconception: string;
  recommendation: string;
}
export interface AnalysisAssessment extends AssessmentPayload {
  assessment_id: string;
  subject_name: string;
  topics: AnalysisTopic[];
}
export type AnswerOutcome = 'correct' | 'incorrect' | 'skipped' | 'pending';

export function answerOutcome(answer: AnalysisAnswer): AnswerOutcome {
  // The backend leaves essay correctness null, even after an overall manual grade.
  if (answer.needs_teacher_review || answer.is_correct === null) return 'pending';
  if (!answer.student_answer.trim()) return 'skipped';
  return answer.is_correct ? 'correct' : 'incorrect';
}

export function buildItemAnalysis(assessment: AnalysisAssessment, submissions: AnalysisSubmission[]) {
  if (!['QUIZ', 'EXAM', 'TEST'].includes(assessment.assessment_type)) throw new Error('Item analysis is available for quizzes, exams, and tests only.');
  const records = submissions.filter(submission => submission.assessment_id === assessment.assessment_id &&
    submission.student_category === assessment.target_category && ['SUBMITTED', 'GRADED'].includes(submission.status));
  const items = assessment.categories_data.flatMap(category => category.questions.map(question => {
    // A missing answer row can mean this pool item was never delivered. Do not count it as skipped.
    const responses = records.flatMap(submission => {
      const answer = submission.answers_payload.answers.find(item => item.question_id === question.id);
      return answer ? [{ learner_id: submission.learner_id, student_name: submission.student_name || submission.learner_id, answer: answer.student_answer, outcome: answerOutcome(answer) }] : [];
    });
    const correct = responses.filter(answer => answer.outcome === 'correct').length;
    const incorrect = responses.filter(answer => answer.outcome === 'incorrect').length;
    const skipped = responses.filter(answer => answer.outcome === 'skipped').length;
    const pending = responses.filter(answer => answer.outcome === 'pending').length;
    const evaluated = correct + incorrect + skipped;
    const expected = question.correct_answer || question.match;
    const labels = new Map<string, string>();
    for (const value of [...question.options, ...(expected ? [expected] : []), ...responses.map(response => response.answer)]) {
      const key = value.trim().toLowerCase();
      if (key && !labels.has(key)) labels.set(key, value);
    }
    const values = [...labels.values()];
    const distribution = values.map(value => ({ answer: value, count: responses.filter(response => response.answer.trim().toLowerCase() === value.trim().toLowerCase()).length, correct: !!expected && value.trim().toLowerCase() === expected.trim().toLowerCase() }));
    return {
      id: question.id, number: 0, prompt: question.text || question.premise, type: category.type,
      expected, responses, distribution, correct, incorrect, skipped, pending, evaluated,
      errorRate: evaluated ? (incorrect + skipped) / evaluated * 100 : null,
      correctRate: evaluated ? correct / evaluated * 100 : null,
    };
  })).map((item, index) => ({ ...item, number: index + 1 }));
  const topics = assessment.topics.map(topic => {
    const affected = items.filter(item => topic.affected_question_ids.includes(item.id));
    const evaluated = affected.reduce((sum, item) => sum + item.evaluated, 0);
    const mistakes = affected.reduce((sum, item) => sum + item.incorrect + item.skipped, 0);
    const studentIds = new Set(affected.flatMap(item => item.responses.filter(response => ['incorrect', 'skipped'].includes(response.outcome)).map(response => response.learner_id)));
    return { ...topic, evaluated, mistakes, errorRate: evaluated ? mistakes / evaluated * 100 : 0, students: records.filter(record => studentIds.has(record.learner_id)).map(record => ({ id: record.learner_id, name: record.student_name || record.learner_id })) };
  }).filter(topic => topic.mistakes > 0).sort((a, b) => b.errorRate - a.errorRate);
  const students = records.map(record => ({
    id: record.learner_id, name: record.student_name || record.learner_id, score: record.final_score,
    provisional: record.status !== 'GRADED',
    topics: topics.filter(topic => topic.students.some(student => student.id === record.learner_id)).map(topic => topic.topic_name),
    answers: items.flatMap(item => item.responses.filter(response => response.learner_id === record.learner_id).map(response => ({ ...response, question: item.number, prompt: item.prompt, expected: item.expected }))),
  }));
  return {
    assessment_id: assessment.assessment_id, items, topics, students,
    total: records.length,
    average: records.length ? records.reduce((sum, record) => sum + record.final_score, 0) / records.length : 0,
    reviewItems: items.filter(item => item.errorRate !== null && item.errorRate >= 50).length,
    pending: items.reduce((sum, item) => sum + item.pending, 0),
    provisional: records.some(record => record.status !== 'GRADED'),
    evaluated: items.reduce((sum, item) => sum + item.evaluated, 0),
  };
}

export type ItemAnalysisReport = ReturnType<typeof buildItemAnalysis>;
export type ItemAnalysisQuestion = ItemAnalysisReport['items'][number];
