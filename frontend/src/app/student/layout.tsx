import DemoAuthGuard from '@/src/components/auth/DemoAuthGuard';
import StudentWorkspace from '@/src/components/layout/student/StudentWorkspace';
import { SidebarProvider } from '@/src/context/SidebarContext';
import { StudentSubjectsProvider } from '@/src/context/StudentSubjectsContext';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoAuthGuard role="student">
      <StudentSubjectsProvider>
        <SidebarProvider>
          <StudentWorkspace>{children}</StudentWorkspace>
        </SidebarProvider>
      </StudentSubjectsProvider>
    </DemoAuthGuard>
  );
}
