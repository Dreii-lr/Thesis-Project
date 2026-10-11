'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { useStudents } from '@/src/context/StudentContext';
import ApiState from '@/src/components/ui/ApiState';
import { formatCategoryLevel } from '@/src/lib/students-api';

export default function AddStudentAccountPage() {
  const { students, isLoading, error, refreshStudents } = useStudents();
  const [search, setSearch] = useState('');
  const mapped = students.filter(student => student.status === 'MAPPED' &&
    [student.first_name, student.last_name, student.student_id, student.personal_details.lrn_number].join(' ').toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Link href="/teacher/create-account" className="mb-5 inline-flex items-center gap-2 text-sm text-blue-600"><ArrowLeft size={16} /> Back to accounts</Link>
      <h1 className="text-2xl font-bold">Create Learner Account</h1>
      <p className="mt-2 text-sm text-slate-500">Choose a learner mapped by an admin. Review their details, then enroll them to create their account.</p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label htmlFor="mapped-search" className="mb-2 block text-sm font-semibold">Search mapped learners</label>
        <div className="relative max-w-md"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input id="mapped-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, student ID, or LRN" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" /></div>
        <ApiState loading={isLoading} error={error} onRetry={() => void refreshStudents()} />
        {!isLoading && !error && <div className="mt-5 divide-y divide-slate-100">
          {mapped.map(student => <Link key={student.id} href={`/teacher/create-account/${encodeURIComponent(student.id)}`} className="flex items-center justify-between gap-3 rounded-lg p-4 hover:bg-blue-50">
            <div><p className="font-semibold">{student.first_name} {student.last_name}</p><p className="mt-1 text-sm text-slate-500">{student.student_id || 'No student ID'} · {formatCategoryLevel(student.user_category)}</p></div><ArrowRight size={18} className="shrink-0 text-blue-600" />
          </Link>)}
          {!mapped.length && <p className="py-8 text-center text-sm text-slate-500">No mapped learners match your search. An admin must map a learner before an account can be created.</p>}
        </div>}
      </div>
    </div>
  );
}
