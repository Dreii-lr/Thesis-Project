import AssessmentAnalysisView from '@/src/components/layout/analysis/AssessmentAnalysisView';

export const metadata = {
  title: 'Assessment Analysis | ALS Teacher Portal',
  description: 'Cohort struggle and diagnostic analysis across ALS quizzes and exams.',
};

export default function TeacherAnalysisPage() {
  return <AssessmentAnalysisView role="teacher" />;
}
