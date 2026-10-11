'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, ClipboardCheck, Layers, Users } from 'lucide-react';
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
    { label: 'Learners', href: '/admin/students', icon: Users, value: students.length, loading: isLoading, error, retry: () => void refreshStudents() },
    { label: 'Learning programs', href: '/admin/user-categories', icon: Layers, value: programs.data?.length, loading: programs.loading, error: programs.error, retry: programs.reload },
    { label: 'Subjects', href: '/admin/subjects', icon: BookOpen, value: subjects.data?.length, loading: subjects.loading, error: subjects.error, retry: subjects.reload },
    { label: 'Attendance sessions', href: '/admin/attendance', icon: ClipboardCheck, value: attendance.data?.length, loading: attendance.loading, error: attendance.error, retry: attendance.reload },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">Admin workspace</p>
      <h1 className="text-3xl font-extrabold tracking-tight">Your learner overview</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Map learners, manage subjects, and review records across learning programs.</p>
      <section className="portal-hero relative mt-6 overflow-hidden rounded-[28px] p-7 text-white shadow-xl shadow-blue-600/15 sm:p-8">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-sm font-semibold text-blue-100">Every learner, a new possibility</p>
          <h2 className="mt-2 text-2xl font-extrabold">Support their next step</h2>
          <p className="mt-3 text-sm text-blue-100">Map learner details so teachers can review them and create student accounts.</p>
          <Link href="/admin/mapping/add-student" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-700">Map a learner <ArrowRight size={16} /></Link>
        </div>
      </section>
      <div className="my-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(metric => <section key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <metric.icon size={21} className="mb-4 text-blue-600" />
          <Link href={metric.href} className="text-sm font-semibold text-slate-500 hover:text-blue-600">{metric.label}</Link>
          <p className="mt-2 text-3xl font-bold">{metric.loading ? '…' : metric.error ? 'Unavailable' : metric.value}</p>
          <ApiState loading={false} error={metric.error} onRetry={metric.retry} />
        </section>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Learner status</h2>
          <ApiState loading={isLoading} error={error} onRetry={() => void refreshStudents()} />
          {!isLoading && !error && <div className="mt-4 grid grid-cols-2 gap-3">
            {['MAPPED', 'ACTIVE', 'INACTIVE', 'COMPLETED'].map(status => <div key={status} className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{status}</p><p className="mt-2 text-2xl font-bold">{students.filter(student => student.status === status).length}</p></div>)}
            {students.some(student => !student.status) && <p className="col-span-2 text-sm text-slate-500">{students.filter(student => !student.status).length} learners have no available status.</p>}
          </div>}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Attendance overview</h2>
          <ApiState loading={attendance.loading} error={attendance.error} onRetry={attendance.reload} />
          {!attendance.loading && !attendance.error && attendance.data && <>
            <p className="mt-4 text-3xl font-bold text-blue-600">{marks.count ? `${Math.round(marks.present / marks.count * 100)}%` : '—'}</p>
            <p className="mt-2 text-sm text-slate-500">Present marks across {completed.length} completed sessions. {marks.count ? `${marks.present} of ${marks.count} recorded marks.` : 'No completed attendance marks yet.'}</p>
            <p className="mt-3 text-sm text-slate-600">{attendance.data.filter(session => session.status === 'DRAFT').length} draft sessions</p>
            <Link href="/admin/attendance" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">View session history <ArrowRight size={16} /></Link>
          </>}
        </section>
      </div>
    </div>
  );
}
