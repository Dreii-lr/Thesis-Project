'use client';

import React, { Suspense } from 'react';
import { useTeacher } from '@/src/context/TeacherContext';
import { useRouter, useSearchParams } from 'next/navigation';
import AssessmentForm from '@/src/components/layout/teacher/assessment-tasks/AssessmentForm';
import {
  AssessmentPayload,
  toAssessmentCreatePayload,
  toAssessmentUpdatePayload,
} from '@/src/data/mockAssessment';
import { ArrowLeft } from 'lucide-react';

function ExamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const { tasks, createAssessment, updateAssessment } = useTeacher();
  const editingTask = tasks.find((task) => task.id === editId) ?? null;

  const handleSave = (task: AssessmentPayload) => {
    const saved = editId
      ? updateAssessment(editId, toAssessmentUpdatePayload(task))
      : createAssessment(toAssessmentCreatePayload(task));
    if (!saved) return;
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

        <AssessmentForm
          type="Exam"
          initialData={editingTask}
          onSave={handleSave}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-slate-500">Loading exam editor...</div>
      }
    >
      <ExamContent />
    </Suspense>
  );
}
