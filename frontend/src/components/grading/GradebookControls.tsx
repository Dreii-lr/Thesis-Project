'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ArrowDownUp, CalendarDays, Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { emptyGradebookFilters, gradebookDateError, gradebookFilterCount, GRADEBOOK_STATUSES, type GradebookFilters, type GradebookSort, type GradebookTab } from '@/src/lib/gradebook-view';

const controlClass = 'flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 shadow-xs transition hover:border-blue-200 hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 [&::-webkit-details-marker]:hidden';
const labelFor = (status: string) => GRADEBOOK_STATUSES.find(([value]) => value === status)?.[1] || status;
export function GradebookFilterChips({ filters, onChange }: { filters: GradebookFilters; onChange: (next: GradebookFilters) => void }) {
  const chips = [
    ...filters.statuses.map(value => ({ key: value, label: labelFor(value), remove: () => onChange({ ...filters, statuses: filters.statuses.filter(item => item !== value) }) })),
    ...filters.types.map(value => ({ key: value, label: value.charAt(0) + value.slice(1).toLowerCase(), remove: () => onChange({ ...filters, types: filters.types.filter(item => item !== value) }) })),
    ...(filters.dateFrom || filters.dateTo ? [{ key: 'date', label: `${filters.dateFrom || 'Any date'} – ${filters.dateTo || 'Any date'}`, remove: () => onChange({ ...filters, dateFrom: '', dateTo: '' }) }] : []),
  ];
  return <div className="flex flex-wrap gap-1.5" aria-label="Selected gradebook filters">{chips.map(chip => <button key={chip.key} type="button" onClick={chip.remove} aria-label={`Remove ${chip.label} filter`} className="inline-flex items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50/70 py-1 pl-2.5 pr-1.5 text-[11px] font-medium text-blue-800 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-500">{chip.label}<X size={11} /></button>)}</div>;
}

