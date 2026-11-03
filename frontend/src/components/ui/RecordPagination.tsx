import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { recordPage } from '@/src/lib/record-view';

export default function RecordPagination({ page, onChange, label = 'records' }: {
  page: ReturnType<typeof recordPage>; onChange: (page: number) => void; label?: string;
}) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 sm:px-5">
    <p role="status" className="text-xs text-slate-500">Showing {page.start}–{page.end} of {page.total} {label}</p>
    <nav aria-label={`${label} pagination`} className="flex flex-wrap items-center gap-1">
      <button type="button" disabled={page.current === 1} onClick={() => onChange(page.current - 1)} aria-label="Previous page" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-30"><ChevronLeft size={15} /></button>
      {page.pages.map((number, index) => number === 'ellipsis' ? <span key={`gap-${index}`} className="px-1 text-slate-400">…</span> : <button key={number} type="button" aria-label={`Page ${number}`} aria-current={number === page.current ? 'page' : undefined} onClick={() => onChange(number)} className={`h-10 min-w-10 rounded-lg px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-blue-500 ${number === page.current ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{number}</button>)}
      <button type="button" disabled={page.current === page.totalPages} onClick={() => onChange(page.current + 1)} aria-label="Next page" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-30"><ChevronRight size={15} /></button>
    </nav>
  </div>;
}
