// src/components/layout/teacher/generate-content/ContentSidebar.tsx
'use client';

import {
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  PanelLeftDashed,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { LessonFolder } from '@/src/data/mockModules';
import { useState } from 'react';

interface ContentSidebarProps {
  lessons: LessonFolder[];
  activeFileId: string;
  onFileSelect: (fileId: string) => void;
  onRenameLesson: (lessonId: string, newTitle: string) => void;
  onRenameFile: (lessonId: string, fileId: string, newTitle: string) => void;
}

export default function ContentSidebar({
  lessons,
  activeFileId,
  onFileSelect,
  onRenameLesson,
  onRenameFile,
}: ContentSidebarProps) {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(
    lessons.reduce((acc, lesson) => ({ ...acc, [lesson.id]: true }), {})
  );

  // Track which folder or file is currently being renamed in the sidebar
  const [editingItem, setEditingItem] = useState<{
    type: 'lesson' | 'file';
    lessonId: string;
    fileId?: string;
  } | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const startEditingLesson = (e: React.MouseEvent, lesson: LessonFolder) => {
    e.stopPropagation();
    setEditingItem({ type: 'lesson', lessonId: lesson.id });
    setDraftTitle(lesson.title);
  };

  const startEditingFile = (
    e: React.MouseEvent,
    lessonId: string,
    fileId: string,
    currentTitle: string
  ) => {
    e.stopPropagation();
    setEditingItem({ type: 'file', lessonId, fileId });
    setDraftTitle(currentTitle);
  };

  const handleSaveRename = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    if (!editingItem) return;

    const trimmed = draftTitle.trim();
    if (trimmed) {
      if (editingItem.type === 'lesson') {
        onRenameLesson(editingItem.lessonId, trimmed);
      } else if (editingItem.type === 'file' && editingItem.fileId) {
        onRenameFile(editingItem.lessonId, editingItem.fileId, trimmed);
      }
    }
    setEditingItem(null);
    setDraftTitle('');
  };

  const handleCancelRename = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    setEditingItem(null);
    setDraftTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveRename(e);
    } else if (e.key === 'Escape') {
      handleCancelRename(e);
    }
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col overflow-hidden border-r border-slate-200/80 bg-white">
      {/* Fixed Sidebar Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Content outline
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Lessons & files</p>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
          aria-label="Document outline"
        >
          <PanelLeftDashed size={16} />
        </button>
      </div>

      {/* Independently Scrollable Lessons List (No outer box container) */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {lessons.map((lesson) => {
          const isOpen = openFolders[lesson.id];
          const isEditingThisLesson =
            editingItem?.type === 'lesson' && editingItem.lessonId === lesson.id;

          return (
            <div key={lesson.id}>
              {/* Main Topic (Folder) Row */}
              {isEditingThisLesson ? (
                <div className="flex items-center gap-1 rounded-lg bg-white px-2 py-1.5 ring-1 ring-blue-500">
                  <FolderOpen size={15} className="shrink-0 text-blue-500" />
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-slate-800 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveRename}
                    className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                    title="Save"
                  >
                    <Check size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelRename}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Cancel"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="group flex w-full items-center justify-between rounded-lg px-2 py-2 text-slate-700 transition-colors hover:bg-slate-50">
                  <button
                    type="button"
                    onClick={() => toggleFolder(lesson.id)}
                    onDoubleClick={(e) => startEditingLesson(e, lesson)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="text-slate-400">
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <FolderOpen size={15} className="shrink-0 text-blue-500" />
                    <span className="truncate text-[12px] font-semibold">
                      {lesson.title}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => startEditingLesson(e, lesson)}
                    className="ml-1 hidden shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 group-hover:inline-flex"
                    title="Rename main topic"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              )}

              {/* Sub-Topics (Files) List with Vertical Tree Line */}
              {isOpen && (
                <div className="mt-1 mb-1 ml-6 space-y-1 border-l border-slate-200 py-0.5 pl-3">
                  {lesson.files.map((file) => {
                    const isActive = activeFileId === file.id;
                    const isEditingThisFile =
                      editingItem?.type === 'file' &&
                      editingItem.lessonId === lesson.id &&
                      editingItem.fileId === file.id;

                    if (isEditingThisFile) {
                      return (
                        <div
                          key={file.id}
                          className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 shadow-xs ring-1 ring-blue-500"
                        >
                          <FileText size={14} className="shrink-0 text-blue-500" />
                          <input
                            type="text"
                            value={draftTitle}
                            onChange={(e) => setDraftTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-slate-800 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleSaveRename}
                            className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                            title="Save"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelRename}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            title="Cancel"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={file.id}
                        className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 transition-all ${
                          isActive
                            ? 'bg-blue-50/60 text-blue-700 shadow-2xs ring-1 ring-inset ring-blue-100'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onFileSelect(file.id)}
                          onDoubleClick={(e) =>
                            startEditingFile(e, lesson.id, file.id, file.title)
                          }
                          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                        >
                          <FileText
                            size={14}
                            className={`shrink-0 ${
                              isActive ? 'text-blue-500' : 'text-slate-400'
                            }`}
                          />
                          <span
                            className={`truncate text-[12px] ${
                              isActive ? 'font-semibold' : 'font-medium'
                            }`}
                          >
                            {file.title}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) =>
                            startEditingFile(e, lesson.id, file.id, file.title)
                          }
                          className="ml-1 hidden shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 group-hover:inline-flex"
                          title="Rename sub-topic"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
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