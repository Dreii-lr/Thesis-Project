'use client';

import { ChevronDown, ChevronRight, FileText, FolderOpen, PanelLeftDashed } from 'lucide-react';
import { LessonFolder } from '@/src/data/mockModules';
import { useState } from 'react';

interface ContentSidebarProps {
  lessons: LessonFolder[];
  activeFileId: string;
  onFileSelect: (fileId: string) => void;
}

export default function ContentSidebar({ lessons, activeFileId, onFileSelect }: ContentSidebarProps) {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(
    lessons.reduce((acc, lesson) => ({ ...acc, [lesson.id]: true }), {})
  );

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-slate-200/80 bg-white">
      <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Content outline
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Lessons & files</p>
        </div>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
          aria-label="Document outline"
        >
          <PanelLeftDashed size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {lessons.map((lesson) => {
          const isOpen = openFolders[lesson.id];

          return (
            <div key={lesson.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-1.5">
              <button
                onClick={() => toggleFolder(lesson.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-slate-700 transition-colors hover:bg-white"
              >
                <span className="text-slate-400">
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                <FolderOpen size={15} className="shrink-0 text-blue-500" />
                <span className="truncate text-[12px] font-semibold">{lesson.title}</span>
              </button>

              {isOpen && (
                <div className="mt-1 space-y-1 pb-1 pl-3">
                  {lesson.files.map((file) => {
                    const isActive = activeFileId === file.id;

                    return (
                      <button
                        key={file.id}
                        onClick={() => onFileSelect(file.id)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all ${
                          isActive
                            ? 'bg-white text-blue-700 shadow-sm ring-1 ring-inset ring-blue-100'
                            : 'text-slate-500 hover:bg-white hover:text-slate-800'
                        }`}
                      >
                        <FileText
                          size={14}
                          className={`shrink-0 ${isActive ? 'text-blue-500' : 'text-slate-400'}`}
                        />
                        <span className={`truncate text-[12px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                          {file.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
