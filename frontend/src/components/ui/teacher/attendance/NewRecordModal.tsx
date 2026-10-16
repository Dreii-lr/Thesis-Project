'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  CATEGORY_LABELS,
  type TargetCategory,
} from '@/src/lib/assessments-api';
import { dateKey } from '@/src/data/mockTeacher';
import { listSubjects, type SubjectRecord } from '@/src/lib/subjects-api';

interface NewRecordModalProps {
  program: TargetCategory | string;
  categoryId?: string;
  categoryName?: string;
  preloadedSubjects?: SubjectRecord[];
  onClose: () => void;
  onStartRecording: (date: string, subject: string) => void;
}

export default function NewRecordModal({
  program,
  categoryId,
  categoryName,
  preloadedSubjects = [],
  onClose,
  onStartRecording,
}: NewRecordModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState(() => dateKey(new Date()));
  const [availableSubjects, setAvailableSubjects] = useState<
    { code: string; name: string }[]
  >(() => {
    if (preloadedSubjects.length > 0) {
      return preloadedSubjects
        .filter((s) => s.is_active)
        .map((s) => ({
          code: s.code || s.name,
          name: s.code && s.name && s.code !== s.name ? `${s.code} - ${s.name}` : s.name,
        }));
    }
    return [];
  });
  const [subject, setSubject] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    dialogRef.current?.showModal();

    if (preloadedSubjects.length > 0) {
      const mapped = preloadedSubjects
        .filter((s) => s.is_active)
        .map((s) => ({
          code: s.code || s.name,
          name: s.code && s.name && s.code !== s.name ? `${s.code} - ${s.name}` : s.name,
        }));
      if (mapped.length > 0) {
        setAvailableSubjects(mapped);
        return;
      }
    }

    let isMounted = true;
    const targetCategoryParam =
      categoryId ||
      (program.toUpperCase() === 'SECONDARY' || program === 'junior'
        ? 'SECONDARY'
        : program.toUpperCase() === 'ELEMENTARY' || program === 'elementary'
          ? 'ELEMENTARY'
          : 'BLP');

    listSubjects(targetCategoryParam)
      .then((records) => {
        if (!isMounted) return;
        const active = records.filter((s) => s.is_active);
        const mapped = active.map((s) => ({
          code: s.code || s.name,
          name: s.code && s.name && s.code !== s.name ? `${s.code} - ${s.name}` : s.name,
        }));
        setAvailableSubjects(mapped);
      })
      .catch(() => {
        if (isMounted) setAvailableSubjects([]);
      });

    return () => {
      isMounted = false;
    };
  }, [program, categoryId, preloadedSubjects]);

  const handleStart = (event: React.FormEvent) => {
    event.preventDefault();
    if (!date || date > dateKey(new Date())) {
      setError('Choose today or an earlier date.');
      return;
    }
    if (!subject) {
      setError('Please select a subject.');
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
          {categoryName || CATEGORY_LABELS[program as TargetCategory] || program}
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
            required
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              setError('');
            }}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>
              {availableSubjects.length > 0 ? 'Select Subject' : 'No subjects available'}
            </option>
            {availableSubjects.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
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
