import Gradebook from '@/src/components/grading/Gradebook';

export default async function SubjectGradesPage({ params }: { params: Promise<{ program: string; subjectId: string }> }) {
  const { program, subjectId } = await params;
  return <Gradebook programCode={program} subjectId={subjectId} />;
}
