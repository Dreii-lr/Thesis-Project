import DemoAuthGuard from '@/src/components/auth/DemoAuthGuard';
import StudentSidebar from '@/src/components/layout/StudentSidebar';
import StudentHeader from '@/src/components/layout/student/StudentHeader';
import { SidebarProvider } from '@/src/context/SidebarContext';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoAuthGuard role="student">
      <SidebarProvider>
        <div className="flex min-h-screen bg-[#f6f8fc] text-slate-900">
          <StudentSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <StudentHeader />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </DemoAuthGuard>
  );
}
