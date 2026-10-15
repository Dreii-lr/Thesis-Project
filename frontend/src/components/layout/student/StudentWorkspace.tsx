'use client';

import { usePathname } from 'next/navigation';
import StudentSidebar from '@/src/components/layout/StudentSidebar';
import StudentHeader from './StudentHeader';

export default function StudentWorkspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const assessment = /^\/student\/activities\/assessment\/[^/]+\/?$/.test(pathname);

  return <div className={`flex bg-[#f6f8fc] text-slate-900 ${assessment ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}>
    <StudentSidebar />
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <StudentHeader />
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  </div>;
}
