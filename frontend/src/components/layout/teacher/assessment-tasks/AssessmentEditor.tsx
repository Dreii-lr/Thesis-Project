"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import ActivityForm from './ActivityForm';
import AssessmentForm from './AssessmentForm';
import AIGenerator from './AIGenerator';
import { AssessmentPayload, TaskType, createAssessment, getAssessment, toAssessmentUpdatePayload, updateAssessment } from '@/src/lib/assessments-api';

export default function AssessmentEditor({ type }: { type: TaskType }) {
  const params = useSearchParams();
  return <EditorContent key={`${type}:${params.get('edit') ?? 'new'}`} type={type} editId={params.get('edit')} ai={params.get('mode') === 'ai'} />;
}

function EditorContent({ type, editId, ai }: { type: TaskType; editId: string | null; ai: boolean }) {
  const router = useRouter();
  const [initialData, setInitialData] = useState<AssessmentPayload | null>(null);
  const [loading, setLoading] = useState(Boolean(editId));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    if (editId) getAssessment(editId).then(task => {
      if (task.assessment_type !== type) throw new Error('This assessment belongs to a different editor. Open it from the dashboard.');
      const categories = task.categories_data ?? [];
      const supported = ['Multiple Choice', 'True/False', 'True or False', 'Matching Type'];
      const types = categories.map(category => category.type === 'True or False' ? 'True/False' : category.type);
      if (type !== 'ACTIVITY' && (categories.some(category => !supported.includes(category.type)) || new Set(types).size !== types.length)) throw new Error('This assessment uses question categories that this editor cannot safely edit yet.');
      if (active) setInitialData(task);
    }).catch(error => { if (active) setError(error instanceof Error ? error.message : 'Unable to load assessment.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [editId, type, retry]);

  async function save(task: AssessmentPayload) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      if (editId) await updateAssessment(editId, toAssessmentUpdatePayload(task));
      else await createAssessment(task);
      router.push('/teacher/assessment-tasks');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save assessment. Please try again.');
      inFlight.current = false;
      setSaving(false);
    }
  }
  return <div className="w-full p-4 sm:p-6 lg:p-8 font-sans"><div className="mx-auto max-w-[1480px] space-y-6">
    <button disabled={saving} onClick={() => router.push('/teacher/assessment-tasks')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"><ArrowLeft size={16} /> Back to assessments</button>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}{editId && !initialData && <button className="ml-4 underline" onClick={() => { setLoading(true); setError(''); setRetry(value => value + 1); }}>Retry</button>}</div>}
    {loading ? <p role="status">Loading assessment...</p> : (!editId || initialData) && <fieldset disabled={saving} className="min-w-0 space-y-4 disabled:opacity-70">
      {saving && <p role="status">Saving assessment...</p>}
      {!editId && ai ? <AIGenerator /> : type === 'ACTIVITY'
        ? <ActivityForm key={editId ?? 'new'} initialData={initialData} onSave={save} onCancel={() => router.push('/teacher/assessment-tasks')} />
        : <AssessmentForm key={editId ?? 'new'} type={type === 'EXAM' ? 'Exam' : 'Quiz'} initialData={initialData} onSave={save} onCancel={() => router.push('/teacher/assessment-tasks')} />}
    </fieldset>}
  </div></div>;
}
