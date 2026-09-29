'use client';

import { useState, useEffect, use } from 'react';
import DocumentSidebar from '@/src/components/layout/teacher/generate-content/ContentSidebar';
import { Edit2, FileText } from 'lucide-react';
import { mockModules, ContentFile } from '@/src/data/mockModules';
import { notFound } from 'next/navigation';

export default function DocumentViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const moduleId = resolvedParams.id;
  const moduleData = mockModules.find((module) => module.id === moduleId);

  if (!moduleData) {
    return notFound();
  }

  const firstFile = moduleData.lessons[0]?.files[0];

  const [activeFileId, setActiveFileId] = useState<string>(firstFile?.id || '');
  const [activeContent, setActiveContent] = useState<ContentFile | null>(firstFile || null);

  useEffect(() => {
    for (const lesson of moduleData.lessons) {
      const foundFile = lesson.files.find((file) => file.id === activeFileId);
      if (foundFile) {
        setActiveContent(foundFile);
        break;
      }
    }
  }, [activeFileId, moduleData]);

  return (
    <div className="flex h-full min-h-[calc(100vh-72px)] w-full bg-[#f6f8fc] p-4 sm:p-5 lg:p-6">
      <div className="flex min-h-0 w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <DocumentSidebar
          lessons={moduleData.lessons}
          activeFileId={activeFileId}
          onFileSelect={(fileId) => setActiveFileId(fileId)}
        />

        <div className="min-w-0 flex-1 overflow-y-auto bg-slate-50/50">
          {activeContent ? (
            <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
              <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                <FileText size={13} />
                Generated lesson content
              </div>

              <article className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-8 sm:py-8 lg:px-10">
                <div className="mb-7 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="mb-1.5 text-[12px] font-medium text-blue-600">
                      {moduleData.title}
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 lg:text-[28px]">
                      {activeContent.title}
                    </h1>
                  </div>

                  <button className="inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3.5 text-[12px] font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900">
                    <Edit2 size={14} className="text-slate-400" />
                    Edit Content
                  </button>
                </div>

                <div className="max-w-none">
                  {activeContent.paragraphs.map((paragraph, index) => (
                    <p
                      key={index}
                      className="mb-5 text-[14px] leading-7 text-slate-600 sm:text-[15px]"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-slate-400">
              Select a file from the outline to view content.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
