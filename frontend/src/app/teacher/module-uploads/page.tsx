'use client';

import { useState } from 'react';
import UploadDropzone from '@/src/components/layout/teacher/module-uploads/UploadDropzone';
import DigitizedLibrary from '@/src/components/layout/teacher/module-uploads/DigitizedLibrary';
import ConfigureUploadModal from '@/src/components/ui/teacher/module-uploads/ConfigureUploadModal';
import { LibraryModule, mockLibrary } from '@/src/data/mockTeacher';
import PendingApprovals from '@/src/components/layout/teacher/module-uploads/PendingApprovals';

export default function ModuleUploadsPage() {
  const [library, setLibrary] = useState<LibraryModule[]>(mockLibrary);
  const [pending, setPending] = useState<LibraryModule[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>('');

  const handleFileSelect = (filename: string) => {
    setSelectedFile(filename);
    setIsModalOpen(true);
  };

  const startUpload = (filename: string, level: string, subject: string) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const newId = `p-${Date.now()}`;
    
    // 1. Add it initially in an 'Uploading' state at 0%
    const newPendingModule: LibraryModule = {
      id: newId,
      filename,
      level,
      subject,
      uploadDate: `Today, ${today}`,
      status: 'Uploading',
      progress: 0
    };

    setPending([newPendingModule, ...pending]);
    setIsModalOpen(false);

    // 2. Simulate the upload progress bar
    const progressSteps = [20, 45, 75, 90, 100];
    
    progressSteps.forEach((progressPoint, index) => {
      setTimeout(() => {
        setPending(currentPending => 
          currentPending.map(item => {
            if (item.id === newId) {
              // If it hits 100%, change status to 'Pending' so the buttons appear
              if (progressPoint === 100) {
                return { ...item, progress: 100, status: 'Pending' };
              }
              // Otherwise just update the progress bar
              return { ...item, progress: progressPoint };
            }
            return item;
          })
        );
      }, (index + 1) * 400); // Progresses every 400ms
    });
  };

  const approveModule = (id: string) => {
    const approvedModule = pending.find(m => m.id === id);
    if (approvedModule) {
      setPending(pending.filter(m => m.id !== id));
      setLibrary([{ ...approvedModule, status: 'Published' }, ...library]);
    }
  };

  const cancelModule = (id: string) => {
    setPending(pending.filter(m => m.id !== id));
  };

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 lg:p-8 bg-gray-50/30 animate-in fade-in duration-300 overflow-y-auto">
      
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Curriculum & Module Uploads</h1>
          <p className="text-xs sm:text-[13px] text-gray-500 mt-1 max-w-xl">
            Upload raw documents. Pending modules must be approved before they are published to the digitized library and assigned to learners.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 sm:mb-8">
        <UploadDropzone onFileSelect={handleFileSelect} />
        <PendingApprovals 
          pendingItems={pending} 
          onApprove={approveModule} 
          onCancel={cancelModule} 
        />
      </div>

      <div className="pb-8">
        <DigitizedLibrary modules={library} />
      </div>

      <ConfigureUploadModal 
        isOpen={isModalOpen}
        filename={selectedFile}
        onClose={() => setIsModalOpen(false)}
        onConfirm={startUpload}
      />
      
    </div>
  );
}