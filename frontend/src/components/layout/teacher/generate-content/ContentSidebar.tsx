'use client';

import { FolderOpen, Folder, FileText, PanelLeftDashed } from 'lucide-react';
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
    setOpenFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  return (
    <aside className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col h-full">
      <div className="h-14 flex items-center justify-between px-5 border-b border-gray-100">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
          Document Outline
        </span>
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <PanelLeftDashed size={18} />
        </button>
      </div>

      <div className="p-4 overflow-y-auto flex-1 space-y-2">
        {lessons.map((lesson) => (
          <div key={lesson.id}>
            {/* Folder Header */}
            <div 
              onClick={() => toggleFolder(lesson.id)}
              className="flex items-center gap-2.5 px-2 py-2 text-gray-700 cursor-pointer hover:bg-gray-50 rounded-md"
            >
              {openFolders[lesson.id] ? (
                <FolderOpen size={16} className="text-gray-400 shrink-0" />
              ) : (
                <Folder size={16} className="text-gray-400 shrink-0" />
              )}
              <span className="text-sm font-medium truncate">{lesson.title}</span>
            </div>
            
            {/* Folder Files */}
            {openFolders[lesson.id] && (
              <div className="ml-5 mt-1 space-y-1 border-l border-gray-100 pl-2">
                {lesson.files.map((file) => {
                  const isActive = activeFileId === file.id;
                  return (
                    <div 
                      key={file.id}
                      onClick={() => onFileSelect(file.id)}
                      className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer rounded-md transition-colors ${
                        isActive ? 'bg-[#f0f4ff] text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <FileText size={16} className={isActive ? "text-blue-500 shrink-0" : "text-gray-400 shrink-0"} />
                      <span className={`text-sm truncate ${isActive ? 'font-medium' : ''}`}>
                        {file.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}