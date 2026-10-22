'use client';

import StudentPageHeader, { studentHeaderActionClass } from '@/src/components/layout/student/StudentPageHeader';
import StudentStatCards from '@/src/components/layout/student/StudentStatCards';
import { Award, CheckCheck, Clock3 } from 'lucide-react';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { useAuth } from '@/src/context/AuthContext';
import { useStudentSubjects } from '@/src/context/StudentSubjectsContext';
import { useApiData } from '@/src/lib/use-api-data';
import { subjectTasks } from '@/src/lib/student-subjects';
import { loadStudentResults, resultDateLabel, resultNumber, resultScore, resultStatus, resultsSummary, type StudentResult } from '@/src/lib/student-results';
import type { TaskType } from '@/src/lib/assessments-api';
import ApiState from '@/src/components/ui/ApiState';
import StudentResultDetails from '@/src/components/learners/StudentResultDetails';

const typeNames: Record<string, string> = { ACTIVITY: 'Activity', QUIZ: 'Quiz', EXAM: 'Exam' };
const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50';

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

  return <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <StudentPageHeader eyebrow={program?.name || 'Student Portal'} title="My Results" description="Your submitted work, scores, and teacher feedback in one place." actions={<button type="button" onClick={results.reload} disabled={results.loading} className={studentHeaderActionClass}>Refresh results</button>}>
      <StudentStatCards label="Results overview" items={[
        { label: 'Graded assessments', value: ready ? summary.graded : '—', description: 'Results with finalized scores', icon: CheckCheck, loading: results.loading },
        { label: 'Awaiting review', value: ready ? summary.pending : '—', description: 'Submitted and waiting for grading', icon: Clock3, loading: results.loading },
        { label: 'Graded points', value: ready && summary.possible > 0 ? `${resultNumber(summary.earned)} / ${resultNumber(summary.possible)}` : '—', description: ready && !summary.graded ? 'No final scores yet' : 'Points from available final results', icon: Award, loading: results.loading },
      ]} />
    </StudentPageHeader>

    <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
      <div className="space-y-4 border-b border-slate-100 p-6 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-sm font-semibold tracking-tight text-slate-800">Assessment records</h2><p className="mt-1 text-xs leading-5 text-slate-500">Select a result to see your score breakdown and feedback.</p></div>{ready && <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>}</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_1fr_1fr]">
          <div className="relative md:col-span-2 xl:col-span-1"><label className="block min-w-0"><span className="mb-2 block text-xs font-medium text-slate-600">Search results</span><input aria-label="Search results" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search assessments or subjects" className={`${fieldClass} pl-3`} /></label></div>
          <label className="block min-w-0"><span className="mb-2 block text-xs font-medium text-slate-600">Subject</span><select aria-label="Filter by subject" value={subject} onChange={event => setSubject(event.target.value)} className={fieldClass}><option value="ALL">All subjects</option>{subjectOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label className="block min-w-0"><span className="mb-2 block text-xs font-medium text-slate-600">Grading status</span><select aria-label="Filter by grading status" value={status} onChange={event => setStatus(event.target.value)} className={fieldClass}><option value="ALL">All grading statuses</option><option value="GRADED">Graded</option><option value="SUBMITTED">Awaiting review</option></select></label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-1 rounded-xl bg-slate-50 p-1" aria-label="Filter by assessment type">{(['ALL', 'ACTIVITY', 'QUIZ', 'EXAM'] as const).map(value => <button key={value} type="button" aria-pressed={type === value} onClick={() => setType(value)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${type === value ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/60' : 'text-slate-500 hover:text-slate-700'}`}>{value === 'ALL' ? 'All types' : value === 'ACTIVITY' ? 'Activities' : value === 'QUIZ' ? 'Quizzes' : 'Exams'}</button>)}</div>{hasFilters && <button type="button" onClick={clearFilters} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Clear filters</button>}</div>
      </div>
      <ApiState loading={results.loading} error={results.error} onRetry={results.reload} />
      {ready && unavailable > 0 && <div role="status" className="mx-5 mt-6 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Some result details could not be loaded. Available scores are still shown. <button type="button" onClick={results.reload} className="font-semibold underline">Retry</button></div>}
      {ready && filtered.length > 0 && <>
        <div className="hidden overflow-x-auto xl:block"><table className="w-full text-left"><thead className="bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-6 py-4">Assessment</th><th scope="col" className="px-3 py-4">Type</th><th scope="col" className="px-3 py-4">Submitted</th><th scope="col" className="px-3 py-4">Score</th><th scope="col" className="px-3 py-4">Status</th><th scope="col" className="px-4 py-4"><span className="sr-only">View result</span></th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(({ record, subjectName }) => <tr key={record.task.assessment_id} className="transition-colors hover:bg-blue-50/30"><td className="max-w-xs px-6 py-6"><ResultTitle record={record} subjectName={subjectName} /></td><td className="px-3 py-6 text-xs text-slate-500">{typeNames[record.task.assessment_type]}</td><td className="whitespace-nowrap px-3 py-6 text-xs text-slate-500">{resultDateLabel(record.submission?.submitted_at)}</td><td className="px-3 py-6"><Score record={record} /></td><td className="px-3 py-6"><Status record={record} /></td><td className="px-4 py-6"><button type="button" onClick={() => setSelectedId(record.task.assessment_id)} aria-label={`View result for ${record.task.title}`} className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 px-3 text-xs font-medium text-blue-700 hover:border-blue-200 hover:bg-blue-50">View result</button></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-slate-100 xl:hidden">{filtered.map(({ record, subjectName }) => <article key={record.task.assessment_id} className="space-y-4 p-6"><div className="flex items-start justify-between gap-3"><ResultTitle record={record} subjectName={subjectName} /><span className="rounded-xl bg-slate-50 px-2 py-1 text-xs text-slate-500">{typeNames[record.task.assessment_type]}</span></div><div className="flex flex-wrap items-center justify-between gap-3"><Score record={record} /><Status record={record} /></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3"><p className="text-xs text-slate-500">Submitted {resultDateLabel(record.submission?.submitted_at)}</p><button type="button" onClick={() => setSelectedId(record.task.assessment_id)} aria-label={`View result for ${record.task.title}`} className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">View result</button></div></article>)}</div>
      </>}
      {ready && !filtered.length && <div className="px-6 py-12 text-center"><h3 className="mt-4 text-sm font-semibold text-slate-800">{records.length ? 'No matching results' : 'Your results will appear here'}</h3><p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500">{records.length ? 'Try another subject, assessment type, or grading status.' : 'After you submit an activity, quiz, or exam, you can check its grading status and teacher feedback here.'}</p>{records.length ? <button type="button" onClick={clearFilters} className="mt-6 text-xs font-semibold text-blue-600">Clear filters</button> : <Link href="/student/subjects" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white hover:bg-blue-700">Go to My Subjects</Link>}</div>}
    </section>
    <p className="px-1 text-xs leading-5 text-slate-500">Showing results currently available from your assigned assessments. Graded points are a summary of these records, not an official subject grade.</p>
    {selected && <StudentResultDetails record={selected.record} subjectName={selected.subjectName} onClose={() => setSelectedId(null)} onRetry={() => { setSelectedId(null); results.reload(); }} />}
  </div>;
}

function ResultTitle({ record, subjectName }: { record: StudentResult; subjectName: string }) {
  return <div className="flex min-w-0 items-start gap-3"><div className="min-w-0"><h3 className="break-words text-xs font-semibold leading-5 text-slate-700">{record.task.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{subjectName}</p>{record.submission?.feedback?.trim() && <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600">Teacher feedback</p>}</div></div>;
}

function Score({ record }: { record: StudentResult }) {
  const score = resultScore(record);
  if (score === null) return <span className="text-xs text-slate-500">{resultStatus(record) === 'GRADED' ? 'Unavailable' : 'Pending review'}</span>;
  return <div><p className="whitespace-nowrap text-sm font-semibold text-slate-800">{resultNumber(score)}<span className="ml-1 text-xs font-medium text-slate-500">/ {resultNumber(record.task.max_score)}</span></p>{record.task.max_score > 0 && <p className="mt-1 text-xs font-semibold text-blue-600">{resultNumber(score / record.task.max_score * 100)}%</p>}</div>;
}

function Status({ record }: { record: StudentResult }) {
  const graded = resultStatus(record) === 'GRADED';
  return <span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${graded ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{graded ? 'Graded' : 'Awaiting review'}</span>;
}
