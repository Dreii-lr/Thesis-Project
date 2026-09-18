'use client';

import { useState } from 'react';
import UploadModal from '@/src/components/ui/UploadModal';
import ModuleCard from '@/src/components/ui/ModuleCard';
import { mockModules } from '@/src/data/mockModules';

export default function GenerateContentPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="w-full h-full flex flex-col p-6 lg:p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Summarize Module</h1>
          <p className="text-gray-500 text-sm">
            Transform digitized modules into structured, editable lessons and presentations.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#2563eb] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Upload Module
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 flex-1 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
        {mockModules.map((module) => {
          const totalFiles = module.lessons.reduce((acc, lesson) => acc + lesson.files.length, 0);
          
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

      {isModalOpen && <UploadModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}