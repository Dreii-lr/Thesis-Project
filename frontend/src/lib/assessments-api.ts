import { authenticatedRequest, clearCurrentUserCache, getCurrentUser, SessionError, type UserRead } from './auth-api';

export type TargetCategory = 'ELEMENTARY' | 'SECONDARY' | 'BLP';
export const CATEGORY_LABELS = { ELEMENTARY: 'Elementary', SECONDARY: 'Junior High School', BLP: 'Basic Literacy Program' };
export type TaskStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';
export type TaskType = 'ACTIVITY' | 'QUIZ' | 'EXAM' | 'TEST' | (string & {});
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
  can_edit?: boolean; lock_reason?: string | null;
}
export type AssessmentUpdate = Partial<Omit<AssessmentPayload, 'assessment_id' | 'assessment_type' | 'materials' | 'is_ai_generated' | 'submissions_count'>>;

function request<T>(path: string, init?: RequestInit): Promise<T> {
  return authenticatedRequest<T>(`/assessments${path}`, init);
}

async function teacherRequest<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await request<T>(path, init);
  } catch (error) {
    if (!(error instanceof SessionError) || error.status !== 403 || !/Operation not permitted for your role/i.test(error.message)) throw error;
    // Cookies can change in another tab while this page still shows the previous account.
    clearCurrentUserCache();
    let user;
    try { user = await getCurrentUser(true, true); }
    catch { throw new SessionError('The server denied teacher access, and your current session could not be verified. Please sign out and sign in with your teacher account.', 403); }
    const role = String(user?.role || user?.user_type || '').trim().toUpperCase();
    if (role === 'TEACHER' || role === 'ADMIN') {
      throw new SessionError(`Your current session is ${role}, but the server rejected this request. The running backend permissions need to be checked.`, 403);
    }
    throw new SessionError(`Assessment configuration requires a TEACHER or ADMIN account. Your current session is ${role || 'not signed in'}. Please sign out and sign in with your authorized account.${role === 'EMPLOYEE' ? ' EMPLOYEE and TEACHER are separate roles in this system.' : ''}`, 403);
  }
}

export function getAssessment(id: string) { return teacherRequest<AssessmentPayload>(`/${encodeURIComponent(id)}`); }
export async function listAssessments(): Promise<AssessmentPayload[]> {
  const rows = await listAssessmentRecords();
  const tasks: AssessmentPayload[] = [];
  for (let index = 0; index < rows.length; index += 8) {
    tasks.push(...await Promise.all(rows.slice(index, index + 8).map(row => getAssessment(row.assessment_id))));
  }
  return tasks;
}
export function createAssessment(task: AssessmentPayload) {
  const { title, description, subject_code, target_category, assessment_type, status, start_date, end_date, grace_period_minutes, duration_minutes, max_score, is_ai_generated, categories_data, materials } = task;
  return teacherRequest<AssessmentPayload>('/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, subject_code, target_category, assessment_type, status, start_date, end_date, grace_period_minutes, duration_minutes, max_score, is_ai_generated, categories_data, materials }) });
}
export function updateAssessment(id: string, task: AssessmentUpdate) {
  return teacherRequest<AssessmentPayload>(`/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) });
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
  submissions_count?: number;
  can_edit?: boolean;
  lock_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
}
export interface SubmissionDetail {
  submission_id: string;
  assessment_id: string;
  account_id?: string | null;
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
    const page = await teacherRequest<AssessmentRow[]>(`/teacher/my-tasks?offset=${offset}&limit=100`);
    if (!Array.isArray(page) || page.some(task => !task.assessment_id)) throw new Error('Unexpected assessment list response.');
    tasks.push(...page);
    if (page.length < 100) return tasks;
  }
}
export function listAssessmentSubmissions(id: string) {
  return teacherRequest<SubmissionDetail[]>(`/${encodeURIComponent(id)}/submissions`);
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
  status: TaskStatus;
  start_date: string | null;
  end_date: string | null;
  grace_period_minutes: number;
  duration_minutes: number | null;
  max_score: number;
  submission_status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | null;
  final_score: number | null;
  is_available: boolean;
}

export async function listStudentTasks(expectedUser: UserRead | null): Promise<StudentTask[]> {
  const matchesStudent = (user: UserRead | null) => {
    const category = String(user?.user_category || '').trim().toUpperCase();
    return !!expectedUser && !!user &&
      (user.user_id || user.email) === (expectedUser.user_id || expectedUser.email) &&
      String(user.role || user.user_type || '').toUpperCase() === 'STUDENT' &&
      ['ELEMENTARY', 'SECONDARY', 'BLP'].includes(category) &&
      category === String(expectedUser.user_category || '').trim().toUpperCase();
  };
  // Tabs share cookies. Never show another account's tasks under this student's program.
  if (!matchesStudent(await getCurrentUser(true, true))) {
    throw new Error('Your account or learning program has changed. Reload this page before viewing assessments.');
  }
  const tasks = await request<StudentTask[]>('/student/my-tasks');
  if (!matchesStudent(await getCurrentUser(true, true))) {
    throw new Error('Your account or learning program changed while loading. Reload this page to continue.');
  }
  if (!Array.isArray(tasks)) throw new Error('Unexpected student assessment response.');
  return tasks;
}

export interface StudentQuestion {
  id: string;
  category_id: string;
  category_type: string;
  points_per_item: number;
  text?: string | null;
  options?: string[] | null;
  premise?: string | null;
  matching_pool?: string[] | null;
}

export interface StudentDelivery {
  assessment_id: string;
  title: string;
  description?: string | null;
  assessment_type: TaskType;
  duration_minutes: number | null;
  max_score: number;
  submission_id: string;
  started_at: string;
  questions: StudentQuestion[];
}

export function startStudentAssessment(id: string) {
  return request<StudentDelivery>(`/${encodeURIComponent(id)}/start`, { method: 'POST' });
}

export function submitStudentAssessment(id: string, payload: {
  answers: { question_id: string; student_answer: string }[];
  time_spent_seconds: number;
}) {
  return request<SubmissionDetail>(`/${encodeURIComponent(id)}/submit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
}

export function getStudentAssessmentResult(id: string) {
  return request<SubmissionDetail>(`/${encodeURIComponent(id)}/my-result`);
}

export interface StudentActivityMetrics {
  submitted_count: number;
  pending_count: number;
  total_assigned: number;
}

export function getStudentActivityMetrics(): Promise<StudentActivityMetrics> {
  return request<StudentActivityMetrics>('/student/activity-metrics');
}


export function gradeSubmission(
  assessmentId: string,
  submissionId: string,
  payload: { manual_score: number; feedback?: string }
): Promise<SubmissionDetail> {
  return teacherRequest<SubmissionDetail>(
    `/${encodeURIComponent(assessmentId)}/submissions/${encodeURIComponent(submissionId)}/grade`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
}
