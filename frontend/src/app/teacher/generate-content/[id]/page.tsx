'use client';

import { useState, useEffect, use } from 'react';
import DocumentSidebar from '@/src/components/layout/ContentSidebar';
import { Edit2 } from 'lucide-react';
import { mockModules, ContentFile } from '@/src/data/mockModules';
import { notFound } from 'next/navigation';


export default function DocumentViewPage({ params }: { params: Promise<{ id: string }> }) {

  const resolvedParams = use(params);
  const moduleId = resolvedParams.id;
  const moduleData = mockModules.find(m => m.id === moduleId);
  
  if (!moduleData) {
    return notFound(); 
  }

  const firstFile = moduleData.lessons[0]?.files[0];
  
  const [activeFileId, setActiveFileId] = useState<string>(firstFile?.id || '');
  const [activeContent, setActiveContent] = useState<ContentFile | null>(firstFile || null);

  useEffect(() => {
    for (const lesson of moduleData.lessons) {
      const foundFile = lesson.files.find(f => f.id === activeFileId);
      if (foundFile) {
        setActiveContent(foundFile);
        break;
      }
    }
  }, [activeFileId, moduleData]);

  return (
    <div className="h-full w-full flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      
      <DocumentSidebar 
        lessons={moduleData.lessons} 
        activeFileId={activeFileId}
        onFileSelect={(fileId) => setActiveFileId(fileId)}
      />

      <div className="flex-1 overflow-y-auto bg-white">
        {activeContent ? (
          <div className="w-full mx-auto px-8 py-6 lg:px-12 lg:py-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{activeContent.title}</h1>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm shrink-0">
                <Edit2 size={16} className="text-gray-500" />
                Edit Content
              </button>
            </div>

            <div className="prose prose-gray max-w-none">
              {activeContent.paragraphs.map((paragraph, index) => (
                <p key={index} className="text-[15px] text-gray-700 leading-relaxed mb-6">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            Select a file from the outline to view content.
          </div>
        )}
      </div>
    </div>
  );
}