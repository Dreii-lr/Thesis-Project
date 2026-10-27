'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Check, FileCheck2, FlaskConical, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Trash2, Users } from 'lucide-react';
import { useOptionalAuth } from '@/src/context/AuthContext';
import StudentPageHeader, { studentHeaderActionClass } from '@/src/components/layout/student/StudentPageHeader';
import Modal from '@/src/components/ui/Modal';
import { REQUIREMENTS, STATUS_LABELS, formatRequirementDate, isSatisfied, reviewRequirement, type RequirementRecord, type RequirementStatus, type ReviewerRole } from '@/src/lib/requirements';
import { DemoNotice, RequirementError, RequirementIcon, RequirementStats, StatusBadge, SubmissionDetails, buttonClass, fieldClass, primaryClass } from './RequirementShared';
import { clearSampleRequirements, saveRequirement, useRequirements } from './useRequirements';

export default function StaffRequirements({ role }: { role: ReviewerRole }) {
  const params = useSearchParams();
  const requestedLearner = params.get('learner') || '';
  const { records, loading, error, reload } = useRequirements();
  const [search, setSearch] = useState(requestedLearner);
  const [status, setStatus] = useState('all');
  const [program, setProgram] = useState('all');
  const [type, setType] = useState('all');
  const [tab, setTab] = useState<'queue' | 'guide'>('queue');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [pending, setPending] = useState(false);
  const actionLock = useRef(false);
  const selected = records.find(record => record.id === selectedId);
  const reviews = records.filter(record => record.status === 'review');
  const visible = records.filter(record => (status === 'all' || record.status === status) && (program === 'all' || record.program === program) && (type === 'all' || record.requirementId === type) && `${record.learnerName} ${record.email} ${record.versions[0]?.fileName || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const programs = Array.from(new Set(records.map(record => record.program))).sort();
  async function samples(remove = false) {
    if (actionLock.current) return;
    actionLock.current = true; setPending(true); setActionError('');
    try {
      if (remove) { await clearSampleRequirements(records); setNotice('Illustrative samples removed. Learner submissions were preserved.'); }
      else {
        const at = new Date().toISOString();
        const samples: { key: string; name: string; program: string; requirementId: RequirementRecord['requirementId']; status: RequirementStatus; type: string; note: string }[] = [
          { key: 'ana-birth', name: 'Ana Santos', program: 'ELEMENTARY', requirementId: 'birth', status: 'auto_verified', type: 'Local Civil Registrar Birth Certificate', note: 'Illustrative automatic result: accepted alternative, readable birth date, and matching learner name.' },
          { key: 'miguel-school', name: 'Miguel Reyes', program: 'SECONDARY', requirementId: 'school', status: 'review', type: 'School-record assistance', note: 'I cannot obtain my previous school records. Please help me find an alternative.' },
          { key: 'lea-id', name: 'Lea Cruz', program: 'BLP', requirementId: 'identity', status: 'correction', type: 'Barangay Clearance', note: 'Illustrative correction: the lower part is cut off. Please upload the complete document.' },
          { key: 'paolo-school', name: 'Paolo Ramos', program: 'SECONDARY', requirementId: 'school', status: 'review', type: 'Form 138 / Report Card', note: 'Illustrative review: the learner name needs comparison with the profile.' },
        ];
        for (const item of samples) {
          const id = `sample:${item.key}`;
          if (records.some(record => record.id === id)) continue;
          const assistance = item.type === 'School-record assistance';
          await saveRequirement({ id, ownerId: id, learnerName: item.name, email: `${item.key}@example.invalid`, program: item.program, requirementId: item.requirementId, status: item.status, note: item.note, updatedAt: at, sample: true,
            versions: [{ id: crypto.randomUUID(), at, type: item.type, fileName: assistance ? '' : 'Illustrative sample.pdf', fileSize: 0, mime: 'application/pdf', status: item.status, note: item.note, scenario: assistance ? 'assistance' : item.status === 'auto_verified' ? 'pass' : item.status === 'review' ? 'review' : 'correction' }],
            events: [{ id: crypto.randomUUID(), at, actor: 'Sample data', message: item.note }] });
        }
        setNotice('Illustrative submissions loaded. Open a sample to try the review flow.');
      }
    } catch (err) { setActionError(err instanceof Error ? err.message : 'The sample records could not be updated.'); }
    finally { actionLock.current = false; setPending(false); }
  }
  return <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <StudentPageHeader eyebrow={role === 'admin' ? 'Learner management · Verification workspace' : 'Learner management · Document support'} title={role === 'admin' ? 'Requirements & verification' : 'Student requirements'} description={role === 'admin' ? 'Keep learner records moving. Resolve exceptions, review automated outcomes, and make clear verification decisions.' : 'Help learners complete their records. Follow submitted documents, resolve questions, and send exceptions for an admin decision.'} actions={<button type="button" className={studentHeaderActionClass} onClick={reload} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /><span className="ml-2">Refresh records</span></button>}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-blue-100"><span className="flex items-center gap-2"><ShieldCheck size={16} />Automatic checks handle qualifying submissions</span><span className="flex items-center gap-2"><Users size={16} />Staff handle exceptions and assistance</span></div>
    </StudentPageHeader>
    <DemoNotice />
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">{([{ id: 'queue', label: 'Submissions' }, { id: 'guide', label: 'Acceptance guide' }] as const).map(item => <button key={item.id} type="button" aria-pressed={tab === item.id} onClick={() => setTab(item.id)} className={`rounded-lg px-4 py-2.5 text-xs font-semibold ${tab === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:text-slate-700'}`}>{item.label}</button>)}</div><div className="flex flex-wrap gap-2"><button type="button" disabled={pending || loading || Boolean(error)} onClick={() => samples()} className={buttonClass}><FlaskConical size={14} />Load sample submissions</button>{records.some(record => record.sample) && <button type="button" disabled={pending} onClick={() => samples(true)} className={buttonClass}><Trash2 size={13} />Remove samples</button>}</div></div>
    {notice && <p role="status" className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800"><Check size={15} />{notice}<button type="button" className="ml-auto px-2 font-semibold" onClick={() => setNotice('')}>Dismiss</button></p>}
    {(error || actionError) && <RequirementError message={error || actionError} />}
    <RequirementStats items={[{ label: 'Needs staff review', value: loading || error ? '—' : reviews.length, detail: 'Uncertain details and school-record assistance' }, { label: 'Automatically verified', value: loading || error ? '—' : records.filter(record => record.status === 'auto_verified').length, detail: 'Simulated successful document checks' }, { label: 'Learners with submissions', value: loading || error ? '—' : new Set(records.map(record => record.ownerId)).size, detail: 'Records saved in this browser demonstration' }]} />
    {tab === 'guide' ? <AcceptanceGuide role={role} /> : <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-800">Document submissions</h2><p className="mt-1 text-[11px] text-slate-400">{visible.length} matching records · latest submission per requirement</p></div><button type="button" onClick={() => { setStatus('review'); setSearch(''); setProgram('all'); setType('all'); }} className={buttonClass}><SlidersHorizontal size={14} />Review queue · {reviews.length}</button></div>
      <div className="grid gap-3 border-b border-slate-100 bg-slate-50/40 p-4 sm:grid-cols-2 xl:grid-cols-4"><label className="text-[11px] font-semibold text-slate-500">Search learners<div className="relative"><Search size={14} className="pointer-events-none absolute left-3 top-5 text-slate-400" /><input className={`${fieldClass} pl-9`} value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, email, or filename" /></div></label><label className="text-[11px] font-semibold text-slate-500">Status<select className={fieldClass} value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-[11px] font-semibold text-slate-500">Program<select className={fieldClass} value={program} onChange={event => setProgram(event.target.value)}><option value="all">All programs</option>{programs.map(value => <option key={value}>{value}</option>)}</select></label><label className="text-[11px] font-semibold text-slate-500">Requirement<select className={fieldClass} value={type} onChange={event => setType(event.target.value)}><option value="all">All requirements</option>{REQUIREMENTS.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>
      {loading ? <p role="status" className="p-12 text-center text-xs text-slate-400">Loading submitted requirements…</p> : error ? <div className="p-8 text-center"><p className="mb-3 text-xs text-slate-500">Reconnect to browser storage to restore the review queue.</p><button type="button" className={buttonClass} onClick={reload}>Retry loading</button></div> : visible.length ? <div className="space-y-3 p-4 sm:p-5">{visible.map(record => <article key={record.id} className="rounded-xl border border-slate-200/80 p-4 transition hover:border-blue-200 sm:p-5"><div className="flex flex-wrap items-start gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><RequirementIcon id={record.requirementId} size={20} /></span><div className="min-w-0 flex-1 basis-40"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-slate-800">{record.learnerName}</h3>{record.sample && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400">SAMPLE</span>}</div><p className="mt-1 break-all text-[11px] text-slate-400">{record.email} · {record.program}</p></div><StatusBadge status={record.status} /></div><div className="mt-3 flex flex-col items-stretch gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-600">{REQUIREMENTS.find(item => item.id === record.requirementId)?.title}</p><p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-400">{record.note}</p><p className="mt-1 text-[10px] text-slate-400">Updated {formatRequirementDate(record.updatedAt)} · {record.versions.length} submission{record.versions.length === 1 ? '' : 's'}</p></div><button type="button" className={buttonClass} onClick={() => setSelectedId(record.id)}>{role === 'admin' ? 'Review & decide' : 'Open submission'}<ArrowRight size={13} /></button></div></article>)}</div> : <div className="flex flex-col items-center px-6 py-14 text-center"><span className="rounded-2xl bg-blue-50 p-4 text-blue-500"><FileCheck2 size={30} strokeWidth={1.4} /></span><h3 className="mt-4 text-sm font-semibold text-slate-800">{records.length ? 'No submissions match these filters' : 'Your requirements workspace is ready'}</h3><p className="mt-2 max-w-sm text-xs leading-6 text-slate-400">{records.length ? 'Try another status, program, or learner name.' : 'Student demo uploads appear here when saved in this browser. You can also load illustrative samples to explore the review flow.'}</p>{records.length > 0 && <button type="button" onClick={() => { setSearch(''); setStatus('all'); setProgram('all'); setType('all'); }} className={`${buttonClass} mt-4`}>Clear filters</button>}</div>}
    </section>}
    {selected && <ReviewDialog key={`${selected.id}:${selected.updatedAt}`} record={selected} role={role} onClose={() => setSelectedId(null)} onSaved={() => { setSelectedId(null); setNotice('Review decision saved. The student checklist in this browser will show the update.'); }} />}
  </div>;
}

function ReviewDialog({ record, role, onClose, onSaved }: { record: RequirementRecord; role: ReviewerRole; onClose: () => void; onSaved: () => void }) {
  const auth = useOptionalAuth();
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<'verify' | 'exempt' | 'correct' | 'forward'>(role === 'admin' ? record.versions[0]?.fileName ? 'verify' : 'exempt' : 'forward');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function save() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const actor = `${auth?.user?.full_name || auth?.user?.email || role} (${role})`;
      await saveRequirement(reviewRequirement(record, role, decision, note, actor), undefined, record.updatedAt);
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'This decision could not be saved.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Modal title={`${record.learnerName} · Requirement review`} onClose={onClose} pending={busy}><div className="space-y-5"><p className="break-all text-xs text-slate-400">{record.email} · {record.program}{record.sample ? ' · Illustrative sample' : ''}</p><SubmissionDetails record={record} /><div className="space-y-4 border-t border-slate-100 pt-5"><h3 className="text-sm font-semibold text-slate-800">{role === 'admin' ? 'Admin decision' : 'Teacher review'}</h3>{role === 'teacher' && <p className="text-xs leading-6 text-slate-500">Help the learner correct their submission, or send the case for an admin decision. Final manual verification and exemptions belong to admins.</p>}<label className="block text-xs font-semibold text-slate-600">Next action<select disabled={busy} className={fieldClass} value={decision} onChange={event => setDecision(event.target.value as typeof decision)}>{role === 'admin' ? <><option value="verify" disabled={!record.versions[0]?.fileName}>Verify document</option>{record.requirementId === 'school' && <option value="exempt">Approve school-record exemption</option>}</> : <option value="forward">Forward to admin</option>}<option value="correct">Request correction / reopen for correction</option></select></label><label className="block text-xs font-semibold text-slate-600">Reason or feedback <span className="font-normal text-slate-400">(required · visible to student)</span><textarea disabled={busy} className={fieldClass} rows={3} value={note} maxLength={1000} onChange={event => setNote(event.target.value)} placeholder="Explain the decision and any next steps for the learner." /></label>{error && <RequirementError message={error} />}<div className="flex justify-end gap-2"><button type="button" onClick={onClose} disabled={busy} className={buttonClass}>Close</button><button type="button" onClick={save} disabled={busy || !note.trim()} className={primaryClass}>{busy ? 'Saving…' : 'Save demo decision'}</button></div></div></div></Modal>;
}

function AcceptanceGuide({ role }: { role: ReviewerRole }) {
  return <div className="grid items-start gap-4 lg:grid-cols-3">{REQUIREMENTS.map(item => <section key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5"><span className="inline-flex rounded-xl bg-blue-50 p-3 text-blue-600"><RequirementIcon id={item.id} /></span><h2 className="mt-4 text-sm font-semibold text-slate-800">{item.title}</h2><p className="mt-2 text-xs leading-6 text-slate-500">{item.description}</p><ul className="mt-4 space-y-2">{item.types.map(type => <li key={type} className="flex gap-2 text-xs leading-5 text-slate-600"><Check size={13} className="mt-1 shrink-0 text-blue-600" />{type}</li>)}</ul><p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-500">{item.guidance}</p><p className="mt-3 text-[11px] leading-6 text-slate-400">{role === 'admin' ? 'This frontend preview uses the supplied acceptance list. Production acceptance rules and real automatic checks need a server integration.' : 'Uncertain details go to review. Only admins can approve manual verification or school-record exemptions.'}</p></section>)}</div>;
}

export function LearnerRequirementsSummary({ email, role }: { email: string; role: ReviewerRole }) {
  const { records, loading, error } = useRequirements();
  const own = email ? records.filter(record => record.email.trim().toLowerCase() === email.trim().toLowerCase()) : [];
  return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-800">Enrollment requirements</h2><p className="mt-1 text-xs text-slate-400">{loading ? 'Loading…' : `${own.filter(record => isSatisfied(record.status)).length} of 3 satisfied in this browser demo`}</p></div><Link href={`/${role}/requirements?learner=${encodeURIComponent(email)}`} className={buttonClass}>Open requirements<ArrowRight size={13} /></Link></div><DemoNotice />{error ? <RequirementError message={error} /> : !loading && <div className="space-y-2">{REQUIREMENTS.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><span className="flex items-center gap-2 text-xs font-medium text-slate-600"><RequirementIcon id={item.id} size={17} />{item.title}</span><StatusBadge status={own.find(record => record.requirementId === item.id)?.status} /></div>)}</div>}</section>;
}
