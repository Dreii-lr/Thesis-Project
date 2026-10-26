'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, ChevronRight, CircleHelp, FileCheck2, Loader2, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import Link from 'next/link';
import { useOptionalAuth } from '@/src/context/AuthContext';
import StudentPageHeader, { studentHeaderActionClass } from '@/src/components/layout/student/StudentPageHeader';
import Modal from '@/src/components/ui/Modal';
import { REQUIREMENTS, formatRequirementDate, isSatisfied, type RequirementId } from '@/src/lib/requirements';
import { DemoNotice, RequirementError, RequirementIcon, RequirementStats, StatusBadge, SubmissionDetails, buttonClass, primaryClass } from './RequirementShared';
import RequirementUpload, { AssistanceRequest, type RequirementLearner } from './RequirementUpload';
import { useRequirements } from './useRequirements';
import EnrollmentRequirementFiles from '@/src/components/enrollment/EnrollmentRequirementFiles';

export default function StudentRequirements() {
  const auth = useOptionalAuth();
  if (auth?.isLoading) return <p role="status" className="p-8 text-sm text-slate-500">Opening your requirements…</p>;
  const user = auth?.user;
  const ownerId = String(user?.user_id || user?.id || user?.email || '');
  if (!user || !ownerId) return <div className="p-6"><RequirementError message="Your learner account could not be loaded. Refresh your session to continue." /></div>;
  const learner: RequirementLearner = { ownerId, learnerName: user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email, email: user.email, program: String(user.user_category || 'Unassigned program') };
  return <LearnerRequirements key={ownerId} learner={learner} />;
}

