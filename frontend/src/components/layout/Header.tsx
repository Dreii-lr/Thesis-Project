'use client';

import { useSidebar } from '@/src/context/SidebarContext';
import { usePathname } from 'next/navigation';
import { PanelLeft, Bell, Search, Home, ChevronRight } from 'lucide-react';
import ProfileDropdown from '@/src/components/layout/ProfileDropDown';
import Link from 'next/link';

export default function Header() {
  const { toggleSidebar } = useSidebar();
  const pathname = usePathname();

  const pathSegments = pathname?.split('/').filter(Boolean) || [];
  const breadcrumbSegments = pathSegments.filter(
    (segment) => segment !== 'teacher' && segment !== 'admin'
  );

  const formatSegment = (segment: string) => {
    return segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <header className="sticky top-0 z-10 flex h-[72px] w-full shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={19} strokeWidth={1.8} />
        </button>

        <div className="hidden h-5 w-px bg-slate-200 sm:block" />

        <div className="hidden min-w-0 items-center gap-1.5 text-[13px] text-slate-400 sm:flex">
          <Link
            href="/teacher/dashboard"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-slate-50 hover:text-blue-600"
            title="Dashboard"
          >
            <Home size={15} strokeWidth={1.8} />
          </Link>

          {breadcrumbSegments.map((segment, index) => {
            const segmentIndex = pathSegments.indexOf(segment);
            const href = '/' + pathSegments.slice(0, segmentIndex + 1).join('/');
            const isLast = index === breadcrumbSegments.length - 1;

            return (
              <div key={`${segment}-${index}`} className="flex min-w-0 items-center gap-1.5">
                <ChevronRight size={14} strokeWidth={1.7} className="shrink-0 text-slate-300" />

                {isLast ? (
                  <span className="max-w-[260px] truncate font-semibold text-slate-700">
                    {formatSegment(segment)}
                  </span>
                ) : (
                  <Link
                    href={href}
                    className="max-w-[180px] truncate transition-colors hover:text-blue-600"
                  >
                    {formatSegment(segment)}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden h-9 w-64 items-center rounded-xl border border-slate-200 bg-slate-50/80 px-3 transition-all focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50 lg:flex xl:w-80">
          <Search size={15} className="shrink-0 text-slate-400" strokeWidth={1.8} />
          <input
            type="text"
            placeholder="Search anything"
            className="ml-2.5 w-full border-none bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>

        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="Notifications"
        >
          <Bell size={18} strokeWidth={1.8} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <div className="hidden h-6 w-px bg-slate-200 sm:block" />
        <ProfileDropdown />
      </div>
    </header>
  );
}
