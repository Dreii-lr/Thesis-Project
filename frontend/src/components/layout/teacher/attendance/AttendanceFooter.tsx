'use client';

import { Info, Save } from 'lucide-react';

interface AttendanceFooterProps {
  onSave: () => void;
  onCancel: () => void;
  isDataEmpty: boolean;
  isUpdate: boolean;
}

export default function AttendanceFooter({
  onSave,
  onCancel,
  isDataEmpty,
  isUpdate,
}: AttendanceFooterProps) {
  return (
    <div className="flex flex-col justify-between gap-4 border-t border-slate-200 p-5 sm:flex-row sm:items-center">
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Info size={16} /> Mark every learner before saving this completed
        session.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={isDataEmpty}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
        >
          <Save size={16} /> {isUpdate ? 'Save changes' : 'Complete attendance'}
        </button>
      </div>
    </div>
  );
}