export default function GradebookControls({ filters, onChange, sort, onSort, tab, resultCount }: {
  filters: GradebookFilters; onChange: (filters: GradebookFilters) => void;
  sort: GradebookSort; onSort: (sort: GradebookSort) => void; tab: GradebookTab;
  resultCount: (filters: GradebookFilters) => number;
}) {
  const filterRef = useRef<HTMLDetailsElement>(null), sortRef = useRef<HTMLDetailsElement>(null);
  const [draft, setDraft] = useState<GradebookFilters>(emptyGradebookFilters);
  const [layout, setLayout] = useState({ above: false, right: 0, maxHeight: 520 });
  const id = useId(), count = gradebookFilterCount(filters), dateError = gradebookDateError(draft);
  const statuses = GRADEBOOK_STATUSES.filter(([value]) => tab === 'learners' || !['NO_ASSESSMENTS', 'INCOMPLETE'].includes(value));
  const sorts: [GradebookSort, string][] = [['name-asc', 'Learner A–Z'], ['name-desc', 'Learner Z–A'], ...(tab === 'records' ? [['newest', 'Newest submission'], ['oldest', 'Oldest submission']] as [GradebookSort, string][] : [])];

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      for (const ref of [filterRef, sortRef]) if (ref.current && !ref.current.contains(event.target)) ref.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      for (const ref of [filterRef, sortRef]) if (ref.current?.open) { ref.current.open = false; ref.current.querySelector('summary')?.focus(); }
    };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, []);

  function position(element: HTMLDetailsElement) {
    const rect = element.querySelector('summary')!.getBoundingClientRect();
    const width = Math.min(350, window.innerWidth - 32), below = window.innerHeight - rect.bottom - 16, above = Math.max(0, rect.top - 88);
    const openAbove = below < 340 && above > below;
    setLayout({ above: openAbove, right: Math.min(0, rect.right - width - 16), maxHeight: Math.max(120, Math.min(520, openAbove ? above : below)) });
  }
  const panelStyle = { right: layout.right, maxHeight: layout.maxHeight, ...(layout.above ? { bottom: 'calc(100% + 10px)' } : { top: 'calc(100% + 10px)' }) };
  const closeFilters = () => { if (filterRef.current) { filterRef.current.open = false; filterRef.current.querySelector('summary')?.focus(); } };

  return <div className="flex shrink-0 items-center gap-2">
    <details ref={sortRef} className="relative" onToggle={event => { if (event.target !== event.currentTarget || !event.currentTarget.open) return; if (filterRef.current) filterRef.current.open = false; position(event.currentTarget); }}>
      <summary className={controlClass}><ArrowDownUp size={14} /><span>Sort</span><ChevronDown size={12} /></summary>
      <div role="group" aria-label="Sort gradebook" style={panelStyle} className="absolute z-40 w-56 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
        {sorts.map(([value, label]) => <button key={value} type="button" aria-pressed={sort === value} onClick={() => { onSort(value); if (sortRef.current) { sortRef.current.open = false; sortRef.current.querySelector('summary')?.focus(); } }} className="flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-blue-50">{label}{sort === value && <Check size={14} className="text-blue-600" />}</button>)}
      </div>
    </details>
    <details ref={filterRef} className="relative" onToggle={event => {
      if (event.target !== event.currentTarget || !event.currentTarget.open) return;
      if (sortRef.current) sortRef.current.open = false;
      setDraft({ ...filters, statuses: [...filters.statuses], types: [...filters.types] }); position(event.currentTarget);
    }}>
      <summary className={`${controlClass} ${count ? 'border-blue-200 bg-blue-50 text-blue-800' : ''}`}><SlidersHorizontal size={14} /><span>Filter{count ? ` (${count})` : ''}</span></summary>
      <div role="region" aria-label="Filter gradebook" style={panelStyle} className="absolute z-40 flex w-[350px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_50px_-12px_rgba(15,23,42,0.22)]">
        <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-5"><h3 className="text-sm font-bold text-slate-900">Filter {tab === 'learners' ? 'learners' : 'assessment records'}</h3><button type="button" onClick={closeFilters} aria-label="Close filters" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={15} /></button></div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
          {tab === 'records' && <details open className="border-b border-slate-100 py-4"><summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-slate-800"><span className="flex items-center gap-2"><CalendarDays size={14} />Submission date</span><ChevronDown size={13} /></summary>
            <div className="mt-3 grid grid-cols-2 gap-3">{(['dateFrom', 'dateTo'] as const).map(key => <label key={key} className="text-[11px] font-medium text-slate-500">{key === 'dateFrom' ? 'From' : 'To'}<input aria-label={`Submission date ${key === 'dateFrom' ? 'from' : 'to'}`} type="date" value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} aria-invalid={!!dateError} aria-describedby={dateError ? `${id}-dates` : undefined} className="mt-1.5 block w-full min-w-0 rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label>)}</div>
            <p className="mt-2 text-[10px] leading-5 text-slate-400">Dates use local time. Records with no submission date are hidden while a date filter is active.</p>{dateError && <p id={`${id}-dates`} role="alert" className="mt-2 text-[11px] text-rose-600">{dateError}</p>}
          </details>}
          <details open className="py-4"><summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-slate-800">{tab === 'learners' ? 'Learner status' : 'Submission status'}<ChevronDown size={13} /></summary><div className="mt-2 space-y-0.5">{statuses.map(([value, label]) => <label key={value} className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-1 py-2 text-xs text-slate-600 hover:bg-slate-50"><input type="checkbox" checked={draft.statuses.includes(value)} onChange={event => setDraft({ ...draft, statuses: event.target.checked ? [...draft.statuses, value] : draft.statuses.filter(item => item !== value) })} className="size-3.5 accent-[var(--portal-accent-600)]" />{label}</label>)}</div></details>
          {tab === 'records' && <details open className="border-t border-slate-100 py-4"><summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-slate-800">Assessment type<ChevronDown size={13} /></summary><div className="mt-2">{['ACTIVITY', 'QUIZ', 'EXAM', 'TEST'].map(value => <label key={value} className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-1 py-2 text-xs text-slate-600 hover:bg-slate-50"><input type="checkbox" checked={draft.types.includes(value)} onChange={event => setDraft({ ...draft, types: event.target.checked ? [...draft.types, value] : draft.types.filter(item => item !== value) })} className="size-3.5 accent-[var(--portal-accent-600)]" />{value.charAt(0) + value.slice(1).toLowerCase()}</label>)}</div></details>}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 p-4"><button type="button" onClick={() => setDraft(emptyGradebookFilters())} className="text-xs font-semibold text-slate-500 hover:text-slate-800">Reset</button><button type="button" disabled={!!dateError} onClick={() => { onChange(draft); closeFilters(); }} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Show {resultCount(draft)} {tab === 'learners' ? 'learners' : 'records'}</button></div>
      </div>
    </details>
  </div>;
}
