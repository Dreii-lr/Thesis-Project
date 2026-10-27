import { redirect } from 'next/navigation';

export default function EnrollmentPage() {
  redirect('/teacher/learner-accounts?tab=enrollment');
}
