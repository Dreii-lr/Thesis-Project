'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import TypeSelector from '@/src/components/layout/teacher/assessment-tasks/TypeSelector';
import { ArrowLeft } from 'lucide-react';

export default function ChoicePage() {
  const router = useRouter();

  const handleSelection = (view: string) => {
    if (view === 'create-activity') router.push('/teacher/assessment-tasks/activity');
    else if (view === 'create-quiz-manual' || view === 'create-quiz-ai') router.push(`/teacher/assessment-tasks/quizzes?mode=${view.includes('ai') ? 'ai' : 'manual'}`);
    else if (view === 'create-exam') router.push('/teacher/assessment-tasks/exam');
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 font-sans">
      <div className="mx-auto w-full max-w-[1480px]">
        <button onClick={() => router.back()} className="mb-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 text-[13px] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all hover:bg-slate-50">
          <ArrowLeft size={16} strokeWidth={2.2} /> Back
        </button>
        <TypeSelector onViewChange={handleSelection} />
      </div>
    </div>
  );
}