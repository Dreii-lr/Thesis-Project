'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, GraduationCap } from 'lucide-react';
import type { UserCategoryItem } from '@/src/lib/user-categories-api';
import { gradebookProgramHref, gradebookSubjectHref } from '@/src/lib/gradebook-view';

export default function GradebookNavigation({ categories, loading, expanded, pathname }: {
  categories: UserCategoryItem[]; loading: boolean; expanded: boolean; pathname: string;
}) {
  const active = pathname === '/teacher/grades' || pathname.startsWith('/teacher/grades/');
  const [open, setOpen] = useState(active), [programs, setPrograms] = useState<Record<string, boolean>>({});
  const itemClass = `group relative flex min-h-10 items-center rounded-xl transition-colors ${active ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`;
  if (!expanded) return <Link href="/teacher/grades" title="Gradebook" aria-label="Gradebook" aria-current={active ? 'page' : undefined} className={`${itemClass} justify-center`}><GraduationCap size={18} className={active ? 'text-blue-600' : 'text-slate-400'} /></Link>;
  return <div className="space-y-1">
    <div className={`${itemClass} justify-between`}><Link href="/teacher/grades" className="flex min-h-10 min-w-0 flex-1 items-center px-3">{active && <span className="absolute left-0 h-5 w-1 rounded-r-full bg-blue-600" />}<GraduationCap size={18} className={active ? 'shrink-0 text-blue-600' : 'shrink-0 text-slate-400'} /><span className="ml-3 truncate text-[13px] font-medium">Gradebook</span></Link><button type="button" onClick={() => setOpen(value => !value)} aria-label={`${open ? 'Collapse' : 'Expand'} Gradebook programs`} aria-expanded={open} aria-controls="gradebook-programs" className="mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500"><ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} /></button></div>
    {open && <div id="gradebook-programs" className="ml-4 mt-1 space-y-1 border-l border-slate-100 pl-2.5">
      {loading ? <p role="status" className="px-2 py-2 text-[11px] text-slate-400">Loading programs…</p> : categories.length ? categories.map(category => {
        const href = gradebookProgramHref(category.code), currentProgram = pathname === href || pathname.startsWith(`${href}/`);
        const programOpen = programs[category.category_id] ?? currentProgram;
        const subjects = (category.subjects || []).filter(subject => subject.is_active);
        const id = `gradebook-subjects-${category.category_id}`;
        return <div key={category.category_id} className="space-y-0.5"><div className="flex items-center justify-between rounded-lg pl-2 hover:bg-slate-50"><Link href={href} className={`flex min-h-10 min-w-0 flex-1 items-center truncate text-[11px] font-semibold ${currentProgram ? 'text-blue-700' : 'text-slate-700 hover:text-blue-600'}`}>{category.name}</Link><button type="button" aria-label={`${programOpen ? 'Collapse' : 'Expand'} ${category.name} grading subjects`} aria-expanded={programOpen} aria-controls={id} onClick={() => setPrograms(current => ({ ...current, [category.category_id]: !programOpen }))} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500"><ChevronDown size={12} className={`transition-transform ${programOpen ? 'rotate-180' : ''}`} /></button></div>
          {programOpen && <div id={id} className="ml-2 space-y-0.5 border-l border-slate-200 py-0.5 pl-2">{subjects.length ? subjects.map(subject => {
            const subjectHref = gradebookSubjectHref(category.code, subject.subject_id), selected = pathname === subjectHref;
            return <Link key={subject.subject_id} href={subjectHref} title={subject.name} aria-current={selected ? 'page' : undefined} className={`flex min-h-9 items-center rounded-lg px-2 py-2 text-[11px] transition focus-visible:outline-2 focus-visible:outline-blue-500 ${selected ? 'bg-blue-50 font-semibold text-blue-700 ring-1 ring-inset ring-blue-100' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'}`}><span className="truncate">{subject.name}</span></Link>;
          }) : <p className="px-2 py-2 text-[10px] text-slate-400">No active subjects</p>}</div>}
        </div>;
      }) : <p className="px-2 py-2 text-[11px] text-slate-400">Open Gradebook to retry loading programs.</p>}
    </div>}
  </div>;
}
