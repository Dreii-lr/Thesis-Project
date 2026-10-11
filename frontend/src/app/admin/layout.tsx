import AdminSidebar from '@/src/components/layout/AdminSidebar';
import Header from '@/src/components/layout/Header';
import DemoAuthGuard from '@/src/components/auth/DemoAuthGuard';
import { SidebarProvider } from '@/src/context/SidebarContext';
import { StudentProvider } from '@/src/context/StudentContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoAuthGuard role="admin">
      <SidebarProvider>
        <StudentProvider>
          <div data-portal-role="admin" className="portal-theme flex min-h-screen bg-[var(--portal-background)] text-slate-900">
            <AdminSidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <Header />
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
        </StudentProvider>
      </SidebarProvider>
    </DemoAuthGuard>
  );
}
