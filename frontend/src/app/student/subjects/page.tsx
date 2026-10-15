'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, RefreshCw } from 'lucide-react';
import { useStudentSubjects } from '@/src/context/StudentSubjectsContext';
import { subjectHref } from '@/src/lib/student-subjects';
import ApiState from '@/src/components/ui/ApiState';

export default function StudentSubjectsPage() {
  const { subjects, program, loading, error, reload } = useStudentSubjects();
  return <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">{program?.name || 'Student Portal'}</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">My Subjects</h1><p className="mt-2 text-sm text-slate-500">Choose a subject to see the activities, quizzes, and exams assigned by your teacher.</p></div>
      <button type="button" onClick={reload} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh subjects</button>
    </div>
    <ApiState loading={loading} error={error} onRetry={reload} />
    {!loading && !error && <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {subjects.map(subject => <Link key={subject.subject_id} href={subjectHref(subject.subject_id)} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-300">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><BookOpen size={22} /></span>
        <h2 className="mt-4 text-lg font-bold text-slate-900">{subject.name}</h2><p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{subject.description || 'View your assigned assessments for this subject.'}</p>
        <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-blue-600">View assessments <ArrowRight size={14} /></span>
      </Link>)}
      {!subjects.length && <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500 md:col-span-2 xl:col-span-3">No subjects are available for your learning program yet. Check with your teacher or refresh after subjects have been added.</p>}
    </div>}
  </div>;
}
