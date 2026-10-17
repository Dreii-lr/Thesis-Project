"use client";

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarCheck, CalendarDays, CheckCircle2, Clock3, RefreshCw, Search, XCircle } from 'lucide-react';
import { useOptionalAuth } from '@/src/context/AuthContext';
import { getStudentAttendance, formatAttendanceDate, type AttendanceStatus } from '@/src/lib/attendance-api';
import { listSubjects, subjectName, type SubjectRecord } from '@/src/lib/subjects-api';
import { useApiData } from '@/src/lib/use-api-data';

export default function StudentAttendancePage() {
  const auth = useOptionalAuth();
  const user = auth?.user;
  if (auth?.isLoading) return <p role="status" className="p-8 text-sm text-slate-500">Loading your attendance…</p>;
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
    {label:'Present', value:data?.present_days, icon:CheckCircle2, color:'text-emerald-700', background:'bg-emerald-50'},
    {label:'Absent', value:data?.absent_days, icon:XCircle, color:'text-red-600', background:'bg-red-50'},
    {label:'Excused', value:data?.excused_days, icon:Clock3, color:'text-amber-600', background:'bg-amber-50'},
  ];
  return <div className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-blue-700"><CalendarCheck size={14} /> Learning journey</p><h1 className="text-3xl font-bold tracking-tight text-slate-900">My attendance</h1><p className="mt-2 text-sm leading-6 text-slate-500">Keep track of your learning sessions and notes from your teacher.</p></div><button type="button" onClick={history.reload} disabled={history.loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"><RefreshCw size={14} className={history.loading ? 'animate-spin' : ''} /> Refresh</button></div>
    {history.error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><div><p>{history.error}</p><button type="button" onClick={history.reload} className="mt-1 font-semibold underline">Try again</button></div></div>}
    <div className="relative overflow-hidden rounded-3xl bg-blue-600 p-6 text-white sm:p-8"><div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full border-[40px] border-white/5" /><div className="relative flex flex-wrap items-center justify-between gap-6"><div><p className="text-xs font-semibold uppercase tracking-widest text-white/70">Session participation</p><h2 className="mt-3 text-xl font-semibold">Every session is a step forward.</h2><p className="mt-2 max-w-md text-sm leading-6 text-white/75">Your attendance is updated when your teacher saves a session.</p></div><div className="min-w-36 rounded-2xl border border-white/20 bg-white/10 px-6 py-4"><p className="text-4xl font-bold tracking-tight">{history.loading ? '…' : data?.total_days ? `${rate}%` : '—'}</p><p className="mt-2 text-xs text-white/75">{history.loading ? 'Loading attendance' : history.error ? 'Attendance unavailable' : data?.total_days ? 'Present across recorded sessions' : 'No recorded sessions yet'}</p></div></div></div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{metrics.map(({label,value,icon:Icon,color,background}) => <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color} ${background}`}><Icon size={19} /></span><div><p className="text-2xl font-bold text-slate-900">{history.loading ? '…' : value ?? '—'}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div></div>)}</div>
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5"><div><h2 className="text-lg font-bold text-slate-900">Session history</h2><p className="mt-1 text-xs text-slate-500">Your attendance, one learning session at a time.</p></div><label className="relative w-full sm:w-64"><span className="sr-only">Search attendance history</span><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search subject, date or note…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" /></label></div>
      <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">{(['all','Present','Absent','Excused'] as const).map(status => <button key={status} type="button" aria-pressed={filter === status} onClick={() => setFilter(status)} className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${filter === status ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{status === 'all' ? 'All sessions' : status}</button>)}</div>
      {history.loading ? <p role="status" className="p-14 text-center text-sm text-slate-500">Loading your attendance history…</p> : history.error ? <p className="p-12 text-center text-sm text-slate-500">Attendance history could not be loaded.</p> : !records.length ? <div className="px-6 py-14 text-center"><CalendarDays size={32} className="mx-auto mb-3 text-blue-300" /><h3 className="font-semibold text-slate-800">{data?.records.length ? 'No matching sessions' : 'Your journey starts here'}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{data?.records.length ? 'Try another status, subject or date.' : 'Your sessions will appear here once your teacher records attendance.'}</p></div> : <div className="divide-y divide-slate-100">{records.map(record => {
        const Icon = record.status === 'Present' ? CheckCircle2 : record.status === 'Absent' ? XCircle : Clock3;
        const badge = record.status === 'Present' ? 'bg-emerald-50 text-emerald-700' : record.status === 'Absent' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700';
        return <article key={record.id} className="grid gap-4 p-5 transition hover:bg-slate-50/50 sm:grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] lg:items-center"><div className="flex min-w-0 items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-blue-600"><CalendarDays size={20} /></span><div className="min-w-0"><h3 className="break-words text-sm font-semibold text-slate-900">{subjectName(subjects, record.subject)}</h3><time dateTime={record.date} className="mt-1 block text-xs text-slate-500">{formatAttendanceDate(record.date)}</time></div></div><span className={`inline-flex w-fit items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-semibold ${badge}`}><Icon size={13} />{record.status}</span><div className="border-l-2 border-slate-100 pl-3 sm:col-span-2 lg:col-span-1"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Teacher note</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{record.remarks || record.reason_of_absence || 'No note added'}</p></div></article>;
      })}</div>}
      {data && !history.loading && !history.error && <p className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">Showing {records.length} of {data.records.length} recorded sessions</p>}
    </section>
  </div>;
}
