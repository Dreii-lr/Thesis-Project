'use client';

import { useState } from 'react';
import { Plus, Search, Eye, ChevronLeft, ChevronRight, CalendarDays, CheckCircle2, BookOpen, RefreshCw, LoaderCircle } from 'lucide-react';
import { CATEGORY_LABELS, type TargetCategory } from '@/src/lib/assessments-api';
import type { WorkspaceAttendance } from '@/src/lib/attendance-api';
import { subjectName, type SubjectRecord } from '@/src/lib/subjects-api';

interface AttendanceRecordsListProps {
  program: TargetCategory;
  categoryName?: string;
  categorySubjects?: SubjectRecord[];
  sessions: WorkspaceAttendance[];
  loading?: boolean;
  openingId?: string | null;
  onRefresh: () => void;
  onNewRecord: () => void;
  onViewRecord: (session: WorkspaceAttendance) => void;
}

export default function AttendanceRecordsList({ program, categoryName, categorySubjects = [], sessions, loading = false, openingId, onRefresh, onNewRecord, onViewRecord }: AttendanceRecordsListProps) {
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [searchDate, setSearchDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const filtered = sessions.filter(session =>
    (selectedSubject === 'all' || (session.subject_code || session.strand_code) === selectedSubject) &&
    `${session.session_date} ${session.display_date}`.toLowerCase().includes(searchDate.toLowerCase().trim()),
  ).sort((a, b) => b.session_date.localeCompare(a.session_date));
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);
  const visible = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const subjects = Array.from(new Set([
    ...categorySubjects.map(subject => subject.code || subject.name),
    ...sessions.map(session => session.subject_code || session.strand_code),
  ])).sort();
  const title = (code: string) => subjectName(categorySubjects, code);
  const metrics = [
    { label: 'Recorded sessions', value: sessions.length, icon: CalendarDays },
    { label: 'Completed', value: sessions.filter(session => session.status === 'COMPLETED').length, icon: CheckCircle2 },
    { label: 'Subjects recorded', value: new Set(sessions.map(session => session.subject_code)).size, icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">{categoryName || CATEGORY_LABELS[program] || program}</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Attendance history</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">A clear record of every learning session. Review saved attendance or start a new roll call.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onRefresh} disabled={loading || !!openingId} aria-label="Refresh attendance history" className="rounded-xl border border-slate-200 bg-white p-3 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button>
          <button type="button" onClick={onNewRecord} disabled={!!openingId} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"><Plus size={17} /> New record</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {metrics.map(({label, value, icon: Icon}) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><Icon size={18} className="mb-3 text-blue-600" /><p className="text-2xl font-bold text-slate-900">{loading ? '…' : value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>)}
      </div>
      <section aria-label="Recorded attendance sessions" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
          <div><h2 className="font-semibold text-slate-900">Session records</h2><p className="mt-1 text-xs text-slate-500">Includes sessions recorded by all teachers.</p></div>
          <div className="flex w-full flex-wrap gap-2 lg:w-auto">
            <select aria-label="Filter by subject" value={selectedSubject} onChange={event => { setSelectedSubject(event.target.value); setCurrentPage(1); }} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:ring-2 focus:ring-blue-200 lg:max-w-60"><option value="all">All subjects</option>{subjects.map(code => <option key={code} value={code}>{title(code)}</option>)}</select>
            <label className="relative min-w-0 flex-1 sm:min-w-48"><span className="sr-only">Search attendance dates</span><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={searchDate} onChange={event => { setSearchDate(event.target.value); setCurrentPage(1); }} placeholder="Search date…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" /></label>
          </div>
        </div>
        {loading ? <div role="status" className="flex items-center justify-center gap-2 p-16 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" /> Loading attendance history…</div> : visible.length ? (
          <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm">
            <thead className="bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-500"><tr>{['Session date', 'Subject', 'Participation', 'Status', ''].map((label, index) => <th key={index} scope="col" className="px-5 py-3.5">{label || <span className="sr-only">Review</span>}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{visible.map(session => {
              const present = session.records.filter(record => record.status === 'Present').length;
              const total = session.records.length;
              const subject = title(session.subject_code || session.strand_code);
              return <tr key={session.session_id} className="transition hover:bg-blue-50/40">
                <td className="whitespace-nowrap px-5 py-5 font-semibold text-slate-800"><time dateTime={session.session_date}>{session.display_date}</time></td>
                <td className="max-w-64 px-5 py-5 text-slate-600">{subject}</td>
                <td className="px-5 py-5"><p className="whitespace-nowrap text-xs text-slate-600"><span className="font-semibold text-slate-900">{present} / {total}</span> present</p><div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{width: `${total ? present / total * 100 : 0}%`}} /></div></td>
                <td className="px-5 py-5"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${session.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{session.status === 'COMPLETED' ? 'Completed' : 'Draft'}</span></td>
                <td className="px-5 py-5 text-right"><button type="button" disabled={!!openingId} aria-label={`Review attendance for ${session.display_date}, ${subject}`} onClick={() => onViewRecord(session)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:border-blue-200 hover:bg-blue-50 disabled:opacity-50">{openingId === session.session_id ? <LoaderCircle size={15} className="animate-spin" /> : <Eye size={15} />} Review</button></td>
              </tr>;
            })}</tbody>
          </table></div>
        ) : <div className="px-5 py-14 text-center"><CalendarDays size={30} className="mx-auto mb-3 text-blue-400" /><h3 className="font-semibold text-slate-800">{sessions.length ? 'No matching sessions' : 'Ready for your first session'}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{sessions.length ? 'Try another date or subject to find your record.' : 'Create a record, mark your learners, and keep attendance together in one place.'}</p></div>}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500"><span>{loading ? 'Loading…' : `${filtered.length} sessions · Page ${page} of ${totalPages}`}</span><div className="flex gap-2"><button type="button" aria-label="Previous page" disabled={loading || page === 1} onClick={() => setCurrentPage(page - 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"><ChevronLeft size={15} /></button><button type="button" aria-label="Next page" disabled={loading || page === totalPages} onClick={() => setCurrentPage(page + 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"><ChevronRight size={15} /></button></div></div>
      </section>
    </div>
  );
}
