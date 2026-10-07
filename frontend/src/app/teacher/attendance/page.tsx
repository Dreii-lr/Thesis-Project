'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarCheck, FolderOpen } from 'lucide-react';
import {
  CATEGORY_LABELS,
  type TargetCategory,
} from '@/src/data/mockAssessment';
import {
  formatAttendanceDate,
  programs,
  toAttendancePayload,
  type WorkspaceAttendance,
} from '@/src/data/mockTeacher';
import { useTeacher } from '@/src/context/TeacherContext';
import AttendanceRecordsList from '@/src/components/layout/teacher/attendance/AttendanceRecordsList';
import TakeAttendanceView from '@/src/components/layout/teacher/attendance/TakeAttendanceView';
import NewRecordModal from '@/src/components/ui/teacher/attendance/NewRecordModal';

function AttendanceDirectory({ program }: { program: TargetCategory }) {
  const { attendance, setAttendance, students } = useTeacher();
  const [activeSession, setActiveSession] =
    useState<WorkspaceAttendance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const sessions = attendance.filter(
    (session) => session.level_code === program,
  );

  const startSession = (date: string, subject: string) => {
    const existing = sessions.find(
      (session) =>
        session.session_date === date && session.strand_code === subject,
    );
    setActiveSession(
      existing
        ? structuredClone(existing)
        : {
            session_id: crypto.randomUUID(),
            session_date: date,
            display_date: formatAttendanceDate(date),
            level_code: program,
            strand_code: subject,
            status: 'DRAFT',
            records: students
              .filter((student) => student.user_category === program)
              .map((student) => ({
                student_id: student.id,
                status: null,
                reason_of_absence: '',
                remarks: '',
              })),
          },
    );
    setIsModalOpen(false);
    setMessage(
      existing
        ? 'This session already exists. Review or update the saved attendance below.'
        : '',
    );
  };

  const saveSession = (session: WorkspaceAttendance) => {
    const payload = toAttendancePayload({ ...session, status: 'COMPLETED' });
    const updated = { session_id: session.session_id, ...payload };
    if (
      !setAttendance([
        updated,
        ...attendance.filter((item) => item.session_id !== updated.session_id),
      ])
    )
      return false;
    setMessage(
      'Attendance saved successfully. The history and learner records are updated.',
    );
    return true;
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
          onSave={saveSession}
          onBack={() => setActiveSession(null)}
        />
      ) : (
        <AttendanceRecordsList
          program={program}
          sessions={sessions}
          onNewRecord={() => {
            setIsModalOpen(true);
            setMessage('');
          }}
          onViewRecord={(session) => {
            setActiveSession(structuredClone(session));
            setMessage('');
          }}
        />
      )}
      {isModalOpen && (
        <NewRecordModal
          program={program}
          onClose={() => setIsModalOpen(false)}
          onStartRecording={startSession}
        />
      )}
    </>
  );
}

function AttendanceContent() {
  const searchParams = useSearchParams();
  const program = programs.find(
    (program) => program === searchParams.get('program'),
  );
  const { attendance, students } = useTeacher();

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {program ? (
        <AttendanceDirectory key={program} program={program} />
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
            {programs.map((program, index) => {
              const sessions = attendance.filter(
                (session) => session.level_code === program,
              );
              return (
                <Link
                  key={program}
                  href={`/teacher/attendance?program=${program}`}
                  className="group rounded-[24px] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
                >
                  <span
                    className={`mb-7 flex h-14 w-14 items-center justify-center rounded-2xl ${['bg-blue-50 text-blue-600', 'bg-violet-50 text-violet-600', 'bg-emerald-50 text-emerald-600'][index]}`}
                  >
                    <FolderOpen size={28} />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Program directory
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {CATEGORY_LABELS[program]}
                  </h2>
                  <p className="mt-4 text-sm text-slate-500">
                    {
                      students.filter(
                        (student) => student.user_category === program,
                      ).length
                    }{' '}
                    learners · {sessions.length} attendance records
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {
                      sessions.filter(
                        (session) => session.status === 'COMPLETED',
                      ).length
                    }{' '}
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
