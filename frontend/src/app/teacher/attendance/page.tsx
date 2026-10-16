'use client';

import { Suspense, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarCheck, FolderOpen } from 'lucide-react';
import {
  CATEGORY_LABELS,
  type TargetCategory,
} from '@/src/lib/assessments-api';
import {
  formatAttendanceDate,
  type WorkspaceAttendance,
} from '@/src/data/mockTeacher';
import { StudentContext } from '@/src/context/StudentContext';
import {
  getAttendanceSession,
  getAttendanceSummaryMetrics,
  listAttendanceSessions,
  recordAttendanceSession,
  type AttendanceProgramMetric,
  type AttendanceStatus,
  type RecordAttendancePayload,
} from '@/src/lib/attendance-api';
import {
  getUserCategories,
  type UserCategoryRecord,
  DEFAULT_USER_CATEGORIES,
} from '@/src/lib/user-categories-api';
import {
  listSubjects,
  type SubjectRecord,
} from '@/src/lib/subjects-api';
import AttendanceRecordsList from '@/src/components/layout/teacher/attendance/AttendanceRecordsList';
import TakeAttendanceView from '@/src/components/layout/teacher/attendance/TakeAttendanceView';
import NewRecordModal from '@/src/components/ui/teacher/attendance/NewRecordModal';

function normalizeCategoryCode(code: string | null | undefined): string {
  if (!code) return '';
  const s = code.trim().toLowerCase();
  if (s === 'secondary' || s === 'junior' || s === 'jhs') return 'SECONDARY';
  if (s === 'elementary' || s === 'elem') return 'ELEMENTARY';
  if (s === 'blp' || s === 'basic_literacy' || s === 'basic literacy program') return 'BLP';
  return code.toUpperCase();
}

function matchProgramCategory(
  userCategory: string | null | undefined,
  program: string | null | undefined,
): boolean {
  if (!userCategory || !program) return false;
  return normalizeCategoryCode(userCategory) === normalizeCategoryCode(program);
}

