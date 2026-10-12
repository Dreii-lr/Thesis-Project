import AdminStudentAccountForm from '@/src/components/layout/admin/create-account/AdminStudentAccountForm';

export default async function MappingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminStudentAccountForm key={id} id={id} basePath="/admin/mapping" />;
}
