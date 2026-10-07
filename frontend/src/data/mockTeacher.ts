import {
  CATEGORY_LABELS,
  type AssessmentPayload,
  type TargetCategory,
} from './mockAssessment';
import { mockStudents } from './mockStudents';

// Explicit adapter for the backend UserCategory enum; UI labels stay human-readable.
export const backendCategories = {
  elementary: 'elementary',
  junior: 'junior',
  basic_literacy: 'basic_literacy',
} as const;
export const programs: TargetCategory[] = [
  'elementary',
  'junior',
  'basic_literacy',
];
export const subjects = [
  { code: 'ALS-LS1-COMM', name: 'LS1: Communication Skills' },
  { code: 'ALS-LS2-SCI', name: 'LS2: Scientific Literacy' },
  { code: 'ALS-LS3-MATH', name: 'LS3: Mathematical & Problem Solving' },
  { code: 'ALS-LS4-LIFE', name: 'LS4: Life & Career Skills' },
  { code: 'ALS-LS5-SELF', name: 'LS5: Understanding Self & Society' },
  { code: 'ALS-LS6-DIGITAL', name: 'LS6: Digital Literacy' },
  { code: 'ALS-BLP-101', name: 'Foundational Literacy' },
];
export const subjectName = (code: string) =>
  subjects.find((s) => s.code === code)?.name ?? code;
export const studentName = (id: string) => {
  const s = mockStudents.find((s) => s.id === id);
  return s ? `${s.first_name} ${s.last_name}` : 'Unknown learner';
};
export const dateKey = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
export const formatTime = (value: string) =>
  new Date(value).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export interface Submission {
  submission_id: string;
  assessment_id: string;
  student_id: string;
  status: 'SUBMITTED' | 'GRADED';
  submitted_at: string;
  is_late: boolean;
  auto_score: number;
  manual_score: number;
  final_score: number;
  feedback: string;
  answers_payload: Record<string, string>;
}
export const initialSubmissions: Submission[] = [
  {
    submission_id: 'sub-1',
    assessment_id: 'assess_001',
    student_id: 'ALS-0001',
    status: 'GRADED',
    submitted_at: '2026-10-06T08:40:00Z',
    is_late: false,
    auto_score: 8,
    manual_score: 0,
    final_score: 8,
    feedback: 'Review permanent storage devices.',
    answers_payload: {
      q_mc_1: 'B',
      q_mc_2: 'A',
      q_mt_1: 'RAM (Random Access Memory)',
      q_mt_2: 'CPU (Central Processing Unit)',
      q_mt_3: 'Motherboard',
    },
  },
  {
    submission_id: 'sub-2',
    assessment_id: 'assess_001',
    student_id: 'ALS-0002',
    status: 'SUBMITTED',
    submitted_at: '2026-10-06T08:50:00Z',
    is_late: false,
    auto_score: 10,
    manual_score: 0,
    final_score: 10,
    feedback: '',
    answers_payload: {
      q_mc_1: 'B',
      q_mc_2: 'A',
      q_mt_1: 'RAM (Random Access Memory)',
      q_mt_2: 'CPU (Central Processing Unit)',
      q_mt_3: 'SSD (Solid State Drive)',
    },
  },
  {
    submission_id: 'sub-3',
    assessment_id: 'assess_003',
    student_id: 'ALS-0006',
    status: 'SUBMITTED',
    submitted_at: '2026-10-06T02:30:00Z',
    is_late: false,
    auto_score: 0,
    manual_score: 0,
    final_score: 0,
    feedback: '',
    answers_payload: {
      response:
        'My family helps me practice reading every evening. I read signs in our community and write new words in my notebook.',
    },
  },
  {
    submission_id: 'sub-4',
    assessment_id: 'assess_004',
    student_id: 'ALS-0004',
    status: 'GRADED',
    submitted_at: '2026-10-02T01:45:00Z',
    is_late: false,
    auto_score: 5,
    manual_score: 0,
    final_score: 5,
    feedback: 'Well done!',
    answers_payload: { q_tf_201: 'True' },
  },
];
export interface AttendanceRecordInput {
  student_id: string;
  status: 'Present' | 'Absent' | 'Excused';
  reason_of_absence: string;
  remarks: string;
}

// Matches the attendance request JSON. The session ID is local record metadata.
export interface AttendancePayload {
  session_date: string;
  display_date: string;
  level_code: TargetCategory;
  strand_code: string;
  status: 'DRAFT' | 'COMPLETED';
  records: AttendanceRecordInput[];
}

export interface WorkspaceAttendance extends Omit<
  AttendancePayload,
  'records'
