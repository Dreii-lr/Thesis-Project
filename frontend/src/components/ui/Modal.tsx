'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, children, onClose, pending = false }: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  pending?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!pending) onClose(); }} className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-xl font-bold">{title}</h2>
        <button type="button" onClick={onClose} disabled={pending} aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X size={19} /></button>
      </div>
      {children}
    </dialog>
  );
}
