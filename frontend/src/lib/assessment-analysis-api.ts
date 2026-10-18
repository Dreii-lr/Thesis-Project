import { authenticatedRequest, SessionError } from './auth-api';
import { getAssessment, listAssessmentRecords, listAssessmentSubmissions, type AssessmentRow, type TargetCategory } from './assessments-api';
import { listSubjects, subjectName } from './subjects-api';
import { listUserCategories } from './user-categories-api';
import type { AnalysisAssessment, AnalysisSubmission } from './item-analysis';

export interface CohortAnalysis {
  assessment_id: string;
  target_category?: string | null;
  status: string;
  topic_found: boolean;
  message?: string | null;
  cohort_overview?: { total_students: number; class_average: number; passing_rate: number; performance_summary: string };
  struggling_topics: { topic_name: string; severity: string; error_rate_percent: number; description: string; misconception: string; affected_question_ids: string[]; struggling_students: string[] }[];
  recommended_lessons: { lesson_id: string; material_id?: string | null; module_title: string; lesson_title: string; main_topic: string; relevance_reason: string }[];
  student_breakdowns: { account_id: string; student_name: string; score: number; max_score: number; percentage: number; passed: boolean; personal_struggling_topics: string[] }[];
  updated_at?: string | null;
  created_at?: string | null;
}

export type AnalyzableTaskType = 'QUIZ' | 'EXAM' | 'TEST';

export async function loadAnalysisOptions() {
  const [tasks, subjects, categories] = await Promise.all([listAssessmentRecords(), listSubjects(), listUserCategories()]);
  // Filter for analyzable tasks: QUIZ, EXAM, and TEST (with TEST being the last included type), strictly excluding ACTIVITY
  const analyzableTasks = tasks.filter(
    (task) =>
      task.assessment_type &&
      ['QUIZ', 'EXAM', 'TEST'].includes(String(task.assessment_type).toUpperCase()) &&
      String(task.assessment_type).toUpperCase() !== 'ACTIVITY'
  );
  return {
    tasks: analyzableTasks,
    subjects,
    categories: categories.filter((category) => ['ELEMENTARY', 'SECONDARY', 'BLP'].includes(category.code)),
  };
}

function validateAnalysis(data: CohortAnalysis, id: string, program: string) {
  if (data.assessment_id && data.assessment_id !== id) throw new Error('The analysis belongs to a different assessment. Refresh and try again.');
  if (data.target_category && data.target_category.toUpperCase() !== program.toUpperCase()) throw new Error('The saved analysis belongs to a different learning program. Generate an analysis for the selected program.');
  if (data.topic_found !== false && data.status !== 'NO_TOPIC_FOUND' && (!data.cohort_overview || !Array.isArray(data.struggling_topics))) throw new Error('The server returned an incomplete analysis. Please generate it again.');
  return data;
}

export async function getCohortAnalysis(id: string, program: string, generate = false): Promise<CohortAnalysis> {
  const query = new URLSearchParams({ category: program });
  // The ID route avoids the earlier /assessments/{assessment_id} detail route.
  const data = await authenticatedRequest<CohortAnalysis>(`/assessments/analysis/${encodeURIComponent(id)}?${query}`, generate ? { method: 'POST' } : {});
  return validateAnalysis(data, id, program);
}

export function analysisReady(task: Pick<AssessmentRow, 'status' | 'end_date' | 'grace_period_minutes'>, now = Date.now()) {
  if (task.status === 'DRAFT') return false;
  return task.status === 'COMPLETED' || (!!task.end_date && now > Date.parse(task.end_date) + task.grace_period_minutes * 60000);
}

export async function loadAssessmentAnalysis(task: AssessmentRow, program: TargetCategory, subjects: Awaited<ReturnType<typeof listSubjects>>) {
  const [details, records] = await Promise.all([getAssessment(task.assessment_id), listAssessmentSubmissions(task.assessment_id)]);
  if (details.assessment_id !== task.assessment_id || details.assessment_type === 'ACTIVITY') throw new Error('This quiz or exam is unavailable. Refresh the assessment list.');
  const assessment: AnalysisAssessment = { ...details, assessment_id: task.assessment_id, target_category: program, subject_name: subjectName(subjects, task.subject_code, program), topics: [] };
  const submissions: AnalysisSubmission[] = records
    .filter(record =>
      record.assessment_id === task.assessment_id &&
      (!record.student_category || String(record.student_category).toUpperCase() === String(program).toUpperCase())
    )
    .map(record => ({
      ...record,
      learner_id: record.account_id || record.submission_id,
      answers_payload: {
        answers: Array.isArray(record.answers_payload?.answers)
          ? record.answers_payload.answers.flatMap((raw: unknown) => {
              if (!raw || typeof raw !== 'object') return [];
              const answer = raw as Record<string, unknown>;
              if (typeof answer.question_id !== 'string') return [];
              return [{
                question_id: answer.question_id,
                student_answer: typeof answer.student_answer === 'string' ? answer.student_answer : '',
                is_correct: typeof answer.is_correct === 'boolean' ? answer.is_correct : null,
                needs_teacher_review: answer.needs_teacher_review === true || answer.type === 'Essay'
              }];
            })
          : []
      },
    }));
  let analysis: CohortAnalysis | null = null;
  let analysisError: string | null = null;
  try { analysis = await getCohortAnalysis(task.assessment_id, program); }
  catch (error) {
    if (error instanceof SessionError && [401, 403].includes(error.status)) throw error;
    if (!(error instanceof SessionError) || error.status !== 404) analysisError = error instanceof Error ? error.message : 'The saved analysis could not be loaded.';
  }
  return { assessment, submissions, analysis, analysisError };
}
