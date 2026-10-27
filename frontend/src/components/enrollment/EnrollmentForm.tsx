'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Loader2, MapPin, Save, Send } from 'lucide-react';
import { APPLICATION_STEPS, applicationEvent, newApplication, validateApplication, type EnrollmentApplication, type EnrollmentDetails } from '@/src/lib/enrollment';
import { todayInPhilippines } from '@/src/lib/student-validation';
import StudentAddressFields from '@/src/components/learners/StudentAddressFields';
import ContactNumberInput from '@/src/components/learners/ContactNumberInput';
import StudentPageHeader from '@/src/components/layout/student/StudentPageHeader';
import { ApplicationSummary, EnrollmentNotice, buttonClass, fieldClass, primaryClass, ProfileMessage } from './EnrollmentShared';
import ApplicationDocuments from './ApplicationDocuments';
import { saveApplication, useEnrollment } from './useEnrollment';

export default function EnrollmentForm() {
  const resume = useSearchParams().get('resume');
  const { applications, loading, error } = useEnrollment();
  if (loading) return <p role="status" className="p-8 text-sm text-slate-500">Opening the application form…</p>;
  if (error) return <ProfileMessage error>{error}</ProfileMessage>;
  const existing = applications.find(application => application.id === resume);
  if (resume && !existing) return <ProfileMessage error>This application is unavailable on this browser. <Link className="font-semibold underline" href="/enrollment/status">Open my applications</Link></ProfileMessage>;
  if (existing && !['DRAFT', 'CORRECTION'].includes(existing.status)) return <ProfileMessage>Your application is already submitted. <Link href="/enrollment/status" className="font-semibold underline">View its progress</Link></ProfileMessage>;
  return <ApplicationForm key={resume || 'new'} initial={existing} />;
}

