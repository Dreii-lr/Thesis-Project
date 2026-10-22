"use client";

import StudentPageHeader, { studentHeaderActionClass } from '@/src/components/layout/student/StudentPageHeader';
import StudentStatCards from '@/src/components/layout/student/StudentStatCards';
import { CalendarCheck, CalendarDays, Percent, UserCheck, UserX } from 'lucide-react';

import StudentLoading from '@/src/components/layout/student/StudentLoading';

import { useCallback, useEffect, useState } from 'react';

import { useOptionalAuth } from '@/src/context/AuthContext';
import { getStudentAttendance, formatAttendanceDate, type AttendanceStatus } from '@/src/lib/attendance-api';
import { listSubjects, subjectName, type SubjectRecord } from '@/src/lib/subjects-api';
import { useApiData } from '@/src/lib/use-api-data';

export default function StudentAttendancePage() {
  const auth = useOptionalAuth();
  const user = auth?.user;
  if (auth?.isLoading) return <StudentLoading label="Loading your attendance..." />;
  if (!user) return <p role="alert" className="p-8 text-sm text-red-700">Your student profile is unavailable. Reload the page to try again.</p>;
  return <StudentAttendanceHistory key={user.account_id || user.user_id} accountId={user.account_id || user.user_id || 'me'} category={typeof user.user_category === 'string' ? user.user_category : undefined} />;
}

function StudentAttendanceHistory({accountId, category}: {accountId: string; category?: string}) {
  const load = useCallback(() => getStudentAttendance(accountId), [accountId]);
  const history = useApiData(load);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [filter, setFilter] = useState<'all' | AttendanceStatus>('all');
  const [search, setSearch] = useState('');
  useEffect(() => {
    let active = true;
    listSubjects(category).then(items => { if (active) setSubjects(items); }).catch(() => {
      // Attendance remains readable using the subject stored on the session.
    });
    return () => { active = false; };
  }, [category]);
  const data = history.data;
  const records = (data?.records || []).filter(record =>
    (filter === 'all' || record.status === filter) &&
    `${record.date} ${formatAttendanceDate(record.date)} ${subjectName(subjects, record.subject)} ${record.remarks || record.reason_of_absence || ''}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const rate = data ? Math.min(100, Math.max(0, Math.round(data.attendance_rate))) : null;
  const metrics = [
    {label:'Recorded sessions', value:data?.total_days, icon:CalendarDays, color:'text-blue-700', background:'bg-blue-50'},
    {label:'Present', value:data?.present_days, icon:UserCheck, color:'text-emerald-700', background:'bg-emerald-50'},
    {label:'Absent', value:data?.absent_days, icon:UserX, color:'text-red-600', background:'bg-red-50'},
    {label:'Excused', value:data?.excused_days, icon:CalendarCheck, color:'text-amber-800', background:'bg-amber-50'},
  ];
  return <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <StudentPageHeader eyebrow="Learning journey" title="My attendance" description="Keep track of your learning sessions and notes from your teacher." actions={<button type="button" onClick={history.reload} disabled={history.loading} className={studentHeaderActionClass}>Refresh</button>}>
      <StudentStatCards label="Attendance overview" items={[
        { label: 'Attendance rate', value: history.loading ? '…' : data?.total_days ? `${rate}%` : '—', icon: Percent, loading: history.loading, description: history.loading ? 'Loading attendance' : history.error ? 'Attendance unavailable' : data?.total_days ? 'Present across recorded sessions' : 'No recorded sessions yet' },
        ...metrics.map(({ label, value, icon }) => ({ label, value: history.loading ? '…' : value ?? '—', icon, loading: history.loading })),
      ]} />
    </StudentPageHeader>
    {history.error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700"><div><p>{history.error}</p><button type="button" onClick={history.reload} className="mt-1 font-semibold underline">Try again</button></div></div>}
    <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-6"><div><h2 className="text-lg font-semibold text-slate-900">Session history</h2><p className="mt-1 text-xs text-slate-500">Recorded sessions and teacher notes.</p></div><label className="relative w-full sm:w-64"><span className="mb-2 block text-xs font-medium text-slate-600">Search attendance history</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search subject, date or note…" className="w-full rounded-xl border border-slate-200 py-3 pl-3 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" /></label></div>
      <div className="flex flex-wrap gap-2 border-b border-slate-100 px-6 py-3">{(['all','Present','Absent','Excused'] as const).map(status => <button key={status} type="button" aria-pressed={filter === status} onClick={() => setFilter(status)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${filter === status ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{status === 'all' ? 'All sessions' : status}</button>)}</div>
      {history.loading ? <StudentLoading label="Loading attendance history..." /> : history.error ? <p className="p-12 text-center text-sm text-slate-500">Attendance history could not be loaded.</p> : !records.length ? <div className="px-6 py-14 text-center"><h3 className="font-semibold text-slate-800">{data?.records.length ? 'No matching sessions' : 'No attendance recorded'}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{data?.records.length ? 'Try another status, subject or date.' : 'Your sessions will appear here once your teacher records attendance.'}</p></div> : <div className="divide-y divide-slate-100">{records.map(record => {
        const badge = record.status === 'Present' ? 'bg-emerald-50 text-emerald-700' : record.status === 'Absent' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700';
        return <article key={record.id} className="grid gap-4 p-6 transition hover:bg-slate-50/50 sm:grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] lg:items-center"><div className="flex min-w-0 items-start gap-3"><div className="min-w-0"><h3 className="break-words text-sm font-semibold text-slate-900">{subjectName(subjects, record.subject)}</h3><time dateTime={record.date} className="mt-1 block text-xs text-slate-500">{formatAttendanceDate(record.date)}</time></div></div><span className={`inline-flex w-fit items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-semibold ${badge}`}>{record.status}</span><div className="border-l-2 border-slate-100 pl-3 sm:col-span-2 lg:col-span-1"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teacher note</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{record.remarks || record.reason_of_absence || 'No note added'}</p></div></article>;
      })}</div>}
      {data && !history.loading && !history.error && <p className="border-t border-slate-100 px-6 py-4 text-xs text-slate-500">Showing {records.length} of {data.records.length} recorded sessions</p>}
    </section>
  </div>;
}