> {
  session_id: string;
  records: (Omit<AttendanceRecordInput, 'status'> & {
    status: AttendanceRecordInput['status'] | null;
  })[];
}

export const formatAttendanceDate = (date: string) =>
  new Date(date + 'T12:00:00+08:00').toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export function toAttendancePayload(
  session: WorkspaceAttendance,
): AttendancePayload {
  return {
    session_date: session.session_date,
    display_date: session.display_date,
    level_code: session.level_code,
    strand_code: session.strand_code,
    status: session.status,
    records: session.records.map((record) => {
      if (!record.status)
        throw new Error('Mark every learner before saving attendance.');
      return {
        student_id: record.student_id,
        status: record.status,
        reason_of_absence: record.reason_of_absence,
        remarks: record.remarks,
      };
    }),
  };
}

export const initialAttendance: WorkspaceAttendance[] = programs.flatMap(
  (program, index) =>
    ['2026-10-06', '2026-10-05', '2026-10-02'].map((date, day) => ({
      session_id:
        day === 0 ? 'session-' + index : 'session-' + index + '-' + day,
      session_date: date,
      display_date: formatAttendanceDate(date),
      level_code: program,
      strand_code:
        program === 'basic_literacy' ? 'ALS-BLP-101' : subjects[day].code,
      status: 'COMPLETED',
      records: mockStudents
        .filter((student) => student.user_category === program)
        .map((student, studentIndex) => ({
          student_id: student.id,
          status:
            studentIndex === 1 && day === 0
              ? 'Absent'
              : studentIndex === 0 && day === 1
                ? 'Excused'
                : 'Present',
          reason_of_absence:
            studentIndex === 1 && day === 0
              ? 'Not feeling well'
              : studentIndex === 0 && day === 1
                ? 'Family appointment'
                : '',
          remarks:
            studentIndex === 1 && day === 0
              ? 'Follow up on missed lesson.'
              : studentIndex === 0 && day === 1
                ? 'Guardian informed the teacher.'
                : '',
        })),
    })),
);

export const mockAttendancePayloads: AttendancePayload[] =
  initialAttendance.map(toAttendancePayload);

export interface WorkspaceModule {
  id: string;
  filename: string;
  target_category: TargetCategory;
  subject_code: string;
  uploaded_at: string;
  status: 'Pending' | 'Published';
  file_data: string;
}
export const initialModules: WorkspaceModule[] = programs.map((program, i) => ({
  id: `module-${i}`,
  filename: [
    'Everyday Communication.txt',
    'Computer Hardware.txt',
    'Reading Practice.txt',
  ][i],
  target_category: program,
  subject_code: ['ALS-LS1-COMM', 'ALS-LS6-DIGITAL', 'ALS-BLP-101'][i],
  uploaded_at: '2026-10-01T00:00:00Z',
  status: 'Published',
  file_data: `data:text/plain;charset=utf-8,${encodeURIComponent(['Practice: Write three sentences introducing yourself and your community.', 'The CPU processes instructions. RAM stores temporary data. An SSD stores files permanently.', 'Read these words aloud: family, home, school. Write a sentence using each word.'][i])}`,
}));
export function scheduledTasks(tasks: AssessmentPayload[]) {
  return tasks
    .filter((t) => t.status !== 'DRAFT' && t.start_date && t.end_date)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export type RecordStatus = 'COMPLETED' | 'DRAFT';
export type AttendanceStatus = 'Present' | 'Absent' | 'Excused' | null;

export interface AttendanceSession {
  id: string;
  displayDate: string;
  rawDate: string;
  level: string;
  subject: string;
  presentCount: number;
  totalCount: number;
  status: RecordStatus;
}

export interface AttendanceRecord {
  status: AttendanceStatus;
  remarks: string;
}

export interface LibraryModule {
  id: string;
  filename: string;
  subject: string;
  level: string;
  uploadDate: string;
  status: 'Published' | 'Pending' | 'Uploading';
  progress?: number;
}

export const mockSessions: AttendanceSession[] = initialAttendance.map((s) => ({
  id: s.session_id,
  displayDate: s.display_date,
  rawDate: s.session_date,
  level: CATEGORY_LABELS[s.level_code],
  subject: subjectName(s.strand_code),
  presentCount: s.records.filter((r) => r.status === 'Present').length,
  totalCount: s.records.length,
  status: s.status,
}));
export const mockLibrary: LibraryModule[] = initialModules.map((m) => ({
  id: m.id,
  filename: m.filename,
  subject: subjectName(m.subject_code),
  level: CATEGORY_LABELS[m.target_category],
  uploadDate: m.uploaded_at,
  status: m.status,
}));
