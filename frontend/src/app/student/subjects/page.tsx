'use client';

import StudentPageHeader, { studentHeaderActionClass, studentContentCardClass } from '@/src/components/layout/student/StudentPageHeader';

import Link from 'next/link';

import { useStudentSubjects } from '@/src/context/StudentSubjectsContext';
import { subjectHref } from '@/src/lib/student-subjects';
import ApiState from '@/src/components/ui/ApiState';

export default function StudentSubjectsPage() {
  const { subjects, program, loading, error, reload } = useStudentSubjects();
  return <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <StudentPageHeader eyebrow={program?.name || 'Student Portal'} title="My Subjects" description="Choose a subject to see the activities, quizzes, and exams assigned by your teacher." actions={<button type="button" onClick={reload} disabled={loading} className={studentHeaderActionClass}>Refresh subjects</button>} />
    <ApiState loading={loading} error={error} onRetry={reload} />
    {!loading && !error && <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {subjects.map(subject => <Link key={subject.subject_id} href={subjectHref(subject.subject_id)} className={studentContentCardClass}>

        <h2 className="text-lg font-semibold text-slate-900">{subject.name}</h2><p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{subject.description || 'View your assigned assessments for this subject.'}</p>
        <span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-blue-600">View assessments </span>
      </Link>)}
      {!subjects.length && <p className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500 md:col-span-2 xl:col-span-3">No subjects are available for your learning program yet. Check with your teacher or refresh after subjects have been added.</p>}
    </div>}
  </div>;
}
