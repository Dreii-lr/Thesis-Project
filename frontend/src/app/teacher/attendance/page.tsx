'use client';

import { Suspense, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarCheck, FolderOpen, Users, CheckCircle2 } from 'lucide-react';
import {
  type TargetCategory,
} from '@/src/lib/assessments-api';
import {
  type WorkspaceAttendance,
} from '@/src/lib/attendance-api';
import { StudentContext } from '@/src/context/StudentContext';
import { useOptionalAuth } from '@/src/context/AuthContext';
import {
  attendanceSavePayload,
  attendanceSubjectMatches,
  canEditAttendance,
  createAttendanceDraft,
  initializeAttendanceRoster,
  toAttendanceWorkspace,
  normalizeAttendanceCategory as normalizeCategoryCode,
  resolveAttendanceCategory,
} from '@/src/lib/attendance-workspace';
import {
  getAttendanceSession,
  getAttendanceSummaryMetrics,
  listAttendanceSessions,
  recordAttendanceSession,
  type AttendanceProgramMetric,
} from '@/src/lib/attendance-api';
import {
  listUserCategories,
  type UserCategoryRecord,
} from '@/src/lib/user-categories-api';
import {
  listSubjects,
  type SubjectRecord,
} from '@/src/lib/subjects-api';
import AttendanceRecordsList from '@/src/components/layout/teacher/attendance/AttendanceRecordsList';
import TakeAttendanceView from '@/src/components/layout/teacher/attendance/TakeAttendanceView';
import NewRecordModal from '@/src/components/ui/teacher/attendance/NewRecordModal';
import ApiState from '@/src/components/ui/ApiState';

const EMPTY_SUBJECTS: SubjectRecord[] = [];

function matchProgramCategory(
  userCategory: string | null | undefined,
  program: string | null | undefined,
): boolean {
  if (!userCategory || !program) return false;
  return normalizeCategoryCode(userCategory) === normalizeCategoryCode(program);
}

