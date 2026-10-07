'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  CATEGORY_LABELS,
  type TargetCategory,
} from '@/src/data/mockAssessment';
import { dateKey, subjects } from '@/src/data/mockTeacher';

interface NewRecordModalProps {
  program: TargetCategory;
  onClose: () => void;
  onStartRecording: (date: string, subject: string) => void;
}

export default function NewRecordModal({
  program,
  onClose,
  onStartRecording,
}: NewRecordModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState(() => dateKey(new Date()));
  const [subject, setSubject] = useState(
    program === 'basic_literacy' ? 'ALS-BLP-101' : subjects[0].code,
  );
  const [error, setError] = useState('');

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const handleStart = (event: React.FormEvent) => {
    event.preventDefault();
    if (!date || date > dateKey(new Date())) {
      setError('Choose today or an earlier date.');
      return;
    }
    onStartRecording(date, subject);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="new-attendance-title"
      onCancel={onClose}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 id="new-attendance-title" className="text-lg font-bold">
          New attendance record
        </h2>
        <button
          aria-label="Close new attendance record"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-900"
        >
          <X size={20} />
        </button>
      </div>
      <form onSubmit={handleStart} className="space-y-5 p-6">
        <p className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-700">
          {CATEGORY_LABELS[program]}
        </p>
        <label className="block text-sm font-semibold">
          Session date
          <input
            autoFocus
            required
            type="date"
            max={dateKey(new Date())}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block text-sm font-semibold">
          Subject
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-blue-500"
          >
            {subjects.map((subject) => (
              <option key={subject.code} value={subject.code}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs leading-5 text-slate-500">
          If a record already exists for this date and subject, it will open for
          review.
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Open attendance
        </button>
      </form>
    </dialog>
  );
}
