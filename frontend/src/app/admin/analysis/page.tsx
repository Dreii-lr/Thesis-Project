import AssessmentAnalysisView from '@/src/components/layout/analysis/AssessmentAnalysisView';

export const metadata = {
  title: 'Assessment Analysis | ALS Admin Portal',
  description: 'Cohort struggle and diagnostic analysis across ALS quizzes and exams.',
};

export default function AdminAnalysisPage() {
  return <AssessmentAnalysisView role="admin" />;
}
