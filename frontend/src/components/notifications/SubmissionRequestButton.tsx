'use client';

import { useState } from 'react';
import { CheckCircle2, Clock3, Send } from 'lucide-react';
import Modal from '@/src/components/ui/Modal';
import { useNotifications } from './useNotifications';

export default function SubmissionRequestButton({ assessmentId, assessmentTitle, subject }: {
  assessmentId: string; assessmentTitle: string; subject: string;
}) {
  const { ready, requests, studentId, studentName, sendRequest } = useNotifications('student');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const request = requests.find(item => item.studentId === studentId && item.assessmentId === assessmentId);

  return <>
    {request ? <p role="status" className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold ${request.status === 'declined' ? 'bg-rose-50 text-rose-700' : request.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      {request.status === 'pending' ? <Clock3 size={13} /> : <CheckCircle2 size={13} />}
      {request.status === 'pending' ? 'Request pending' : `Demo request ${request.status}`}
    </p> : <button type="button" disabled={!ready} onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"><Send size={13} />Request for submission</button>}
    {open && <Modal title="Request for submission" onClose={() => setOpen(false)}>
      <form onSubmit={event => {
        event.preventDefault();
        if (!reason.trim()) return;
        sendRequest({ id: crypto.randomUUID(), studentId, studentName, assessmentId, assessmentTitle, subject, reason: reason.trim(), status: 'pending', createdAt: new Date().toISOString() });
        setOpen(false);
        setReason('');
      }} className="space-y-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Missed assessment</p><h3 className="mt-1 text-sm font-semibold text-slate-800">{assessmentTitle}</h3><p className="mt-1 text-xs text-slate-500">{subject}</p></div>
        <div><label htmlFor="submission-request-reason" className="text-sm font-semibold text-slate-700">Tell your teacher what happened</label><textarea id="submission-request-reason" required maxLength={500} rows={4} value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain why you missed the assessment..." className="mt-2 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" /><p className="mt-1 text-right text-[11px] text-slate-400">{reason.length}/500</p></div>
        <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">Demonstration only. Your teacher can review this mock request in Notifications using this browser. Approval will not reopen the actual assessment.</p>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50">Cancel</button><button type="submit" disabled={!reason.trim()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Send size={14} />Send request</button></div>
      </form>
    </Modal>}
  </>;
}
