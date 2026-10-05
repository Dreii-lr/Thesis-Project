'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AssessmentForm from '@/src/components/layout/teacher/assessment-tasks/AssessmentForm';
import AIGenerator from '@/src/components/layout/teacher/assessment-tasks/AIGenerator';
import { initialTasks, AssessmentPayload } from '@/src/data/mockAssessment';
import { ArrowLeft, Sparkles, PenTool } from 'lucide-react';

function QuizzesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'ai' ? 'ai' : 'manual';
  const editId = searchParams.get('edit');

  const [mode, setMode] = useState<'manual' | 'ai'>(initialMode);
  const [editingTask, setEditingTask] = useState<AssessmentPayload | null>(null);

  useEffect(() => {
    if (editId) {
      const existingRaw = localStorage.getItem('als_assessments');
      const existing: AssessmentPayload[] = existingRaw ? JSON.parse(existingRaw) : initialTasks;
      const found = existing.find((t) => t.id === editId);
      if (found) setEditingTask(found);
    }
  }, [editId]);

  const handleSave = (task: AssessmentPayload) => {
    const existingRaw = localStorage.getItem('als_assessments');
    const existing: AssessmentPayload[] = existingRaw ? JSON.parse(existingRaw) : initialTasks;

    const updated = editId
      ? existing.map((t) => (t.id === editId ? task : t))
      : [task, ...existing];

    localStorage.setItem('als_assessments', JSON.stringify(updated));
    router.push('/teacher/assessment-tasks');
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 font-sans">
      <div className="mx-auto w-full max-w-[1480px]">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft size={16} strokeWidth={2.2} /> Back
          </button>

          {!editId && (
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                  mode === 'manual'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <PenTool size={14} /> Manual Authoring
              </button>
              <button
                type="button"
                onClick={() => setMode('ai')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                  mode === 'ai'
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Sparkles size={14} /> AI Generator
              </button>
            </div>
          )}
        </div>

        {mode === 'manual' ? (
          <AssessmentForm
            type="Quiz"
            initialData={editingTask}
            onSave={handleSave}
            onCancel={() => router.back()}
          />
        ) : (
          <AIGenerator onSave={handleSave} />
        )}
      </div>
    </div>
  );
}

export default function QuizzesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading quiz editor...</div>}>
      <QuizzesContent />
    </Suspense>
  );
}