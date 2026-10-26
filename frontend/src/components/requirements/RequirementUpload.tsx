'use client';

import { useRef, useState } from 'react';
import { ArrowRight, FileUp, Loader2, ShieldCheck, UploadCloud } from 'lucide-react';
import Modal from '@/src/components/ui/Modal';
import { REQUIREMENTS, simulationResult, validateRequirementFile, type DemoScenario, type RequirementId, type RequirementRecord } from '@/src/lib/requirements';
import { FilePreview, RequirementError, buttonClass, fieldClass, primaryClass } from './RequirementShared';
import { saveRequirement } from './useRequirements';

export interface RequirementLearner { ownerId: string; learnerName: string; email: string; program: string }

export default function RequirementUpload({ requirementId, learner, previous, onClose, onSaved }: { requirementId: RequirementId; learner: RequirementLearner; previous?: RequirementRecord; onClose: () => void; onSaved: () => void }) {
  const requirement = REQUIREMENTS.find(item => item.id === requirementId)!;
  const [type, setType] = useState(requirement.types[0]);
  const [file, setFile] = useState<File>();
  const [scenario, setScenario] = useState<DemoScenario>('pass');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  function choose(selected?: File) {
    if (!selected || busy) return;
    const issue = validateRequirementFile(selected);
    setError(issue || '');
    if (!issue) setFile(selected);
  }
  async function submit() {
    if (!file || lock.current) return;
    const issue = validateRequirementFile(file);
    if (issue) { setError(issue); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const result = simulationResult(scenario, type);
      const at = new Date().toISOString();
      const record: RequirementRecord = {
        ...learner, id: previous?.id || `${learner.ownerId}:${requirementId}`, requirementId,
        ...result, updatedAt: at,
        versions: [{ id: crypto.randomUUID(), at, type, fileName: file.name, fileSize: file.size, mime: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'), scenario, ...result }, ...(previous?.versions || [])],
        events: [{ id: crypto.randomUUID(), at, actor: 'Demo automatic checks', message: result.note }, { id: crypto.randomUUID(), at, actor: learner.learnerName, message: previous ? 'Replacement submitted. A new verification result was created.' : 'Document submitted.' }, ...(previous?.events || [])],
      };
      await saveRequirement(record, file, previous?.updatedAt || null);
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Submission could not be saved. Try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Modal title={previous ? 'Upload a replacement' : 'Submit a requirement'} pending={busy} onClose={onClose}>
    <div className="space-y-5"><div><p className="text-sm font-semibold text-slate-800">{requirement.title}</p><p className="mt-1 text-xs leading-6 text-slate-500">{requirement.description}</p></div>
      <label className="block text-xs font-semibold text-slate-600">Document type<select className={fieldClass} value={type} disabled={busy} onChange={event => setType(event.target.value)}>{requirement.types.map(value => <option key={value}>{value}</option>)}</select></label>
      <p className="rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-500">{requirement.guidance}</p>
      <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" aria-label="Choose requirement document" disabled={busy} className="sr-only" onChange={event => { choose(event.target.files?.[0]); event.target.value = ''; }} />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files.length > 1) { setError('Choose one file. Combine multiple pages into a single PDF.'); return; } choose(event.dataTransfer.files[0]); }} className={`flex w-full flex-col items-center rounded-2xl border-2 border-dashed px-5 py-6 text-center transition ${dragging ? 'border-blue-500 bg-blue-50' : 'border-blue-200 bg-blue-50/30 hover:bg-blue-50'} disabled:opacity-50`}><span className="rounded-xl bg-white p-3 text-blue-600 shadow-sm"><UploadCloud size={23} strokeWidth={1.6} /></span><span className="mt-3 text-sm font-semibold text-slate-700">{file ? 'Choose a different file' : 'Choose a file or drop it here'}</span><span className="mt-1 text-xs text-slate-400">PDF, JPG, PNG, WebP · up to 10 MB</span><span className="mt-1 text-[11px] text-slate-400">For multiple pages or both sides, use one PDF.</span></button>
      {file && <FilePreview localFile={file} />}
      <fieldset disabled={busy} className="rounded-xl border border-amber-200 bg-amber-50/60 p-4"><legend className="px-1 text-xs font-semibold text-amber-900">Demo verification scenario</legend><p className="text-xs leading-5 text-amber-800">Choose the result to demonstrate. This preview does not read or authenticate the uploaded file.</p><label className="mt-2 block text-xs font-medium text-slate-600">Simulated outcome<select className={fieldClass} value={scenario} onChange={event => setScenario(event.target.value as DemoScenario)}><option value="pass">All checks pass → automatically verified</option><option value="review">Uncertain details → staff review</option><option value="correction">Unreadable / incomplete → correction</option></select></label>{type === 'Alternative proof for staff review' && <p className="mt-2 text-xs text-amber-800">Alternative school proof always goes to staff review.</p>}</fieldset>
      {previous && <p className="text-xs leading-6 text-slate-500">Your earlier file and its decision remain in the history. The replacement receives its own result.</p>}
      {error && <RequirementError message={error} />}
      <div className="flex items-start gap-2 text-xs leading-5 text-slate-400"><ShieldCheck size={15} className="mt-0.5 shrink-0" />Demo files are stored on this browser only. Use a sample document.</div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} disabled={busy} className={buttonClass}>Cancel</button><button type="button" disabled={!file || busy} onClick={submit} className={primaryClass}>{busy ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />}{busy ? 'Running demo checks…' : 'Submit & run demo checks'}{!busy && <ArrowRight size={14} />}</button></div>
    </div>
  </Modal>;
}

export function AssistanceRequest({ learner, previous, onClose, onSaved }: { learner: RequirementLearner; previous?: RequirementRecord; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState('I cannot obtain my previous school records.');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function submit() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const at = new Date().toISOString();
      const message = `${reason}${note.trim() ? ` ${note.trim()}` : ''}`;
      await saveRequirement({ ...learner, id: previous?.id || `${learner.ownerId}:school`, requirementId: 'school', status: 'review', note: message, updatedAt: at,
        versions: [{ id: crypto.randomUUID(), at, type: 'School-record assistance', fileName: '', fileSize: 0, mime: '', status: 'review', note: message, scenario: 'assistance' }, ...(previous?.versions || [])],
        events: [{ id: crypto.randomUUID(), at, actor: learner.learnerName, message: `Requested assistance: ${message}` }, ...(previous?.events || [])] }, undefined, previous?.updatedAt || null);
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Your request could not be saved.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Modal title="Get help with school records" onClose={onClose} pending={busy}><div className="space-y-4"><p className="text-sm leading-6 text-slate-500">Your teacher can help find alternative proof. An admin can confirm an exemption where applicable.</p><label className="block text-xs font-semibold text-slate-600">What do you need help with?<select disabled={busy} className={fieldClass} value={reason} onChange={event => setReason(event.target.value)}><option>I cannot obtain my previous school records.</option><option>I have never attended formal school.</option></select></label><label className="block text-xs font-semibold text-slate-600">Additional details (optional)<textarea disabled={busy} className={fieldClass} rows={3} value={note} maxLength={1000} onChange={event => setNote(event.target.value)} placeholder="Tell your teacher how they can help." /></label><p className="text-xs leading-6 text-slate-400">This creates a review request. It does not automatically exempt the requirement.</p>{error && <RequirementError message={error} />}<div className="flex justify-end gap-2"><button type="button" className={buttonClass} disabled={busy} onClick={onClose}>Cancel</button><button type="button" className={primaryClass} disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Request assistance'}</button></div></div></Modal>;
}
