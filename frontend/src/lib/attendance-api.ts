import { authenticatedRequest } from './auth-api';

export type AttendanceStatus = 'Present' | 'Absent' | 'Excused';

export interface AttendanceRecordRead {
  record_id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  reason_of_absence?: string | null;
  remarks?: string | null;
  recorded_at: string;
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
  presentCount?: number;
  totalCount?: number;
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
  student_id: string;
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
    sessions.push(...result.sessions);
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
  created_at: string;
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

export function getAttendanceSession(id: string): Promise<AttendanceSessionDetails> {
  return authenticatedRequest<AttendanceSessionDetails>(
    `/attendance/sessions/${encodeURIComponent(id)}`
  );
}

export interface RecordAttendanceRecordInput {
  student_id: string;
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

export function recordAttendanceSession(
  payload: RecordAttendancePayload
): Promise<AttendanceSessionDetails> {
  return authenticatedRequest<AttendanceSessionDetails>('/attendance/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
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
