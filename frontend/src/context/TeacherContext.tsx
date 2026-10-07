'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  initialTasks,
  toAssessmentCreatePayload,
  toAssessmentUpdatePayload,
  type AssessmentCreatePayload,
  type AssessmentUpdatePayload,
  type AssessmentPayload,
} from '@/src/data/mockAssessment';
import { mockStudents, type Student } from '@/src/data/mockStudents';
import {
  initialAttendance,
  formatAttendanceDate,
  initialModules,
  initialSubmissions,
  subjectName,
  type Submission,
  type WorkspaceAttendance,
  type WorkspaceModule,
} from '@/src/data/mockTeacher';

interface TeacherContextType {
  tasks: AssessmentPayload[];
  createAssessment: (payload: AssessmentCreatePayload) => boolean;
  updateAssessment: (id: string, payload: AssessmentUpdatePayload) => boolean;
  setTasks: (tasks: AssessmentPayload[]) => boolean;
  submissions: Submission[];
  setSubmissions: (submissions: Submission[]) => boolean;
  attendance: WorkspaceAttendance[];
  setAttendance: (attendance: WorkspaceAttendance[]) => boolean;
  modules: WorkspaceModule[];
  setModules: (modules: WorkspaceModule[]) => boolean;
  students: Student[];
}

const TeacherContext = createContext<TeacherContextType | undefined>(undefined);

function loadSaved<T>(key: string, fallback: T[]): T[] {
  try {
    const saved = localStorage.getItem(key);
    const parsed: unknown = saved ? JSON.parse(saved) : null;
    if (
      !Array.isArray(parsed) ||
      parsed.some((item) => !item || typeof item !== 'object')
    )
      return fallback;
    // Preserve browser demo records saved before matching the backend enum values.
    return parsed.map((item) => {
      const record = { ...item };
      for (const field of ['target_category', 'level_code']) {
        if (record[field] === 'junior_high_school') record[field] = 'junior';
        if (record[field] === 'basic_literacy_program')
          record[field] = 'basic_literacy';
      }
      if (key === 'als_assessments') {
        if (record.status === 'PENDING') record.status = 'SCHEDULED';
        if (record.status === 'PUBLISHED') record.status = 'ACTIVE';
      }
      if (key === 'als_attendance_v1') {
        record.display_date =
          record.display_date || formatAttendanceDate(record.session_date);
        record.records = (record.records || []).map(
          (entry: WorkspaceAttendance['records'][number]) => ({
            ...entry,
            reason_of_absence:
              entry.reason_of_absence ??
              (entry.status === 'Present' ? '' : entry.remarks || ''),
            remarks: entry.remarks || '',
          }),
        );
      }
      return record;
    }) as T[];
  } catch {
    return fallback;
  }
}

// Mounted inside DemoAuthGuard after the teacher's session is verified.
// Account creation and editing continue to use the existing StudentProvider.
export function TeacherProvider({ children }: { children: ReactNode }) {
  const [tasks, updateTasks] = useState(() =>
    loadSaved('als_assessments', initialTasks),
  );
  const [submissions, updateSubmissions] = useState(() =>
    loadSaved('als_submissions_v1', initialSubmissions),
  );
  const [attendance, updateAttendance] = useState(() =>
    loadSaved('als_attendance_v1', initialAttendance),
  );
  const [modules, updateModules] = useState(() =>
    loadSaved('als_modules_v1', initialModules),
  );
  const [error, setError] = useState('');

  const save = (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setError('');
      return true;
    } catch {
      setError(
        'Browser storage is unavailable or full. Your changes were not saved.',
      );
      return false;
    }
  };

  const setTasks = (value: AssessmentPayload[]) => {
    if (!save('als_assessments', value)) return false;
    updateTasks(value);
    return true;
  };
  // Mock POST: assign the local record ID after constructing the request body.
  const createAssessment = (payload: AssessmentCreatePayload) => {
    const body = toAssessmentCreatePayload(payload);
    return setTasks([{ ...body, id: crypto.randomUUID() }, ...tasks]);
  };

  // Mock PUT: preserve create-only fields and update only the supplied contract.
  const updateAssessment = (id: string, payload: AssessmentUpdatePayload) => {
    if (!tasks.some((task) => task.id === id)) {
      setError(
        'This assessment no longer exists. Return to the assessment list.',
      );
      return false;
    }
    const body = toAssessmentUpdatePayload(payload);
    return setTasks(
      tasks.map((task) => (task.id === id ? { ...task, ...body } : task)),
    );
  };

  const setSubmissions = (value: Submission[]) => {
    if (!save('als_submissions_v1', value)) return false;
    updateSubmissions(value);
    return true;
  };
  const setAttendance = (value: WorkspaceAttendance[]) => {
    if (!save('als_attendance_v1', value)) return false;
    updateAttendance(value);
    return true;
  };
  const setModules = (value: WorkspaceModule[]) => {
    if (!save('als_modules_v1', value)) return false;
    updateModules(value);
    return true;
  };

  const students = useMemo<Student[]>(
    () =>
      mockStudents.map((student) => ({
        ...student,
        attendance: attendance
          .filter((session) => session.status === 'COMPLETED')
          .flatMap((session) =>
            session.records.flatMap((record) =>
              record.student_id === student.id && record.status
                ? [
                    {
                      id: session.session_id,
                      date: session.session_date,
                      subject: subjectName(session.strand_code),
                      status: record.status,
                      remarks: record.remarks,
                    },
                  ]
                : [],
            ),
          ),
        quizzes: submissions.flatMap((submission) => {
          const task = tasks.find(
            (task) =>
              task.id === submission.assessment_id &&
              task.assessment_type !== 'ACTIVITY',
          );
          if (submission.student_id !== student.id || !task) return [];
          return [
            {
              id: submission.submission_id,
              title: task.title,
              score: submission.final_score,
              totalItems: task.max_score,
              type:
                task.assessment_type === 'EXAM'
                  ? ('Summative' as const)
                  : ('Quiz' as const),
              status:
                submission.status === 'SUBMITTED'
                  ? ('Needs Review' as const)
                  : submission.final_score >= task.max_score * 0.75
                    ? ('Passed' as const)
                    : ('Failed' as const),
              subject: subjectName(task.subject_code),
              date: submission.submitted_at,
            },
          ];
        }),
        writtenActivities: submissions.flatMap((submission) => {
          const task = tasks.find(
            (task) =>
              task.id === submission.assessment_id &&
              task.assessment_type === 'ACTIVITY',
          );
          if (submission.student_id !== student.id || !task) return [];
          return [
            {
              id: submission.submission_id,
              title: task.title,
              subject: subjectName(task.subject_code),
              date: submission.submitted_at,
              status: submission.status,
              type: 'Reflection' as const,
              content: Object.values(submission.answers_payload).join('\n'),
            },
          ];
        }),
      })),
    [attendance, submissions, tasks],
  );

  return (
    <TeacherContext.Provider
      value={{
        tasks,
        createAssessment,
        updateAssessment,
        setTasks,
        submissions,
        setSubmissions,
        attendance,
        setAttendance,
        modules,
        setModules,
        students,
      }}
    >
      {error && (
        <p
          role="alert"
          className="m-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {children}
    </TeacherContext.Provider>
  );
}

export function useTeacher() {
  const context = useContext(TeacherContext);
  if (!context)
    throw new Error('useTeacher must be used within a TeacherProvider');
  return context;
}
