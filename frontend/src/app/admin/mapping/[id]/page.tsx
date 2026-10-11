import EditStudentForm from '@/src/components/learners/EditStudentForm';

export default async function MappingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditStudentForm key={id} id={id} basePath="/admin/mapping" heading="Update Learner Mapping" />;
}
