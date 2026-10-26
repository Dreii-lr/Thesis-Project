'use client';

import Link from 'next/link';
import { ClipboardList, GraduationCap, UsersRound } from 'lucide-react';
import EnrollmentWorkspace from '@/src/components/enrollment/EnrollmentWorkspace';
import LearnerAccounts from './LearnerAccounts';

export default function LearnerAccountsWorkspace({ tab }: { tab: 'students' | 'enrollment' }) {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="portal-hero flex items-center justify-between gap-5 rounded-2xl px-6 py-7 text-white sm:px-8">
        <div>
          <p className="text-[11px] font-medium text-blue-100">Learner management · Teacher workspace</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Learner Accounts</h1>
          <p className="mt-3 max-w-2xl text-xs leading-6 text-blue-50">Manage student records and enrollment in one place. Review applicants, map learners, and follow their progress after account activation.</p>
        </div>
        <span className="hidden rounded-2xl border border-white/15 bg-white/10 p-4 sm:inline-flex"><GraduationCap size={32} strokeWidth={1.5} /></span>
      </section>

      <nav aria-label="Learner account sections" className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 sm:inline-flex">
        {([
          { id: 'students', label: 'Students', href: '/teacher/learner-accounts', icon: UsersRound },
          { id: 'enrollment', label: 'Enrollment', href: '/teacher/learner-accounts?tab=enrollment', icon: ClipboardList },
        ] as const).map(item => (
          <Link key={item.id} href={item.href} scroll={false} aria-current={tab === item.id ? 'page' : undefined} className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-semibold transition ${tab === item.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'}`}>
            <item.icon size={16} />{item.label}
          </Link>
        ))}
      </nav>

      <section hidden={tab !== 'students'} aria-label="Students tab"><LearnerAccounts /></section>
      <section hidden={tab !== 'enrollment'} aria-label="Enrollment tab"><EnrollmentWorkspace role="teacher" embedded /></section>
    </div>
  );
}
