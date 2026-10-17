'use client';

import { Info, Save } from 'lucide-react';

interface AttendanceFooterProps {
  onSave: () => void;
  onCancel: () => void;
  isDataEmpty: boolean;
  isUpdate: boolean;
  isSaving?: boolean;
  remaining?: number;
}

export default function AttendanceFooter({
  onSave,
  onCancel,
  isDataEmpty,
  isUpdate,
  isSaving = false,
  remaining = 0,
}: AttendanceFooterProps) {
  return (
    <div className="flex flex-col justify-between gap-4 border-t border-slate-200 p-5 sm:flex-row sm:items-center">
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Info size={16} className="shrink-0" /> {remaining ? `${remaining} ${remaining === 1 ? 'learner still needs' : 'learners still need'} a status.` : 'All learners marked. Ready to save.'}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={isDataEmpty || isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save size={16} /> {isSaving ? 'Saving...' : isUpdate ? 'Save changes' : 'Complete attendance'}
        </button>
      </div>
    </div>
  );
}
