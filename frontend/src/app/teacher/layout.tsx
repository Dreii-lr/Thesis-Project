import Sidebar from '@/src/components/layout/TeacherSidebar';
import Header from '@/src/components/layout/Header';
import { SidebarProvider } from '@/src/context/SidebarContext';
import { StudentProvider } from '@/src/context/StudentContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <StudentProvider>
        <div className="flex min-h-screen bg-gray-50">
          
          <Sidebar />
          
          <div className="flex-1 flex flex-col min-w-0">

              <Header />
            
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
            
          </div>
        </div>
      </StudentProvider>
    </SidebarProvider>
  );
}