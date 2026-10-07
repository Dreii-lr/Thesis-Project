"use client";

import { useState } from 'react';
import { X } from 'lucide-react';
import { CATEGORY_LABELS, TargetCategory } from '@/src/lib/assessments-api';

export default function AssignStudentsModal({ taskTitle, initialCategory, onClose, onConfirm }: {
  taskTitle: string; initialCategory: TargetCategory | null; onClose: () => void;
  onConfirm: (category: TargetCategory | null) => Promise<void>;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function publish() {
    if (saving) return;
    setSaving(true);
    setError('');
    try { await onConfirm(category); onClose(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to publish assessment.'); setSaving(false); }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="publish-title" className="w-full max-w-lg space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
      <div className="flex items-center justify-between"><h2 id="publish-title" className="text-lg font-bold">Publish & Assign Assessment</h2><button aria-label="Close" disabled={saving} onClick={onClose}><X size={18} /></button></div>
      <p className="text-sm text-slate-600">{taskTitle}</p>
      <label className="block space-y-2 text-sm font-semibold">Class Program<select autoFocus disabled={saving} value={category ?? ''} onChange={event => setCategory((event.target.value || null) as TargetCategory | null)} className="block w-full rounded-xl border border-slate-200 p-3">
        <option value="">All Programs</option>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <p className="text-xs text-slate-500">All students in the selected program will receive this assessment. Individual assignment is not available.</p>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-3"><button disabled={saving} onClick={onClose} className="rounded-xl border px-4 py-2 text-sm">Cancel</button><button disabled={saving} onClick={publish} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Publishing...' : 'Publish Assessment'}</button></div>
    </section>
  </div>;
}
