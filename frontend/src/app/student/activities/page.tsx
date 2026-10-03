import { ClipboardList, ArrowRight } from 'lucide-react';

export default function Page() {
  const items = [
  { title: 'Digital Literacy Quiz', description: 'Due today at 3:00 PM · 10 questions.' },
  { title: 'Written Activity 2', description: 'Due tomorrow · Upload your completed response.' },
  { title: 'Math Module Checkpoint', description: 'Due Oct 4 · Assessment covering the current module.' },
];
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">Student Portal</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Activities</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Keep track of quizzes, written activities, and assessments assigned to you.</p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ClipboardList size={20} /></div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
            <button type="button" className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">Open <ArrowRight size={15} /></button>
          </article>
        ))}
      </div>
    </div>
  );
}
