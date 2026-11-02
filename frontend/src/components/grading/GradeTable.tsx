import { Eye } from 'lucide-react';
import { formatGrade, GRADE_COMPONENTS, type ComponentAssignments, type GradeWeights } from '@/src/lib/grading';
import { calculateRosterGrade, gradebookGroupStatus, type RosterGradeGroup } from '@/src/lib/gradebook-view';
import { SubmissionStatus } from './AssessmentRecords';

export default function GradeTable({ groups, weights, assignments, onOpen }: {
  groups: RosterGradeGroup[]; weights: GradeWeights; assignments: ComponentAssignments; onOpen: (group: RosterGradeGroup) => void;
}) {
  return <><ul aria-label="Learner grades" className="divide-y divide-slate-100 lg:hidden">{groups.map(group => {
    const result = calculateRosterGrade(group, weights, assignments);
    return <li key={group.key} className="space-y-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-800">{group.name || 'Unnamed learner'}</p><p className="mt-1 text-xs text-slate-400">{group.accountId || 'Account ID unavailable'}</p>{group.unmatched && <p className="mt-1 text-xs text-rose-600">Not in current program roster</p>}</div><button type="button" onClick={() => onOpen(group)} title="View grade breakdown" aria-label={`View grades for ${group.name}`} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"><Eye size={17} /></button></div>
      <dl className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-3">{GRADE_COMPONENTS.map(({ key, shortLabel }) => {
        const total = result.totals[key];
        return <div key={key}><dt className="text-[11px] text-slate-500">{shortLabel}</dt><dd className="mt-1 text-sm font-semibold tabular-nums text-slate-700">{weights[key] === 0 ? 'Not weighted' : total.percentage === null ? '—' : `${formatGrade(total.percentage)}%`}</dd>{weights[key] !== 0 && <p className="mt-1 text-[11px] text-slate-500">{total.possible ? `${formatGrade(total.earned)} / ${formatGrade(total.possible)} graded pts` : 'No graded scores'}{total.pending > 0 ? ` · ${total.pending} pending` : ''}</p>}</div>;
      })}</dl>
      <div className="flex flex-wrap items-center justify-between gap-3"><SubmissionStatus status={gradebookGroupStatus(group)} /><p className="text-xs text-slate-500">Final preview <span title={result.reasons.join(' ')} className={`ml-2 font-semibold ${result.final === null ? 'text-amber-800' : 'text-blue-700'}`}>{result.final === null ? 'Incomplete' : formatGrade(result.final)}</span></p></div>
    </li>;
  })}</ul><div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[950px] text-left">
    <thead className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wide text-slate-500"><tr>
      <th scope="col" className="sticky left-0 z-10 bg-slate-50 px-5 py-4">Learner</th>
      {GRADE_COMPONENTS.map(({ key, shortLabel }) => <th key={key} scope="col" className="px-4 py-4">{shortLabel}<span className="mt-1 block font-normal normal-case tracking-normal">{Number.isFinite(weights[key]) ? formatGrade(weights[key]) : '—'}% weight</span></th>)}
      <th scope="col" className="px-4 py-4">Final preview</th><th scope="col" className="px-4 py-4">Status</th><th scope="col" className="px-4 py-4"><span className="sr-only">View learner grades</span></th>
    </tr></thead>
    <tbody className="divide-y divide-slate-100">{groups.map(group => {
      const result = calculateRosterGrade(group, weights, assignments);
      return <tr key={group.key} className="group hover:bg-blue-50/20">
        <th scope="row" className="sticky left-0 z-10 bg-white px-5 py-4 text-left font-normal group-hover:bg-slate-50"><p className="text-xs font-semibold text-slate-800">{group.name || 'Unnamed learner'}</p><p className="mt-1 text-[11px] text-slate-400">{group.accountId || 'Account ID unavailable'}</p>{group.unmatched && <p className="mt-1 text-[10px] text-rose-600">Not in current program roster</p>}</th>
        {GRADE_COMPONENTS.map(({ key }) => { const total = result.totals[key]; return <td key={key} className="px-4 py-4">
          {weights[key] === 0 ? <span className="text-xs text-slate-400">Not weighted</span> : <><p className="text-sm font-semibold tabular-nums text-slate-700">{total.percentage === null ? '—' : `${formatGrade(total.percentage)}%`}</p><p className="mt-1 text-[10px] tabular-nums text-slate-400">{total.possible ? `${formatGrade(total.earned)} / ${formatGrade(total.possible)} graded pts` : 'No graded scores'}</p>{total.pending > 0 && <p className="mt-1 text-[10px] text-amber-700">{total.pending} pending</p>}</>}
        </td>; })}
        <td className="px-4 py-4">{result.final === null ? <span title={result.reasons.join(' ')} className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">Incomplete</span> : <><p className="text-lg font-bold tabular-nums text-blue-700">{formatGrade(result.final)}</p><p className="mt-1 text-[10px] text-slate-400">Preview</p></>}</td>
        <td className="px-4 py-4"><SubmissionStatus status={gradebookGroupStatus(group)} />{group.missingCount > 0 && group.records.length > 0 && <p className="mt-1 text-[10px] text-slate-400">{group.missingCount} not submitted</p>}</td>
        <td className="px-4 py-4"><button type="button" onClick={() => onOpen(group)} title="View grade breakdown" aria-label={`View grades for ${group.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600"><Eye size={16} /></button></td>
      </tr>;
    })}</tbody>
  </table></div></>;
}
