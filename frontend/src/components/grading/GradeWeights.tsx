import { RotateCcw } from 'lucide-react';
import { DEFAULT_WEIGHTS, formatGrade, GRADE_COMPONENTS, validateWeights, type GradeWeights } from '@/src/lib/grading';

export default function GradeWeightsEditor({ weights, onChange }: {
  weights: GradeWeights;
  onChange: (weights: GradeWeights) => void;
}) {
  const error = validateWeights(weights);
  const total = GRADE_COMPONENTS.reduce((sum, { key }) => sum + weights[key], 0);
  return <section aria-labelledby="weights-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 print:shadow-none">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="weights-title" className="text-sm font-semibold text-slate-800">Grading components</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Weights apply to this subject’s preview for this visit. They are not published to students.</p></div>
      <button type="button" onClick={() => onChange({ ...DEFAULT_WEIGHTS })} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 print:hidden"><RotateCcw size={13} />Reset weights</button>
    </div>
    <div className="mt-5 grid gap-3 md:grid-cols-3">
      {GRADE_COMPONENTS.map(({ key, label }, index) => <label key={key} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">0{index + 1}</span>
        <span className="min-w-0 flex-1 text-xs font-medium leading-5 text-slate-600">{label}</span>
        <span className="flex shrink-0 items-center gap-1"><input aria-label={`${label} weight`} type="number" min="0" max="100" step="any" value={Number.isFinite(weights[key]) ? weights[key] : ''}
          onChange={event => onChange({ ...weights, [key]: event.target.value === '' ? NaN : Number(event.target.value) })} aria-invalid={!!error} aria-describedby={error ? 'weight-error' : undefined}
          className="w-14 rounded-md border border-slate-200 px-1.5 py-2 text-right text-lg font-semibold text-slate-800 outline-none focus:border-blue-400" /><span className="text-sm text-slate-400">%</span></span>
      </label>)}
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
      <p className="text-slate-500">Each score counts once. A&E results need an explicit component assignment.</p>
      <p className={error ? 'font-semibold text-rose-700' : 'font-semibold text-blue-700'}>Total: {Number.isFinite(total) ? formatGrade(total) : '—'} / 100%</p>
    </div>
    {error && <p id="weight-error" role="alert" className="mt-3 text-xs font-medium text-rose-700">{error}</p>}
  </section>;
}
