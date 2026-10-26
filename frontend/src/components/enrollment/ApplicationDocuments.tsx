'use client';

import { useRef, useState } from 'react';
import { CircleHelp, Eye, FileUp, Paperclip } from 'lucide-react';
import type { ApplicationDocument, EnrollmentApplication } from '@/src/lib/enrollment';
import { REQUIREMENTS, validateRequirementFile, type RequirementId } from '@/src/lib/requirements';
import Modal from '@/src/components/ui/Modal';
import { FilePreview } from '@/src/components/requirements/RequirementShared';
import { buttonClass, fieldClass, ProfileMessage } from './EnrollmentShared';

export default function ApplicationDocuments({ application, onChange }: { application: EnrollmentApplication; onChange?: (documents: ApplicationDocument[], assistance: EnrollmentApplication['assistance']) => void }) {
  const [preview, setPreview] = useState<ApplicationDocument | null>(null);
  return <div className="space-y-4">{REQUIREMENTS.map(requirement => <DocumentField key={requirement.id} requirement={requirement} application={application} onChange={onChange} onPreview={setPreview} />)}{preview && <Modal title={preview.type} onClose={() => setPreview(null)}><FilePreview localFile={preview.file} /></Modal>}</div>;
}
function DocumentField({ requirement, application, onChange, onPreview }: { requirement: typeof REQUIREMENTS[number]; application: EnrollmentApplication; onChange?: (documents: ApplicationDocument[], assistance: EnrollmentApplication['assistance']) => void; onPreview: (document: ApplicationDocument) => void }) {
  const versions = application.documents.filter(document => document.requirement === requirement.id);
  const current = versions[0];
  const [type, setType] = useState(current?.type || requirement.types[0]);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  function upload(file?: File) {
    if (!file || !onChange) return;
    const issue = validateRequirementFile(file);
    setError(issue || '');
    if (issue) return;
    const document: ApplicationDocument = { id: crypto.randomUUID(), requirement: requirement.id, type, file, uploadedAt: new Date().toISOString() };
    onChange([document, ...application.documents], { ...application.assistance, [requirement.id]: '' });
  }
  return <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-800">{requirement.title}</h3><p className="mt-1 max-w-xl text-xs leading-6 text-slate-500">{requirement.description}</p></div><span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${current ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-800'}`}>{current ? 'Awaiting staff review' : 'Assistance / upload needed'}</span></div>
    {onChange ? <><label className="block text-xs font-semibold text-slate-600">Document type<select className={fieldClass} value={type} onChange={event => setType(event.target.value)}>{requirement.types.map(item => <option key={item}>{item}</option>)}</select></label><input ref={input} type="file" className="sr-only" aria-label={`Upload ${requirement.title}`} accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={event => { upload(event.target.files?.[0]); event.target.value = ''; }} /><div className="flex flex-wrap items-center gap-2"><button type="button" className={buttonClass} onClick={() => input.current?.click()}><FileUp size={15} />{current ? 'Replace document' : 'Choose document'}</button>{current && <button type="button" className={buttonClass} onClick={() => onPreview(current)}><Eye size={15} />Preview</button>}</div><p className="text-[11px] leading-5 text-slate-400">PDF, JPG, PNG, WebP · up to 10 MB. Combine multiple pages into one PDF.</p></> : current && <button type="button" onClick={() => onPreview(current)} className={buttonClass}><Eye size={15} />Open document</button>}
    {current && <p className="flex items-center gap-2 break-all text-xs text-slate-500"><Paperclip size={13} className="shrink-0" />{current.file.name} · {(current.file.size / 1024).toFixed(0)} KB</p>}
    {!current && (onChange ? <label className="block text-xs font-semibold text-slate-600"><span className="flex items-center gap-2"><CircleHelp size={14} />Need help obtaining this document?</span><textarea rows={2} maxLength={1000} className={fieldClass} value={application.assistance[requirement.id]} onChange={event => onChange(application.documents, { ...application.assistance, [requirement.id as RequirementId]: event.target.value })} placeholder="Explain what you need help with, or why school records do not apply." /></label> : <p className="rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-900">{application.assistance[requirement.id] || 'No document or assistance details provided.'}</p>)}
    {error && <ProfileMessage error>{error}</ProfileMessage>}<details className="rounded-lg bg-slate-50 p-3"><summary className="cursor-pointer text-[11px] font-semibold text-slate-600">Accepted documents and guidance</summary><p className="mt-2 text-xs leading-6 text-slate-500">{requirement.types.join(' · ')}</p><p className="mt-2 text-xs leading-6 text-slate-500">{requirement.guidance}</p></details>
    {versions.length > 1 && <details className="text-xs text-slate-500"><summary className="cursor-pointer">Previous uploads · {versions.length - 1}</summary><div className="mt-2 flex flex-wrap gap-2">{versions.slice(1).map(document => <button key={document.id} type="button" onClick={() => onPreview(document)} className={buttonClass}><Eye size={13} />{document.file.name}</button>)}</div></details>}
  </section>;
}