function ApplicationForm({ initial }: { initial?: EnrollmentApplication }) {
  const router = useRouter();
  const [application, setApplication] = useState<EnrollmentApplication>(() => initial || newApplication());
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [addressVersion, setAddressVersion] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const lock = useRef(false);
  const leaving = useRef(false);
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event: BeforeUnloadEvent) => { if (!leaving.current) event.preventDefault(); };
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download') || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (busy || !window.confirm('Leave this form? Changes since your last saved draft will be lost.')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', warn); document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', navigate, true); };
  }, [dirty, busy]);
  function readForm() {
    const data = new FormData(form.current!);
    const details = { ...application.details };
    for (const [key, value] of data.entries()) if (key in details && typeof value === 'string') details[key as keyof EnrollmentDetails] = value.trim();
    return { ...application, details };
  }
  function move(next: number) {
    const current = readForm();
    const issue = next > step ? validateApplication(current, step) : null;
    setApplication(current); setError(issue || ''); setNotice('');
    if (!issue) { setStep(next); document.getElementById('application-title')?.focus(); }
  }
  async function save(submit = false) {
    if (lock.current) return;
    const current = readForm();
    const issue = submit ? validateApplication(current) : null;
    if (issue) { setError(issue); return; }
    if (submit && !form.current?.reportValidity()) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const saved = await saveApplication({ ...current, ...(submit ? { status: 'ENROLLING' as const, submittedAt: new Date().toISOString(), history: [applicationEvent('Applicant', current.status === 'CORRECTION' ? 'Corrected application resubmitted for teacher review.' : 'Online application submitted for teacher review.'), ...current.history] } : {}) });
      setApplication(saved); setDirty(false);
      if (submit) { leaving.current = true; router.push(`/enrollment/status?application=${encodeURIComponent(saved.id)}`); }
      else setNotice(`Draft saved on this browser. Reference: ${saved.reference}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Your application could not be saved. Your entries are still here.'); }
    finally { lock.current = false; setBusy(false); }
  }
  function onSubmit(event: FormEvent) { event.preventDefault(); if (step < 4) move(step + 1); else void save(true); }
  const d = application.details;
  return <><StudentPageHeader eyebrow="ALS Bubukal · Enrollment application" title="Your next chapter starts here." description="Complete your details at your own pace. Teachers review applications, help with missing records, and prepare learners for account creation."><div className="flex flex-wrap items-center gap-3 text-xs text-blue-100"><MapPin size={15} />Bubukal, Santa Cruz, Laguna<span className="rounded-lg bg-white/10 px-3 py-1.5">{application.reference}</span></div></StudentPageHeader><EnrollmentNotice />
    {application.feedback && <ProfileMessage error><strong>Teacher feedback:</strong> {application.feedback}</ProfileMessage>}
    <div className="grid items-start gap-5 lg:grid-cols-[245px_minmax(0,1fr)]"><aside className="space-y-4"><nav aria-label="Application steps" className="rounded-2xl border border-slate-200 bg-white p-3"><ol className="space-y-1">{APPLICATION_STEPS.map((title, index) => <li key={title}><button type="button" disabled={busy || index > step} onClick={() => move(index)} aria-current={index === step ? 'step' : undefined} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left text-xs font-semibold ${index === step ? 'bg-blue-50 text-blue-700' : 'text-slate-500'} disabled:cursor-default`}><span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${index === step ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{index < step ? <Check size={14} /> : index + 1}</span>{title}</button></li>)}</ol></nav><div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5"><ClipboardCheck size={21} className="text-blue-600" /><h2 className="mt-3 text-xs font-semibold text-slate-800">Already have a learner account?</h2><p className="mt-2 text-xs leading-6 text-slate-500">Sign in to view your information. Returning learners should use their existing record.</p><Link href="/login" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-600">Go to portal login<ArrowRight size={13} /></Link></div></aside>
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><div className="mb-6"><p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Step {step + 1} of 5</p><h2 id="application-title" tabIndex={-1} className="mt-2 text-xl font-semibold tracking-tight text-slate-900 outline-none">{APPLICATION_STEPS[step]}</h2><p className="mt-2 text-xs leading-6 text-slate-500">{step === 3 ? 'Upload available sample documents, or explain the help you need.' : step === 4 ? 'Check every section before submitting this preview for teacher review.' : 'Fill in the information below. Fields marked * are required.'}</p></div>
    {error && <div className="mb-5"><ProfileMessage error>{error}</ProfileMessage></div>}{notice && <div className="mb-5"><ProfileMessage>{notice}</ProfileMessage></div>}
    <form ref={form} onSubmit={onSubmit} onChange={() => { setDirty(true); setNotice(''); }}><fieldset disabled={busy} className="min-w-0 space-y-5">
      {step === 0 && <div key="personal" className="grid gap-4 sm:grid-cols-2"><Field label="First name" name="first_name" value={d.first_name} required autoComplete="given-name" /><Field label="Last name" name="last_name" value={d.last_name} required autoComplete="family-name" /><Field label="Middle name" name="middle_name" value={d.middle_name} /><Field label="Suffix" name="suffix" value={d.suffix} /><Field label="Birth date" name="birth_date" value={d.birth_date} required type="date" max={todayInPhilippines()} /><Field label="Gender" name="gender" value={d.gender} /><Field label="Nationality" name="nationality" value={d.nationality} /><Field label="Civil status" name="civil_status" value={d.civil_status} /><Field label="Religion" name="religion" value={d.religion} /><Field label="Existing LRN (if known)" name="lrn_number" value={d.lrn_number} pattern="[0-9]{12}" inputMode="numeric" /><p className="col-span-full text-xs leading-6 text-slate-400">No LRN or unsure of the number? Leave it blank and ask your teacher for assistance. Do not invent a number.</p><Field label="Guardian / support person's name" name="guardian_name" value={d.guardian_name} /><label className="text-xs font-semibold text-slate-600">Guardian contact number<ContactNumberInput name="guardian_contact_no" defaultValue={d.guardian_contact_no} className={fieldClass} /></label></div>}
      {step === 1 && <div key="contact" className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Contact number<ContactNumberInput name="contact_no" defaultValue={d.contact_no} className={fieldClass} /></label><Field label="Available email" name="email" type="email" value={d.email} autoComplete="email" /><p className="col-span-full text-xs leading-6 text-slate-400">Provide at least one way to contact you. Email can be left blank if you need assistance.</p><Field label="Street / building number" name="street_building_no" value={d.street_building_no} /><div className="flex items-end"><button type="button" className={buttonClass} onClick={() => { const current = readForm(); setApplication({ ...current, details: { ...current.details, province: 'Laguna', municipality: 'Santa Cruz', barangay: 'Bubukal', province_code: '', municipality_code: '', barangay_code: '' } }); setAddressVersion(value => value + 1); setDirty(true); }}><MapPin size={14} />Use Bubukal address</button></div><StudentAddressFields key={addressVersion} initial={d} inputClass={fieldClass} labelClass="block text-xs font-semibold text-slate-600" /></div>}
      {step === 2 && <div key="education" className="grid gap-4 sm:grid-cols-2"><Select label="Have you attended formal school?" name="schooling" value={d.schooling} required options={[['attended', 'Yes, I attended formal school'], ['never', 'I have never attended formal school']]} /><Field label="Last school attended (if known)" name="last_school" value={d.last_school} /><Select label="Last grade completed" name="last_grade" value={d.last_grade} required options={['Never attended', 'Not sure', ...Array.from({ length: 12 }, (_, index) => `Grade ${index + 1}`)].map(value => [value, value])} /><Select label="Previous ALS participation" name="previous_als" value={d.previous_als} required options={['Yes', 'No', 'Not sure'].map(value => [value, value])} /><Select label="Preferred learning modality" name="modality" value={d.modality} required options={[["FTF", 'Face-to-face'], ['BLENDED', 'Blended']]} /><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Learning availability *<textarea name="availability" required maxLength={1000} rows={3} defaultValue={d.availability} placeholder="Tell us which days and times work with your work or family responsibilities." className={fieldClass} /></label><p className="sm:col-span-2 text-xs leading-6 text-slate-400">Your teacher will confirm the suitable learning program, modality, and available schedule.</p></div>}
      {step === 3 && <ApplicationDocuments application={application} onChange={(documents, assistance) => { setApplication(value => ({ ...value, documents, assistance })); setDirty(true); }} />}
      {step === 4 && <><ApplicationSummary application={application} /><ApplicationDocuments application={application} /><label className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs leading-6 text-slate-600"><input type="checkbox" required name="acknowledge" className="mt-1 size-4 shrink-0 accent-blue-600" /><span>I have reviewed these details and understand this is a frontend preview. Sample information and documents remain on this browser and are available to its staff preview screens. This does not confirm official enrollment.</span></label></>}
    </fieldset><div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"><button type="button" disabled={busy || step === 0} onClick={() => move(step - 1)} className={buttonClass}><ArrowLeft size={14} />Back</button><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => save()} className={buttonClass}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Save draft</button><button type="submit" disabled={busy} className={primaryClass}>{busy ? <Loader2 size={14} className="animate-spin" /> : step === 4 ? <Send size={14} /> : <ArrowRight size={14} />}{busy ? 'Saving…' : step === 4 ? 'Submit application preview' : 'Continue'}</button></div></div></form></section></div></>;
}
function Field({ label, name, value, required = false, type = 'text', max, pattern, inputMode, autoComplete }: { label: string; name: string; value: string; required?: boolean; type?: string; max?: string; pattern?: string; inputMode?: 'numeric'; autoComplete?: string }) {
  return <label className="block text-xs font-semibold text-slate-600">{label}{required && ' *'}<input name={name} defaultValue={value} required={required} type={type} max={max} maxLength={150} pattern={pattern} inputMode={inputMode} autoComplete={autoComplete} className={fieldClass} /></label>;
}
function Select({ label, name, value, required = false, options }: { label: string; name: string; value: string; required?: boolean; options: string[][] }) {
  return <label className="block text-xs font-semibold text-slate-600">{label}{required && ' *'}<select name={name} defaultValue={value} required={required} className={fieldClass}><option value="">Select an option</option>{options.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>;
}
