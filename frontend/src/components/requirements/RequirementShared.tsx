'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AlertCircle, BadgeCheck, Check, Clock3, FileCheck2, FileText, Fingerprint, GraduationCap, Info, Loader2, ShieldCheck } from 'lucide-react';
import { REQUIREMENTS, STATUS_LABELS, formatRequirementDate, type RequirementId, type RequirementRecord, type RequirementStatus, type RequirementVersion } from '@/src/lib/requirements';
import { requirementFile } from './useRequirements';

export const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50';
export const primaryClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50';
export const fieldClass = 'mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50';

export function RequirementIcon({ id, size = 22 }: { id: RequirementId; size?: number }) {
  const Icon = id === 'birth' ? FileText : id === 'school' ? GraduationCap : Fingerprint;
  return <Icon size={size} strokeWidth={1.7} />;
}

export function StatusBadge({ status }: { status?: RequirementStatus }) {
  const verified = status === 'auto_verified' || status === 'verified';
  const Icon = verified ? ShieldCheck : status === 'correction' ? AlertCircle : status === 'exempted' ? BadgeCheck : Clock3;
  const color = verified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : status === 'review' ? 'border-amber-200 bg-amber-50 text-amber-800' : status === 'correction' ? 'border-rose-200 bg-rose-50 text-rose-700' : status === 'exempted' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500';
  return <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold ${color}`}><Icon size={13} />{status ? STATUS_LABELS[status] : 'Not submitted'}</span>;
}

export function DemoNotice() {
  return <div className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-xs leading-5 text-amber-900"><Info size={16} className="mt-0.5 shrink-0" /><p><strong className="font-semibold">Frontend demonstration.</strong> Checks and decisions are simulated; no OCR or issuer verification runs. Files stay in this browser and can be viewed from its student, teacher, and admin demo screens. Use sample documents only. Nothing is sent to the server or synced to other devices.</p></div>;
}

export function RequirementError({ message }: { message: string }) {
  return <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs leading-6 text-rose-700"><AlertCircle size={15} className="mt-1 shrink-0" />{message}</p>;
}

export function RequirementStats({ items }: { items: { label: string; value: number | string; detail: string }[] }) {
  return <div className="grid gap-3 sm:grid-cols-3">{items.map(item => <section key={item.label} className="rounded-2xl border border-slate-200/80 bg-white p-5"><p className="text-xs font-medium text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{item.value}</p><p className="mt-2 text-[11px] leading-5 text-slate-400">{item.detail}</p></section>)}</div>;
}

export function FilePreview({ version, localFile, sample = false }: { version?: RequirementVersion; localFile?: File; sample?: boolean }) {
  const [result, setResult] = useState<{ key: string; url: string; error: string } | null>(null);
  const key = localFile ? `${localFile.name}:${localFile.lastModified}:${localFile.size}` : version?.id || '';
  useEffect(() => {
    if (!key || sample) return;
    let active = true;
    let objectUrl = '';
    void (localFile ? Promise.resolve(localFile) : requirementFile(key)).then(file => {
      if (!active) return;
      if (!file) { setResult({ key, url: '', error: 'No document file is attached to this record.' }); return; }
      objectUrl = URL.createObjectURL(file);
      setResult({ key, url: objectUrl, error: '' });
    }).catch(() => { if (active) setResult({ key, url: '', error: 'This file could not be opened.' }); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [key, localFile, sample]);
  const mime = localFile?.type || version?.mime;
  if (sample || !key) return <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center"><FileText size={30} strokeWidth={1.3} className="text-slate-300" /><p className="mt-3 text-xs text-slate-500">{sample ? 'Illustrative sample — no real document attached.' : 'No file attached to this assistance request.'}</p></div>;
  if (result?.key !== key) return <p role="status" className="flex items-center gap-2 p-6 text-xs text-slate-500"><Loader2 size={16} className="animate-spin" />Opening preview…</p>;
  if (result.error) return <RequirementError message={result.error} />;
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
    {mime?.startsWith('image/') ? <div className="flex max-h-80 justify-center overflow-auto p-3"><Image unoptimized src={result.url} width={900} height={700} alt="Selected requirement document" className="h-auto max-h-72 w-auto max-w-full object-contain" /></div> : <iframe title="Requirement PDF preview" src={result.url} className="h-72 w-full bg-white" />}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2"><p className="min-w-0 truncate text-[11px] text-slate-500">{localFile?.name || version?.fileName}</p><a href={result.url} download={localFile?.name || version?.fileName} className="text-xs font-semibold text-blue-600 underline underline-offset-2">Download file</a></div>
  </div>;
}

export function SubmissionDetails({ record }: { record: RequirementRecord }) {
  const [versionId, setVersionId] = useState(record.versions[0]?.id);
  const selected = record.versions.find(version => version.id === versionId) || record.versions[0];
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">{REQUIREMENTS.find(item => item.id === record.requirementId)?.title}</p><p className="mt-1 text-sm font-semibold text-slate-800">{selected?.type || 'School-record assistance'}</p></div><StatusBadge status={record.status} /></div>
    <FilePreview key={selected?.id} version={selected} sample={record.sample} />
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4"><p className="flex items-center gap-2 text-xs font-semibold text-blue-800"><FileCheck2 size={15} />Latest result & feedback</p><p className="mt-2 text-xs leading-6 text-slate-600">{record.note}</p></div>
    {selected && <div className="grid grid-cols-2 gap-3 text-xs"><div><p className="text-slate-400">Version being viewed</p><p className="mt-1 font-medium">{selected.id === record.versions[0]?.id ? 'Latest submission' : 'Previous submission'}</p></div><div><p className="text-slate-400">Submitted</p><p className="mt-1 font-medium">{formatRequirementDate(selected.at)}</p></div></div>}
    {record.versions.length > 1 && <label className="block text-xs font-medium text-slate-600">Submission history<select className={fieldClass} value={selected?.id} onChange={event => setVersionId(event.target.value)}>{record.versions.map((version, index) => <option key={version.id} value={version.id}>{index === 0 ? 'Latest' : `Version ${record.versions.length - index}`} · {version.fileName || 'Assistance request'} · {formatRequirementDate(version.at)}</option>)}</select></label>}
    <details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-xs font-semibold text-slate-700">Activity history · {record.events.length} updates</summary><ol className="mt-4 space-y-4">{record.events.map(event => <li key={event.id} className="flex gap-2"><Check size={13} className="mt-1 shrink-0 text-blue-600" /><div><p className="text-xs leading-6 text-slate-600">{event.message}</p><p className="mt-1 text-[10px] text-slate-400">{event.actor} · {formatRequirementDate(event.at)}</p></div></li>)}</ol></details>
  </div>;
}
