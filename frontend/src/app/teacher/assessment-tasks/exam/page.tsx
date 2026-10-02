'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AssessmentForm from '@/src/components/layout/teacher/assessment-tasks/AssessmentForm';
import AssignStudentsModal from '@/src/components/ui/teacher/assessment-tasks/AssignStudentsModal';
import { ArrowLeft } from 'lucide-react';

export default function ExamPage() {
  const router = useRouter();
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');

  // 1. When the teacher clicks "Publish Exam" in the AssessmentForm
  const handleSave = (task: any) => {
    setTaskTitle(task.title);
    setShowModal(true); // Open the student assignment modal
  };

  // 2. When the teacher confirms the student selection in the Modal
  const confirmAssignment = () => {
    setShowModal(false);
    // Ideally, you would save to your database here.
    // For now, we return them to the main dashboard.
    router.push('/teacher/assessment-tasks');
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 font-sans">
      <div className="mx-auto w-full max-w-[1480px]">
        
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => router.back()} 
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
          >
            <ArrowLeft size={16} strokeWidth={2.2} /> Back
          </button>
        </div>

        {/* The Form */}
        <AssessmentForm 
          type="Exam" 
          onSave={handleSave} 
          onCancel={() => router.back()} 
        />
        
        {/* Assignment Popup Modal */}
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