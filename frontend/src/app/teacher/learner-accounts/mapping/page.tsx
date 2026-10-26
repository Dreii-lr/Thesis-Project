import MapStudentForm from '@/src/components/learners/MapStudentForm';

export default function MappingPage() {
  return <MapStudentForm role="teacher" basePath="/teacher/learner-accounts?tab=enrollment" />;
}
