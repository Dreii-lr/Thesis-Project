'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, ClipboardList, FilePenLine, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { applicationName } from '@/src/lib/enrollment';
import { formatRequirementDate } from '@/src/lib/requirements';
import Modal from '@/src/components/ui/Modal';
import StudentPageHeader from '@/src/components/layout/student/StudentPageHeader';
import { ApplicationBadge, ApplicationHistory, ApplicationSummary, EnrollmentNotice, buttonClass, primaryClass, ProfileMessage } from './EnrollmentShared';
import { deleteDraft, useEnrollment } from './useEnrollment';
import ApplicationDocuments from './ApplicationDocuments';
import type { EnrollmentApplication } from '@/src/lib/enrollment';

export default function ApplicationStatus() {
  const requested = useSearchParams().get('application');
  const { applications, loading, error, reload } = useEnrollment();
  const [selected, setSelected] = useState<string | null>(requested);
  const [remove, setRemove] = useState<EnrollmentApplication | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const application = applications.find(item => item.id === selected);
  async function discard() {
    if (!remove || busy) return;
    setBusy(true); setActionError('');
    try { await deleteDraft(remove); if (selected === remove.id) setSelected(null); setRemove(null); }
    catch (err) { setActionError(err instanceof Error ? err.message : 'The draft could not be removed.'); }
    finally { setBusy(false); }
  }
  return <><StudentPageHeader eyebrow="ALS Bubukal · Application progress" title="My application" description="Follow your application, read teacher feedback, and return to any corrections. Applications shown here are saved on this browser." actions={<Link href="/enrollment" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white"><Plus size={15} />Start an application</Link>} /><EnrollmentNotice />
    {(error || actionError) && <ProfileMessage error>{error || actionError}<button type="button" onClick={reload} className="ml-3 inline-flex items-center gap-1 font-semibold underline"><RefreshCw size={13} />Refresh</button></ProfileMessage>}
    {loading ? <p role="status" className="p-8 text-center text-sm text-slate-500">Loading your applications…</p> : !applications.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><ClipboardList size={36} className="mx-auto text-blue-300" /><h2 className="mt-4 text-lg font-semibold text-slate-800">No applications on this browser</h2><p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500">Start a sample application to explore the enrollment process. Applications saved on another device will not appear in this frontend preview.</p><Link href="/enrollment" className={`${primaryClass} mt-5`}><Plus size={14} />Start application</Link></div> : <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]"><aside className="space-y-3">{applications.map(item => <article key={item.id} className={`rounded-2xl border bg-white p-4 ${item.id === selected ? 'border-blue-300 ring-2 ring-blue-50' : 'border-slate-200'}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-semibold text-slate-400">{item.reference}</p><ApplicationBadge status={item.status} /></div><h2 className="mt-3 break-words text-sm font-semibold text-slate-800">{applicationName(item)}</h2><p className="mt-2 text-[10px] text-slate-400">Updated {formatRequirementDate(item.updatedAt)}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setSelected(item.id)} className={buttonClass}><ArrowRight size={13} />View progress</button>{['DRAFT', 'CORRECTION'].includes(item.status) && <Link href={`/enrollment?resume=${encodeURIComponent(item.id)}`} className={buttonClass}><FilePenLine size={13} />{item.status === 'DRAFT' ? 'Continue' : 'Correct'}</Link>}{item.status === 'DRAFT' && <button type="button" aria-label={`Remove draft ${item.reference}`} onClick={() => { setActionError(''); setRemove(item); }} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={15} /></button>}</div></article>)}</aside><section className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">{application ? <><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">{application.reference}</p><h2 className="mt-2 text-xl font-semibold text-slate-900">{applicationName(application)}</h2></div><ApplicationBadge status={application.status} /></div><div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"><h3 className="text-sm font-semibold text-blue-800">{application.status === 'DRAFT' ? 'Your application is saved as a draft' : application.status === 'ENROLLING' ? 'Awaiting teacher review' : application.status === 'CORRECTION' ? 'Your application needs an update' : 'Teacher review completed'}</h3><p className="mt-2 text-xs leading-6 text-slate-600">{application.status === 'DRAFT' ? 'Complete the remaining steps and submit your application preview.' : application.status === 'ENROLLING' ? 'The teacher preview on this browser can review your details. Your student login has not been created yet.' : application.status === 'CORRECTION' ? application.feedback : 'A learner record has been linked in the system. An admin reviews mapped learners and creates their login accounts. This page does not confirm account activation or official DepEd enrollment.'}</p>{application.status === 'CORRECTION' && <Link href={`/enrollment?resume=${encodeURIComponent(application.id)}`} className={`${primaryClass} mt-4`}><FilePenLine size={14} />Update and resubmit</Link>}</div><ApplicationSummary application={application} /><ApplicationDocuments application={application} /><ApplicationHistory application={application} /></> : <div className="py-12 text-center"><ClipboardList size={32} className="mx-auto text-blue-300" /><p className="mt-3 text-sm text-slate-500">Choose an application to view its progress.</p></div>}</section></div>}
    {remove && <Modal title="Remove saved draft?" pending={busy} onClose={() => setRemove(null)}><p className="text-sm leading-7 text-slate-500">This removes {remove.reference} and its attached sample files from this browser. Submitted applications are retained.</p>{actionError && <ProfileMessage error>{actionError}</ProfileMessage>}<div className="mt-6 flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setRemove(null)} className={buttonClass}><ArrowRight size={14} />Keep draft</button><button type="button" disabled={busy} onClick={discard} className={`${buttonClass} border-rose-200 text-rose-700`}><Trash2 size={14} />{busy ? 'Removing…' : 'Remove draft'}</button></div></Modal>}
  </>;
}
