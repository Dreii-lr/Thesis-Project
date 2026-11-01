'use client';

import { useRef, useState } from 'react';
import { ArrowRight, FileCheck, FileUp, Loader2, UploadCloud, X } from 'lucide-react';
import Modal from '@/src/components/ui/Modal';
import { REQUIREMENTS, createStudentSubmission, validateRequirementFile, type RequirementId, type RequirementItem, type RequirementRecord } from '@/src/lib/requirements';
import { FilePreview, RequirementError, buttonClass, fieldClass, primaryClass } from './RequirementShared';
import { saveRequirement } from './useRequirements';

export interface RequirementLearner { ownerId: string; learnerName: string; email: string; program: string }

export default function RequirementUpload({
  requirement,
  requirementId,
  learner,
  previous,
  onClose,
  onSaved,
}: {
  requirement?: RequirementItem;
  requirementId?: RequirementId;
  learner: RequirementLearner;
  previous?: RequirementRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const req = requirement || REQUIREMENTS.find(item => item.id === requirementId) || {
    id: requirementId || 'rpl',
    code: requirementId || 'rpl',
    title: 'Requirement Document',
    types: ['Official Document'],
    accepted_document_types: ['Official Document'],
    description: '',
    guidance: '',
    allowed_extensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
    max_file_size_mb: 10,
  };
  const activeTypes = req.types?.length ? req.types : req.accepted_document_types?.length ? req.accepted_document_types : ['Official Document'];
  const allowedExts = req.allowed_extensions?.length ? req.allowed_extensions : ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
  const maxMb = req.max_file_size_mb || 10;
  const acceptAttr = allowedExts.map(e => `.${e.toLowerCase().replace(/^\./, '')}`).join(',');
  const resolvedId = req.id || req.code || requirementId || 'rpl';

  const [type, setType] = useState(activeTypes[0] || 'Official Document');
  const [file, setFile] = useState<File>();
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);

  function choose(selected?: File) {
    if (!selected || busy) return;
    const issue = validateRequirementFile(selected, maxMb, allowedExts);
    setError(issue || '');
    if (!issue) setFile(selected);
  }

  function removeFile() {
    setFile(undefined);
    setError('');
    if (input.current) input.current.value = '';
  }

  async function submit() {
    if (!file || lock.current) return;
    const issue = validateRequirementFile(file, maxMb, allowedExts);
    if (issue) { setError(issue); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const result = createStudentSubmission(type, remarks);
      const at = new Date().toISOString();
      const record: RequirementRecord = {
        ...learner, id: previous?.id || `${learner.ownerId}:${resolvedId}`, requirementId: resolvedId,
        ...result, updatedAt: at,
        versions: [{ id: crypto.randomUUID(), at, type, fileName: file.name, fileSize: file.size, mime: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'), scenario: 'submission', ...result }, ...(previous?.versions || [])],
        events: [{ id: crypto.randomUUID(), at, actor: learner.learnerName, message: previous ? `Replacement document (${type}) submitted for review.` : `Document (${type}) submitted for review.` }, ...(previous?.events || [])],
      };
      await saveRequirement(record, file, previous?.updatedAt || null);
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Submission could not be saved. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return <Modal title={previous ? 'Upload a replacement document' : 'Submit requirement document'} pending={busy} onClose={onClose}>
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-slate-800">{req.title}</p>
        {req.description && <p className="mt-1 text-xs leading-6 text-slate-500">{req.description}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700">Select document type</label>
        <select className={fieldClass} value={type} disabled={busy} onChange={event => setType(event.target.value)}>
          {activeTypes.map(value => <option key={value}>{value}</option>)}
        </select>
      </div>

      {req.guidance && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs leading-5 text-slate-600">
          <strong className="font-semibold text-blue-900">Document Guidelines: </strong>
          {req.guidance}
        </div>
      )}

      <input ref={input} type="file" accept={acceptAttr} aria-label="Choose requirement document" disabled={busy} className="sr-only" onChange={event => { choose(event.target.files?.[0]); event.target.value = ''; }} />

      {!file ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          onDragOver={event => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => {
            event.preventDefault();
            setDragging(false);
            if (event.dataTransfer.files.length > 1) { setError('Please upload one document at a time.'); return; }
            choose(event.dataTransfer.files[0]);
          }}
          className={`group flex w-full flex-col items-center rounded-2xl border-2 border-dashed p-6 text-center transition ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50/60 hover:border-blue-400 hover:bg-blue-50/30'} disabled:opacity-50`}
        >
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200 transition group-hover:scale-105">
            <UploadCloud size={24} strokeWidth={1.8} />
          </span>
          <span className="mt-3 text-sm font-semibold text-slate-800">Click to choose a file or drag & drop</span>
          <span className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-400">
            <span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">PDF</span>
            <span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">JPG</span>
            <span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">PNG</span>
            <span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">WebP</span>
            <span className="text-slate-400">· Up to 10 MB</span>
          </span>
          <span className="mt-2 text-[11px] text-slate-400">Make sure all 4 corners and essential text details are clearly readable.</span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <FileCheck size={20} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-800">{file.name}</p>
                <p className="text-[11px] text-slate-400">{formatSize(file.size)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => input.current?.click()}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Change
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={removeFile}
                className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                title="Remove file"
              >
                <X size={15} />
              </button>
            </div>
          </div>
          <FilePreview localFile={file} />
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-700">Remarks for teacher (optional)</label>
        <textarea
          className={fieldClass}
          rows={2}
          disabled={busy}
          value={remarks}
          onChange={event => setRemarks(event.target.value)}
          placeholder="e.g. Seal is slightly faded, or currently requesting updated copy from PSA"
          maxLength={500}
        />
        <p className="mt-1 text-[11px] text-slate-400">Any notes to help your teacher evaluate your submitted document.</p>
      </div>

      {previous && (
        <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          <strong className="font-semibold text-slate-800">Replacement Notice: </strong>
          Your previous submission history is preserved. This new upload will become your latest version awaiting review.
        </div>
      )}

      {error && <RequirementError message={error} />}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={onClose} disabled={busy} className={buttonClass}>Cancel</button>
        <button type="button" disabled={!file || busy} onClick={submit} className={primaryClass}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />}
          {busy ? 'Submitting document…' : previous ? 'Submit replacement' : 'Submit requirement'}
          {!busy && <ArrowRight size={14} />}
        </button>
      </div>
    </div>
  </Modal>;
}

export function AssistanceRequest({
  learner,
  requirement,
  previous,
  onClose,
  onSaved,
}: {
  learner: RequirementLearner;
  requirement?: RequirementItem;
  previous?: RequirementRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const resolvedId = requirement?.id || requirement?.code || 'proof_of_education';
  const reqTitle = requirement?.title || 'school records';
  const [reason, setReason] = useState(
    requirement ? `I cannot obtain my ${reqTitle}.` : 'I cannot obtain my previous school records.'
  );
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);

  async function submit() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const at = new Date().toISOString();
      const message = `${reason}${note.trim() ? ` ${note.trim()}` : ''}`;
      await saveRequirement(
        {
          ...learner,
          id: previous?.id || `${learner.ownerId}:${resolvedId}`,
          requirementId: resolvedId,
          status: 'review',
          note: message,
          updatedAt: at,
          versions: [
            {
              id: crypto.randomUUID(),
              at,
              type: `${reqTitle} assistance`,
              fileName: '',
              fileSize: 0,
              mime: '',
              status: 'review',
              note: message,
              scenario: 'assistance',
            },
            ...(previous?.versions || []),
          ],
          events: [
            {
              id: crypto.randomUUID(),
              at,
              actor: learner.learnerName,
              message: `Requested assistance: ${message}`,
            },
            ...(previous?.events || []),
          ],
        },
        undefined,
        previous?.updatedAt || null
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your request could not be saved.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal title={`Get help with ${reqTitle}`} onClose={onClose} pending={busy}>
      <div className="space-y-4">
        <p className="text-sm leading-6 text-slate-500">
          Your teacher can help find alternative proof. An admin can confirm an exemption where applicable.
        </p>
        <label className="block text-xs font-semibold text-slate-600">
          What do you need help with?
          <select
            disabled={busy}
            className={fieldClass}
            value={reason}
            onChange={event => setReason(event.target.value)}
          >
            {requirement ? (
              <>
                <option value={`I cannot obtain my ${reqTitle}.`}>I cannot obtain my {reqTitle}.</option>
                <option value={`I need an alternative document or exemption for ${reqTitle}.`}>
                  I need an alternative document or exemption for {reqTitle}.
                </option>
                <option value="I have never attended formal school.">I have never attended formal school.</option>
              </>
            ) : (
              <>
                <option>I cannot obtain my previous school records.</option>
                <option>I have never attended formal school.</option>
              </>
            )}
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Additional details (optional)
          <textarea
            disabled={busy}
            className={fieldClass}
            rows={3}
            value={note}
            maxLength={1000}
            onChange={event => setNote(event.target.value)}
            placeholder="Tell your teacher how they can help."
          />
        </label>
        <p className="text-xs leading-6 text-slate-400">
          This creates a review request. It does not automatically exempt the requirement.
        </p>
        {error && <RequirementError message={error} />}
        <div className="flex justify-end gap-2">
          <button type="button" className={buttonClass} disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={primaryClass} disabled={busy} onClick={submit}>
            {busy ? 'Saving…' : 'Request assistance'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
