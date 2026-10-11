import { authenticatedRequest } from './auth-api';

export type AttendanceStatus = 'Present' | 'Absent' | 'Excused';
export interface AttendanceSessionListItem {
  id: string;
  rawDate: string;
  displayDate: string;
  level: string;
  subject: string;
  status: 'DRAFT' | 'COMPLETED';
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
  student_id: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  excused_days: number;
  attendance_rate: number;
  records: StudentAttendanceItem[];
}
export async function listAttendanceSessions(): Promise<AttendanceSessionListItem[]> {
  const sessions: AttendanceSessionListItem[] = [];
  for (let page = 1; ; page += 1) {
    const result = await authenticatedRequest<ListAttendanceSessionsResponse>(`/attendance/sessions?page=${page}&limit=100`);
    sessions.push(...result.sessions);
    if (sessions.length >= result.total) return sessions;
    if (!result.sessions.length) throw new Error('Attendance records changed while loading. Please refresh.');
  }
}
export function getStudentAttendance(id: string) {
  return authenticatedRequest<StudentAttendanceHistory>(`/attendance/students/${encodeURIComponent(id)}`);
}
