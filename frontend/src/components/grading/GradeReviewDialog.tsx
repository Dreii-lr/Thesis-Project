'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gradeSubmission, type TeacherSubmission } from '@/src/lib/assessments-api';
import type { UserRead } from '@/src/lib/auth-api';
import { verifyGradebookSession } from '@/src/lib/grading-api';
import { formatGrade } from '@/src/lib/grading';
import { manualGradePayload } from '@/src/lib/submission-review';
import { reviewedAnswers } from '@/src/lib/student-results';
import Modal from '@/src/components/ui/Modal';

export default function GradeReviewDialog({ record, user, onClose, onSaved }: {
  record: TeacherSubmission;
  user: UserRead;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { task, submission } = record;
  const [score, setScore] = useState(submission.status === 'GRADED' ? String(submission.final_score) : '');
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const answers = reviewedAnswers(submission);
  const originalScore = submission.status === 'GRADED' ? String(submission.final_score) : '';
  const dirty = score !== originalScore || feedback !== (submission.feedback || '');
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!anchor || anchor.getAttribute('href')?.startsWith('#')) return;
      if (pending.current || !window.confirm('Leave this page and discard the unsaved score changes?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', navigate, true); };
  }, [dirty]);
  const close = () => { if (!pending.current && (!dirty || window.confirm('Discard the unsaved score changes?'))) onClose(); };

  const canGrade = task.teacher_id === user.user_id && !!submission.account_id
    && ['ACTIVITY', 'QUIZ', 'EXAM', 'TEST'].includes(task.assessment_type) && ['SUBMITTED', 'GRADED'].includes(submission.status)
    && Number.isFinite(task.max_score) && task.max_score > 0
    && (task.assessment_type === 'ACTIVITY' || (Number.isFinite(submission.auto_score) && submission.auto_score >= 0 && submission.auto_score <= task.max_score));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!canGrade || pending.current) return;
    setError('');
    pending.current = true;
    setSaving(true);
    try {
      const payload = manualGradePayload(task, submission, score, feedback);
      await verifyGradebookSession(user, 'teacher');
      const saved = await gradeSubmission(task.assessment_id, submission.submission_id, payload);
      await verifyGradebookSession(user, 'teacher');
      if (saved.assessment_id !== task.assessment_id || saved.submission_id !== submission.submission_id || saved.status !== 'GRADED'
        || !Number.isFinite(saved.final_score) || Math.abs(saved.final_score - Number(score)) > 0.000001) {
        throw new Error('The saved score could not be confirmed. Close this window and refresh the gradebook before trying again.');
      }
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save this grade.'); }
    finally { pending.current = false; setSaving(false); }
  }

  return <Modal title="Review assessment score" onClose={close} pending={saving}>
    <div className="mb-5 rounded-xl bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-800">{submission.student_name || submission.account_id || 'Unmatched learner'}</p>
      <p className="mt-1 text-xs text-slate-500">{submission.account_id || 'Account ID unavailable'} · {task.title}</p>
      <p className="mt-2 text-xs text-slate-500">{task.assessment_type} · {submission.status === 'GRADED' ? 'Graded' : submission.status === 'IN_PROGRESS' ? 'In progress' : 'Awaiting review'}</p>
    </div>
    {answers.length > 0 && <details className="mb-5 rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-xs font-semibold text-slate-700">Submitted answers ({answers.length})</summary>
      <div className="mt-3 max-h-60 space-y-3 overflow-y-auto">{answers.map((answer, index) => <div key={`${answer.id}:${index}`} className="rounded-lg bg-slate-50 p-3 text-xs leading-5">
        <p className="font-medium text-slate-700">{index + 1}. {answer.question}</p><p className="mt-1 whitespace-pre-wrap break-words text-slate-500">{answer.answer || 'No answer provided'}</p>
        {answer.correct !== null && <p className="mt-1 text-slate-500">{answer.correct ? 'Correct' : 'Incorrect'}{answer.points !== null ? ` · ${formatGrade(answer.points)} points` : ''}</p>}
      </div>)}</div></details>}
    <form onSubmit={save} className="space-y-4">
      <label className="block text-xs font-semibold text-slate-600">Overall assessment score (out of {formatGrade(task.max_score)})
        <input type="number" required min={task.assessment_type === 'ACTIVITY' ? 0 : submission.auto_score} max={task.max_score} step="any" value={score} onChange={event => setScore(event.target.value)} disabled={saving || !canGrade}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 disabled:bg-slate-50" />
      </label>
      {task.assessment_type !== 'ACTIVITY' && <p className="text-xs leading-5 text-slate-500">Includes {formatGrade(submission.auto_score)} automatic points. Only the remaining points are saved as the manual score.</p>}
      <label className="block text-xs font-semibold text-slate-600">Teacher feedback<textarea rows={3} value={feedback} onChange={event => setFeedback(event.target.value)} disabled={saving || !canGrade}
        className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 disabled:bg-slate-50" /></label>
      {!canGrade && <p className="text-xs leading-5 text-amber-800">This submission cannot be graded here. It needs a learner account ID, a supported assessment type, submitted work, and valid maximum and automatic points.</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-700">{error}</p>}
      <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Saving an assessment score makes it available through the existing student results system. Final-grade publication is a separate feature and is currently unavailable.</p>
      <div className="flex items-center justify-between gap-3"><Link href="/teacher/submissions" className="text-xs font-medium text-blue-700">Open submissions</Link>
        <button type="submit" disabled={saving || !canGrade} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save assessment score'}</button></div>
    </form>
    <p className="mt-4 break-all text-[10px] leading-5 text-slate-400">Assessment ID: {task.assessment_id}</p>
  </Modal>;
}
