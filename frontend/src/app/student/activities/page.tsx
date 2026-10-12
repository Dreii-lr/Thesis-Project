'use client';

import { useEffect, useState } from 'react';
import {
  ClipboardList,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ListTodo,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import { listStudentTasks, StudentTask, TaskType } from '@/src/lib/assessments-api';

export default function StudentActivitiesPage() {
  const [tasks, setTasks] = useState<StudentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listStudentTasks()
      .then((data) => {
        if (active) setTasks(data);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load your assigned activities. Please try again.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);

  const filteredTasks = tasks.filter((t) => {
    if (filterType === 'ALL') return true;
    return t.assessment_type === filterType;
  });

  const getTypeIcon = (type: TaskType) => {
    switch (type) {
      case 'ACTIVITY':
        return <FileText size={18} className="text-blue-600" />;
      case 'QUIZ':
        return <ListTodo size={18} className="text-purple-600" />;
      case 'EXAM':
        return <GraduationCap size={18} className="text-amber-600" />;
      default:
        return <ClipboardList size={18} className="text-slate-600" />;
    }
  };

  const getTypeBadgeClass = (type: TaskType) => {
    switch (type) {
      case 'ACTIVITY':
        return 'bg-blue-50 text-blue-700 ring-blue-100';
      case 'QUIZ':
        return 'bg-purple-50 text-purple-700 ring-purple-100';
      case 'EXAM':
        return 'bg-amber-50 text-amber-700 ring-amber-100';
      default:
        return 'bg-slate-50 text-slate-700 ring-slate-100';
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 font-sans">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
            <ClipboardList size={13} strokeWidth={2} /> Assigned Workspace
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            My Activities & Quizzes
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-slate-500">
            View activities, quizzes, and exams assigned strictly to your enrolled ALS class program.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {['ALL', 'ACTIVITY', 'QUIZ', 'EXAM'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                filterType === type
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {type === 'ALL'
                ? 'All Tasks'
                : type === 'ACTIVITY'
                ? 'Activities'
                : type === 'QUIZ'
                ? 'Quizzes'
                : 'Exams'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading your assigned tasks...</p>
          <p className="text-xs text-slate-400 mt-1">Fetching assessments from your program</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 space-y-3"
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle size={18} /> Unable to load assessments
          </div>
          <p className="text-xs leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => setRetry((v) => v + 1)}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredTasks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="text-base font-bold text-slate-900">No tasks currently assigned</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {tasks.length === 0
              ? 'You have no active assessments assigned to your class program right now. Check back soon!'
              : 'No assessments match the selected filter category.'}
          </p>
        </div>
      )}

      {/* Task Cards Grid */}
      {!loading && !error && filteredTasks.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredTasks.map((task) => {
            const hasStarted = task.submission_status !== null;
            const isGraded = task.submission_status === 'GRADED';
            const isSubmitted = task.submission_status === 'SUBMITTED';

            return (
              <article
                key={task.assessment_id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
              >
                <div className="space-y-3.5">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${getTypeBadgeClass(
                        task.assessment_type
                      )}`}
                    >
                      {getTypeIcon(task.assessment_type)}
                      {task.assessment_type}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {task.max_score} pts
                    </span>
                  </div>

                  {/* Title & Subject */}
                  <div>
                    <h2 className="text-base font-bold text-slate-900 line-clamp-1">
                      {task.title}
                    </h2>
                    <p className="text-xs font-semibold text-blue-600 mt-1">
                      {task.subject_code}
                    </p>
                  </div>

                  {/* Description */}
                  {task.description && (
                    <p className="text-xs leading-relaxed text-slate-500 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* Schedule & Timing Info */}
                  <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    {task.end_date && (
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-slate-400 shrink-0" />
                        <span>
                          Deadline: {new Date(task.end_date).toLocaleDateString()} at{' '}
                          {new Date(task.end_date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                    {task.duration_minutes ? (
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-slate-400 shrink-0" />
                        <span>Duration: {task.duration_minutes} minutes</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Footer Status & Actions */}
                <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                  <div>
                    {isGraded ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        <CheckCircle2 size={12} /> Score: {task.final_score ?? 0}/{task.max_score}
                      </span>
                    ) : isSubmitted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-inset ring-blue-200">
                        Submitted · Pending Review
                      </span>
                    ) : hasStarted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 ring-1 ring-inset ring-purple-200">
                        In Progress
                      </span>
                    ) : task.is_available ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        Not Started
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                        Scheduled
                      </span>
                    )}
                  </div>

                  {task.is_available ? (
                    <button
                      type="button"
                      onClick={() => alert(`Starting task: ${task.title}`)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
                    >
                      {hasStarted ? 'Continue' : 'Open'} <ArrowRight size={13} />
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400">
                      {task.start_date && new Date(task.start_date) > new Date()
                        ? `Opens ${new Date(task.start_date).toLocaleDateString()}`
                        : 'Unavailable'}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
