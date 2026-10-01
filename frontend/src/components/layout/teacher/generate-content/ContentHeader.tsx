'use client';

import { Database } from 'lucide-react';

interface ContentHeaderProps {
  onExportDatabaseJson: () => void;
}

export default function ContentHeader({
  onExportDatabaseJson,
}: ContentHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-end border-b border-slate-100 bg-white/95 px-6 backdrop-blur-xs">
      <button
        type="button"
        onClick={onExportDatabaseJson}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900"
        title="Download JSON payload for Database"
      >
        <Database size={13} className="text-blue-600" />
        Export DB JSON
      </button>
    </header>
  );
}