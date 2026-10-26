import EnrollmentPublicShell from '@/src/components/enrollment/EnrollmentPublicShell';

export default function EnrollmentLayout({ children }: { children: React.ReactNode }) {
  return <EnrollmentPublicShell>{children}</EnrollmentPublicShell>;
}
