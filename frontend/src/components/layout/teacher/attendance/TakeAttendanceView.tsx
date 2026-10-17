'use client';

import { useContext, useMemo, useState } from 'react';
import { ArrowLeft, Check, Pencil, CalendarDays, Search, Eye, CheckCircle2 } from 'lucide-react';
import { CATEGORY_LABELS } from '@/src/lib/assessments-api';
import type { WorkspaceAttendance } from '@/src/lib/attendance-api';
import { subjectName, type SubjectRecord } from '@/src/lib/subjects-api';
import { StudentContext } from '@/src/context/StudentContext';
import AttendanceTable from './AttendanceTable';
import AttendanceFooter from './AttendanceFooter';

interface TakeAttendanceViewProps {
  session: WorkspaceAttendance;
  categoryName?: string;
  categorySubjects?: SubjectRecord[];
  canEdit: boolean;
  onSave: (session: WorkspaceAttendance) => Promise<WorkspaceAttendance>;
  onBack: () => void;
}

export default function TakeAttendanceView({ session, categoryName, categorySubjects = [], canEdit, onSave, onBack }: TakeAttendanceViewProps) {
  const studentCtx = useContext(StudentContext);
  const students = studentCtx?.students || [];
  const [savedSession, setSavedSession] = useState(session);
  const [records, setRecords] = useState(() => structuredClone(session.records));
  const [isEditing, setIsEditing] = useState(canEdit && session.status === 'DRAFT');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const hasChanges = JSON.stringify(records) !== JSON.stringify(savedSession.records);
  const marked = records.filter(record => record.status).length;
  const remaining = records.length - marked;
  const visible = records.filter(record => {
    const learner = students.find(student => student.account_id === record.account_id || student.id === record.account_id);
    const text = `${learner?.first_name || ''} ${learner?.last_name || ''} ${learner?.account_id || record.account_id}`;
    return text.toLowerCase().includes(search.trim().toLowerCase()) &&
      (filter === 'all' || (filter === 'unmarked' ? !record.status : record.status === filter));
  });
  const categoryLabel = categoryName || (CATEGORY_LABELS as Record<string, string>)[session.level_code] || session.level_code;
  const subject = useMemo(() => subjectName(categorySubjects, session.subject_code || session.strand_code), [categorySubjects, session.subject_code, session.strand_code]);

  const handleSave = async () => {
    if (isSaving || !canEdit) return;
    if (!records.length || remaining) { setError('Mark every learner before saving attendance.'); return; }
    setIsSaving(true);
    setError('');
    try {
      const saved = await onSave({...savedSession, status: 'COMPLETED', records});
      setSavedSession(saved);
      setRecords(structuredClone(saved.records));
      setIsEditing(false);
      setFilter('all');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Attendance was not saved. Your changes are still here; please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  const handleBack = () => {
    if (isSaving || (hasChanges && !window.confirm('Discard unsaved attendance changes?'))) return;
    onBack();
  };
  const cancelChanges = () => {
    if (isSaving || (hasChanges && !window.confirm('Discard unsaved attendance changes?'))) return;
    if (savedSession.status === 'DRAFT') { onBack(); return; }
    setRecords(structuredClone(savedSession.records));
    setIsEditing(false);
    setError('');
    setFilter('all');
  };

  return <div className="space-y-6">
    <button type="button" onClick={handleBack} disabled={isSaving} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 disabled:opacity-40"><ArrowLeft size={16} /> Attendance history</button>
    <div className="portal-hero rounded-3xl p-6 text-white sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">{categoryLabel}</p><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">{savedSession.status === 'DRAFT' ? 'New session' : 'Completed session'}</span></div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{isEditing ? 'Take attendance' : 'Session overview'}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/90">{subject}</p>
      <p className="mt-5 inline-flex items-center gap-2 text-xs text-white/80"><CalendarDays size={15} /> {session.display_date || session.session_date}</p>
    </div>
    {!canEdit && <p className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600"><Eye size={18} className="mt-0.5 shrink-0 text-blue-600" />This session was recorded by another teacher. You can review its attendance here. Create a new record to take attendance under your account.</p>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[
      {label:'Learners', value:records.length, color:'text-slate-900'},
      {label:'Present', value:records.filter(record => record.status === 'Present').length, color:'text-emerald-700'},
      {label:'Absent', value:records.filter(record => record.status === 'Absent').length, color:'text-red-600'},
      {label:'Excused', value:records.filter(record => record.status === 'Excused').length, color:'text-amber-600'},
    ].map(metric => <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4"><p className="text-xs text-slate-500">{metric.label}</p><p className={`mt-2 text-2xl font-bold ${metric.color}`}>{metric.value}</p></div>)}</div>
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="font-bold text-slate-900">Learner roll call</h2><p className="mt-1 text-xs leading-5 text-slate-500">{isEditing ? 'Choose a status and add a note when needed.' : 'Saved attendance and notes for this session.'}</p></div>{canEdit && (isEditing ? <button type="button" disabled={isSaving || remaining === 0} onClick={() => { setRecords(previous => previous.map(record => ({...record, status:record.status ?? 'Present'}))); setError(''); }} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-700 disabled:opacity-40"><Check size={15} /> Mark unmarked present</button> : <button type="button" onClick={() => setIsEditing(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Pencil size={15} /> Edit attendance</button>)}</div>
      {isEditing && <div className="border-b border-slate-100 bg-blue-50/40 px-5 py-4"><div className="mb-2 flex items-center justify-between gap-2 text-xs"><p className="font-semibold text-blue-800">{marked} of {records.length} learners marked</p><span className="text-slate-500">{remaining ? `${remaining} remaining` : 'Ready to save'}</span></div><div role="progressbar" aria-label="Attendance completion" aria-valuemin={0} aria-valuemax={records.length || 1} aria-valuenow={marked} className="h-1.5 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{width:`${records.length ? marked / records.length * 100 : 0}%`}} /></div></div>}
      <div className="flex flex-wrap gap-3 border-b border-slate-100 px-5 py-4"><label className="relative min-w-0 flex-1"><span className="sr-only">Search learners</span><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or account ID…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" /></label><select aria-label="Filter learner marks" value={filter} onChange={event => setFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600"><option value="all">All learners</option>{isEditing && <option value="unmarked">Not marked</option>}<option value="Present">Present</option><option value="Absent">Absent</option><option value="Excused">Excused</option></select></div>
      {error && <p role="alert" className="m-5 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</p>}
      <AttendanceTable students={students} records={visible} isEditing={isEditing && !isSaving} onChange={(accountId, changes) => { setRecords(previous => previous.map(record => record.account_id === accountId ? {...record, ...changes} : record)); setError(''); }} />
      {isEditing ? <AttendanceFooter onSave={handleSave} onCancel={cancelChanges} isDataEmpty={!records.length || remaining > 0} isUpdate={savedSession.status === 'COMPLETED'} isSaving={isSaving} remaining={remaining} /> : <p className="flex items-center gap-2 border-t border-slate-100 px-5 py-4 text-xs text-slate-500"><CheckCircle2 size={14} className="text-emerald-600" /> Attendance has been saved for this session.</p>}
    </section>
  </div>;
}
