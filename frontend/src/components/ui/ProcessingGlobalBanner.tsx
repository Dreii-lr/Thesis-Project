'use client';

import React from 'react';
import Link from 'next/link';
import { Loader2, CheckCircle2, AlertTriangle, X, ArrowRight, Sparkles } from 'lucide-react';
import { useDocumentProcessing } from '@/src/context/DocumentProcessingContext';

export default function ProcessingGlobalBanner() {
  const {
    activeUpload,
    activeLessonGenerations,
    backendProcessingDocs,
    dismissUploadNotification,
    dismissLessonNotification,
  } = useDocumentProcessing();

  const lessonJobs = Object.values(activeLessonGenerations);
  const hasUpload = Boolean(activeUpload);
  const hasLessons = lessonJobs.length > 0;

  // Filter backend docs that aren't already represented by activeUpload
  const otherProcessingDocs = backendProcessingDocs.filter(
    (d) => !activeUpload || d.filename.toLowerCase() !== activeUpload.filename.toLowerCase()
  );

  if (!hasUpload && !hasLessons && otherProcessingDocs.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label="Background processing notifications"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {/* 1. Active or Completed Module Upload */}
      {activeUpload && (
        <div
          className={`pointer-events-auto rounded-2xl border p-4 shadow-xl transition-all duration-300 ${
            activeUpload.status === 'COMPLETED'
              ? 'border-emerald-200 bg-white/95 backdrop-blur-md text-emerald-950 ring-1 ring-emerald-500/10'
              : activeUpload.status === 'ERROR'
              ? 'border-rose-200 bg-white/95 backdrop-blur-md text-rose-950 ring-1 ring-rose-500/10'
              : 'border-blue-200 bg-white/95 backdrop-blur-md text-slate-900 ring-1 ring-blue-500/10'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                {activeUpload.status === 'COMPLETED' ? (
                  <CheckCircle2 size={18} className="text-emerald-600" />
                ) : activeUpload.status === 'ERROR' ? (
                  <AlertTriangle size={18} className="text-rose-600" />
                ) : (
                  <Loader2 size={18} className="animate-spin text-blue-600" />
                )}
              </span>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {activeUpload.status === 'COMPLETED'
                    ? 'Processing Finished'
                    : activeUpload.status === 'ERROR'
                    ? 'Upload Failed'
                    : 'AI Document Parser'}
                </p>
                <h4 className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                  {activeUpload.filename}
                </h4>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {activeUpload.message}
                </p>

                {activeUpload.status === 'COMPLETED' && (
                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      href="/teacher/module-uploads"
                      onClick={dismissUploadNotification}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700"
                    >
                      <span>Review in Modules</span>
                      <ArrowRight size={12} />
                    </Link>
                    <Link
                      href="/teacher/lesson-content"
                      onClick={dismissUploadNotification}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Sparkles size={12} className="text-amber-500" />
                      <span>Lessons</span>
                    </Link>
                  </div>
                )}

                {(activeUpload.status === 'UPLOADING' || activeUpload.status === 'PARSING') && (
                  <p className="mt-2 text-[11px] font-medium text-blue-600">
                    Running in background · you can browse other pages
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={dismissUploadNotification}
              className="text-slate-400 hover:text-slate-600 transition"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 2. Active Lesson Generations */}
      {lessonJobs.map((job) => (
        <div
          key={job.materialId}
          className={`pointer-events-auto rounded-2xl border p-4 shadow-xl transition-all duration-300 ${
            job.status === 'COMPLETED'
              ? 'border-emerald-200 bg-white/95 backdrop-blur-md text-emerald-950 ring-1 ring-emerald-500/10'
              : job.status === 'ERROR'
              ? 'border-rose-200 bg-white/95 backdrop-blur-md text-rose-950 ring-1 ring-rose-500/10'
              : 'border-purple-200 bg-white/95 backdrop-blur-md text-slate-900 ring-1 ring-purple-500/10'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                {job.status === 'COMPLETED' ? (
                  <CheckCircle2 size={18} className="text-emerald-600" />
                ) : job.status === 'ERROR' ? (
                  <AlertTriangle size={18} className="text-rose-600" />
                ) : (
                  <Loader2 size={18} className="animate-spin text-purple-600" />
                )}
              </span>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-700">
                  {job.status === 'COMPLETED'
                    ? 'Lessons Generated'
                    : job.status === 'ERROR'
                    ? 'Generation Failed'
                    : 'AI Generating Lessons'}
                </p>
                <h4 className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                  {job.title || 'Curriculum Material'}
                </h4>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {job.message}
                </p>

                {job.status === 'COMPLETED' && (
                  <div className="mt-3">
                    <Link
                      href={`/teacher/lesson-content/${job.materialId}`}
                      onClick={() => dismissLessonNotification(job.materialId)}
                      className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-purple-700"
                    >
                      <span>Open Generated Lessons</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => dismissLessonNotification(job.materialId)}
              className="text-slate-400 hover:text-slate-600 transition"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}

      {/* 3. External Server Processing (Detected via database status) */}
      {!activeUpload && otherProcessingDocs.length > 0 && (
        <div className="pointer-events-auto rounded-2xl border border-amber-200 bg-white/95 backdrop-blur-md p-4 shadow-xl ring-1 ring-amber-500/10">
          <div className="flex items-start gap-3">
            <Loader2 size={18} className="mt-0.5 animate-spin text-amber-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Server Processing Active
              </p>
              <h4 className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                {otherProcessingDocs[0].filename}
              </h4>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                The AI parser is actively processing this document on the backend server.
              </p>
              <Link
                href="/teacher/module-uploads"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
              >
                <span>View in Module Uploads</span>
                <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
