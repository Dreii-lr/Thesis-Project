import LearnerProfile from '@/src/components/learners/LearnerProfile';

export default async function CreateStudentAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LearnerProfile key={id} id={id} />;
}