function AttendanceDirectory({
  program, categoryId, categoryName, initialSubjects = EMPTY_SUBJECTS,
}: {
  program: string;
  categoryId?: string;
  categoryName?: string;
  initialSubjects?: SubjectRecord[];
}) {
  const studentCtx = useContext(StudentContext);
  const auth = useOptionalAuth();
  const teacherId = auth?.user?.user_id;
  const [sessions, setSessions] = useState<WorkspaceAttendance[]>([]);
  const [activeSession, setActiveSession] = useState<WorkspaceAttendance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [categorySubjects, setCategorySubjects] = useState<SubjectRecord[]>(() => initialSubjects.filter(subject => subject.is_active));
  const normalizedCategory = normalizeCategoryCode(program);

  useEffect(() => {
    let active = true;
    listSubjects(categoryId || normalizedCategory)
      .then(items => {
        if (active) setCategorySubjects(items.filter(subject => subject.is_active && (!categoryId || subject.category_id === categoryId)));
      })
      .catch(err => { if (active) setSubjectsError(err instanceof Error ? err.message : 'Unable to load subjects.'); })
      .finally(() => { if (active) setSubjectsLoading(false); });
    return () => { active = false; };
  }, [categoryId, normalizedCategory, reloadKey]);

  useEffect(() => {
    let active = true;
    listAttendanceSessions({ level: normalizedCategory })
      .then(items => { if (active) setSessions(items.map(toAttendanceWorkspace)); })
      .catch(err => { if (active) setSessionsError(err instanceof Error ? err.message : 'Unable to load attendance.'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [normalizedCategory, reloadKey]);

  const prepareSession = (session: WorkspaceAttendance) => {
    if (session.status === 'DRAFT' && !session.records.length && canEditAttendance(session, teacherId)) {
      if (!studentCtx || studentCtx.isLoading) throw new Error('Wait for the learner list to finish loading, then open this draft again.');
      if (studentCtx.error) throw new Error(studentCtx.error);
    }
    return initializeAttendanceRoster(session, studentCtx?.students || [], teacherId);
  };

  const handleViewRecord = async (session: WorkspaceAttendance) => {
    if (openingId) return;
    setOpeningId(session.session_id);
    setActionError('');
    setMessage('');
    try {
      // List responses omit teacher_id, so open the full record before editing.
      setActiveSession(prepareSession(toAttendanceWorkspace(await getAttendanceSession(session.session_id))));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to open this attendance record.');
    } finally {
      setOpeningId(null);
    }
  };

  const startSession = async (date: string, subject: string): Promise<string | null> => {
    if (!teacherId) return 'Your teacher profile is still loading. Please try again.';
    if (isLoading || subjectsLoading) return 'Wait for attendance and subjects to finish loading.';
    if (sessionsError || subjectsError) return sessionsError || subjectsError;
    const selectedSubject = categorySubjects.find(item => (item.code || item.name) === subject);
    if (!selectedSubject) return 'Select an active subject belonging to this program.';
    try {
      const matching = sessions.filter(session => session.session_date === date && attendanceSubjectMatches(session, selectedSubject));
      for (const session of matching) {
        const details = toAttendanceWorkspace(await getAttendanceSession(session.session_id));
        if (canEditAttendance(details, teacherId)) {
          setActiveSession(prepareSession(details));
          setMessage(details.status === 'DRAFT' ? 'Your saved draft is open. Finish marking the learners below.' : 'Your saved session is open. Select Edit attendance to make a correction.');
          setIsModalOpen(false);
          return null;
        }
      }
      if (!studentCtx) return 'The learner directory is unavailable. Reload the page and try again.';
      if (studentCtx.isLoading) return 'Wait for the learner list to finish loading.';
      if (studentCtx.error) return studentCtx.error;
      setActiveSession(createAttendanceDraft(date, subject, normalizedCategory, studentCtx.students, teacherId));
      setIsModalOpen(false);
      setMessage('');
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Unable to open attendance.';
    }
  };

  const retryLoading = () => {
    setIsLoading(true);
    setSubjectsLoading(true);
    setSessionsError(null);
    setSubjectsError(null);
    setActionError('');
    setReloadKey(value => value + 1);
    if (studentCtx?.error) void studentCtx.refreshStudents();
  };

  const saveSession = async (session: WorkspaceAttendance) => {
    if (!canEditAttendance(session, teacherId)) throw new Error('Open a session recorded by your account to make changes.');
    const payload = attendanceSavePayload(session, studentCtx?.students || []);
    const updated = toAttendanceWorkspace(await recordAttendanceSession(payload));
    setSessions(previous => [updated, ...previous.filter(item => item.session_id !== updated.session_id && item.session_id !== session.session_id)]);
    setMessage('Attendance saved. Learners can now see these records in their attendance history.');
    return updated;
  };

  return (
    <>
      {!activeSession && <Link href="/teacher/attendance" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><ArrowLeft size={16} /> All programs</Link>}
      {message && <p role="status" className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={18} className="shrink-0" />{message}</p>}
      {actionError && <p role="alert" className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{actionError}</p>}
      {activeSession ? (
        <TakeAttendanceView key={activeSession.session_id} session={activeSession} categoryName={categoryName} categorySubjects={categorySubjects} canEdit={canEditAttendance(activeSession, teacherId)} onSave={saveSession} onBack={() => { setActiveSession(null); setMessage(''); }} />
      ) : (
        <>
          <ApiState loading={false} error={sessionsError || subjectsError || studentCtx?.error || null} onRetry={retryLoading} />
          <AttendanceRecordsList program={program as TargetCategory} sessions={sessions} categorySubjects={categorySubjects} categoryName={categoryName} loading={isLoading} openingId={openingId} onRefresh={retryLoading} onNewRecord={() => { setIsModalOpen(true); setMessage(''); setActionError(''); }} onViewRecord={session => void handleViewRecord(session)} />
        </>
      )}
      {isModalOpen && <NewRecordModal program={program} subjects={categorySubjects} isLoading={isLoading || subjectsLoading || !!studentCtx?.isLoading} loadError={sessionsError || subjectsError || studentCtx?.error || null} onRetry={retryLoading} categoryName={categoryName} onClose={() => setIsModalOpen(false)} onStartRecording={startSession} />}
    </>
  );
}

function AttendanceContent() {
  const searchParams = useSearchParams();
  const programParam = searchParams.get('program');

  const studentCtx = useContext(StudentContext);
  const liveStudents = studentCtx?.students || [];

  const [categories, setCategories] = useState<UserCategoryRecord[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AttendanceProgramMetric[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [metricsVersion, setMetricsVersion] = useState(0);

  // Fetch dynamic categories from the backend
  useEffect(() => {
    let isMounted = true;
    listUserCategories()
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
        if (isMounted) setCategoriesError(err instanceof Error ? err.message : 'Unable to load learning programs.');
      })
      .finally(() => {
        if (isMounted) setCategoriesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // The backend totals include sessions recorded by all teachers.
  useEffect(() => {
    let isMounted = true;
    getAttendanceSummaryMetrics()
      .then((items) => {
        if (!isMounted) return;
        setMetrics(items);
      })
      .catch((err) => {
        if (isMounted) setMetricsError(err instanceof Error ? err.message : 'Unable to load attendance totals.');
      })
      .finally(() => {
        if (isMounted) setMetricsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [metricsVersion]);

  const selectedCategory = useMemo(
    () => programParam ? resolveAttendanceCategory(categories, programParam) : null,
    [categories, programParam],
  );

  if (categoriesLoading || categoriesError) {
    return <ApiState loading={categoriesLoading} error={categoriesError} onRetry={() => window.location.reload()} />;
  }
  if (programParam && !selectedCategory) {
    return (
      <div className="p-8 text-sm text-slate-600">
        <p>This learning program is unavailable. Choose a program from the attendance directory.</p>
        <Link href="/teacher/attendance" className="mt-3 inline-block font-semibold text-blue-600">All programs</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {selectedCategory ? (
        <AttendanceDirectory
          key={selectedCategory.category_id}
          program={selectedCategory.code}
          categoryId={selectedCategory.category_id}
          categoryName={selectedCategory.name}
          initialSubjects={(selectedCategory.subjects as SubjectRecord[] | undefined) || EMPTY_SUBJECTS}
        />
      ) : (
        <>
          <div className="portal-hero relative mb-7 overflow-hidden rounded-3xl p-6 text-white sm:p-8">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              <CalendarCheck size={14} /> Attendance
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Learner attendance
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
              Every learning session counts. Choose a program to record attendance, review participation, and keep learner records up to date.
            </p>
          </div>
          {metricsError && <ApiState loading={metricsLoading} error={metricsError} onRetry={() => { setMetricsLoading(true); setMetricsError(null); setMetricsVersion(value => value + 1); }} />}
          {!categories.length && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No learning programs are available. Add a program and active subjects before recording attendance.</div>}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((cat) => {
              const catCode = cat.code || cat.category_id;
              const metric = metrics.find(
                (m) =>
                  (m.category_id && cat.category_id && m.category_id === cat.category_id) ||
                  normalizeCategoryCode(m.category_code) === normalizeCategoryCode(catCode) ||
                  (m.category_name && cat.name && m.category_name.trim().toLowerCase() === cat.name.trim().toLowerCase()),
              );
              // Actual database student count fallback from StudentContext (role === 'STUDENT')
              const studentFallbackCount = liveStudents.filter(
                (s) =>
                  matchProgramCategory(s.user_category, catCode) && s.status !== 'INACTIVE',
              ).length;

              const learnersCount = metric?.learners_count ?? (studentCtx && !studentCtx.isLoading && !studentCtx.error ? studentFallbackCount : '—');
              const totalSessions = metric?.total_sessions ?? '—';
              const completedSessions = metric?.completed_sessions ?? '—';

              return (
                <Link
                  key={cat.category_id || cat.code}
                  href={`/teacher/attendance?program=${encodeURIComponent(cat.code || cat.category_id)}`}
                  className="group relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
                >
                  <span
                    className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700"
                  >
                    <FolderOpen size={24} />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Program directory
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {cat.name}
                  </h2>
                  <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4">
                    <div><p className="text-xl font-bold text-slate-900">{metricsLoading || studentCtx?.isLoading ? '…' : learnersCount}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Users size={13} /> Registered learners</p></div>
                    <div><p className="text-xl font-bold text-slate-900">{metricsLoading ? '…' : totalSessions}</p><p className="mt-1 text-xs text-slate-500">Recorded sessions</p></div>
                  </div>
                  <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500"><CheckCircle2 size={14} className="text-blue-600" /> {metricsLoading ? '…' : completedSessions} completed sessions · all teachers</p>
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
