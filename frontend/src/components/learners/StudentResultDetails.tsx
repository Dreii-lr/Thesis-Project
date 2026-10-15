'use client';

import { BadgeCheck, CalendarDays, Clock3, MessageSquareText } from 'lucide-react';
import Modal from '@/src/components/ui/Modal';
import { resultDateLabel, resultNumber, resultScore, resultStatus, resultTimeLabel, reviewedAnswers, type StudentResult } from '@/src/lib/student-results';

export default function StudentResultDetails({ record, subjectName, onClose, onRetry }: {
  record: StudentResult;
  subjectName: string;
  onClose: () => void;
  onRetry: () => void;
}) {
  const { task, submission } = record;
  const graded = resultStatus(record) === 'GRADED';
  const score = resultScore(record);
  const answers = submission ? reviewedAnswers(submission) : [];

  return <Modal title="Assessment result" onClose={onClose}>
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 p-5 text-white">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">{task.assessment_type} · {subjectName}</p>
      <h3 className="mt-2 text-lg font-bold leading-7">{task.title}</h3>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-white/10 pt-4">
        <div><p className="text-[10px] text-blue-200">{graded ? 'Final score' : 'Final score pending'}</p><p className="mt-1 text-3xl font-bold tracking-tight">{score === null ? graded ? 'Unavailable' : 'Awaiting review' : <>{resultNumber(score)}<span className="ml-1 text-lg font-medium text-blue-200">/ {resultNumber(task.max_score)}</span></>}</p></div>
        {score !== null && task.max_score > 0 && <span className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold">{resultNumber(score / task.max_score * 100)}%</span>}
      </div>
    </div>
    {record.error && <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">{record.error}<button type="button" onClick={onRetry} className="mt-2 block font-semibold underline">Reload results</button></div>}
    {submission && <>
      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"><dt className="flex items-center gap-1.5 text-[10px] text-slate-400"><CalendarDays size={12} />Submitted</dt><dd className="mt-2 text-xs font-semibold text-slate-700">{resultDateLabel(submission.submitted_at)}</dd></div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"><dt className="flex items-center gap-1.5 text-[10px] text-slate-400"><Clock3 size={12} />Time spent</dt><dd className="mt-2 text-xs font-semibold text-slate-700">{resultTimeLabel(submission.time_spent_seconds)}</dd></div>
      </dl>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold">
        <span className={`rounded-full px-2.5 py-1.5 ${graded ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{graded ? 'Graded' : 'Awaiting review'}</span>
        {submission.is_late && <span className="rounded-full bg-amber-50 px-2.5 py-1.5 text-amber-800">Late submission</span>}
      </div>
      {!graded && <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-4 text-xs leading-6 text-amber-800">Your teacher has not finalized this result.{task.assessment_type !== 'ACTIVITY' && Number.isFinite(submission.auto_score) ? ` Automatically scored points so far: ${resultNumber(submission.auto_score)}. Your final score may change after review.` : ' Your score will appear after grading.'}</p>}
      {graded && <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-slate-100 px-4 py-3 text-[11px] text-slate-500"><div><dt className="inline">Automatic score: </dt><dd className="inline font-semibold text-slate-700">{resultNumber(submission.auto_score)}</dd></div><div><dt className="inline">Teacher-entered score: </dt><dd className="inline font-semibold text-slate-700">{resultNumber(submission.manual_score)}</dd></div></dl>}
      <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
        <h4 className="flex items-center gap-2 text-xs font-bold text-slate-700"><MessageSquareText size={15} className="text-blue-600" />Teacher feedback</h4>
        <p className="mt-3 whitespace-pre-line break-words text-xs leading-6 text-slate-600">{submission.feedback?.trim() || 'No teacher feedback has been added yet.'}</p>
      </section>
      <section className="mt-6">
        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800"><BadgeCheck size={16} className="text-blue-600" />Answer review</h4>
        {answers.length ? <>
          <p className="mt-2 text-[11px] leading-5 text-slate-400">Question points reflect automatic marking. Teacher scores are recorded in the result above.</p>
          <div className="mt-4 space-y-3">{answers.map((answer, index) => <article key={`${answer.id}-${index}`} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Question {index + 1}</span><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${answer.essay ? graded ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700' : answer.correct === true ? 'bg-emerald-50 text-emerald-700' : answer.correct === false ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>{answer.essay ? graded ? 'Included in final result' : 'Awaiting teacher review' : answer.correct === true ? 'Correct' : answer.correct === false ? 'Incorrect' : 'Not marked'}</span></div>
            <p className="mt-3 whitespace-pre-line break-words text-xs font-semibold leading-6 text-slate-700">{answer.question}</p>
            <p className="mt-2 whitespace-pre-line break-words rounded-lg bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-500"><span className="font-medium text-slate-600">Your answer: </span>{answer.answer.trim() || 'No answer submitted'}</p>
            {answer.points !== null && answer.maxPoints !== null && <p className="mt-2 text-right text-[10px] font-semibold text-slate-400">{resultNumber(answer.points)} / {resultNumber(answer.maxPoints)} points</p>}
          </article>)}</div>
        </> : <p className="mt-3 rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-500">{task.assessment_type === 'ACTIVITY' ? 'This activity is evaluated through its score and teacher feedback.' : 'A question breakdown is not available for this submission.'}</p>}
      </section>
    </>}
    <button type="button" onClick={onClose} className="mt-6 w-full rounded-xl border border-slate-200 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">Close result</button>
  </Modal>;
}
