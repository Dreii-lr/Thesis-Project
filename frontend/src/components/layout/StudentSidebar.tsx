'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/src/context/SidebarContext';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  BarChart3,
  CalendarCheck2,
  BadgeCheck,
  CalendarDays,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/student/dashboard' },
  { name: 'My Learning', icon: BookOpen, href: '/student/modules' },
  { name: 'Activities', icon: ClipboardList, href: '/student/activities' },
  { name: 'Calendar', icon: CalendarDays, href: '/student/calendar' },
  { name: 'Progress', icon: BarChart3, href: '/student/progress' },
  { name: 'Attendance', icon: CalendarCheck2, href: '/student/attendance' },
  { name: 'Results', icon: BadgeCheck, href: '/student/results' },
];

export default function StudentSidebar() {
  const { isExpanded } = useSidebar();
  const pathname = usePathname();

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
            const active = isActive(item.href);
            const Icon = item.icon;

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
