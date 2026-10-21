"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Pencil, Send, BookOpen, Eye, Lock } from "lucide-react";
import {
  AssessmentPayload,
  CATEGORY_LABELS,
  TargetCategory,
  TaskStatus,
  updateAssessment,
} from "@/src/lib/assessments-api";
import AssignStudentsModal from "@/src/components/ui/teacher/assessment-tasks/AssignStudentsModal";
import { datePart, timePart, validateAssessmentSchedule } from '@/src/lib/assessment-timing';

export default function TaskDashboard({
  tasks,
  onUpdated,
}: {
  tasks: AssessmentPayload[];
  onUpdated: (task: AssessmentPayload) => void;
}) {
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("ALL");
  const [publishing, setPublishing] = useState<AssessmentPayload | null>(null);
  const filtered = tasks.filter(
    (task) =>
      (category === "all" || task.target_category === category) &&
      (status === "ALL" || task.status === status),
  );
  async function publish(target_category: TargetCategory) {
    if (!publishing?.assessment_id)
      throw new Error("Assessment ID is missing. Reload the page.");
    if (!target_category)
      throw new Error(
        "Please select a specific program (Elementary, Junior High School, or Basic Literacy Program).",
      );
    if (publishing.end_date && new Date(publishing.end_date) <= new Date())
      throw new Error(
        "The deadline has passed. Edit the schedule before publishing.",
      );
    if (publishing.assessment_type !== 'ACTIVITY') {
      const start = publishing.start_date ? new Date(publishing.start_date) : null;
      const scheduleError = validateAssessmentSchedule(start ? datePart(start) : '', start ? timePart(start) : '', publishing.duration_minutes ?? '', publishing.grace_period_minutes);
      if (scheduleError) throw new Error(`${scheduleError} Edit the configuration before publishing.`);
      if (!start || !publishing.end_date || Date.parse(publishing.end_date) !== start.getTime() + Number(publishing.duration_minutes) * 60000) {
        throw new Error('The end time must match the start time plus duration. Edit the configuration before publishing.');
      }
    }
    if (
      publishing.assessment_type !== "ACTIVITY" &&
      (!publishing.categories_data.length ||
        publishing.categories_data.some(
          (category) =>
            category.required_count > category.questions.length ||
            category.questions.some((q) =>
              category.type === "Matching Type"
                ? !q.premise?.trim() || !q.match?.trim()
                : category.type === "Essay"
                  ? !q.text?.trim()
                  : (!q.text?.trim() && !q.image_url) ||
                    !q.correct_answer?.trim() ||
                    (category.type === "Multiple Choice" &&
                      (!q.options?.length ||
                        q.options.some((option) => !option.trim()))),
            ),
        ))
    )
      throw new Error(
        "Complete the questions and answers in the editor before publishing.",
      );
    if (
      publishing.categories_data.some(
        (category) =>
          category.type === "Matching Type" &&
          (category.distractors?.length || 0) >
            Math.floor(category.questions.length / 5),
      )
    ) {
      throw new Error(
        "For Matching Type, only 1 distractor is allowed for every 5 items. Please check your distractors before publishing.",
      );
    }
    const status: TaskStatus =
      publishing.start_date && new Date(publishing.start_date) > new Date()
        ? "SCHEDULED"
        : "ACTIVE";
    onUpdated(
      await updateAssessment(publishing.assessment_id, {
        target_category,
        status,
      }),
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <label className="text-xs font-semibold text-slate-600">
          Class Program{" "}
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="ml-2 rounded-xl border border-slate-200 p-2"
          >
            <option value="all">All Classes</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Status{" "}
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="ml-2 rounded-xl border border-slate-200 p-2"
          >
            {["ALL", "DRAFT", "SCHEDULED", "ACTIVE", "COMPLETED"].map(
              (value) => (
                <option key={value} value={value}>
                  {value === "ALL" ? "All Status" : value}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      {!filtered.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-500">
          {tasks.length
            ? "No assessments match these filters."
            : "No assessments yet. Create your first activity, quiz, or exam."}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((task) => {
            const displayStatus = task.status;
            const route =
              task.assessment_type === "QUIZ"
                ? "quizzes"
                : task.assessment_type === "EXAM"
                  ? "exam"
                  : "activity";
            const isLocked =
              task.can_edit === false ||
              displayStatus === "COMPLETED" ||
              (task.submissions_count ?? 0) > 0;
            return (
              <article
                key={task.assessment_id}
                className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex justify-between gap-2 text-xs font-semibold">
                  <span className="text-blue-600">{task.assessment_type}</span>
                  <div className="flex items-center gap-1.5">
                    {isLocked && (
                      <span
                        title={task.lock_reason || "Assessment is locked from editing"}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                      >
                        <Lock size={11} /> {displayStatus === "COMPLETED" ? "Completed" : "Locked"}
                      </span>
                    )}
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                      {displayStatus}
                    </span>
                  </div>
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  {task.title}
                </h2>
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <BookOpen size={14} />
                  {task.subject_code}
                </p>
                <p className="text-xs text-slate-500">
                  {task.target_category
                    ? CATEGORY_LABELS[task.target_category]
                    : "Program Not Assigned"}
                </p>
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar size={14} />
                  {task.end_date
                    ? new Date(task.end_date).toLocaleString()
                    : "No deadline"}
                </p>
                <div className="flex justify-between border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <span>{task.submissions_count ?? 0} submissions</span>
                  <span>{task.max_score} points</span>
                </div>
                <div className="flex gap-2">
                  {isLocked ? (
                    <Link
                      href={`/teacher/assessment-tasks/${route}?edit=${encodeURIComponent(task.assessment_id ?? "")}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Eye size={13} /> View Details
                    </Link>
                  ) : (
                    <Link
                      href={`/teacher/assessment-tasks/${route}?edit=${encodeURIComponent(task.assessment_id ?? "")}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                    >
                      <Pencil size={13} /> Edit
                    </Link>
                  )}
                  {!isLocked && task.status === "DRAFT" && (
                    <button
                      onClick={() => setPublishing(task)}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                    >
                      <Send size={13} /> Publish
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {publishing && (
        <AssignStudentsModal
          key={publishing.assessment_id}
          taskTitle={publishing.title}
          initialCategory={publishing.target_category}
          onClose={() => setPublishing(null)}
          onConfirm={publish}
        />
      )}
    </div>
  );
}
