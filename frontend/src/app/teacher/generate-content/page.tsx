'use client';

import { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import UploadModal from '@/src/components/ui/UploadModal';
import ModuleCard from '@/src/components/ui/ModuleCard';
import { mockModules } from '@/src/data/mockModules';

export default function GenerateContentPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1480px]">
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
              <Sparkles size={13} strokeWidth={2} />
              AI Content Workspace
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">
              Summarize Module
            </h1>
            <p className="mt-1.5 text-[13px] leading-6 text-slate-500 sm:text-sm">
              Transform digitized modules into structured, editable lessons and presentations.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-blue-600/15 transition-all hover:bg-blue-700 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 sm:self-auto"
          >
            <Plus size={16} strokeWidth={2.2} />
            Upload Module
          </button>
        </div>

        <section className="rounded-2xl border border-slate-200/80 bg-white/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Your modules</h2>
              <p className="mt-0.5 text-[12px] text-slate-500">
                Open a module to review and edit its generated lesson content.
              </p>
            </div>

            <span className="self-start rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 sm:self-auto">
              {mockModules.length} {mockModules.length === 1 ? 'module' : 'modules'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {mockModules.map((module) => {
              const totalFiles = module.lessons.reduce(
                (acc, lesson) => acc + lesson.files.length,
                0
              );

              return (
                <ModuleCard
                  key={module.id}
                  id={module.id}
                  title={module.title}
                  subtitle={module.subtitle}
                  fileCount={totalFiles}
                />
              );
            })}
          </div>
        </section>
      </div>

      {isModalOpen && <UploadModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
