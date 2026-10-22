'use client';

import { usePathname } from 'next/navigation';
import StudentSidebar from '@/src/components/layout/StudentSidebar';
import StudentHeader from './StudentHeader';

export default function StudentWorkspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const assessment = /^\/student\/activities\/assessment\/[^/]+\/?$/.test(pathname);

  return <div data-student-portal className={`flex bg-background text-slate-900 ${assessment ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}>
    <StudentSidebar />
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <StudentHeader />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto [&_button]:min-h-10 [&_button]:transition-colors [&_button]:duration-150 [&_a]:transition-colors [&_a]:duration-150 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-blue-600 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-blue-600 [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-offset-2 [&_input:focus-visible]:outline-blue-600 [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-offset-2 [&_select:focus-visible]:outline-blue-600 [&_textarea:focus-visible]:outline-2 [&_textarea:focus-visible]:outline-offset-2 [&_textarea:focus-visible]:outline-blue-600 [&_summary:focus-visible]:outline-2 [&_summary:focus-visible]:outline-offset-2 [&_summary:focus-visible]:outline-blue-600">{children}</main>
    </div>
  </div>;
}
