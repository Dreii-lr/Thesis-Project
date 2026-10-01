'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AssessmentForm from '@/src/components/layout/teacher/assessment-tasks/AssessmentForm';
import AIGenerator from '@/src/components/layout/teacher/assessment-tasks/AIGenerator';
import AssignStudentsModal from '@/src/components/ui/teacher/assessment-tasks/AssignStudentsModal';
import { ArrowLeft, Sparkles, PenTool } from 'lucide-react';

export default function QuizzesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'ai' ? 'ai' : 'manual';
  
  const [mode, setMode] = useState<'manual' | 'ai'>(initialMode);
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
        
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/teacher/assessment-tasks/choice')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            <ArrowLeft size={16} strokeWidth={2.2} /> Back
          </button>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button onClick={() => setMode('manual')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${mode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <PenTool size={14} /> Manual Authoring
            </button>
            <button onClick={() => setMode('ai')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${mode === 'ai' ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20' : 'text-slate-500 hover:text-slate-700'}`}>
              <Sparkles size={14} /> AI Generator
            </button>
          </div>
        </div>

        {mode === 'manual' ? (
          <AssessmentForm type="Quiz" onSave={handleSave} onCancel={() => router.back()} />
        ) : (
          <AIGenerator onSave={handleSave} />
        )}
        
        <AssignStudentsModal isOpen={showModal} onClose={() => setShowModal(false)} onConfirm={confirmAssignment} taskTitle={taskTitle} />
      </div>
    </div>
  );
}