'use client';

import MapStudentForm from '@/src/components/learners/MapStudentForm';

export default function TeacherMapStudentPage() {
  return <MapStudentForm role="teacher" basePath="/teacher/learner-accounts" />;
}
