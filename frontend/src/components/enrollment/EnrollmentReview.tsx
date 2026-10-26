'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { ArrowLeft, CheckCheck, FilePenLine, Link2, Loader2, Save, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { useStudents } from '@/src/context/StudentContext';
import { applicationEvent, applicationName, type EnrollmentApplication } from '@/src/lib/enrollment';
import { mapReviewedApplication } from '@/src/lib/enrollment-mapping';
import { getCurrentUser, normalizeUserRole } from '@/src/lib/auth-api';
import { formatCategoryLevel } from '@/src/lib/students-api';
import Modal from '@/src/components/ui/Modal';
import { ApplicationBadge, ApplicationHistory, ApplicationSummary, buttonClass, fieldClass, primaryClass, ProfileMessage } from './EnrollmentShared';
import ApplicationDocuments from './ApplicationDocuments';
import { getApplications, saveApplication } from './useEnrollment';

export default function EnrollmentReview({ application, role, onSaved }: { application: EnrollmentApplication; role: 'teacher' | 'admin'; onSaved: () => void }) {
  const auth = useAuth();
  const { refreshStudents } = useStudents();
  const [note, setNote] = useState('');
  const [email, setEmail] = useState(application.details.email);
  const [lrn, setLrn] = useState(application.details.lrn_number);
  const [program, setProgram] = useState('');
  const [modality, setModality] = useState(application.details.modality || 'FTF');
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<'map' | 'link' | null>(null);
  const lock = useRef(false);
  const actor = [auth.user?.first_name, auth.user?.last_name].filter(Boolean).join(' ') || 'Teacher';
  async function currentApplication() {
    const current = (await getApplications()).find(item => item.id === application.id);
    if (!current || current.revision !== application.revision || current.status !== 'ENROLLING') throw new Error('This application changed. Close it and refresh before making a decision.');
    return current;
  }
  async function decide(action: 'correct' | 'map' | 'link') {
    if (lock.current || role !== 'teacher') return;
    if (!note.trim()) { setError('Add review notes or clear correction instructions.'); return; }
    if (action !== 'correct' && !checked) { setError('Confirm that you reviewed the learner information, documents, and any assistance needs.'); return; }
    lock.current = true; setBusy(true); setError('');
    const work = async () => {
      const current = await currentApplication();
      const session = await getCurrentUser(true, true);
      if (!session || session.user_id !== auth.user?.user_id || normalizeUserRole(session) !== 'teacher') throw new Error('Your teacher session changed. Reload before continuing.');
      if (action === 'correct') {
        await saveApplication({ ...current, status: 'CORRECTION', feedback: note.trim(), history: [applicationEvent(actor, `Requested correction: ${note.trim()}`), ...current.history] });
      } else {
        const result = await mapReviewedApplication(current, { email, lrn, program, modality }, session.user_id!, 'teacher', action === 'link');
        try {
          await saveApplication({ ...current, status: 'MAPPED', mappedUserId: result.student.id, mappedAccountId: result.student.account_id, program: result.student.user_category, feedback: note.trim(), history: [applicationEvent(actor, `${result.linked ? 'Linked existing learner' : 'Mapped learner'} ${result.student.account_id}. ${note.trim()}`), ...current.history] });
        } catch {
          throw new Error('The learner record is saved in the system, but this browser application could not be updated. Refresh the queue and use Link existing learner after checking its LRN. Do not create another record.');
        }
        await refreshStudents();
      }
      onSaved();
    };
    try {
      if (navigator.locks) await navigator.locks.request(`als-enrollment:${application.id}`, work);
      else await work();
    } catch (err) { setError(err instanceof Error ? err.message : 'The review could not be saved.'); }
    finally { lock.current = false; setBusy(false); setConfirm(null); }
  }
  return <div className="space-y-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Online application · {application.reference}</p><h2 className="mt-2 text-xl font-semibold text-slate-900">{applicationName(application)}</h2></div><ApplicationBadge status={application.status} /></div><ApplicationSummary application={application} /><ApplicationDocuments application={application} /><ApplicationHistory application={application} />
    {application.feedback && <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-700">Latest staff feedback</p><p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-500">{application.feedback}</p></div>}
    {application.status === 'MAPPED' ? <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-blue-800"><UserCheck size={17} />Learner record linked</p><p className="text-xs leading-6 text-slate-500">{application.mappedAccountId} · {formatCategoryLevel(application.program)}. Account activation is checked against the live learner record.</p><Link href={role === 'admin' ? `/admin/create-account/${encodeURIComponent(application.mappedUserId || '')}` : `/teacher/learner-accounts/enrollment/${encodeURIComponent(application.mappedUserId || '')}`} className={primaryClass}><ShieldCheck size={14} />{role === 'admin' ? 'Review account activation' : 'Review learner record'}</Link></div> : role === 'admin' ? <ProfileMessage>Teachers review online applications and mark them as Mapped. Mapped learners then appear in your account activation queue.</ProfileMessage> : application.status === 'CORRECTION' ? <ProfileMessage>Waiting for the applicant to correct and resubmit this application from the public enrollment preview on this browser.</ProfileMessage> : <section className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/30 p-4 sm:p-5"><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><CheckCheck size={17} className="text-blue-600" />Teacher review</h3><p className="text-xs leading-6 text-slate-500">Mapping saves a real learner record through the existing system. Confirm the email, LRN, and placement before continuing. Documents remain in this browser application; no automatic authenticity check is performed.</p><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Confirmed email<input type="email" value={email} onChange={event => setEmail(event.target.value)} className={fieldClass} /></label><label className="text-xs font-semibold text-slate-600">Confirmed 12-digit LRN<input value={lrn} inputMode="numeric" maxLength={12} onChange={event => setLrn(event.target.value.replace(/\D/g, ''))} className={fieldClass} /></label><label className="text-xs font-semibold text-slate-600">Learning program<select value={program} onChange={event => setProgram(event.target.value)} className={fieldClass}><option value="">Select program</option>{['BLP', 'ELEMENTARY', 'SECONDARY'].map(value => <option key={value} value={value}>{formatCategoryLevel(value)}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Confirmed modality<select className={fieldClass} value={modality} onChange={event => setModality(event.target.value)}><option value="FTF">Face-to-face</option><option value="BLENDED">Blended</option></select></label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Review notes / correction instructions<textarea value={note} onChange={event => setNote(event.target.value)} rows={3} maxLength={2000} className={fieldClass} placeholder="Explain the review decision and any help the learner needs." /></label><label className="flex items-start gap-2 text-xs leading-6 text-slate-600 sm:col-span-2"><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} className="mt-1 size-4 shrink-0 accent-blue-600" />I reviewed the learner details, available documents, assistance needs, and placement.</label></fieldset>{error && <ProfileMessage error>{error}</ProfileMessage>}<div className="flex flex-wrap justify-end gap-2 border-t border-blue-100 pt-4"><button type="button" disabled={busy} onClick={() => decide('correct')} className={buttonClass}>{busy ? <Loader2 size={14} className="animate-spin" /> : <FilePenLine size={14} />}Request correction</button><button type="button" disabled={busy || !checked} onClick={() => setConfirm('link')} className={buttonClass}><Link2 size={14} />Link existing learner</button><button type="button" disabled={busy || !checked} onClick={() => setConfirm('map')} className={primaryClass}><UserCheck size={14} />Mark as Mapped</button></div></section>}
    {confirm && <Modal title={confirm === 'link' ? 'Link an existing learner?' : 'Save a mapped learner?'} pending={busy} onClose={() => setConfirm(null)}><p className="text-sm leading-7 text-slate-500">{confirm === 'link' ? 'The system will look for this LRN and confirm the learner name and birth date before linking the application. It will not create a duplicate account.' : 'This creates a learner record in the system using the reviewed details. An admin creates the student login account afterward.'}</p>{error && <ProfileMessage error>{error}</ProfileMessage>}<div className="mt-6 flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setConfirm(null)} className={buttonClass}><ArrowLeft size={14} />Back to review</button><button type="button" disabled={busy} onClick={() => decide(confirm)} className={primaryClass}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{busy ? 'Saving…' : confirm === 'link' ? 'Confirm link' : 'Save mapped learner'}</button></div></Modal>}
  </div>;
}
