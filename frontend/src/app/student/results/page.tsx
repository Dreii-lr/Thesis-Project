'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, BookOpen, CheckCircle2, ClipboardList, Clock3, GraduationCap, MessageSquareText, RefreshCw, Search, Trophy } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useStudentSubjects } from '@/src/context/StudentSubjectsContext';
import { useApiData } from '@/src/lib/use-api-data';
import { subjectTasks } from '@/src/lib/student-subjects';
import { loadStudentResults, resultDateLabel, resultNumber, resultScore, resultStatus, resultsSummary, type StudentResult } from '@/src/lib/student-results';
import type { TaskType } from '@/src/lib/assessments-api';
import ApiState from '@/src/components/ui/ApiState';
import StudentResultDetails from '@/src/components/learners/StudentResultDetails';

const typeNames: Record<TaskType, string> = { ACTIVITY: 'Activity', QUIZ: 'Quiz', EXAM: 'Exam' };
const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50';

export default function StudentResultsPage() {
  const { user } = useAuth();
  const { subjects, program } = useStudentSubjects();
  const load = useCallback(() => loadStudentResults(user), [user]);
  const results = useApiData(load);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'ALL' | TaskType>('ALL');
  const [subject, setSubject] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const records = results.data || [];
  const summary = resultsSummary(records);
  const ready = !results.loading && !results.error;
  const rows = records.map(record => {
    const match = subjects.find(item => subjectTasks([record.task], item).length);
    return { record, subjectId: match?.subject_id || record.task.subject_code, subjectName: match?.name || record.task.subject_code };
  });
  const subjectOptions = Array.from(new Map(rows.map(row => [row.subjectId, row.subjectName])).entries()).sort((a, b) => a[1].localeCompare(b[1]));
  const filtered = rows.filter(row => (type === 'ALL' || row.record.task.assessment_type === type) &&
    (subject === 'ALL' || row.subjectId === subject) &&
    (status === 'ALL' || resultStatus(row.record) === status) &&
    `${row.record.task.title} ${row.subjectName}`.toLowerCase().includes(search.trim().toLowerCase()));
  const selected = rows.find(row => row.record.task.assessment_id === selectedId);
  const unavailable = records.filter(record => record.error).length;
  const hasFilters = !!search.trim() || type !== 'ALL' || subject !== 'ALL' || status !== 'ALL';
  const clearFilters = () => { setSearch(''); setType('ALL'); setSubject('ALL'); setStatus('ALL'); };

  useEffect(() => {
    if (selectedId) return;
    window.addEventListener('focus', results.reload);
    return () => window.removeEventListener('focus', results.reload);
  }, [selectedId, results.reload]);

  return <div className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 p-6 text-white shadow-lg shadow-blue-900/10">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-28 -z-10 h-80 w-80 rounded-full border-[40px] border-white/5" />
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><p className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-wide text-blue-200"><BadgeCheck size={13} />{program?.name || 'Student Portal'}</p><h1 className="mt-3 text-3xl font-bold tracking-tight">My Results</h1><p className="mt-2 max-w-xl text-xs leading-6 text-blue-100/80">Your submitted work, scores, and teacher feedback in one place.</p></div>
        <button type="button" onClick={results.reload} disabled={results.loading} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-[11px] font-semibold text-white hover:bg-white/20 disabled:opacity-50"><RefreshCw size={13} className={results.loading ? 'animate-spin' : ''} />Refresh results</button>
      </div>
    </section>

    <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
      {[
        { title: 'Graded assessments', value: summary.graded, note: 'Results with finalized scores', Icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
        { title: 'Awaiting review', value: summary.pending, note: 'Submitted and waiting for grading', Icon: Clock3, color: 'bg-amber-50 text-amber-600' },
        { title: 'Graded points', value: summary.possible > 0 ? `${resultNumber(summary.earned)} / ${resultNumber(summary.possible)}` : '—', note: ready && !summary.graded ? 'No final scores yet' : 'Points from available final results', Icon: Trophy, color: 'bg-blue-50 text-blue-600' },
      ].map(({ title, value, note, Icon, color }) => <div key={title} className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={18} /></span><div className="min-w-0"><p className="text-[11px] font-medium text-slate-500">{title}</p><p className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-800">{ready ? value : '—'}</p><p className="mt-1 text-[10px] leading-5 text-slate-400">{note}</p></div></div>)}
    </div>

    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-4 border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-base font-bold tracking-tight text-slate-800">Assessment records</h2><p className="mt-1 text-[11px] leading-5 text-slate-400">Select a result to see your score breakdown and feedback.</p></div>{ready && <span className="rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-semibold text-slate-500">{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>}</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_1fr_1fr]">
          <div className="relative md:col-span-2 xl:col-span-1"><Search size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><input aria-label="Search results" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search assessments or subjects" className={`${fieldClass} pl-9`} /></div>
          <select aria-label="Filter by subject" value={subject} onChange={event => setSubject(event.target.value)} className={fieldClass}><option value="ALL">All subjects</option>{subjectOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
          <select aria-label="Filter by grading status" value={status} onChange={event => setStatus(event.target.value)} className={fieldClass}><option value="ALL">All grading statuses</option><option value="GRADED">Graded</option><option value="SUBMITTED">Awaiting review</option></select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-1 rounded-xl bg-slate-50 p-1" aria-label="Filter by assessment type">{(['ALL', 'ACTIVITY', 'QUIZ', 'EXAM'] as const).map(value => <button key={value} type="button" aria-pressed={type === value} onClick={() => setType(value)} className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors ${type === value ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/60' : 'text-slate-400 hover:text-slate-700'}`}>{value === 'ALL' ? 'All types' : value === 'ACTIVITY' ? 'Activities' : value === 'QUIZ' ? 'Quizzes' : 'Exams'}</button>)}</div>{hasFilters && <button type="button" onClick={clearFilters} className="text-[11px] font-semibold text-blue-600 hover:text-blue-800">Clear filters</button>}</div>
      </div>
      <ApiState loading={results.loading} error={results.error} onRetry={results.reload} />
      {ready && unavailable > 0 && <div role="status" className="mx-5 mt-5 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Some result details could not be loaded. Available scores are still shown. <button type="button" onClick={results.reload} className="font-semibold underline">Retry</button></div>}
      {ready && filtered.length > 0 && <>
        <div className="hidden overflow-x-auto xl:block"><table className="w-full text-left"><thead className="bg-slate-50/60 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><tr><th scope="col" className="px-6 py-4">Assessment</th><th scope="col" className="px-3 py-4">Type</th><th scope="col" className="px-3 py-4">Submitted</th><th scope="col" className="px-3 py-4">Score</th><th scope="col" className="px-3 py-4">Status</th><th scope="col" className="px-4 py-4"><span className="sr-only">View result</span></th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(({ record, subjectName }) => <tr key={record.task.assessment_id} className="transition-colors hover:bg-blue-50/30"><td className="max-w-xs px-6 py-5"><ResultTitle record={record} subjectName={subjectName} /></td><td className="px-3 py-5 text-[11px] text-slate-500">{typeNames[record.task.assessment_type]}</td><td className="whitespace-nowrap px-3 py-5 text-[11px] text-slate-500">{resultDateLabel(record.submission?.submitted_at)}</td><td className="px-3 py-5"><Score record={record} /></td><td className="px-3 py-5"><Status record={record} /></td><td className="px-4 py-5"><button type="button" onClick={() => setSelectedId(record.task.assessment_id)} aria-label={`View result for ${record.task.title}`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-blue-600 hover:border-blue-200 hover:bg-blue-50"><ArrowRight size={15} /></button></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-slate-100 xl:hidden">{filtered.map(({ record, subjectName }) => <article key={record.task.assessment_id} className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><ResultTitle record={record} subjectName={subjectName} /><span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] text-slate-500">{typeNames[record.task.assessment_type]}</span></div><div className="flex flex-wrap items-center justify-between gap-3"><Score record={record} /><Status record={record} /></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3"><p className="text-[10px] text-slate-400">Submitted {resultDateLabel(record.submission?.submitted_at)}</p><button type="button" onClick={() => setSelectedId(record.task.assessment_id)} aria-label={`View result for ${record.task.title}`} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-700">View result<ArrowRight size={12} /></button></div></article>)}</div>
      </>}
      {ready && !filtered.length && <div className="px-6 py-12 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><BookOpen size={25} /></span><h3 className="mt-4 text-base font-bold text-slate-800">{records.length ? 'No matching results' : 'Your results will appear here'}</h3><p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500">{records.length ? 'Try another subject, assessment type, or grading status.' : 'After you submit an activity, quiz, or exam, you can check its grading status and teacher feedback here.'}</p>{records.length ? <button type="button" onClick={clearFilters} className="mt-5 text-xs font-semibold text-blue-600">Clear filters</button> : <Link href="/student/subjects" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white hover:bg-blue-700">Go to My Subjects<ArrowRight size={13} /></Link>}</div>}
    </section>
    <p className="px-1 text-[10px] leading-5 text-slate-400">Showing results currently available from your assigned assessments. Graded points are a summary of these records, not an official subject grade.</p>
    {selected && <StudentResultDetails record={selected.record} subjectName={selected.subjectName} onClose={() => setSelectedId(null)} onRetry={() => { setSelectedId(null); results.reload(); }} />}
  </div>;
}

function ResultTitle({ record, subjectName }: { record: StudentResult; subjectName: string }) {
  const Icon = record.task.assessment_type === 'ACTIVITY' ? ClipboardList : record.task.assessment_type === 'EXAM' ? GraduationCap : BadgeCheck;
  return <div className="flex min-w-0 items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon size={16} /></span><div className="min-w-0"><h3 className="break-words text-xs font-semibold leading-5 text-slate-700">{record.task.title}</h3><p className="mt-1 text-[10px] leading-5 text-slate-400">{subjectName}</p>{record.submission?.feedback?.trim() && <p className="mt-1 inline-flex items-center gap-1 text-[9px] font-medium text-blue-600"><MessageSquareText size={10} />Teacher feedback</p>}</div></div>;
}

function Score({ record }: { record: StudentResult }) {
  const score = resultScore(record);
  if (score === null) return <span className="text-[11px] text-slate-400">{resultStatus(record) === 'GRADED' ? 'Unavailable' : 'Pending review'}</span>;
  return <div><p className="whitespace-nowrap text-sm font-bold text-slate-800">{resultNumber(score)}<span className="ml-1 text-[11px] font-medium text-slate-400">/ {resultNumber(record.task.max_score)}</span></p>{record.task.max_score > 0 && <p className="mt-1 text-[10px] font-semibold text-blue-600">{resultNumber(score / record.task.max_score * 100)}%</p>}</div>;
}

function Status({ record }: { record: StudentResult }) {
  const graded = resultStatus(record) === 'GRADED';
  const Icon = graded ? CheckCircle2 : Clock3;
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[9px] font-semibold ${graded ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}><Icon size={11} />{graded ? 'Graded' : 'Awaiting review'}</span>;
}
