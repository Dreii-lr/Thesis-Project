import { EyeOff } from 'lucide-react';

export default function PublishedGrades() {
  return <section aria-labelledby="published-grades-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <h2 id="published-grades-title" className="text-sm font-semibold text-slate-800">Published final grades</h2>
    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center">
      <EyeOff size={23} className="mx-auto text-slate-400" />
      <h3 className="mt-3 text-sm font-semibold text-slate-700">Final grades are not available yet</h3>
      <p className="mx-auto mt-2 max-w-lg text-xs leading-6 text-slate-500">Final-grade release has not been enabled. You can continue viewing your individual assessment scores and teacher feedback in My Results.</p>
    </div>
  </section>;
}
