'use client';

import { CloudUpload, FileText, Trash2, X } from 'lucide-react';

interface UploadModalProps {
  onClose: () => void;
}

export default function UploadModal({ onClose }: UploadModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/50 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.2)] animate-in fade-in zoom-in duration-200">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Upload curriculum file</h2>
            <p className="mt-1 text-[13px] text-slate-500">
              Add the source files you want to prepare for content generation.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close upload modal"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 px-6 py-9 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/40">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100">
              <CloudUpload size={22} strokeWidth={1.8} />
            </div>
            <p className="text-sm font-semibold text-slate-800">Drop curriculum files here</p>
            <p className="mt-1 text-xs text-slate-500">or click to browse · 50 MB max</p>
          </div>

          <div className="mb-6 space-y-2.5">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                  <FileText size={15} />
                </div>
                <span className="truncate text-[13px] font-medium text-slate-700">
                  title_curriculum_file.pdf
                </span>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-3">
                <span className="text-[11px] text-slate-400">20.4 KB</span>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  aria-label="Remove title_curriculum_file.pdf"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                  <FileText size={15} />
                </div>
                <span className="truncate text-[13px] font-medium text-slate-700">
                  syllabus_outline.docx
                </span>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-3">
                <span className="text-[11px] text-slate-400">15.1 KB</span>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  aria-label="Remove syllabus_outline.docx"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-5">
            <button
              onClick={onClose}
              className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button className="h-9 rounded-lg bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
