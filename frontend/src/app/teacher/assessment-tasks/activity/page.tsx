import { Suspense } from 'react';
import AssessmentEditor from '@/src/components/layout/teacher/assessment-tasks/AssessmentEditor';

export default function Page() {
  return <Suspense fallback={<p className="p-8 text-sm text-slate-500">Loading editor...</p>}><AssessmentEditor type="ACTIVITY" /></Suspense>;
}
