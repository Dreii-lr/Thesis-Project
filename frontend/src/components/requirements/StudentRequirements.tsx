'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, ChevronRight, CircleHelp, FileCheck2, Loader2, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import Link from 'next/link';
import { useOptionalAuth } from '@/src/context/AuthContext';
import StudentPageHeader, { studentHeaderActionClass } from '@/src/components/layout/student/StudentPageHeader';
import Modal from '@/src/components/ui/Modal';
import { REQUIREMENTS, formatRequirementDate, isSatisfied, type RequirementId, type RequirementItem } from '@/src/lib/requirements';
import { getDefaultRequirements } from '@/src/lib/requirements-api';
import { RequirementError, RequirementIcon, RequirementStats, StatusBadge, SubmissionDetails, buttonClass, primaryClass } from './RequirementShared';
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
  const [requirementsList, setRequirementsList] = useState<RequirementItem[]>(REQUIREMENTS);
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    void getDefaultRequirements()
      .then(items => {
        if (active && items.length > 0) {
          setRequirementsList(items);
        }
      })
      .catch(err => {
        console.warn('Failed to fetch dynamic student requirements catalog:', err);
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => { active = false; };
  }, []);

  const refreshAll = async () => {
    setCatalogLoading(true);
    try {
      const [_, items] = await Promise.all([
        reload(),
        getDefaultRequirements(),
      ]);
      if (items && items.length > 0) {
        setRequirementsList(items);
      }
    } finally {
      setCatalogLoading(false);
    }
  };

  const isBusy = loading || catalogLoading;
  const own = records.filter(record => record.ownerId === learner.ownerId);
  const [uploadId, setUploadId] = useState<RequirementId | null>(null);
  const [viewId, setViewId] = useState<RequirementId | null>(null);
  const [assistanceReq, setAssistanceReq] = useState<RequirementItem | null>(null);
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<'all' | 'action' | 'satisfied'>('all');
  const getRecord = (id: RequirementId) => own.find(record => record.requirementId === id);
  const totalCount = requirementsList.length || 1;
  const satisfied = own.filter(record => isSatisfied(record.status)).length;
  const waiting = own.filter(record => record.status === 'review').length;
  const action = requirementsList.filter(item => !getRecord(item.id) || getRecord(item.id)?.status === 'correction').length;
  const visible = requirementsList.filter(item => filter === 'all' || (filter === 'satisfied' ? isSatisfied(getRecord(item.id)?.status) : !getRecord(item.id) || getRecord(item.id)?.status === 'correction'));
  const viewing = viewId ? getRecord(viewId) : undefined;
  const selectedUpload = requirementsList.find(item => item.id === uploadId || item.code === uploadId);
  function saved() { setUploadId(null); setAssistanceReq(null); setNotice('Your document was successfully submitted for teacher review.'); }
  return <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <StudentPageHeader eyebrow="Student records · Enrollment documents" title="My requirements" description="A clear path to a complete learner record. Submit your documents, follow their progress, and get help when you need it." actions={<button type="button" className={studentHeaderActionClass} disabled={isBusy} onClick={refreshAll}><RefreshCw size={15} className={isBusy ? 'animate-spin' : ''} /><span className="ml-2">Refresh</span></button>}>
      <div className="flex flex-wrap items-center gap-5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20"><ShieldCheck size={26} strokeWidth={1.5} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold">Your document checklist</span>
            <span className="text-blue-100">{isBusy ? 'Loading…' : `${satisfied} of ${totalCount} verified${waiting > 0 ? ` · ${waiting} under review` : ''}`}</span>
          </div>
          <div role="progressbar" aria-label="Requirements satisfied" aria-valuenow={satisfied} aria-valuemin={0} aria-valuemax={totalCount} className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.min(100, (satisfied / totalCount) * 100)}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-blue-100">Verified documents and approved exemptions count toward your DepEd ALS enrollment completion.</p>
        </div>
      </div>
    </StudentPageHeader>

    <EnrollmentRequirementFiles />

    {notice && (
      <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 shadow-xs">
        <Check size={16} className="text-emerald-600 shrink-0" />
        <span>{notice}</span>
        <button type="button" onClick={() => setNotice('')} className="ml-auto rounded-lg px-2 py-1 text-emerald-700 hover:bg-emerald-100 font-semibold">
          Dismiss
        </button>
      </div>
    )}

    {error && <div className="space-y-2"><RequirementError message={error} /><button type="button" className={buttonClass} onClick={refreshAll}>Retry loading</button></div>}

    <RequirementStats items={[
      { label: 'Requirements verified', value: isBusy || error ? '—' : `${satisfied} / ${totalCount}`, detail: 'Verified documents or approved exemptions' },
      { label: 'Under teacher review', value: isBusy || error ? '—' : waiting, detail: 'Documents submitted awaiting teacher verification' },
      { label: 'Action needed', value: isBusy || error ? '—' : action, detail: 'Missing requirements or corrections requested' }
    ]} />

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Your required documents</h2>
            <p className="mt-1 text-[11px] text-slate-400">One accepted document per requirement</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-50 p-1" aria-label="Filter requirements">
            {([{ value: 'all', label: 'All' }, { value: 'action', label: 'Action needed' }, { value: 'satisfied', label: 'Verified' }] as const).map(item => (
              <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} className={`rounded-lg px-3 py-2 text-[11px] font-semibold ${filter === item.value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>{item.label}</button>
            ))}
          </div>
        </div>

        {isBusy ? (
          <p role="status" className="flex items-center justify-center gap-2 p-12 text-xs text-slate-400"><Loader2 size={17} className="animate-spin" />Loading your checklist…</p>
        ) : error ? (
          <p className="p-8 text-center text-xs text-slate-500">Could not load requirements. Please refresh the page.</p>
        ) : (
          <div className="space-y-4 p-4 sm:p-5">
            {visible.map(item => {
              const record = getRecord(item.id);
              const isUnderReview = record?.status === 'review';
              const isCorrection = record?.status === 'correction';
              const isGood = isSatisfied(record?.status);
              const itemTypes = (item.types && item.types.length > 0) ? item.types : (item.accepted_document_types || []);
              const allowedExts = (item.allowed_extensions && item.allowed_extensions.length > 0) ? item.allowed_extensions : ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
              const maxMb = item.max_file_size_mb || 10;

              return (
                <article key={item.id} className={`rounded-2xl border p-4 sm:p-5 transition ${isCorrection ? 'border-rose-200 bg-rose-50/20' : isUnderReview ? 'border-amber-200/80 bg-amber-50/15' : isGood ? 'border-emerald-200/80 bg-emerald-50/10' : 'border-slate-200/80 bg-white'}`}>
                  <div className="flex items-start gap-3.5">
                    <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${isCorrection ? 'bg-rose-50 text-rose-600' : isUnderReview ? 'bg-amber-50 text-amber-600' : isGood ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                      <RequirementIcon id={item.id} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-800">{item.title}</h3>
                        <StatusBadge status={record?.status} />
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                      {(item.conditional || item.is_conditional) && <span className="mt-2 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">If applicable · teacher assistance available</span>}
                    </div>
                  </div>

                  <details className="mt-3.5 rounded-xl bg-slate-50/80 px-3.5 py-2.5">
                    <summary className="cursor-pointer text-[11px] font-semibold text-slate-600 hover:text-slate-900">Accepted documents & guidance</summary>
                    <ul className="mt-2.5 space-y-1.5 border-t border-slate-200/60 pt-2">
                      {itemTypes.map(type => (
                        <li key={type} className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                          <Check size={12} className="mt-1 shrink-0 text-blue-600" />
                          <span>{type}</span>
                        </li>
                      ))}
                    </ul>
                    {item.guidance && <p className="mt-2.5 border-t border-slate-200/60 pt-2 text-xs leading-5 text-slate-500">{item.guidance}</p>}
                  </details>

                  {record && (
                    <div className={`mt-3.5 rounded-xl px-3.5 py-2.5 text-xs leading-5 ${isCorrection ? 'border border-rose-200 bg-rose-50 text-rose-800' : isUnderReview ? 'border border-amber-200 bg-amber-50 text-amber-800' : 'border border-slate-200 bg-slate-50 text-slate-600'}`}>
                      <p className="font-medium">{record.note}</p>
                      <p className="mt-1 text-[10px] opacity-75">Submitted on {formatRequirementDate(record.updatedAt)}</p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    {(item.allow_assistance || item.id === 'school' || item.id === 'proof_of_education') && !isSatisfied(record?.status) ? (
                      <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700" onClick={() => setAssistanceReq(item)}>
                        <CircleHelp size={14} />
                        Need help with {item.title}?
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">{allowedExts.map(e => e.toUpperCase()).join(', ')} · Up to {maxMb} MB</span>
                    )}

                    <div className="ml-auto flex flex-wrap gap-2">
                      {record && (
                        <button type="button" className={buttonClass} onClick={() => setViewId(item.id)}>
                          View details
                          <ChevronRight size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={record ? buttonClass : primaryClass}
                        onClick={() => setUploadId(item.id)}
                      >
                        <Upload size={14} />
                        {record ? (isCorrection ? 'Upload correction' : 'Replace document') : 'Upload document'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {!visible.length && (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <FileCheck2 size={30} className="text-blue-300" />
                <p className="text-sm font-semibold text-slate-700">{filter === 'action' ? 'No uploads need your attention' : 'No verified requirements yet'}</p>
                <p className="text-xs text-slate-400">{filter === 'action' ? 'You can check the progress of your submitted documents in All.' : 'Submit a document to start completing your checklist.'}</p>
                <button type="button" className={buttonClass} onClick={() => setFilter('all')}>View all requirements</button>
              </div>
            )}
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-5">
          <span className="inline-flex rounded-xl bg-white p-2.5 text-blue-600 ring-1 ring-blue-100">
            <ShieldCheck size={22} strokeWidth={1.6} />
          </span>
          <h2 className="mt-4 text-sm font-semibold text-slate-800">What happens after upload?</h2>
          <ol className="mt-4 space-y-4">
            {[
              { title: '1. Submit clear documents', text: 'Select an accepted DepEd ALS document type and make sure all details and stamps are visible.' },
              { title: '2. Teacher review', text: 'Your assigned ALS teacher verifies your submission against your student profile.' },
              { title: '3. Official ALS enrollment', text: 'Once verified, your requirements are marked satisfied for DepEd ALS enrollment.' }
            ].map(step => (
              <li key={step.title} className="flex gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-700">{step.title}</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-400">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-800">Helpful submission tips</h2>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Use even lighting, avoid glare, and lay the document flat.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>For ID cards with back details, combine both sides into a single PDF.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>If you do not have previous school records, click &quot;Need help with school records?&quot;</span>
            </li>
          </ul>
          <Link href="/student/profile" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
            View my profile
            <ArrowUpRight size={13} />
          </Link>
        </section>
      </aside>
    </div>

    {uploadId && (
      <RequirementUpload
        key={uploadId}
        requirement={selectedUpload}
        requirementId={uploadId}
        learner={learner}
        previous={getRecord(uploadId)}
        onClose={() => setUploadId(null)}
        onSaved={saved}
      />
    )}
    {assistanceReq && (
      <AssistanceRequest
        learner={learner}
        requirement={assistanceReq}
        previous={getRecord(assistanceReq.id || assistanceReq.code || 'proof_of_education')}
        onClose={() => setAssistanceReq(null)}
        onSaved={saved}
      />
    )}
    {viewing && (
      <Modal title="Your submission details" onClose={() => setViewId(null)}>
        <SubmissionDetails key={`${viewing.id}:${viewing.updatedAt}`} record={viewing} />
      </Modal>
    )}
  </div>;
}
