'use client';

import Link from 'next/link';
import { useStudents } from '@/src/context/StudentContext';
import { listSubjects } from '@/src/lib/subjects-api';
import { listUserCategories } from '@/src/lib/user-categories-api';
import { listAttendanceSessions } from '@/src/lib/attendance-api';
import { useApiData } from '@/src/lib/use-api-data';
import ApiState from '@/src/components/ui/ApiState';

export default function AdminDashboard() {
  const { students, isLoading, error, refreshStudents } = useStudents();
  const subjects = useApiData(listSubjects);
  const programs = useApiData(listUserCategories);
  const attendance = useApiData(listAttendanceSessions);
  const completed = attendance.data?.filter(session => session.status === 'COMPLETED') || [];
  const marks = completed.reduce((total, session) => ({ present: total.present + session.presentCount, count: total.count + session.totalCount }), { present: 0, count: 0 });
  const metrics = [
    { label: 'Learners', href: '/admin/students', value: students.length, loading: isLoading, error, retry: () => void refreshStudents() },
    { label: 'Learning programs', href: '/admin/user-categories', value: programs.data?.length, loading: programs.loading, error: programs.error, retry: programs.reload },
    { label: 'Subjects', href: '/admin/subjects', value: subjects.data?.length, loading: subjects.loading, error: subjects.error, retry: subjects.reload },
    { label: 'Attendance sessions', href: '/admin/attendance', value: attendance.data?.length, loading: attendance.loading, error: attendance.error, retry: attendance.reload },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-blue-600">
      <section aria-labelledby="admin-dashboard-title" className="min-w-0 rounded-xl bg-blue-800 p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 basis-64">
            <p className="text-xs font-medium leading-5 text-blue-50">Admin workspace</p>
            <h1 id="admin-dashboard-title" className="mt-3 text-2xl font-semibold leading-tight tracking-tight">Your learner overview</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">Map learners, manage subjects, and review records across learning programs.</p>
          </div>
          <Link href="/admin/mapping/add-student" className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-800 transition-colors duration-150 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Map a learner</Link>
        </div>
        <div className="mt-6 border-t border-white/20 pt-4">
          <div role="group" aria-label="Dashboard totals" className="w-full overflow-x-auto pb-1">
            <div className="flex w-full min-w-3xl gap-3">
              {metrics.map(metric => <section key={metric.label} data-admin-metric className="flex min-h-20 min-w-0 flex-1 flex-col items-start justify-between gap-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <p data-admin-metric-value className={`font-semibold leading-7 tracking-tight text-white tabular-nums ${metric.error ? 'text-sm' : 'text-2xl'}`}>
                  {metric.loading ? <span role="status"><span className="sr-only">Loading {metric.label.toLowerCase()}</span><span aria-hidden="true" className="block h-5 w-8 animate-pulse rounded bg-white/20 motion-reduce:animate-none" /></span> : metric.error ? 'Unavailable' : metric.value}
                </p>
                <Link href={metric.href} className="rounded text-xs font-medium leading-4 text-white underline-offset-4 transition-colors duration-150 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{metric.label}</Link>
              </section>)}
            </div>
          </div>
        </div>
      </section>
      {metrics.map(metric => metric.error && <section key={metric.label} aria-label={`${metric.label} loading error`} className="rounded-xl border border-rose-100 bg-white p-4 [&_[role=alert]]:mx-0 [&_[role=alert]]:mb-0">
        <p className="text-sm font-semibold text-slate-800">{metric.label}</p>
        <ApiState loading={false} error={metric.error} onRetry={metric.retry} />
      </section>)}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Learner status</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Current status across your learner records.</p>
          <ApiState loading={isLoading} error={error} onRetry={() => void refreshStudents()} />
          {isLoading && <div aria-hidden="true" className="mt-6 grid animate-pulse grid-cols-2 gap-4 motion-reduce:animate-none">{['Mapped', 'Active', 'Inactive', 'Completed'].map(label => <div key={label} className="space-y-3 rounded-xl border border-slate-100 p-4"><div className="h-3 w-16 rounded bg-slate-100" /><div className="h-6 w-10 rounded bg-slate-100" /></div>)}</div>}
          {!isLoading && !error && <div className="mt-4 grid grid-cols-2 gap-3">
            {['MAPPED', 'ACTIVE', 'INACTIVE', 'COMPLETED'].map(status => <div key={status} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"><p className="text-xs font-medium capitalize text-slate-600">{status.toLowerCase()}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{students.filter(student => student.status === status).length}</p></div>)}
            {!students.length && <p className="col-span-2 pt-1 text-sm leading-6 text-slate-500">No learner records yet. Map a learner to get started.</p>}
            {students.some(student => !student.status) && <p className="col-span-2 text-sm leading-6 text-slate-500">Learners without an available status: {students.filter(student => !student.status).length}.</p>}
          </div>}
        </section>
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Attendance overview</h2>
          <ApiState loading={attendance.loading} error={attendance.error} onRetry={attendance.reload} />
          {attendance.loading && <div aria-hidden="true" className="mt-6 animate-pulse space-y-3 motion-reduce:animate-none"><div className="h-8 w-20 rounded bg-slate-100" /><div className="h-4 w-full rounded bg-slate-100" /><div className="h-4 w-2/3 rounded bg-slate-100" /></div>}
          {!attendance.loading && !attendance.error && attendance.data && <>
            <p className="mt-4 text-2xl font-semibold tracking-tight text-blue-700">{marks.count ? `${Math.round(marks.present / marks.count * 100)}%` : '—'}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">Completed sessions: {completed.length}. {marks.count ? `${marks.present} of ${marks.count} recorded marks were present.` : 'No completed attendance marks yet.'}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">Draft sessions: {attendance.data.filter(session => session.status === 'DRAFT').length}.</p>
            <Link href="/admin/attendance" className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors duration-150 hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">View session history</Link>
          </>}
        </section>
      </div>
    </div>
  );
}
