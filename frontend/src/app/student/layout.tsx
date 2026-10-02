import DemoAuthGuard from '@/src/components/auth/DemoAuthGuard';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <DemoAuthGuard role="student">{children}</DemoAuthGuard>;
}
