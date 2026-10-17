import type { Student } from './students-api';
import type { UserCategoryRecord } from './user-categories-api';
import type { SubjectRecord } from './subjects-api';
import {
  formatAttendanceDate,
  type AttendanceSessionDetails,
  type AttendanceSessionListItem,
  type RecordAttendancePayload,
  type WorkspaceAttendance,
} from './attendance-api';

export function normalizeAttendanceCategory(code: string | null | undefined): string {
  const value = code?.trim().toUpperCase() || '';
  if (['JUNIOR', 'JHS', 'JUNIOR_HIGH_SCHOOL', 'JUNIOR HIGH SCHOOL'].includes(value)) return 'SECONDARY';
  if (value === 'ELEM') return 'ELEMENTARY';
  if (['BASIC_LITERACY', 'BASIC_LITERACY_PROGRAM', 'BASIC LITERACY PROGRAM'].includes(value)) return 'BLP';
  return value;
}

export function resolveAttendanceCategory(categories: UserCategoryRecord[], program: string) {
  return categories.find(category =>
    category.category_id === program ||
    normalizeAttendanceCategory(category.code) === normalizeAttendanceCategory(program),
  ) || null;
}

export function attendanceLearnerId(student: Pick<Student, 'id' | 'account_id'>): string {
  // Student history resolves both account_id and the existing users.user_id.
  return student.account_id?.trim() || student.id?.trim() || '';
}

export function createAttendanceDraft(
  date: string,
  subject: string,
  categoryCode: string,
  students: Student[],
  teacherId?: string,
): WorkspaceAttendance {
  const category = normalizeAttendanceCategory(categoryCode);
  const learners = students.filter(student =>
    normalizeAttendanceCategory(student.user_category) === category && student.status === 'ACTIVE',
  );
  if (!learners.length) {
    throw new Error('No active learners are enrolled in this program. Enroll a learner before recording attendance.');
  }
  if (learners.some(student => !attendanceLearnerId(student))) {
    throw new Error('A learner has no user or account ID. Reload the learner directory before recording attendance.');
  }
  return {
    // Only a local draft key; the backend assigns the saved session ID.
    session_id: `draft:${category}:${date}:${subject}`,
    teacher_id: teacherId,
    session_date: date,
    display_date: formatAttendanceDate(date),
    level_code: category,
    category_code: category,
    strand_code: subject,
    subject_code: subject,
    status: 'DRAFT',
    records: learners.map(student => ({
      account_id: attendanceLearnerId(student),
      status: null,
      reason_of_absence: '',
      remarks: '',
    })),
  };
}

export function toAttendanceWorkspace(session: AttendanceSessionDetails | AttendanceSessionListItem): WorkspaceAttendance {
  return {
    session_id: 'session_id' in session ? session.session_id : session.id,
    teacher_id: 'teacher_id' in session ? session.teacher_id : undefined,
    session_date: session.session_date,
    display_date: formatAttendanceDate(session.session_date),
    category_code: session.category_code,
    level_code: session.category_code,
    subject_code: session.subject_code,
    strand_code: session.subject_code,
    status: session.status,
    present_count: session.records.filter(record => record.status === 'Present').length,
    total_count: session.records.length,
    records: session.records.map(record => ({
      account_id: record.account_id,
      status: record.status,
      // The service returns both names for the same stored note.
      reason_of_absence: record.remarks ?? record.reason_of_absence ?? '',
      remarks: record.remarks ?? record.reason_of_absence ?? '',
    })),
  };
}

export function canEditAttendance(session: WorkspaceAttendance, teacherId?: string | null) {
  return !!teacherId && session.teacher_id === teacherId;
}

export function attendanceSubjectMatches(session: WorkspaceAttendance, subject: SubjectRecord) {
  const stored = session.subject_code || session.strand_code;
  return [subject.subject_id, subject.code, subject.name].some(value => !!value && value === stored);
}

export function initializeAttendanceRoster(session: WorkspaceAttendance, students: Student[], teacherId?: string | null) {
  if (session.status !== 'DRAFT' || session.records.length || !canEditAttendance(session, teacherId)) return session;
  const draft = createAttendanceDraft(session.session_date, session.subject_code || session.strand_code, session.category_code || session.level_code, students, teacherId || undefined);
  return { ...session, records: draft.records };
}

export function attendanceSavePayload(session: WorkspaceAttendance, students: Student[]): RecordAttendancePayload {
  if (!session.records.length || session.records.some(record => !record.status)) {
    throw new Error('Mark every learner before saving attendance.');
  }
  const records = session.records.map(record => {
    const learner = students.find(student => student.id === record.account_id || student.account_id?.trim() === record.account_id);
    const accountId = learner ? attendanceLearnerId(learner) : record.account_id.trim();
    if (!accountId) throw new Error('Each learner needs a user or account ID before attendance can be saved.');
    const note = record.remarks.trim() || null;
    return { account_id: accountId, status: record.status!, remarks: note, reason_of_absence: note };
  });
  if (new Set(records.map(record => record.account_id)).size !== records.length) {
    throw new Error('This session contains duplicate learner records. Attendance has not been saved.');
  }
  return {
    session_date: session.session_date,
    // Keep saved category and subject values: they identify the existing session.
    category_code: session.category_code || session.level_code,
    subject_code: session.subject_code || session.strand_code,
    status: 'COMPLETED',
    records,
  };
}