function AttendanceDirectory({
  program,
  categoryId,
  categoryName,
  initialSubjects = [],
}: {
  program: string;
  categoryId?: string;
  categoryName?: string;
  initialSubjects?: SubjectRecord[];
}) {
  const studentCtx = useContext(StudentContext);
  const liveStudents = studentCtx?.students || [];

  const [sessions, setSessions] = useState<WorkspaceAttendance[]>([]);
  const [activeSession, setActiveSession] =
    useState<WorkspaceAttendance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [categorySubjects, setCategorySubjects] = useState<SubjectRecord[]>(() => {
    return initialSubjects.filter((s) => s.is_active !== false);
  });

  const normalizedCategory = useMemo(
    () => normalizeCategoryCode(program),
    [program],
  );

  // Dynamically load active subjects belonging to this category
  useEffect(() => {
    let isMounted = true;
    const targetQueryParam = categoryId || normalizedCategory;
    listSubjects(targetQueryParam)
      .then((items) => {
        if (!isMounted) return;
        const activeOnly = items.filter((s) => s.is_active !== false);
        setCategorySubjects(activeOnly);
      })
      .catch((err) => {
        console.warn('Failed to load category subjects for attendance:', err);
        if (isMounted && initialSubjects.length === 0) setCategorySubjects([]);
      });

    return () => {
      isMounted = false;
    };
  }, [categoryId, normalizedCategory, initialSubjects]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    listAttendanceSessions({ level: normalizedCategory })
      .then((items) => {
        if (!isMounted) return;
        const mapped: WorkspaceAttendance[] = items.map((item) => {
          const rawDate = String(item.session_date || item.rawDate || '');
          const cat = (item.category_code || item.level || normalizedCategory) as TargetCategory;
          const subj = item.subject_code || item.subject || '';
          const recs = item.records || [];
          const presCount = recs.filter((r) => r.status === 'Present').length;
          const totCount = recs.length;

          return {
            session_id: item.id,
            session_date: rawDate,
            display_date: formatAttendanceDate(rawDate),
            level_code: cat,
            category_code: cat,
            strand_code: subj,
            subject_code: subj,
            status: item.status,
            present_count: presCount,
            total_count: totCount,
            records: recs.map((r) => ({
              student_id: r.student_id,
              status: r.status,
              reason_of_absence: r.reason_of_absence || '',
              remarks: r.remarks || '',
            })),
          };
        });
        setSessions(mapped);
      })
      .catch(() => {
        if (isMounted) {
          setSessions([]);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [normalizedCategory]);

  const handleViewRecord = async (
    session: WorkspaceAttendance,
    customMessage = '',
  ) => {
    setMessage(customMessage);
    if (session.records && session.records.length > 0) {
      setActiveSession(structuredClone(session));
      return;
    }
    try {
      const details = await getAttendanceSession(session.session_id);
      const rawDate = String(details.session_date);
      const cat = (details.category_code || details.level_code || normalizedCategory) as TargetCategory;
      const subj = details.subject_code || details.strand_code || '';
      const recs = details.records || [];

      const fullSession: WorkspaceAttendance = {
        session_id: details.session_id,
        session_date: rawDate,
        display_date: formatAttendanceDate(rawDate),
        level_code: cat,
        category_code: cat,
        strand_code: subj,
        subject_code: subj,
        status: details.status,
        present_count: recs.filter((r) => r.status === 'Present').length,
        total_count: recs.length,
        records: recs.map((r) => ({
          student_id: r.student_id,
          status: r.status,
          reason_of_absence: r.reason_of_absence || '',
          remarks: r.remarks || '',
        })),
      };
      setActiveSession(fullSession);
    } catch {
      setActiveSession(structuredClone(session));
    }
  };

  const startSession = (date: string, subject: string) => {
    const existing = sessions.find(
      (session) =>
        session.session_date === date &&
        (session.strand_code === subject || session.subject_code === subject),
    );
    if (existing) {
      void handleViewRecord(
        existing,
        'This session already exists. Review or update the saved attendance below.',
      );
      setIsModalOpen(false);
      return;
    }

    const learners = liveStudents.filter(
      (s) =>
        matchProgramCategory(s.user_category, program) &&
        (!((s as any).role) || (s as any).role === 'STUDENT'),
    );

    setActiveSession({
      session_id: crypto.randomUUID(),
      session_date: date,
      display_date: formatAttendanceDate(date),
      level_code: normalizedCategory as TargetCategory,
      category_code: normalizedCategory as TargetCategory,
      strand_code: subject,
      subject_code: subject,
      status: 'DRAFT',
      records: learners.map((student) => ({
        student_id: (student as any).student_id || student.id,
        status: null,
        reason_of_absence: '',
        remarks: '',
      })),
    });
    setIsModalOpen(false);
    setMessage('');
  };

  const saveSession = async (session: WorkspaceAttendance) => {
    try {
      const catCode = normalizeCategoryCode(
        session.category_code || session.level_code || normalizedCategory,
      );
      const subjCode = session.subject_code || session.strand_code;

      const payload: RecordAttendancePayload = {
        session_date: session.session_date,
        category_code: catCode,
        subject_code: subjCode,
        level_code: catCode,
        strand_code: subjCode,
        status: 'COMPLETED',
        records: session.records.map((record) => {
          if (!record.status) {
            throw new Error('Mark every learner before saving attendance.');
          }
          return {
            student_id: record.student_id,
            status: record.status as AttendanceStatus,
            reason_of_absence: record.reason_of_absence || null,
            remarks: record.remarks || record.reason_of_absence || null,
          };
        }),
      };

      const saved = await recordAttendanceSession(payload);
      const rawDate = String(saved.session_date);
      const cat = (saved.category_code || saved.level_code || catCode) as TargetCategory;
      const subj = saved.subject_code || saved.strand_code || subjCode;
      const recs = saved.records || [];

      const updated: WorkspaceAttendance = {
        session_id: saved.session_id,
        session_date: rawDate,
        display_date: formatAttendanceDate(rawDate),
        level_code: cat,
        category_code: cat,
        strand_code: subj,
        subject_code: subj,
        status: saved.status,
        present_count: recs.filter((r) => r.status === 'Present').length,
        total_count: recs.length,
        records: recs.map((r) => ({
          student_id: r.student_id,
          status: r.status,
          reason_of_absence: r.reason_of_absence || '',
          remarks: r.remarks || '',
        })),
      };

      setSessions((prev) => [
        updated,
        ...prev.filter(
          (item) =>
            item.session_id !== updated.session_id &&
            !(
              item.session_date === updated.session_date &&
              (item.strand_code === updated.strand_code ||
                item.subject_code === updated.subject_code)
            ),
        ),
      ]);
      setMessage(
        'Attendance saved successfully. The history and learner records are updated.',
      );
      return true;
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to save attendance session.';
      setMessage(msg);
      return false;
    }
  };

  return (
    <>
      {!activeSession && (
        <Link
          href="/teacher/attendance"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
        >
          <ArrowLeft size={16} /> All programs
        </Link>
      )}
      {message && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800"
        >
          {message}
        </p>
      )}
      {activeSession ? (
        <TakeAttendanceView
          key={activeSession.session_id}
          session={activeSession}
          categorySubjects={categorySubjects}
          onSave={saveSession}
          onBack={() => setActiveSession(null)}
        />
      ) : (
        <AttendanceRecordsList
          program={program as TargetCategory}
          sessions={sessions}
          categorySubjects={categorySubjects}
          categoryName={categoryName}
          onNewRecord={() => {
            setIsModalOpen(true);
            setMessage('');
          }}
          onViewRecord={(session) => {
            void handleViewRecord(session);
          }}
        />
      )}
      {isModalOpen && (
        <NewRecordModal
          program={program as TargetCategory}
          categoryId={categoryId}
          preloadedSubjects={categorySubjects}
          categoryName={categoryName}
          onClose={() => setIsModalOpen(false)}
          onStartRecording={startSession}
        />
      )}
    </>
  );
}

function AttendanceContent() {
  const searchParams = useSearchParams();
  const programParam = searchParams.get('program');

  const studentCtx = useContext(StudentContext);
  const liveStudents = studentCtx?.students || [];

  const [categories, setCategories] = useState<UserCategoryRecord[]>(DEFAULT_USER_CATEGORIES);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [metrics, setMetrics] = useState<AttendanceProgramMetric[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Fetch dynamic categories from the backend
  useEffect(() => {
    let isMounted = true;
    getUserCategories()
      .then((cats) => {
        if (!isMounted) return;
        if (cats && cats.length > 0) {
          const studentCategories = cats.filter(
            (c) =>
              (c.code || '').toUpperCase() !== 'EMPLOYEE' &&
              (c.name || '').toUpperCase() !== 'EMPLOYEE',
          );
          setCategories(studentCategories);
        }
      })
      .catch((err) => {
        console.warn('Failed to load user categories for attendance:', err);
      })
      .finally(() => {
        if (isMounted) setCategoriesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch aggregate summary metrics from dedicated backend endpoint
  useEffect(() => {
    let isMounted = true;
    setMetricsLoading(true);

    getAttendanceSummaryMetrics()
      .then((items) => {
        if (!isMounted) return;
        setMetrics(items);
      })
      .catch((err) => {
        console.warn('Failed to load attendance summary metrics:', err);
        if (isMounted) setMetrics([]);
      })
      .finally(() => {
        if (isMounted) setMetricsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedCategory = useMemo(() => {
    if (!programParam) return null;
    return (
      categories.find(
        (cat) =>
          normalizeCategoryCode(cat.code) === normalizeCategoryCode(programParam) ||
          cat.category_id === programParam,
      ) || null
    );
  }, [categories, programParam]);

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {programParam ? (
        <AttendanceDirectory
          key={programParam}
          program={programParam}
          categoryId={selectedCategory?.category_id}
          categoryName={
            selectedCategory?.name ||
            CATEGORY_LABELS[programParam as TargetCategory] ||
            programParam
          }
          initialSubjects={(selectedCategory?.subjects as SubjectRecord[] | undefined) || []}
        />
      ) : (
        <>
          <div className="mb-7">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <CalendarCheck size={14} /> Attendance
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Learner attendance
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Choose a program to view attendance history, review learner
              records, or record a new session.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {categories.map((cat, index) => {
              const catCode = cat.code || cat.category_id;
              const metric = metrics.find(
                (m) =>
                  (m.category_id && cat.category_id && m.category_id === cat.category_id) ||
                  normalizeCategoryCode(m.category_code) === normalizeCategoryCode(catCode) ||
                  (m.category_name && cat.name && m.category_name.trim().toLowerCase() === cat.name.trim().toLowerCase()),
              );
              const cardThemes = [
                'bg-blue-50 text-blue-600',
                'bg-violet-50 text-violet-600',
                'bg-emerald-50 text-emerald-600',
                'bg-amber-50 text-amber-600',
              ];
              const cardTheme = cardThemes[index % cardThemes.length];

              // Actual database student count fallback from StudentContext (role === 'STUDENT')
              const studentFallbackCount = liveStudents.filter(
                (s) =>
                  matchProgramCategory(s.user_category, catCode) &&
                  (!((s as any).role) || (s as any).role === 'STUDENT'),
              ).length;

              const learnersCount = metric?.learners_count ?? studentFallbackCount;
              const totalSessions = metric?.total_sessions ?? 0;
              const completedSessions = metric?.completed_sessions ?? 0;

              return (
                <Link
                  key={cat.category_id || cat.code}
                  href={`/teacher/attendance?program=${encodeURIComponent(cat.code || cat.category_id)}`}
                  className="group rounded-[24px] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
                >
                  <span
                    className={`mb-7 flex h-14 w-14 items-center justify-center rounded-2xl ${cardTheme}`}
                  >
                    <FolderOpen size={28} />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Program directory
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {cat.name}
                  </h2>
                  <p className="mt-4 text-sm text-slate-500">
                    {metricsLoading ? '...' : learnersCount} learners ·{' '}
                    {metricsLoading ? '...' : totalSessions} attendance records
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {metricsLoading
                      ? '...'
                      : completedSessions}{' '}
                    completed sessions
                  </p>
                  <span className="mt-8 flex items-center justify-between text-sm font-bold text-blue-600">
                    View attendance history <ArrowRight size={17} />
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-sm text-slate-500">Loading attendance…</p>
      }
    >
      <AttendanceContent />
    </Suspense>
  );
}
