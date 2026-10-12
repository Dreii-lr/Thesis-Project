import { authenticatedRequest } from './auth-api';

export type TargetCategory = 'ELEMENTARY' | 'SECONDARY' | 'BLP';
export const CATEGORY_LABELS = { ELEMENTARY: 'Elementary', SECONDARY: 'Junior High School', BLP: 'Basic Literacy Program' };
export type TaskStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';
export type TaskType = 'ACTIVITY' | 'QUIZ' | 'EXAM';
export interface QuestionPayload {
  id: string; text: string; options: string[]; correct_answer: string; premise: string; match: string;
}
export interface CategoryDataPayload {
  category_id: string; type: string; pool_size: number; required_count: number;
  points_per_item: number; is_expanded: boolean; distractors: string[]; questions: QuestionPayload[];
}
export interface MaterialPayload { file_name: string; file_url: string; file_type: string; file_size_bytes: number }
export interface AssessmentPayload {
  assessment_id?: string; title: string; description: string | null; subject_code: string;
  target_category: TargetCategory; assessment_type: TaskType; status: TaskStatus;
  start_date: string | null; end_date: string | null; grace_period_minutes: number;
  duration_minutes: number | null; max_score: number; is_ai_generated: boolean;
  categories_data: CategoryDataPayload[]; materials: MaterialPayload[]; submissions_count?: number;
}
export type AssessmentUpdate = Partial<Omit<AssessmentPayload, 'assessment_id' | 'assessment_type' | 'materials' | 'is_ai_generated' | 'submissions_count'>>;

function request<T>(path: string, init?: RequestInit): Promise<T> {
  return authenticatedRequest<T>(`/assessments${path}`, init);
}
export function getAssessment(id: string) { return request<AssessmentPayload>(`/${encodeURIComponent(id)}`); }
export async function listAssessments(): Promise<AssessmentPayload[]> {
  const page = await request<AssessmentPayload[]>('/teacher/my-tasks?offset=0&limit=100');
  if (!Array.isArray(page)) throw new Error('Unexpected assessment list response.');
  return page;
}
export function createAssessment(task: AssessmentPayload) {
  const { title, description, subject_code, target_category, assessment_type, status, start_date, end_date, grace_period_minutes, duration_minutes, max_score, is_ai_generated, categories_data, materials } = task;
  return request<AssessmentPayload>('/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, subject_code, target_category, assessment_type, status, start_date, end_date, grace_period_minutes, duration_minutes, max_score, is_ai_generated, categories_data, materials }) });
}
export function updateAssessment(id: string, task: AssessmentUpdate) {
  return request<AssessmentPayload>(`/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) });
}
export function toAssessmentUpdatePayload(task: AssessmentPayload): AssessmentUpdate {
  const { title, description, subject_code, target_category, status, start_date, end_date, grace_period_minutes, duration_minutes, max_score } = task;
  return { title, description, subject_code, target_category, status, start_date, end_date, grace_period_minutes, duration_minutes, max_score,
    ...(task.assessment_type === 'ACTIVITY' ? {} : { categories_data: task.categories_data }) };
}

export interface AssessmentRow {
  assessment_id: string;
  teacher_id: string;
  title: string;
  description?: string | null;
  subject_code: string;
  target_category?: TargetCategory | null;
  assessment_type: TaskType;
  status: TaskStatus;
  start_date?: string | null;
  end_date?: string | null;
  grace_period_minutes: number;
  duration_minutes?: number | null;
  max_score: number;
  is_ai_generated: boolean;
  created_at: string;
  updated_at?: string | null;
}
export interface SubmissionDetail {
  submission_id: string;
  assessment_id: string;
  student_id: string;
  student_name?: string | null;
  student_category?: TargetCategory | null;
  auto_score: number;
  manual_score: number;
  final_score: number;
  feedback?: string | null;
  is_late: boolean;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
  started_at: string;
  submitted_at?: string | null;
  time_spent_seconds: number;
  answers_payload?: Record<string, unknown> | null;
  attachments_payload?: Record<string, unknown>[] | null;
}
export interface TeacherSubmission {
  task: AssessmentRow;
  submission: SubmissionDetail;
}
export async function listAssessmentRecords(): Promise<AssessmentRow[]> {
  const tasks: AssessmentRow[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await request<AssessmentRow[]>(`/teacher/my-tasks?offset=${offset}&limit=100`);
    if (!Array.isArray(page) || page.some(task => !task.assessment_id)) throw new Error('Unexpected assessment list response.');
    tasks.push(...page);
    if (page.length < 100) return tasks;
  }
}
export function listAssessmentSubmissions(id: string) {
  return request<SubmissionDetail[]>(`/${encodeURIComponent(id)}/submissions`);
}
export async function listTeacherSubmissions(tasks: AssessmentRow[]): Promise<TeacherSubmission[]> {
  const records: TeacherSubmission[] = [];
  for (let index = 0; index < tasks.length; index += 8) {
    const batches = await Promise.all(tasks.slice(index, index + 8).map(async task => {
      const submissions = await listAssessmentSubmissions(task.assessment_id);
      return submissions.map(submission => ({ task, submission }));
    }));
    records.push(...batches.flat());
  }
  return records;
}

export interface StudentTask {
  assessment_id: string;
  title: string;
  description: string | null;
  subject_code: string;
  assessment_type: TaskType;
  start_date: string | null;
  end_date: string | null;
  grace_period_minutes: number;
  duration_minutes: number | null;
  max_score: number;
  submission_status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | null;
  final_score: number | null;
  is_available: boolean;
}

export function listStudentTasks(): Promise<StudentTask[]> {
  return request<StudentTask[]>('/student/my-tasks');
}

export function gradeSubmission(
  assessmentId: string,
  submissionId: string,
  payload: { manual_score: number; feedback?: string }
): Promise<SubmissionDetail> {
  return request<SubmissionDetail>(
    `/${encodeURIComponent(assessmentId)}/submissions/${encodeURIComponent(submissionId)}/grade`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
}
