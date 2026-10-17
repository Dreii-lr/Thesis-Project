'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import {
  CATEGORY_LABELS,
  type TargetCategory,
} from '@/src/lib/assessments-api';
import { attendanceDate as dateKey } from '@/src/lib/attendance-api';
import { type SubjectRecord } from '@/src/lib/subjects-api';

interface NewRecordModalProps {
  program: TargetCategory | string;
  categoryName?: string;
  subjects: SubjectRecord[];
  isLoading?: boolean;
  loadError?: string | null;
  onRetry: () => void;
  onClose: () => void;
  onStartRecording: (date: string, subject: string) => Promise<string | null>;
}

export default function NewRecordModal({
  program,
  categoryName,
  subjects,
  isLoading = false,
  loadError = null,
  onRetry,
  onClose,
  onStartRecording,
}: NewRecordModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState(() => dateKey(new Date()));
  const availableSubjects = subjects.filter(item => item.is_active !== false).map(item => ({
    code: item.code || item.name,
    name: item.code && item.code !== item.name ? `${item.code} - ${item.name}` : item.name,
  }));
  const [isOpening, setIsOpening] = useState(false);
  const [subject, setSubject] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  const handleStart = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isOpening || isLoading || loadError) return;
    if (!date || date > dateKey(new Date())) {
      setError('Choose today or an earlier date.');
      return;
    }
    if (!availableSubjects.some(item => item.code === subject)) {
      setError('Please select a subject.');
      return;
    }
    setIsOpening(true);
    setError('');
    try {
      const message = await onStartRecording(date, subject);
      if (message) setError(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open attendance.');
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="new-attendance-title"
      onCancel={(event) => {
        if (isOpening) event.preventDefault();
        else onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><CalendarDays size={19} /></span>
          <div><h2 id="new-attendance-title" className="text-base font-bold">New attendance record</h2><p className="mt-1 text-xs text-slate-500">Choose your learning session.</p></div>
        </div>
        <button
          aria-label="Close new attendance record"
          disabled={isOpening}
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-900"
        >
          <X size={20} />
        </button>
      </div>
      <form onSubmit={handleStart} className="space-y-5 p-6">
        <p className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-700">
          {categoryName || CATEGORY_LABELS[program as TargetCategory] || program}
        </p>
        <label className="block text-sm font-semibold">
          Session date
          <input
            autoFocus
            required
            type="date"
            disabled={isOpening}
            max={dateKey(new Date())}
            value={date}
            onChange={(event) => { setDate(event.target.value); setError(''); }}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block text-sm font-semibold">
          Subject
          <select
            required
            disabled={isLoading || isOpening || !!loadError}
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              setError('');
            }}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>
              {isLoading ? 'Loading subjects...' : availableSubjects.length > 0 ? 'Select subject' : 'No active subjects available'}
            </option>
            {availableSubjects.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs leading-5 text-slate-500">
          Your saved record will open if you already took attendance for this
          date and subject. Only active enrolled learners appear in a new record.
        </p>
        {loadError && (
          <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <p>{loadError}</p>
            <button type="button" onClick={onRetry} className="mt-2 font-semibold underline">Retry loading</button>
          </div>
        )}
        {!isLoading && !loadError && !availableSubjects.length && (
          <p role="status" className="text-sm text-slate-500">Add an active subject to this learning program before recording attendance.</p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isLoading || isOpening || !!loadError || !availableSubjects.length}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isOpening ? 'Opening attendance...' : isLoading ? 'Loading attendance...' : 'Open attendance'}
        </button>
      </form>
    </dialog>
  );
}
