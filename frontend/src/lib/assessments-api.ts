import { authenticatedFetch } from './auth-api';

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
  target_category: TargetCategory | null; assessment_type: TaskType; status: TaskStatus;
  start_date: string | null; end_date: string | null; grace_period_minutes: number;
  duration_minutes: number | null; max_score: number; is_ai_generated: boolean;
  categories_data: CategoryDataPayload[]; materials: MaterialPayload[]; submissions_count?: number;
}
export type AssessmentUpdate = Partial<Omit<AssessmentPayload, 'assessment_id' | 'assessment_type' | 'materials' | 'is_ai_generated' | 'submissions_count'>>;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(`/assessments${path}`, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item: { loc?: string[]; msg: string }) => `${item.loc?.slice(1).join('.')}: ${item.msg}`).join('; ')
      : typeof detail === 'string' ? detail : body?.message;
    throw new Error(message || `Unable to save or load assessment (${response.status}).`);
  }
  if (!body?.data || !('resources' in body.data)) throw new Error('Unexpected assessment response.');
  return body.data.resources as T;
}
export function getAssessment(id: string) { return request<AssessmentPayload>(`/${encodeURIComponent(id)}`); }
export async function listAssessments() {
  const tasks: AssessmentPayload[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await request<AssessmentPayload[]>(`/teacher/my-tasks?offset=${offset}&limit=100`);
    // The list route serializes assessment rows without question banks or counts.
    // Fetch the detail contract in bounded batches for publishing and dashboard totals.
    for (let index = 0; index < page.length; index += 8) {
      const details = await Promise.all(page.slice(index, index + 8).map(task => {
        if (!task.assessment_id) throw new Error('Assessment ID is missing from the response.');
        return getAssessment(task.assessment_id);
      }));
      tasks.push(...details);
    }
    if (page.length < 100) return tasks;
  }
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
