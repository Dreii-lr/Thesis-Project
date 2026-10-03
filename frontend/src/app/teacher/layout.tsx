import Sidebar from '@/src/components/layout/TeacherSidebar';
import Header from '@/src/components/layout/Header';
import { SidebarProvider } from '@/src/context/SidebarContext';
import { StudentProvider } from '@/src/context/StudentContext';
import DemoAuthGuard from '@/src/components/auth/DemoAuthGuard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoAuthGuard role="teacher">
      <SidebarProvider>
        <StudentProvider>
          <div className="flex min-h-screen bg-[#f6f8fc] text-slate-900">
            <Sidebar />

            <div className="flex min-w-0 flex-1 flex-col">
              <Header />

              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
        </StudentProvider>
      </SidebarProvider>
    </DemoAuthGuard>
  );
}
