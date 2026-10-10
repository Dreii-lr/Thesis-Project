// src/components/layout/teacher/lesson-content/ContentHeader.tsx
'use client';

import { Sparkles, Loader2, Database } from 'lucide-react';

interface ContentHeaderProps {
  onGenerateContent?: () => void;
  hasGeneratedContent?: boolean;
  isGenerating?: boolean;
  hideWhenGenerated?: boolean;
  onExportDatabaseJson?: () => void;
}

export default function ContentHeader({
  onGenerateContent,
  hasGeneratedContent = false,
  isGenerating = false,
  hideWhenGenerated = false,
  onExportDatabaseJson,
}: ContentHeaderProps) {
  // If content is already generated and hideWhenGenerated is explicitly requested, do not render the button
  if (hasGeneratedContent && hideWhenGenerated) {
    return (
      <header className="flex h-14 w-full shrink-0 items-center justify-end border-b border-slate-100 bg-white px-6">
        {onExportDatabaseJson && (
          <button
            type="button"
            onClick={onExportDatabaseJson}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900"
            title="Download JSON payload for Database"
          >
            <Database size={13} className="text-slate-500" />
            Export DB JSON
          </button>
        )}
      </header>
    );
  }

  return (
    <header className="flex h-14 w-full shrink-0 items-center justify-end gap-3 border-b border-slate-100 bg-white px-6">
      {onExportDatabaseJson && (
        <button
          type="button"
          onClick={onExportDatabaseJson}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900"
          title="Download JSON payload for Database"
        >
          <Database size={13} className="text-slate-500" />
          Export DB JSON
        </button>
      )}

      {onGenerateContent && (
        <button
          type="button"
          onClick={onGenerateContent}
          disabled={hasGeneratedContent || isGenerating}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
            hasGeneratedContent
              ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 opacity-60 shadow-none'
              : 'border border-blue-600 bg-blue-600 text-white shadow-xs hover:bg-blue-700 hover:border-blue-700 active:scale-[0.98]'
          }`}
          title={
            hasGeneratedContent
              ? 'Lesson content has already been generated'
              : 'Generate lesson content with AI'
          }
        >
          {isGenerating ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Generating Content…</span>
            </>
          ) : (
            <>
              <Sparkles
                size={13}
                className={hasGeneratedContent ? 'text-slate-400' : 'text-blue-100'}
              />
              <span>
                {hasGeneratedContent ? 'Content Generated' : 'Generate Content'}
              </span>
            </>
          )}
        </button>
      )}
    </header>
  );
}