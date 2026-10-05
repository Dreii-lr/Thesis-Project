'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ActivityForm from '@/src/components/layout/teacher/assessment-tasks/ActivityForm';
import { initialTasks, AssessmentPayload } from '@/src/data/mockAssessment';
import { ArrowLeft } from 'lucide-react';

function ActivityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

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
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
          >
            <ArrowLeft size={16} strokeWidth={2.2} /> Back
          </button>
        </div>

        <ActivityForm
          initialData={editingTask}
          onSave={handleSave}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading activity editor...</div>}>
      <ActivityContent />
    </Suspense>
  );
}