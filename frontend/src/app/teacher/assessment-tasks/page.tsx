'use client';

import { useEffect, useState } from 'react';
import { AssessmentPayload, listAssessments } from '@/src/lib/assessments-api';
import { useRouter } from 'next/navigation';
import { ClipboardList, Plus } from 'lucide-react';
import TaskDashboard from '@/src/components/layout/teacher/assessment-tasks/TaskDashboard';

export default function AssessmentsDashboardPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<AssessmentPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    listAssessments().then(tasks => { if (active) setTasks(tasks); })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : 'Unable to load assessments.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 font-sans">
      <div className="mx-auto w-full max-w-[1480px]">
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
              <ClipboardList size={13} strokeWidth={2} /> Assessments Workspace
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">
              Assessments & Tasks
            </h1>
            <p className="mt-1.5 text-[13px] leading-6 text-slate-500 sm:text-sm">
              Manage and track all your created activities, quizzes, and exams.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/teacher/assessment-tasks/choice')}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-blue-600/15 transition-all hover:bg-blue-700 hover:shadow-md focus:outline-none"
          >
            <Plus size={16} strokeWidth={2.2} /> Create New
          </button>
        </div>

        {loading ? <p role="status" className="text-sm text-slate-500">Loading assessments...</p> : error ? <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}<button onClick={() => { setLoading(true); setError(''); setRetry(value => value + 1); }} className="ml-3 underline">Retry</button></div> : <TaskDashboard tasks={tasks} onUpdated={updated => setTasks(current => current.map(task => task.assessment_id === updated.assessment_id ? updated : task))} />}
      </div>
    </div>
  );
}
