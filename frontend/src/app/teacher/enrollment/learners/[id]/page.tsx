import { redirect } from 'next/navigation';

export default async function LearnerReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/teacher/learner-accounts/enrollment/${encodeURIComponent(id)}`);
}
