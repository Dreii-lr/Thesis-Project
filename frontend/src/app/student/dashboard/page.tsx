'use client';

import StudentPageHeader from '@/src/components/layout/student/StudentPageHeader';

import StudentLoading from '@/src/components/layout/student/StudentLoading';

import Link from 'next/link';
import { BookOpen, CalendarCheck, ClipboardList, Layers } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useOptionalAuth } from '@/src/context/AuthContext';
import { useStudentSubjects } from '@/src/context/StudentSubjectsContext';
import { getLearningProgramInfo } from '@/src/lib/curated-flashcards';
import { listFlashcardsApi } from '@/src/lib/curated-flashcards-api';
import { subjectTasks } from '@/src/lib/student-subjects';
import { useApiData } from '@/src/lib/use-api-data';
import {
  listStudentTasks,
  type StudentTask,
} from '@/src/lib/assessments-api';
import {
  getStudentAttendance,
  type StudentAttendanceHistory,
} from '@/src/lib/attendance-api';

function formatTaskMeta(task: StudentTask): string {
  if (!task.end_date) {
    return task.subject_code ? `${task.subject_code} · No deadline` : 'No deadline';
  }
  const date = new Date(task.end_date);
  if (isNaN(date.getTime())) {
    return task.subject_code || 'Assigned task';
  }
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  let datePrefix = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  if (isToday) datePrefix = 'Today';
  else if (isTomorrow) datePrefix = 'Tomorrow';

  const parts = [task.subject_code, `${datePrefix} · ${timeStr}`].filter(Boolean);
  return parts.join(' · ');
}

function formatTaskType(type: string): string {
  if (type === 'QUIZ') return 'Quiz';
  if (type === 'EXAM') return 'Exam';
  return 'Activity';
}

const modules = [
  {
    title: 'Introduction to Computing',
    subject: 'Digital Literacy',
    progress: 72,
    lesson: 'Lesson 4 · Computer Hardware',
    time: '18 min left',
  },
  {
    title: 'Communication Skills',
    subject: 'English',
    progress: 45,
    lesson: 'Lesson 3 · Effective Communication',
    time: '25 min left',
  },
  {
    title: 'Practical Mathematics',
    subject: 'Mathematics',
    progress: 30,
    lesson: 'Lesson 2 · Fractions and Decimals',
    time: '32 min left',
  },
];

