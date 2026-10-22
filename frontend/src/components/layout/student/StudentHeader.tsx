'use client';

import { useSidebar } from '@/src/context/SidebarContext';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home, PanelLeft } from 'lucide-react';
import Link from 'next/link';
import StudentProfileDropdown from './StudentProfileDropdown';
import { useStudentSubjects } from '@/src/context/StudentSubjectsContext';
import NotificationBell from '@/src/components/notifications/NotificationBell';

export default function StudentHeader() {
  const { toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const { subjects } = useStudentSubjects();

  const pathSegments = pathname?.split('/').filter(Boolean) || [];
  const formatSegment = (segment: string) =>
    segment === 'results' ? 'My Results' : segment === 'subjects' || segment === 'activities' ? 'My Subjects' : subjects.find(subject => subject.subject_id === segment)?.name || segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const isAssessmentPage = pathSegments[1] === 'activities' && pathSegments[2] === 'assessment';
  const breadcrumbs = isAssessmentPage
    ? [{ label: 'Assessment', href: '/student/subjects' }, { label: 'Details', href: null }]
    : pathSegments.slice(1).map((segment, index, segments) => ({
        label: formatSegment(segment),
        href: index === segments.length - 1 ? null
          : segment === 'subjects' || segment === 'activities' ? '/student/subjects'
          : '/' + pathSegments.slice(0, index + 2).join('/'),
      }));

  return (
    <header className="sticky top-0 z-[60] flex h-[72px] w-full shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 shadow-[0_1px_0_rgba(15,23,42,0.02)] sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
        <button
          onClick={toggleSidebar}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={19} strokeWidth={1.8} />
        </button>

        <div className="hidden h-5 w-px bg-slate-200 sm:block" />

        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-[13px] text-slate-400 sm:flex">
          <Link
            href="/student/dashboard"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-slate-50 hover:text-blue-600"
            title="Dashboard"
          >
            <Home size={15} strokeWidth={1.8} />
          </Link>

          {breadcrumbs.map((crumb, index) => {
            return (
              <div key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
                <ChevronRight size={14} strokeWidth={1.7} className="shrink-0 text-slate-300" />
                {crumb.href ? (
                  <Link href={crumb.href} className="max-w-[160px] truncate hover:text-blue-600">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="max-w-[220px] truncate font-semibold text-slate-700">
                    {crumb.label}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <NotificationBell role="student" />

        <div className="hidden h-6 w-px bg-slate-200 sm:block" />
        <StudentProfileDropdown />
      </div>
    </header>
  );
}
