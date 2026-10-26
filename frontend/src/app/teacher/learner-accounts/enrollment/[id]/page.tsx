import CreateStudentAccountForm from '@/src/components/layout/teacher/create-account/CreateStudentAccountForm';

export default async function EnrollmentLearnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CreateStudentAccountForm key={id} id={id} />;
}
