import Gradebook from '@/src/components/grading/Gradebook';

export default async function ProgramGradesPage({ params }: { params: Promise<{ program: string }> }) {
  const { program } = await params;
  return <Gradebook programCode={program} />;
}
