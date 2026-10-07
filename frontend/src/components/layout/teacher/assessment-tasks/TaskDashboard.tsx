'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  Send,
  Users,
  BookOpen,
  Pencil,
  Trash2,
  X,
  UserCheck,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  TargetCategory,
  AssessmentPayload,
  CATEGORY_LABELS,
  mockStudents,
} from '@/src/data/mockAssessment';

interface TaskDashboardProps {
  tasks: AssessmentPayload[];
  onUpdateTasks?: (tasks: AssessmentPayload[]) => void;
}

export default function TaskDashboard({
  tasks = [],
  onUpdateTasks,
}: TaskDashboardProps) {
  const router = useRouter();
  const localTasks = tasks;
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | TargetCategory
  >('all');
  const [selectedStatus, setSelectedStatus] = useState<
    'ALL' | 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED'
  >('ALL');

  // Built-in Publish Modal State
  const [publishingTask, setPublishingTask] =
    useState<AssessmentPayload | null>(null);
  const [modalCategory, setModalCategory] = useState<TargetCategory>('junior');
  const [assignType, setAssignType] = useState<'all' | 'specific'>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const formatDateTime = (isoOrDateStr?: string, fallback?: string) => {
    if (!isoOrDateStr) return fallback || 'Not set';
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return isoOrDateStr;
    return `${d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} • ${d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  };

  const normalizeStatus = (task: AssessmentPayload) => task.status;

  const normalizeCategory = (t: AssessmentPayload): TargetCategory => {
    const raw = String(t.target_category || t.subject || '').toLowerCase();
    if (raw.includes('elem')) return 'elementary';
    if (raw.includes('basic') || raw.includes('blp')) return 'basic_literacy';
    return 'junior';
  };

  const normalizeType = (
    t: AssessmentPayload,
  ): 'QUIZ' | 'EXAM' | 'ACTIVITY' => {
    const raw = String(t.assessment_type || t.type || 'QUIZ').toUpperCase();
    if (raw === 'EXAM') return 'EXAM';
    if (raw === 'ACTIVITY') return 'ACTIVITY';
    return 'QUIZ';
  };

  const filteredTasks = localTasks.filter((t) => {
    const cat = normalizeCategory(t);
    const st = normalizeStatus(t);
    const matchesCategory =
      selectedCategory === 'all' || cat === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || st === selectedStatus;
    return matchesCategory && matchesStatus;
  });

  const openPublishModal = (task: AssessmentPayload) => {
    const cat = normalizeCategory(task);
    setPublishingTask(task);
    setModalCategory(cat);
    setAssignType(task.assign_type || 'all');
    setSelectedStudentIds(task.assigned_student_ids || []);
  };

  const handleEditTask = (task: AssessmentPayload) => {
    if (!task.id) return;
    const aType = normalizeType(task);
    if (aType === 'QUIZ') {
      router.push(`/teacher/assessment-tasks/quizzes?edit=${task.id}`);
    } else if (aType === 'EXAM') {
      router.push(`/teacher/assessment-tasks/exam?edit=${task.id}`);
    } else {
      router.push(`/teacher/assessment-tasks/activity?edit=${task.id}`);
    }
  };

  const handleDeleteTask = (id?: string) => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this assessment?'))
      return;
    const updated = localTasks.filter((t) => t.id !== id);
    if (onUpdateTasks) onUpdateTasks(updated);
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleConfirmPublish = () => {
    if (!publishingTask) return;

    const classStudents = mockStudents.filter(
      (s) => s.target_category === modalCategory,
    );
    if (assignType === 'specific' && selectedStudentIds.length === 0) {
      alert('Please select at least one student for manual assignment.');
      return;
    }

    const finalStudentIds =
      assignType === 'all'
        ? classStudents.map((s) => s.id)
        : selectedStudentIds;

    const updated: AssessmentPayload[] = localTasks.map((t) =>
      t.id === publishingTask.id
        ? {
            ...t,
            status:
              new Date(t.start_date) > new Date()
                ? 'SCHEDULED'
                : new Date(t.end_date) < new Date()
                  ? 'COMPLETED'
                  : 'ACTIVE',
            target_category: modalCategory,
            assign_type: assignType,
            assigned_student_ids: finalStudentIds,
          }
        : t,
    );

    if (onUpdateTasks) onUpdateTasks(updated);
    setPublishingTask(null);
  };

  const modalClassStudents = mockStudents.filter(
    (s) => s.target_category === modalCategory,
  );

  return (
    <div className="space-y-6">
      {/* Filter Bar by Target Class Category & Status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: 'all', label: 'All Classes' },
              { key: 'elementary', label: 'Elementary' },
              { key: 'junior', label: 'Junior High School' },
              {
                key: 'basic_literacy',
                label: 'Basic Literacy Program',
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedCategory(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
          {(
            [
              { key: 'ALL', label: 'All Status' },
              { key: 'DRAFT', label: 'Drafts' },
              { key: 'SCHEDULED', label: 'Scheduled' },
              { key: 'ACTIVE', label: 'Active' },
              { key: 'COMPLETED', label: 'Completed' },
            ] as const
          ).map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => setSelectedStatus(st.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedStatus === st.key
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-slate-700">
            No assessments found
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Try switching filters or create a new activity, quiz, or exam.
          </p>
        </div>
      )}

      {/* Assessment Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTasks.map((task, idx) => {
          const status = normalizeStatus(task);
          const category = normalizeCategory(task);
          const aType = normalizeType(task);
          const isDraft = status === 'DRAFT';
          const isPending = status === 'SCHEDULED';

          return (
            <div
              key={task.id || `${task.title}-${idx}`}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                    <BookOpen size={12} />
                    {CATEGORY_LABELS[category]}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isDraft ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                        <FileEdit size={11} /> Draft
                      </span>
                    ) : isPending ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                        <AlertCircle size={12} /> Scheduled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        <CheckCircle2 size={12} />{' '}
                        {status === 'COMPLETED' ? 'Completed' : 'Active'}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleEditTask(task)}
                      title="Edit Assessment"
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      title="Delete Assessment"
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  {aType} • {task.subject_code || task.subject || 'ALS'} •{' '}
                  {task.max_score ?? 0} pts
                </div>
                <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}

                <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
                  {aType !== 'ACTIVITY' && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-500 flex items-center gap-1.5">
                        <Calendar size={13} /> Start:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {formatDateTime(task.start_date, task.deadline)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-500 flex items-center gap-1.5">
                      <Clock size={13} />{' '}
                      {aType === 'ACTIVITY' ? 'Deadline:' : 'End:'}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatDateTime(task.end_date, task.deadline)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {isDraft ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleEditTask(task)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition-all"
                    >
                      <FileEdit size={14} /> Continue Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => openPublishModal(task)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-all"
                    >
                      <Send size={13} /> Publish
                    </button>
                  </>
                ) : isPending ? (
                  <button
                    type="button"
                    onClick={() => openPublishModal(task)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-all"
                  >
                    <Send size={14} /> Click to Publish to Students
                  </button>
                ) : (
                  <div className="flex w-full items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                      <Users size={14} className="text-emerald-600" />
                      {task.assign_type === 'specific'
                        ? `${task.assigned_student_ids?.length || 0} Specific Student(s)`
                        : `All ${CATEGORY_LABELS[category]} Students`}
                    </span>
                    <button
                      type="button"
                      onClick={() => openPublishModal(task)}
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      Edit Access
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Built-in Publish & Assign Students Modal */}
      {publishingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Publish & Assign Assessment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {publishingTask.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPublishingTask(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  1. Select Class Program
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    [
                      'elementary',
                      'junior',
                      'basic_literacy',
                    ] as TargetCategory[]
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setModalCategory(cat);
                        setSelectedStudentIds([]);
                      }}
                      className={`rounded-xl border p-2.5 text-left text-xs font-semibold transition-all ${
                        modalCategory === cat
                          ? 'border-blue-600 bg-blue-50/70 text-blue-700 ring-1 ring-blue-600'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  2. Recipient Option
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAssignType('all')}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                      assignType === 'all'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users size={16} />
                    <div className="text-left">
                      <div>All Students</div>
                      <div className="text-[10px] font-normal text-slate-500">
                        Entire {CATEGORY_LABELS[modalCategory]}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignType('specific')}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                      assignType === 'specific'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserCheck size={16} />
                    <div className="text-left">
                      <div>Manual Selection</div>
                      <div className="text-[10px] font-normal text-slate-500">
                        Specific students only
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {assignType === 'specific' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>
                      Select Students ({CATEGORY_LABELS[modalCategory]})
                    </span>
                    <span className="text-blue-600">
                      {selectedStudentIds.length} selected
                    </span>
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1.5">
                    {modalClassStudents.map((student) => {
                      const checked = selectedStudentIds.includes(student.id);
                      return (
                        <div
                          key={student.id}
                          onClick={() => toggleStudentSelection(student.id)}
                          className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                            checked
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>{student.name}</span>
                          {checked ? (
                            <CheckSquare size={15} />
                          ) : (
                            <Square size={15} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setPublishingTask(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Confirm & Publish Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
