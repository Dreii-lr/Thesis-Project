'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSidebar } from '@/src/context/SidebarContext';
import { useStudentSubjects } from '@/src/context/StudentSubjectsContext';
import { subjectHref } from '@/src/lib/student-subjects';
import {
  LayoutDashboard,
  BookOpen,
  ChevronDown,
  RefreshCw,
  BarChart3,
  CalendarCheck2,
  BadgeCheck,
  Layers3,
  CalendarDays,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/student/dashboard' },
  { name: 'My Learning', icon: BookOpen, href: '/student/modules' },
  { name: 'My Subjects', icon: BookOpen, href: '/student/subjects' },
  { name: 'Flashcards', icon: Layers3, href: '/student/flashcards' },
  { name: 'Calendar', icon: CalendarDays, href: '/student/calendar' },
  { name: 'Progress', icon: BarChart3, href: '/student/progress' },
  { name: 'Attendance', icon: CalendarCheck2, href: '/student/attendance' },
  { name: 'Results', icon: BadgeCheck, href: '/student/results' },
];

export default function StudentSidebar() {
  const { isExpanded } = useSidebar();
  const pathname = usePathname();
  const { subjects, program, loading, error, reload } = useStudentSubjects();
  const [subjectsOpen, setSubjectsOpen] = useState(true);

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <aside
      className={`${
        isExpanded ? 'w-[258px]' : 'w-[82px]'
      } sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-slate-200/80 bg-white transition-all duration-300 ease-in-out md:flex`}
    >
      <div
        className={`flex h-[72px] items-center border-b border-slate-100 ${
          isExpanded ? 'justify-start px-5' : 'justify-center px-3'
        }`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 shadow-sm">
          <Image
            src="/logo.png"
            alt="ALS Logo"
            width={44}
            height={44}
            className="h-10 w-10 object-contain"
          />
        </div>

        {isExpanded && (
          <div className="ml-3 min-w-0">
            <p className="truncate text-[14px] font-bold tracking-tight text-slate-900">
              ALS Learning Management System
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
              Student Portal
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {isExpanded && (
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Learning Workspace
          </p>
        )}

        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href) || (item.name === 'My Subjects' && isActive('/student/activities'));
            const Icon = item.icon;

            if (item.name === 'My Subjects') {
              if (!isExpanded) return <Link key={item.name} href={item.href} title="My Subjects" aria-label="My Subjects" className={`flex h-11 items-center justify-center rounded-xl ${active ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}><BookOpen size={18} /></Link>;
              return <div key={item.name}>
                <button type="button" aria-expanded={subjectsOpen} aria-controls="student-subject-list" onClick={() => setSubjectsOpen(value => !value)} className={`group relative flex min-h-11 w-full items-center rounded-xl px-3 text-left transition-all duration-200 ${active ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}>
                  {active && <span className="absolute left-0 h-5 w-1 rounded-r-full bg-blue-600" />}
                  <BookOpen size={18} className={`shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="ml-3 flex-1 text-[12px] font-medium">My Subjects</span>
                  <ChevronDown size={14} className={`transition-transform ${subjectsOpen ? 'rotate-180' : ''}`} />
                </button>
                {subjectsOpen && <div id="student-subject-list" className="mb-2 ml-5 mt-1.5 space-y-0.5 border-l border-slate-100 pl-2.5">
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5">{program && <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-slate-400">{program.name}</p>}<button type="button" aria-label="Refresh subjects" title="Refresh subjects" disabled={loading} onClick={reload} className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50"><RefreshCw size={11} className={loading ? 'animate-spin' : ''} /></button></div>
                  {loading && <p role="status" className="px-2 py-2 text-xs text-slate-400">Loading subjects...</p>}
                  {error && <p role="alert" className="px-2 py-2 text-xs leading-5 text-rose-600">{error}</p>}
                  {!loading && !error && subjects.map(subject => <Link key={subject.subject_id} href={subjectHref(subject.subject_id)} title={subject.name} aria-current={isActive(subjectHref(subject.subject_id)) ? 'page' : undefined} className={`flex items-start gap-2 rounded-lg px-2 py-2 text-[11px] leading-4 transition-colors ${isActive(subjectHref(subject.subject_id)) ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" /><span className="line-clamp-2 break-words">{subject.name}</span></Link>)}
                  {!loading && !error && !subjects.length && <p className="px-2 py-2 text-xs leading-5 text-slate-400">No subjects are available for your learning program yet.</p>}
                </div>}
              </div>;
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                title={!isExpanded ? item.name : undefined}
                className={`group relative flex h-11 items-center rounded-xl transition-all duration-200 ${
                  isExpanded ? 'justify-start px-3' : 'justify-center px-0'
                } ${
                  active
                    ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                {active && isExpanded && (
                  <span className="absolute left-0 h-5 w-1 rounded-r-full bg-blue-600" />
                )}

                <Icon
                  size={18}
                  className={`shrink-0 ${
                    active
                      ? 'text-blue-600'
                      : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                  strokeWidth={active ? 2.2 : 1.9}
                />

                {isExpanded && (
                  <span className="ml-3 truncate text-[13px] font-medium">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {isExpanded && (
        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl bg-blue-50/70 px-3 py-3 ring-1 ring-inset ring-blue-100">
            <p className="text-[11px] font-semibold text-slate-700">
              Alternative Learning System
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
              Learn at your own pace and keep moving forward.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
