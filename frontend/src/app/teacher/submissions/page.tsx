'use client';

import { useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { CATEGORY_LABELS, gradeSubmission, type TeacherSubmission } from '@/src/lib/assessments-api';
import { subjectName } from '@/src/lib/subjects-api';
import { loadSubmissionReview, manualGradePayload } from '@/src/lib/submission-review';
import { reviewedAnswers, resultTimeLabel } from '@/src/lib/student-results';
import { useApiData } from '@/src/lib/use-api-data';
import ApiState from '@/src/components/ui/ApiState';

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100';
const learnerName = (row: TeacherSubmission) => row.submission.student_name || row.submission.account_id || 'Learner';
const submittedAt = (value?: string | null) => value ? new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'Not recorded';

export default function SubmissionsPage() {
  const source = useApiData(loadSubmissionReview);
  const [search, setSearch] = useState('');
  const [program, setProgram] = useState('all');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<TeacherSubmission | null>(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const rows = source.error || source.loading ? [] : source.data?.records || [];
  const filtered = rows.filter(row => (program === 'all' || row.task.target_category === program) && (type === 'all' || row.task.assessment_type === type) &&
    (status === 'all' || row.submission.status === status) && `${learnerName(row)} ${row.task.title} ${row.submission.account_id || ''}`.toLowerCase().includes(search.toLowerCase()));

  const review = (row: TeacherSubmission) => {
    setSelected(row); setScore(String(row.submission.final_score)); setFeedback(row.submission.feedback || ''); setError(''); setMessage('');
  };
  const save = async () => {
    if (!selected || pending.current) return;
    setError('');
    try {
      const payload = manualGradePayload(selected.task, selected.submission, score, feedback);
      pending.current = true; setSaving(true);
      await gradeSubmission(selected.task.assessment_id, selected.submission.submission_id, payload);
      setSelected(null); setMessage('Grade and feedback saved.'); source.reload();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save the grade.'); }
    finally { pending.current = false; setSaving(false); }
  };

  return <div className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight text-slate-900">Student submissions</h1><p className="mt-2 text-sm leading-6 text-slate-500">Review learner answers and save grades to the assessment record.</p></div><button type="button" disabled={saving || source.loading} onClick={() => { setSelected(null); source.reload(); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 disabled:opacity-50"><RefreshCw size={14} />Refresh</button></div>
    <ApiState loading={source.loading} error={source.error} onRetry={source.reload} />
    {message && <p role="status" className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">{message}</p>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-3">{[['Total submitted', rows.length], ['Needs review', rows.filter(row => row.submission.status === 'SUBMITTED').length], ['Graded', rows.filter(row => row.submission.status === 'GRADED').length]].map(([label, value]) => <section key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{source.loading || source.error ? '—' : value}</p></section>)}</div>
    {selected ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{selected.task.assessment_type}</span><h2 className="mt-3 text-xl font-bold">{learnerName(selected)}</h2><p className="mt-2 text-xs text-slate-500">{selected.submission.account_id || 'Account ID unavailable'} · {selected.task.title}</p><p className="mt-2 text-xs text-slate-400">{submittedAt(selected.submission.submitted_at)} · {resultTimeLabel(selected.submission.time_spent_seconds)}</p></div><button type="button" disabled={saving} onClick={() => { setSelected(null); setError(''); }} className="text-xs font-semibold text-blue-600 disabled:opacity-50">Back to submissions</button></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]"><div><h3 className="mb-3 text-sm font-bold">Submitted answers</h3>{reviewedAnswers(selected.submission).map((answer, index) => <article key={answer.id} className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-semibold text-slate-400">Item {index + 1}{answer.essay ? ' · Essay / teacher review' : ''}</p><h4 className="mt-2 text-sm font-semibold leading-6 text-slate-700">{answer.question}</h4><p className="mt-3 whitespace-pre-line break-words rounded-lg bg-white p-3 text-sm leading-6 text-slate-600">{answer.answer || 'No answer provided'}</p>{answer.correct !== null && <p className={`mt-2 text-xs ${answer.correct ? 'text-emerald-700' : 'text-rose-600'}`}>{answer.correct ? 'Correct' : 'Incorrect'}{answer.points !== null ? ` · ${answer.points} points` : ''}</p>}</article>)}{!reviewedAnswers(selected.submission).length && <p className="text-sm text-slate-400">No text answers are available for this submission.</p>}{!!selected.submission.attachments_payload?.length && <div className="mt-4"><h4 className="text-xs font-semibold text-slate-600">Submitted attachments</h4>{selected.submission.attachments_payload.map((attachment, index) => <p key={index} className="mt-2 break-words text-xs text-slate-500">{String(attachment.file_name || attachment.name || `Attachment ${index + 1}`)}</p>)}</div>}</div>
      <form onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-4"><label className="block text-xs font-semibold text-slate-600">Final score (out of {selected.task.max_score})<input type="number" required step="any" min={selected.task.assessment_type === 'ACTIVITY' ? 0 : selected.submission.auto_score} max={selected.task.max_score} value={score} disabled={saving} onChange={event => setScore(event.target.value)} className={`${fieldClass} mt-2`} /></label>{selected.task.assessment_type !== 'ACTIVITY' && <p className="text-xs leading-6 text-slate-400">Includes {selected.submission.auto_score} automatically awarded points. Only the remaining manual points are added.</p>}<label className="block text-xs font-semibold text-slate-600">Feedback<textarea rows={5} value={feedback} disabled={saving} onChange={event => setFeedback(event.target.value)} className={`${fieldClass} mt-2`} /></label><button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save grade & feedback'}</button></form></div>
    </section> : !source.loading && !source.error && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><input aria-label="Search submissions" placeholder="Search learner or assessment" value={search} onChange={event => setSearch(event.target.value)} className={fieldClass} /><select aria-label="Program" value={program} onChange={event => setProgram(event.target.value)} className={fieldClass}><option value="all">All programs</option>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Type" value={type} onChange={event => setType(event.target.value)} className={fieldClass}><option value="all">All types</option>{['ACTIVITY', 'QUIZ', 'EXAM'].map(value => <option key={value}>{value}</option>)}</select><select aria-label="Review status" value={status} onChange={event => setStatus(event.target.value)} className={fieldClass}><option value="all">All statuses</option><option value="SUBMITTED">Needs review</option><option value="GRADED">Graded</option></select></div><div className="space-y-3">{filtered.map(row => <button key={row.submission.submission_id} type="button" onClick={() => review(row)} className="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-5 text-left hover:border-blue-300 hover:bg-blue-50/30"><div><p className="text-sm font-bold text-slate-800">{learnerName(row)}</p><p className="mt-1 text-xs text-slate-500">{row.submission.account_id || 'Account ID unavailable'} · {row.task.title}</p><p className="mt-2 text-[11px] text-slate-400">{subjectName(source.data?.subjects || [], row.task.subject_code, row.task.target_category)} · {submittedAt(row.submission.submitted_at)}</p></div><div className="flex items-center gap-3"><span className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">{row.task.assessment_type}</span><span className="text-xs text-slate-500">{row.submission.status === 'GRADED' ? `${row.submission.final_score}/${row.task.max_score} · Graded` : 'Needs review'}</span><span className="text-xs font-semibold text-blue-600">Review →</span></div></button>)}{!filtered.length && <p className="py-10 text-center text-sm text-slate-400">No submissions match these filters.</p>}</div></section>}
  </div>;
}
