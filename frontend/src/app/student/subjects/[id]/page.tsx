'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useStudentSubjects } from '@/src/context/StudentSubjectsContext';
import ApiState from '@/src/components/ui/ApiState';
import SubjectAssessments from '@/src/components/learners/SubjectAssessments';

export default function StudentSubjectPage() {
  const { id } = useParams<{ id: string }>();
  const { subjects, program, loading, error, reload } = useStudentSubjects();
  const subject = subjects.find(item => item.subject_id === id);
  return <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <ApiState loading={loading} error={error} onRetry={reload} />
    {!loading && !error && (subject && program ? <SubjectAssessments key={id} subject={subject} programName={program.name} /> : <div className="rounded-xl border border-slate-200 bg-white p-8"><h1 className="text-lg font-semibold text-slate-900">Subject unavailable</h1><p className="mt-2 text-sm text-slate-500">This subject is not available in your learning program.</p><Link href="/student/subjects" className="mt-6 inline-block text-sm font-semibold text-blue-600">Return to My Subjects</Link></div>)}
  </div>;
}
