import { getStudentAssessmentResult, listStudentTasks, type StudentTask, type SubmissionDetail } from './assessments-api';
import { getCurrentUser, type UserRead } from './auth-api';

export interface StudentResult {
  task: StudentTask;
  submission: SubmissionDetail | null;
  error: string | null;
}

export async function loadStudentResults(user: UserRead | null): Promise<StudentResult[]> {
  const tasks = (await listStudentTasks(user)).filter(task => task.submission_status === 'SUBMITTED' || task.submission_status === 'GRADED');
  const records: StudentResult[] = [];
  // The existing API returns one student's result at a time.
  for (let index = 0; index < tasks.length; index += 6) {
    const batch = await Promise.all(tasks.slice(index, index + 6).map(async task => {
      try {
        const submission = await getStudentAssessmentResult(task.assessment_id);
        if (!submission || submission.assessment_id !== task.assessment_id ||
          (user?.user_id && submission.student_id !== user.user_id) ||
          (submission.student_category && submission.student_category !== user?.user_category) ||
          !['SUBMITTED', 'GRADED'].includes(submission.status)) {
          throw new Error('This result is unavailable for your account. Refresh your records and try again.');
        }
        return { task, submission, error: null };
      } catch (error) {
        return { task, submission: null, error: error instanceof Error ? error.message : 'Unable to load result details.' };
      }
    }));
    records.push(...batch);
  }
  const current = await getCurrentUser(true, true);
  if (!user || !current || (current.user_id || current.email) !== (user.user_id || user.email) ||
    current.user_category !== user.user_category || String(current.role || current.user_type).toUpperCase() !== 'STUDENT') {
    throw new Error('Your account or learning program changed while loading. Reload this page to view your own results.');
  }
  return records.sort((a, b) => resultDate(b) - resultDate(a));
}

function resultDate(record: StudentResult) {
  const timestamp = Date.parse(record.submission?.submitted_at || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function resultStatus(record: StudentResult) {
  return record.submission?.status || record.task.submission_status;
}

export function resultScore(record: StudentResult): number | null {
  if (resultStatus(record) !== 'GRADED') return null;
  const score = record.submission ? record.submission.final_score : record.task.final_score;
  return typeof score === 'number' && Number.isFinite(score) ? score : null;
}

export function resultsSummary(records: StudentResult[]) {
  let graded = 0, pending = 0, earned = 0, possible = 0;
  for (const record of records) {
    if (resultStatus(record) === 'SUBMITTED') pending++;
    if (resultStatus(record) !== 'GRADED') continue;
    graded++;
    const score = resultScore(record);
    if (score !== null && Number.isFinite(record.task.max_score) && record.task.max_score >= 0) {
      earned += score;
      possible += record.task.max_score;
    }
  }
  return { graded, pending, earned, possible };
}

export interface ReviewedAnswer {
  id: string;
  question: string;
  answer: string;
  essay: boolean;
  correct: boolean | null;
  points: number | null;
  maxPoints: number | null;
}

export function reviewedAnswers(submission: SubmissionDetail): ReviewedAnswer[] {
  const payload = submission.answers_payload;
  if (!payload || !Array.isArray(payload.answers)) return [];
  const delivered = Array.isArray(payload.delivered_questions) ? payload.delivered_questions : [];
  const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;
  return payload.answers.flatMap((item: unknown, index: number) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    if (typeof row.question_id !== 'string') return [];
    const question = delivered.find((value: unknown) => value && typeof value === 'object' && (value as Record<string, unknown>).id === row.question_id);
    const prompt = row.question_text || question?.text || question?.premise;
    const essay = row.type === 'Essay' || question?.category_type === 'Essay';
    return [{
      id: row.question_id,
      question: typeof prompt === 'string' && prompt.trim() ? prompt : `Question ${index + 1}`,
      answer: typeof row.student_answer === 'string' ? row.student_answer : '',
      essay,
      correct: !essay && typeof row.is_correct === 'boolean' ? row.is_correct : null,
      points: essay ? null : number(row.points_awarded),
      maxPoints: essay ? null : number(row.max_points),
    }];
  });
}

export function resultNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function resultDateLabel(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not recorded';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function resultTimeLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'Not recorded';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}m ${total % 60}s`;
}