function LearnerRequirements({ learner }: { learner: RequirementLearner }) {
  const { records, loading, error, reload } = useRequirements();
  const own = records.filter(record => record.ownerId === learner.ownerId);
  const [uploadId, setUploadId] = useState<RequirementId | null>(null);
  const [viewId, setViewId] = useState<RequirementId | null>(null);
  const [assistance, setAssistance] = useState(false);
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<'all' | 'action' | 'satisfied'>('all');
  const getRecord = (id: RequirementId) => own.find(record => record.requirementId === id);
  const satisfied = own.filter(record => isSatisfied(record.status)).length;
  const waiting = own.filter(record => record.status === 'review').length;
  const action = REQUIREMENTS.filter(item => !getRecord(item.id) || getRecord(item.id)?.status === 'correction').length;
  const visible = REQUIREMENTS.filter(item => filter === 'all' || (filter === 'satisfied' ? isSatisfied(getRecord(item.id)?.status) : !getRecord(item.id) || getRecord(item.id)?.status === 'correction'));
  const viewing = viewId ? getRecord(viewId) : undefined;
  function saved() { setUploadId(null); setAssistance(false); setNotice('Your submission was saved in this browser. Check its result below.'); }
  return <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <StudentPageHeader eyebrow="Student records · Enrollment documents" title="My requirements" description="A clear path to a complete learner record. Submit your documents, follow their progress, and get help when you need it." actions={<button type="button" className={studentHeaderActionClass} disabled={loading} onClick={reload}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /><span className="ml-2">Refresh</span></button>}>
      <div className="flex flex-wrap items-center gap-5"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20"><ShieldCheck size={26} strokeWidth={1.5} /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold">Your document checklist</span><span className="text-blue-100">{loading ? 'Loading…' : `${satisfied} of 3 satisfied`}</span></div><div role="progressbar" aria-label="Requirements satisfied" aria-valuenow={satisfied} aria-valuemin={0} aria-valuemax={3} className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${satisfied / 3 * 100}%` }} /></div><p className="mt-2 text-[11px] text-blue-100">Verified documents and approved exemptions count toward completion.</p></div></div>
    </StudentPageHeader>
    <DemoNotice />
    <EnrollmentRequirementFiles />
    {notice && <p role="status" className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800"><Check size={16} />{notice}<button type="button" onClick={() => setNotice('')} className="ml-auto px-2 font-semibold">Dismiss</button></p>}
    {error && <div className="space-y-2"><RequirementError message={error} /><button type="button" className={buttonClass} onClick={reload}>Retry loading</button></div>}
    <RequirementStats items={[{ label: 'Requirements satisfied', value: loading || error ? '—' : `${satisfied} / 3`, detail: 'Verified documents or approved exemptions' }, { label: 'Awaiting a staff decision', value: loading || error ? '—' : waiting, detail: 'Your files and requests are retained' }, { label: 'Your next steps', value: loading || error ? '—' : action, detail: 'Missing documents or requested corrections' }]} />
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_285px]">
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Your requirements</h2><p className="mt-1 text-[11px] text-slate-400">One accepted document per requirement</p></div><div className="flex flex-wrap gap-1 rounded-xl bg-slate-50 p-1" aria-label="Filter requirements">{([{ value: 'all', label: 'All' }, { value: 'action', label: 'Action needed' }, { value: 'satisfied', label: 'Satisfied' }] as const).map(item => <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} className={`rounded-lg px-3 py-2 text-[11px] font-semibold ${filter === item.value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>{item.label}</button>)}</div></div>
        {loading ? <p role="status" className="flex items-center justify-center gap-2 p-12 text-xs text-slate-400"><Loader2 size={17} className="animate-spin" />Loading your checklist…</p> : error ? <p className="p-8 text-center text-xs text-slate-500">Reconnect to browser storage to view or submit requirements.</p> : <div className="space-y-3 p-4 sm:p-5">{visible.map(item => {
          const record = getRecord(item.id);
          return <article key={item.id} className="rounded-xl border border-slate-200/80 p-4 sm:p-5"><div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><RequirementIcon id={item.id} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-800">{item.title}</h3><StatusBadge status={record?.status} /></div><p className="mt-2 text-xs leading-6 text-slate-500">{item.description}</p>{item.conditional && <span className="mt-1 inline-block rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">If applicable · assistance available</span>}</div></div>
            <details className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5"><summary className="cursor-pointer text-[11px] font-semibold text-slate-600">Accepted documents & guidance</summary><ul className="mt-3 space-y-1.5">{item.types.map(type => <li key={type} className="flex items-start gap-2 text-xs leading-5 text-slate-500"><Check size={12} className="mt-1 shrink-0 text-blue-600" />{type}</li>)}</ul><p className="mt-3 text-xs leading-6 text-slate-500">{item.guidance}</p></details>
            {record && <div className={`mt-3 rounded-lg px-3 py-2.5 text-xs leading-6 ${record.status === 'correction' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500'}`}><p>{record.note}</p><p className="mt-1 text-[10px] opacity-75">Updated {formatRequirementDate(record.updatedAt)}</p></div>}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">{item.id === 'school' && !isSatisfied(record?.status) ? <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600" onClick={() => setAssistance(true)}><CircleHelp size={14} />Need help with records?</button> : <span className="text-[10px] text-slate-400">PDF or image · up to 10 MB</span>}<div className="ml-auto flex flex-wrap gap-2">{record && <button type="button" className={buttonClass} onClick={() => setViewId(item.id)}>View details<ChevronRight size={13} /></button>}<button type="button" className={record ? buttonClass : primaryClass} onClick={() => setUploadId(item.id)}><Upload size={14} />{record ? 'Upload replacement' : 'Upload document'}</button></div></div>
          </article>;
        })}{!visible.length && <div className="flex flex-col items-center gap-3 py-12 text-center"><FileCheck2 size={30} className="text-blue-300" /><p className="text-sm font-semibold text-slate-700">{filter === 'action' ? 'No uploads need your attention' : 'No satisfied requirements yet'}</p><p className="text-xs text-slate-400">{filter === 'action' ? 'You can check the progress of your submitted documents in All.' : 'Submit a document to start completing your checklist.'}</p><button type="button" className={buttonClass} onClick={() => setFilter('all')}>View all requirements</button></div>}</div>}
      </section>
      <aside className="space-y-4"><section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-5"><span className="inline-flex rounded-xl bg-white p-2.5 text-blue-600 ring-1 ring-blue-100"><ShieldCheck size={22} strokeWidth={1.6} /></span><h2 className="mt-4 text-sm font-semibold text-slate-800">What happens after upload?</h2><ol className="mt-4 space-y-4">{[{ title: 'Submit a clear document', text: 'Choose an accepted type and preview every page.' }, { title: 'Follow the check result', text: 'This demo previews automatic verification, staff review, or correction.' }, { title: 'Get support when needed', text: 'Teachers help resolve issues. Admins make exception decisions.' }].map((step, index) => <li key={step.title} className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">{index + 1}</span><div><p className="text-xs font-semibold text-slate-700">{step.title}</p><p className="mt-1 text-[11px] leading-5 text-slate-400">{step.text}</p></div></li>)}</ol></section><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold text-slate-800">A few helpful tips</h2><p className="mt-3 text-xs leading-6 text-slate-500">Use even lighting, keep all edges visible, and avoid glare. Accepted birth-document alternatives count toward the same requirement.</p><Link href="/student/profile" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-600">View my profile<ArrowUpRight size={13} /></Link></section></aside>
    </div>
    {uploadId && <RequirementUpload key={uploadId} requirementId={uploadId} learner={learner} previous={getRecord(uploadId)} onClose={() => setUploadId(null)} onSaved={saved} />}
    {assistance && <AssistanceRequest learner={learner} previous={getRecord('school')} onClose={() => setAssistance(false)} onSaved={saved} />}
    {viewing && <Modal title="Your submission" onClose={() => setViewId(null)}><SubmissionDetails key={`${viewing.id}:${viewing.updatedAt}`} record={viewing} /></Modal>}
  </div>;
}
