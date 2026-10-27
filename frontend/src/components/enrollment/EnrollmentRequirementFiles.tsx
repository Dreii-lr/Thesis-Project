'use client';

import { useAuth } from '@/src/context/AuthContext';
import { useEnrollment } from './useEnrollment';
import ApplicationDocuments from './ApplicationDocuments';
import { ProfileMessage } from './EnrollmentShared';

export default function EnrollmentRequirementFiles({ email, learnerId }: { email?: string; learnerId?: string }) {
  const { user, role } = useAuth();
  const { applications, error } = useEnrollment();
  const application = applications.find(item => item.mappedUserId && (role === 'student' ? item.mappedUserId === user?.user_id : learnerId ? item.mappedUserId === learnerId : Boolean(email) && item.details.email.toLowerCase() === email?.toLowerCase()));
  if (error) return <ProfileMessage error>Enrollment application files could not be loaded: {error}</ProfileMessage>;
  if (!application) return null;
  return <section className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/30 p-4"><div><h2 className="text-sm font-semibold text-slate-800">Enrollment application documents</h2><p className="mt-2 text-xs leading-6 text-slate-500">{application.reference} · Original sample files retained on this browser. Their presence does not mark the separate requirements checklist as verified.</p></div><ApplicationDocuments application={application} /></section>;
}
