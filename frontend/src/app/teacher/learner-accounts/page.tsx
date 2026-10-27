import LearnerAccountsWorkspace from '@/src/components/learners/LearnerAccountsWorkspace';

export default async function LearnerAccountsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <LearnerAccountsWorkspace tab={tab === 'enrollment' ? 'enrollment' : 'students'} />;
}