export default function StudentDashboardPage() {
  const auth = useOptionalAuth();
  const user = auth?.user;
  const { subjects, loading: subjectsLoading, error: subjectsError } = useStudentSubjects();
  const programCode = getLearningProgramInfo(String(user?.user_category || '')).code.toUpperCase();
  const loadFlashcardCount = useCallback(
    () => listFlashcardsApi({ program: programCode, limit: 1 }).then(result => result.total),
    [programCode],
  );
  const flashcards = useApiData(loadFlashcardCount);
  const identity = user
    ? user.full_name ||
      [user.first_name, user.last_name].filter(Boolean).join(' ').trim() ||
      user.email ||
      String(user.user_id || 'Learner')
    : 'Learner';

  const [tasks, setTasks] = useState<StudentTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<StudentAttendanceHistory | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState(false);

  const targetId = user?.account_id || user?.user_id;

  useEffect(() => {
    let active = true;

    listStudentTasks(user || null)
      .then((data) => {
        if (!active) return;
        setTasks(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (active) setTasksError(true);
        console.error('Failed to load student tasks for dashboard:', err);
      })
      .finally(() => {
        if (active) setTasksLoading(false);
      });

    if (targetId) {
      getStudentAttendance(String(targetId))
        .then((data) => {
          if (!active) return;
          setAttendanceHistory(data);
        })
        .catch((err) => {
          if (active) setAttendanceError(true);
          console.error('Failed to load student attendance for dashboard:', err);
        })
        .finally(() => {
          if (active) setAttendanceLoading(false);
        });
    } else {
      setAttendanceLoading(false);
    }

    return () => {
      active = false;
    };
  }, [targetId, user]);

  const assessmentCount = new Set(subjects.flatMap(subject => subjectTasks(tasks, subject))
    .map(task => task.assessment_id)).size;
  const overview = [
    {
      label: 'Subjects', value: subjects.length, href: '/student/subjects',
      icon: BookOpen,
      loading: subjectsLoading, unavailable: Boolean(subjectsError),
    },
    {
      label: 'Flashcard sets', value: flashcards.data ?? 0, href: '/student/flashcards',
      icon: Layers,
      loading: flashcards.loading, unavailable: Boolean(flashcards.error),
    },
    {
      label: 'Assessments', value: assessmentCount, href: '/student/subjects',
      icon: ClipboardList,
      loading: tasksLoading || subjectsLoading, unavailable: tasksError || Boolean(subjectsError),
    },
    {
      label: 'Attendance',
      icon: CalendarCheck,
      value: `${Math.round(Math.min(100, Math.max(0, attendanceHistory?.attendance_rate ?? 0)))}%`,
      href: '/student/attendance', loading: attendanceLoading,
      unavailable: attendanceError || !attendanceHistory?.total_days,
    },
  ];

  const upcomingTasks = useMemo(() => {
    return tasks
      .filter(
        (t) =>
          t.status !== 'COMPLETED' &&
          t.submission_status !== 'SUBMITTED' &&
          t.submission_status !== 'GRADED' &&
          (!t.end_date || new Date(t.end_date).getTime() > Date.now())
      )
      .sort((a, b) => {
        if (!a.end_date) return 1;
        if (!b.end_date) return -1;
        return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
      })
      .slice(0, 3);
  }, [tasks]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <StudentPageHeader eyebrow="Welcome back" title={identity} description="Review your lessons, upcoming assessments, and learning progress.">
        <nav aria-label="Learning overview" className="w-full overflow-x-auto pb-1">
          <ul className="flex w-full min-w-xl gap-3">
            {overview.map(({ icon: Icon, ...item }) => (
              <li key={item.label} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  className="relative flex min-h-20 w-full min-w-0 flex-col items-start justify-between gap-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-left shadow-sm backdrop-blur-md transition-colors duration-150 hover:border-white/35 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white!"
                  aria-label={`${item.label}: ${item.loading ? 'Loading' : item.unavailable ? 'Unavailable' : item.value}`}
                >
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" className="absolute right-4 top-4 text-blue-100" />
                  <span data-overview-value className="pr-6 text-xl font-semibold leading-7 tracking-tight text-white tabular-nums">
                    {item.loading ? <span role="status"><span className="sr-only">Loading {item.label.toLowerCase()}</span><span aria-hidden="true" className="block h-5 w-6 animate-pulse rounded-md bg-white/20 motion-reduce:animate-none" /></span> : item.unavailable ? '—' : item.value}
                  </span>
                  <span data-overview-label className="text-xs font-medium leading-4 text-blue-50">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </StudentPageHeader>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Continue learning</h2>
              <p className="mt-1 text-sm text-slate-500">Pick up where you left off.</p>
            </div>
            <Link href="/student/modules" className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {modules.map((module) => (
              <article key={module.title} className="flex min-h-56 flex-col rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white p-6">

                <p className="text-xs font-medium text-slate-500">{module.subject}</p>
                <h3 className="mt-1 text-sm font-semibold leading-6 text-slate-900">{module.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{module.lesson}</p>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>{module.progress}% complete</span>
                    <span>{module.time}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <progress aria-label="Progress" max={100} value={module.progress} className="block h-full w-full appearance-none overflow-hidden rounded-full border-0 bg-slate-100 [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600" />
                  </div>
                </div>

                <button type="button" className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-blue-600 ring-1 ring-inset ring-slate-200 hover:bg-blue-50 hover:ring-blue-100">
                   Continue
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Upcoming</h2>
              <p className="mt-1 text-sm text-slate-500">Activities that need attention.</p>
            </div>

          </div>

          <div className="mt-6 space-y-3">
            {tasksLoading ? (
              <StudentLoading label="Loading upcoming tasks..." />
            ) : upcomingTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">

                <p className="text-xs font-semibold text-slate-700">No upcoming assessments</p>
                <p className="mt-0.5 text-xs text-slate-500">No pending activities or quizzes due.</p>
              </div>
            ) : (
              upcomingTasks.map((task) => (
                <Link
                  key={task.assessment_id}
                  href="/student/subjects"
                  className="block rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-slate-200 hover:bg-slate-100/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 line-clamp-1">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatTaskMeta(task)}</p>
                    </div>
                    <span className="shrink-0 rounded-xl bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wide text-blue-600 ring-1 ring-slate-200">
                      {formatTaskType(task.assessment_type)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>

          <Link href="/student/subjects" className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            View my subjects
          </Link>
        </section>
      </div>
    </div>
  );
}
