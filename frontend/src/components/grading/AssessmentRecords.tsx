import { Eye } from 'lucide-react';
import { assessmentComponent, formatGrade, GRADE_COMPONENTS, type ComponentAssignments } from '@/src/lib/grading';
import { GRADEBOOK_STATUSES, type GradebookEntry } from '@/src/lib/gradebook-view';
import type { TeacherSubmission } from '@/src/lib/assessments-api';

export function SubmissionStatus({ status }: { status: string }) {
  const label = GRADEBOOK_STATUSES.find(([key]) => key === status)?.[1] || status;
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${status === 'GRADED' ? 'bg-blue-50 text-blue-700' : status === 'SUBMITTED' ? 'bg-amber-50 text-amber-800' : status === 'UNAVAILABLE' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>{label}</span>;
}

export default function AssessmentRecords({ entries, assignments, onReview }: {
  entries: GradebookEntry[]; assignments: ComponentAssignments; onReview: (record: TeacherSubmission) => void;
}) {
  return <><ul aria-label="Assessment records" className="divide-y divide-slate-100 md:hidden">{entries.map(({ key, task, submission, group, unavailable }) => {
    const status = unavailable ? 'UNAVAILABLE' : submission?.status || 'NO_SUBMISSION';
    const canReview = !!submission && ['SUBMITTED', 'GRADED'].includes(submission.status);
    return <li key={key} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-800">{group.name}</p><p className="mt-1 text-xs text-slate-400">{group.accountId || 'Account ID unavailable'}</p></div><button type="button" disabled={!canReview} title={canReview ? 'Review score' : unavailable ? 'Refresh to load this record' : 'A submitted record is needed before grading'} onClick={() => { if (submission) onReview({ task, submission }); }} aria-label={`Review ${task.title} for ${group.name}`} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:border-transparent disabled:text-slate-300"><Eye size={17} /></button></div><div className="rounded-xl bg-slate-50 p-3"><p className="break-words text-xs font-medium text-slate-700">{task.title}</p><p className="mt-1 text-[11px] text-slate-500">{task.assessment_type} · {GRADE_COMPONENTS.find(item => item.key === assessmentComponent(task, assignments))?.shortLabel || 'Unassigned component'}</p></div><div className="flex flex-wrap items-center justify-between gap-3"><SubmissionStatus status={status} /><p className="text-sm font-semibold tabular-nums text-slate-700">{submission?.status === 'GRADED' && Number.isFinite(submission.final_score) ? formatGrade(submission.final_score) : '—'}<span className="font-normal text-slate-400"> / {formatGrade(task.max_score)}</span></p></div></li>;
  })}</ul><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[740px] text-left"><thead className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wide text-slate-500"><tr>
    <th scope="col" className="px-5 py-4">Learner</th><th scope="col" className="px-4 py-4">Assessment</th><th scope="col" className="px-4 py-4">Score</th><th scope="col" className="px-4 py-4">Status</th><th scope="col" className="px-4 py-4"><span className="sr-only">Review score</span></th>
  </tr></thead><tbody className="divide-y divide-slate-100">{entries.map(({ key, task, submission, group, unavailable }) => {
    const status = unavailable ? 'UNAVAILABLE' : submission?.status || 'NO_SUBMISSION';
    const canReview = !!submission && ['SUBMITTED', 'GRADED'].includes(submission.status);
    return <tr key={key} className="hover:bg-slate-50/70">
      <td className="px-5 py-4"><p className="text-xs font-semibold text-slate-800">{group.name}</p><p className="mt-1 text-[11px] text-slate-400">{group.accountId || 'Account ID unavailable'}</p></td>
      <td className="max-w-sm px-4 py-4"><p className="text-xs font-medium text-slate-700">{task.title}</p><p className="mt-1 text-[10px] text-slate-400">{task.assessment_type} · {GRADE_COMPONENTS.find(item => item.key === assessmentComponent(task, assignments))?.shortLabel || 'Unassigned component'}</p></td>
      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold tabular-nums text-slate-700">{submission?.status === 'GRADED' && Number.isFinite(submission.final_score) ? formatGrade(submission.final_score) : '—'}<span className="text-xs font-normal text-slate-400"> / {formatGrade(task.max_score)}</span></td>
      <td className="px-4 py-4"><SubmissionStatus status={status} /></td>
      <td className="px-4 py-4"><button type="button" disabled={!canReview} title={canReview ? 'Review score' : unavailable ? 'Refresh to load this record' : 'A submitted record is needed before grading'} onClick={() => { if (submission) onReview({ task, submission }); }} aria-label={`Review ${task.title} for ${group.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:border-transparent disabled:text-slate-300 disabled:hover:bg-transparent"><Eye size={16} /></button></td>
    </tr>;
  })}</tbody></table></div></>;
}
