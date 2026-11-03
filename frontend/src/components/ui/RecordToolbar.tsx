'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDownUp, Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';

export interface RecordFilter { key: string; label: string; value: string; options: { value: string; label: string }[] }
const controlClass = 'inline-flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-500 [&::-webkit-details-marker]:hidden';

export default function RecordToolbar({ search, onSearch, searchLabel, placeholder, filters, onApply, sort, onSort, sorts }: {
  search: string; onSearch: (value: string) => void; searchLabel: string; placeholder: string;
  filters: RecordFilter[]; onApply: (values: Record<string, string>) => void;
  sort: string; onSort: (value: string) => void; sorts: { value: string; label: string }[];
}) {
  const filterRef = useRef<HTMLDetailsElement>(null), sortRef = useRef<HTMLDetailsElement>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [position, setPosition] = useState({ left: 16, top: 90, maxHeight: 400 });
  const applied = filters.filter(filter => filter.value !== filter.options[0]?.value);
  const values = () => Object.fromEntries(filters.map(filter => [filter.key, filter.value]));
  const reset = () => Object.fromEntries(filters.map(filter => [filter.key, filter.options[0]?.value || '']));
  const close = (ref: typeof filterRef, focus = false) => { if (ref.current) { ref.current.open = false; if (focus) ref.current.querySelector('summary')?.focus(); } };
  useEffect(() => {
    const outside = (event: PointerEvent) => { for (const ref of [filterRef, sortRef]) if (event.target instanceof Node && !ref.current?.contains(event.target)) close(ref); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') for (const ref of [filterRef, sortRef]) if (ref.current?.open) close(ref, true); };
    const resize = () => { close(filterRef); close(sortRef); };
    const scroll = (event: Event) => { if (event.target instanceof Node && (filterRef.current?.contains(event.target) || sortRef.current?.contains(event.target))) return; resize(); };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape); window.addEventListener('resize', resize); window.addEventListener('wheel', scroll, true); window.addEventListener('touchmove', scroll, true);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('resize', resize); window.removeEventListener('wheel', scroll, true); window.removeEventListener('touchmove', scroll, true); };
  }, []);
  function place(element: HTMLDetailsElement) {
    const rect = element.querySelector('summary')!.getBoundingClientRect(), width = Math.min(336, window.innerWidth - 32);
    const below = window.innerHeight - rect.bottom - 24, above = rect.top - 96;
    const openBelow = below >= 280 || below >= above;
    const height = Math.min(480, openBelow ? below : above);
    setPosition({ left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)), top: openBelow ? rect.bottom + 8 : Math.max(88, rect.top - height - 8), maxHeight: Math.max(140, height) });
  }
  const panelClass = 'fixed z-[80] w-[336px] max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 shadow-xl';
  return <div className="space-y-3"><div className="flex flex-wrap items-center gap-3">
    <label className="relative block min-w-0 flex-1 basis-56"><span className="sr-only">{searchLabel}</span><Search size={15} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" /><input type="search" value={search} onChange={event => onSearch(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 text-xs text-slate-700 outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-50" /></label>
    <div className="flex gap-2">
      <details ref={sortRef} onToggle={event => { if (event.target !== event.currentTarget || !event.currentTarget.open) return; close(filterRef); place(event.currentTarget); }}><summary className={controlClass}><ArrowDownUp size={14} />Sort<ChevronDown size={12} /></summary><div role="group" aria-label="Sort records" style={position} className={panelClass}>{sorts.map(option => <button key={option.value} type="button" aria-pressed={sort === option.value} onClick={() => { onSort(option.value); close(sortRef, true); }} className="flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-left text-xs text-slate-600 hover:bg-blue-50">{option.label}{sort === option.value && <Check size={14} />}</button>)}</div></details>
      <details ref={filterRef} onToggle={event => { if (event.target !== event.currentTarget || !event.currentTarget.open) return; close(sortRef); setDraft(values()); place(event.currentTarget); }}><summary className={controlClass}><SlidersHorizontal size={14} />Filter{applied.length ? ` (${applied.length})` : ''}</summary><div role="region" aria-label="Filter records" style={position} className={panelClass}>
        <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-800">Filter records</h3><button type="button" aria-label="Close filters" onClick={() => close(filterRef, true)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={15} /></button></div>
        <div className="space-y-4">{filters.map(filter => <label key={filter.key} className="block text-xs font-medium text-slate-600">{filter.label}<select value={draft[filter.key] ?? filter.value} onChange={event => setDraft(current => ({ ...current, [filter.key]: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50">{filter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}</div>
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><button type="button" onClick={() => setDraft(reset())} className="min-h-10 text-xs font-semibold text-slate-500">Reset</button><button type="button" onClick={() => { onApply({ ...values(), ...draft }); close(filterRef, true); }} className="min-h-10 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700">Apply filters</button></div>
      </div></details>
    </div>
  </div>{!!applied.length && <div className="flex flex-wrap items-center gap-2" aria-label="Selected filters">{applied.map(filter => <button key={filter.key} type="button" aria-label={`Remove ${filter.label} filter`} onClick={() => onApply({ ...values(), [filter.key]: filter.options[0]?.value || '' })} className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-2.5 text-xs text-blue-700">{filter.label}: {filter.options.find(option => option.value === filter.value)?.label}<X size={11} /></button>)}<button type="button" onClick={() => onApply(reset())} className="min-h-8 text-xs font-semibold text-slate-500">Clear all</button></div>}</div>;
}
