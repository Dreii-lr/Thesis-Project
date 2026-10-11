'use client';

import { useCallback, useState } from 'react';
import { ArrowRight, Layers, RefreshCw } from 'lucide-react';
import { getUserCategory, listUserCategories } from '@/src/lib/user-categories-api';
import { useApiData } from '@/src/lib/use-api-data';
import ApiState from '@/src/components/ui/ApiState';
import Modal from '@/src/components/ui/Modal';

export default function LearningProgramsPage() {
  const programs = useApiData(listUserCategories);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = programs.data?.filter(program => [program.name, program.code, program.description].join(' ').toLowerCase().includes(search.trim().toLowerCase())) || [];

  return <div className="p-4 sm:p-6 lg:p-8">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">Learning Programs</h1><p className="mt-1 text-sm text-slate-500">Browse program details and their subjects.</p></div><button type="button" onClick={programs.reload} disabled={programs.loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm disabled:opacity-50"><RefreshCw size={16} /> Refresh</button></div>
    <input aria-label="Search learning programs" placeholder="Search programs..." value={search} onChange={event => setSearch(event.target.value)} className="mb-5 w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
    <ApiState loading={programs.loading} error={programs.error} onRetry={programs.reload} />
    {!programs.loading && !programs.error && <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {filtered.map(program => <section key={program.category_id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><Layers size={24} className="mb-4 text-blue-600" /><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{program.code}</p><h2 className="mt-2 text-lg font-bold">{program.name}</h2><p className="mt-3 text-sm leading-6 text-slate-500">{program.description || 'No description available.'}</p><button type="button" onClick={() => setSelected(program.category_id)} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">View details <ArrowRight size={16} /></button></section>)}
      {!filtered.length && <p className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">No programs match your search.</p>}
    </div>}
    {selected && <ProgramDetails key={selected} id={selected} onClose={() => setSelected(null)} />}
  </div>;
}

function ProgramDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const load = useCallback(() => getUserCategory(id), [id]);
  const program = useApiData(load);
  return <Modal title={program.data?.name || 'Learning Program Details'} onClose={onClose}>
    <ApiState loading={program.loading} error={program.error} onRetry={program.reload} />
    {!program.loading && !program.error && program.data && <>
      <p className="text-xs font-semibold text-blue-600">{program.data.code}</p><p className="mt-3 text-sm leading-6 text-slate-600">{program.data.description || 'No description available.'}</p>
      <h3 className="mb-3 mt-6 text-sm font-bold">Subjects ({program.data.subjects.length})</h3>
      <ul className="divide-y divide-slate-100">{program.data.subjects.map(subject => <li key={subject.subject_id} className="py-3"><p className="text-sm font-semibold">{subject.name}</p><p className="mt-1 text-xs text-slate-500">{subject.code} · {subject.is_active ? 'Active' : 'Inactive'}</p><p className="mt-1 text-sm text-slate-500">{subject.description}</p></li>)}</ul>
      {!program.data.subjects.length && <p className="text-sm text-slate-500">This program has no subjects yet.</p>}
    </>}
  </Modal>;
}
