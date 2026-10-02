'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ActivityForm from '@/src/components/layout/teacher/assessment-tasks/ActivityForm';
import AssignStudentsModal from '@/src/components/ui/teacher/assessment-tasks/AssignStudentsModal';
import { ArrowLeft } from 'lucide-react';

export default function ActivityPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');

  const handleSave = (task: any) => {
    setTaskTitle(task.title);
    setShowModal(true);
  };

  const confirmAssignment = () => {
    setShowModal(false);
    router.push('/assessment-tasks');
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 font-sans">
      <div className="mx-auto w-full max-w-[1480px]">
        <button onClick={() => router.back()} className="mb-6 inline-flex h-10 items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 text-[13px] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:bg-slate-50">
          <ArrowLeft size={16} strokeWidth={2.2} /> Back
        </button>
        <ActivityForm onSave={handleSave} onCancel={() => router.back()} />
        
        <AssignStudentsModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
          onConfirm={confirmAssignment} 
          taskTitle={taskTitle} 
        />
      </div>
    </div>
  );
}