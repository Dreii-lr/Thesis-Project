'use client';

import { Info, CheckCircle2, Loader2 } from 'lucide-react';

interface AttendanceFooterProps {
  onSave: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  isDataEmpty: boolean;
}

export default function AttendanceFooter({ onSave, isSaving, saveSuccess, isDataEmpty }: AttendanceFooterProps) {
  return (
    <div className="border-t border-gray-200 bg-white p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
        <Info size={16} className="text-gray-400" /> Ensure all statuses are marked before saving.
      </div>
      
      <div className="w-full sm:w-auto flex items-center gap-3">
        {saveSuccess && (
          <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5 animate-in fade-in slide-in-from-right-4 duration-300">
            <CheckCircle2 size={16} /> Saved successfully
          </span>
        )}
        
        <button 
          onClick={onSave}
          disabled={isSaving || isDataEmpty}
          className={`w-full sm:w-auto px-6 py-2.5 rounded-md text-sm font-semibold transition-all shadow-sm flex items-center justify-center min-w-[200px] ${
            isSaving || isDataEmpty ? 'bg-indigo-300 text-white cursor-not-allowed' : 'bg-[#818cf8] hover:bg-[#6366f1] text-white'
          }`}
        >
          {isSaving ? <><Loader2 size={16} className="animate-spin mr-2" /> Saving...</> : 'Save Attendance Record'}
        </button>
      </div>
    </div>
  );
}