import { authenticatedRequest } from './auth-api';

export type AttendanceStatus = 'Present' | 'Absent' | 'Excused';

export interface AttendanceRecordRead {
  record_id: string;
  session_id: string;
  account_id: string;
  status: AttendanceStatus;
  reason_of_absence?: string | null;
  remarks?: string | null;
  recorded_at?: string | null;
}

export interface AttendanceSessionListItem {
  id: string;
  session_date: string; // YYYY-MM-DD
  category_code: string;
  subject_code: string;
  status: 'DRAFT' | 'COMPLETED';
  records: AttendanceRecordRead[];
  // Transitional support
  rawDate?: string;
  displayDate?: string;
  level?: string;
  subject?: string;
  presentCount: number;
  totalCount: number;
}

export interface ListAttendanceSessionsResponse {
  sessions: AttendanceSessionListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface StudentAttendanceItem {
  id: string;
  date: string;
  subject: string;
  status: AttendanceStatus;
  reason_of_absence?: string | null;
  remarks?: string | null;
}

export interface StudentAttendanceHistory {
  account_id: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  excused_days: number;
  attendance_rate: number;
  records: StudentAttendanceItem[];
}

export interface ListAttendanceSessionsParams {
  level?: string;
  subject?: string;
  search_date?: string;
  page?: number;
  limit?: number;
}

export async function listAttendanceSessions(
  params?: ListAttendanceSessionsParams
): Promise<AttendanceSessionListItem[]> {
  const query = new URLSearchParams();
  if (params?.level && params.level !== 'all' && params.level !== 'All Levels') {
    query.set('level', params.level);
  }
  if (params?.subject && params.subject !== 'all' && params.subject !== 'All Subjects') {
    query.set('subject', params.subject);
  }
  if (params?.search_date) {
    query.set('search_date', params.search_date);
  }

  const limit = params?.limit ?? 100;
  const sessions: AttendanceSessionListItem[] = [];
  const startPage = params?.page ?? 1;

  for (let page = startPage; ; page += 1) {
    query.set('page', String(page));
    query.set('limit', String(limit));
    const result = await authenticatedRequest<ListAttendanceSessionsResponse>(
      `/attendance/sessions?${query.toString()}`
    );
    if (!Array.isArray(result.sessions)) throw new Error('Unexpected attendance response.');
    sessions.push(...result.sessions.map(normalizeAttendanceSession));
    if (params?.page || sessions.length >= result.total) return sessions;
    if (!result.sessions.length) break;
  }
  return sessions;
}

export function getStudentAttendance(id: string): Promise<StudentAttendanceHistory> {
  return authenticatedRequest<StudentAttendanceHistory>(
    `/attendance/students/${encodeURIComponent(id)}`
  );
}

export interface AttendanceSessionDetails {
  session_id: string;
  teacher_id: string;
  session_date: string;
  category_code: string;
  subject_code: string;
  status: 'DRAFT' | 'COMPLETED';
  records: AttendanceRecordRead[];
  created_at?: string | null;
  updated_at?: string | null;
  // Transitional support
  display_date?: string;
  level_code?: string;
  strand_code?: string;
  total_count?: number;
  present_count?: number;
  absent_count?: number;
  excused_count?: number;
  attendance_rate?: number;
}

export async function getAttendanceSession(id: string): Promise<AttendanceSessionDetails> {
  const session = await authenticatedRequest<AttendanceSessionDetails>(
    `/attendance/sessions/${encodeURIComponent(id)}`
  );
  return normalizeAttendanceDetails(session);
}

export interface RecordAttendanceRecordInput {
  account_id: string;
  status: AttendanceStatus;
  reason_of_absence?: string | null;
  remarks?: string | null;
}

export interface RecordAttendancePayload {
  session_date: string;
  category_code?: string;
  subject_code?: string;
  level_code?: string;
  strand_code?: string;
  display_date?: string | null;
  status?: 'DRAFT' | 'COMPLETED';
  records: RecordAttendanceRecordInput[];
}

export async function recordAttendanceSession(
  payload: RecordAttendancePayload
): Promise<AttendanceSessionDetails> {
  if (payload.records.some(record => !record.account_id?.trim())) throw new Error('Each learner needs a user or account ID before attendance can be saved.');
  const session = await authenticatedRequest<AttendanceSessionDetails>('/attendance/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return normalizeAttendanceDetails(session);
}

export function normalizeAttendanceSession(session: AttendanceSessionListItem): AttendanceSessionListItem {
  const records = session.records || [];
  return { ...session, records, rawDate: session.session_date, displayDate: formatAttendanceDate(session.session_date),
    level: session.category_code, subject: session.subject_code,
    presentCount: records.filter(record => record.status === 'Present').length, totalCount: records.length };
}

function normalizeAttendanceDetails(session: AttendanceSessionDetails): AttendanceSessionDetails {
  const records = session.records || [];
  const present = records.filter(record => record.status === 'Present').length;
  return { ...session, records, level_code: session.category_code, strand_code: session.subject_code,
    display_date: formatAttendanceDate(session.session_date), total_count: records.length, present_count: present,
    absent_count: records.filter(record => record.status === 'Absent').length,
    excused_count: records.filter(record => record.status === 'Excused').length,
    attendance_rate: records.length ? Math.round(present / records.length * 100) : 0 };
}

export interface WorkspaceAttendance {
  session_id: string;
  teacher_id?: string;
  session_date: string;
  display_date: string;
  level_code: string;
  strand_code: string;
  category_code?: string;
  subject_code?: string;
  status: 'DRAFT' | 'COMPLETED';
  present_count?: number;
  total_count?: number;
  records: { account_id: string; status: AttendanceStatus | null; reason_of_absence: string; remarks: string }[];
}

export function formatAttendanceDate(date: string) {
  if (!date) return '';
  const value = new Date(`${date.slice(0, 10)}T12:00:00+08:00`);
  return Number.isFinite(value.getTime()) ? value.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : date;
}

export function attendanceDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export interface AttendanceProgramMetric {
  category_id?: string | null;
  category_code: string;
  category_name?: string | null;
  learners_count: number;
  total_sessions: number;
  completed_sessions: number;
}

export interface AttendanceSummaryMetricsResponse {
  metrics: AttendanceProgramMetric[];
}

export async function getAttendanceSummaryMetrics(): Promise<AttendanceProgramMetric[]> {
  const result = await authenticatedRequest<AttendanceSummaryMetricsResponse | AttendanceProgramMetric[]>(
    '/attendance/summary-metrics'
  );
  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as AttendanceSummaryMetricsResponse).metrics)) {
    return (result as AttendanceSummaryMetricsResponse).metrics;
  }
  return [];
}
