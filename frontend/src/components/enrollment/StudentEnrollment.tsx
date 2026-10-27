'use client';

import Link from 'next/link';
import { ArrowRight, BadgeCheck, FileCheck2, RefreshCw, UserRound } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { formatCategoryLevel } from '@/src/lib/students-api';
import StudentPageHeader, { studentHeaderActionClass } from '@/src/components/layout/student/StudentPageHeader';
import { ProfileFields } from '@/src/components/profile/ProfileShared';
import { ApplicationHistory, buttonClass, EnrollmentNotice, ProfileMessage } from './EnrollmentShared';
import { useEnrollment } from './useEnrollment';
import ApplicationDocuments from './ApplicationDocuments';

export default function StudentEnrollment() {
  const { user } = useAuth();
  const { applications, loading, error, reload } = useEnrollment();
  const linked = applications.find(application => application.mappedUserId === user?.user_id);
  const personal = user?.personal_details as { lrn_number?: string; learning_modalities?: string } | undefined;
  const status = typeof user?.status === 'string' ? user.status : '';
  return <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><StudentPageHeader eyebrow="Student workspace · Learner information" title="My Enrollment" description="Review the program and account information connected to your learner record. Keep your existing account when continuing your learning journey." actions={<button type="button" disabled={loading} onClick={reload} className={studentHeaderActionClass}><RefreshCw size={14} /><span className="ml-2">Refresh application</span></button>}><span className="inline-flex items-center gap-2 text-xs text-blue-100"><BadgeCheck size={16} />{status === 'ACTIVE' ? 'Your learner account is active' : 'Your learner account information'}</span></StudentPageHeader>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"><section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Current learner record</p><h2 className="mt-2 text-lg font-semibold text-slate-900">Learning and account details</h2></div><ProfileFields fields={[["Learner name", [user?.first_name, user?.middle_name, user?.last_name].filter(value => typeof value === 'string').join(' ')], ['Account ID', user?.account_id], ['Account status', status], ['Learning program', formatCategoryLevel(typeof user?.user_category === 'string' ? user.user_category : '')], ['LRN', personal?.lrn_number], ['Learning modality', personal?.learning_modalities === 'BLENDED' ? 'Blended' : personal?.learning_modalities === 'FTF' ? 'Face-to-face' : ''], ['Application reference', linked?.reference]]} /><p className="rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-500">Your teacher confirms your learning center, schedule, and enrollment arrangements. Portal account activation does not confirm an official DepEd LIS enrollment record. Please contact your teacher for the confirmed enrollment period and learning-center assignment.</p></section><aside className="space-y-4"><section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5"><FileCheck2 size={23} className="text-blue-600" /><h2 className="mt-3 text-sm font-semibold text-slate-800">Follow your requirements</h2><p className="mt-2 text-xs leading-6 text-slate-500">Open your checklist for document submissions, assistance, and staff feedback.</p><Link href="/student/requirements" className={`${buttonClass} mt-4`}><FileCheck2 size={14} />My requirements<ArrowRight size={13} /></Link></section><Link href="/student/profile" className={buttonClass}><UserRound size={14} />Review my profile<ArrowRight size={13} /></Link></aside></div>
    {error && <ProfileMessage error>{error}</ProfileMessage>}{linked && <section id="documents" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><div><h2 className="text-lg font-semibold text-slate-900">Your online application</h2><p className="mt-2 text-xs text-slate-500">{linked.reference} · Files submitted before account creation</p></div><EnrollmentNotice /><ApplicationDocuments application={linked} /><ApplicationHistory application={linked} /></section>}
  </div>;
}
