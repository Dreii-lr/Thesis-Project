import { listAssessmentRecords, listTeacherSubmissions, type AssessmentRow, type SubmissionDetail } from './assessments-api';
import { listSubjects } from './subjects-api';

export async function loadSubmissionReview() {
  const [tasks, subjects] = await Promise.all([listAssessmentRecords(), listSubjects()]);
  const records = (await listTeacherSubmissions(tasks)).filter(record => record.submission.status !== 'IN_PROGRESS');
  return { records, subjects };
}

export function manualGradePayload(task: Pick<AssessmentRow, 'assessment_type' | 'max_score'>, submission: Pick<SubmissionDetail, 'auto_score'>, finalScore: string, feedback: string) {
  const value = Number(finalScore);
  const minimum = task.assessment_type === 'ACTIVITY' ? 0 : submission.auto_score;
  if (!finalScore.trim() || !Number.isFinite(value) || value < minimum || value > task.max_score) throw new Error(`Enter a final score from ${minimum} to ${task.max_score}.`);
  // The backend adds manual quiz/exam points to the objective score.
  return { manual_score: value - minimum, feedback };
}
