"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Users,
} from "lucide-react";
import { useStudents } from "@/src/context/StudentContext";
import {
  listAssessmentRecords,
  listTeacherSubmissions,
  type AssessmentRow,
  type TeacherSubmission,
} from "@/src/lib/assessments-api";
import {
  listAttendanceSessions,
  type AttendanceSessionListItem,
} from "@/src/lib/attendance-api";
import {
  listUserCategories,
  type UserCategoryRecord,
} from "@/src/lib/user-categories-api";
import {
  listSubjects,
  subjectName,
  type SubjectRecord,
} from "@/src/lib/subjects-api";
import {
  assessmentWindow,
  dateKey,
  formatTime,
  scheduledTasks,
} from "@/src/lib/teacher-calendar";
import {
  getMaterials,
  normalizeMaterialStatus,
  matchMaterialToCategory,
  type MaterialItem,
} from "@/src/lib/document-processor-api";
import ApiState from "@/src/components/ui/ApiState";

export default function TeacherDashboard() {
  const {
    students,
    isLoading: studentsLoading,
    error: studentsError,
    refreshStudents,
  } = useStudents();
  const [data, setData] = useState<{
    tasks: AssessmentRow[];
    categories: UserCategoryRecord[];
    subjects: SubjectRecord[];
    records: TeacherSubmission[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceSessionListItem[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceRetry, setAttendanceRetry] = useState(0);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [materialsRetry, setMaterialsRetry] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([listAssessmentRecords(), listUserCategories(), listSubjects()])
      .then(async ([tasks, categories, subjects]) => {
        const records = await listTeacherSubmissions(tasks);
        if (active) setData({ tasks, categories, subjects, records });
      })
      .catch((err) => {
        if (active)
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your dashboard.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);

  useEffect(() => {
    let active = true;
    listAttendanceSessions()
      .then((sessions) => {
        if (active) setAttendance(sessions);
      })
      .catch((err) => {
        if (active)
          setAttendanceError(
            err instanceof Error ? err.message : "Unable to load attendance.",
          );
      })
      .finally(() => {
        if (active) setAttendanceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attendanceRetry]);

  useEffect(() => {
    let active = true;
    getMaterials({ pageSize: 100 })
      .then((items) => {
        if (active) setMaterials(items || []);
      })
      .catch((err) => {
        if (active)
          setMaterialsError(
            err instanceof Error ? err.message : "Unable to load materials."
          );
      })
      .finally(() => {
        if (active) setMaterialsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [materialsRetry]);

  const tasks = data?.tasks || [];
  const programs = data?.categories || [];
  const subjects = data?.subjects || [];
  const publishedMaterials = materials.filter(
    (m) => normalizeMaterialStatus(m.status) === "PUBLISHED"
  );
  const validSubmissions = (data?.records || [])
    .map((record) => record.submission)
    .filter((submission) => submission.submitted_at);
  const pending = validSubmissions.filter(
    (submission) => submission.status === "SUBMITTED",
  );
  const enrolled = students.filter((student) => student.status === "ACTIVE");
  const totals = attendance
    .filter((session) => session.status === "COMPLETED")
    .reduce(
      (total, session) => ({
        present: total.present + session.presentCount,
        count: total.count + session.totalCount,
      }),
      { present: 0, count: 0 },
    );
  const attendanceRate = totals.count
    ? Math.round((totals.present / totals.count) * 100)
    : null;
  const today = dateKey(new Date());
  const agenda = scheduledTasks(tasks).filter(
    (task) => (assessmentWindow(task)?.end || "") >= today,
  );
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">
            Teacher workspace
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {"Your teaching overview"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {
              "A clear view of your learners, lessons, and the work that needs your attention."
            }
          </p>
        </div>
      </div>
      <ApiState
        loading={loading}
        error={error}
        onRetry={() => {
          setLoading(true);
          setError(null);
          setRetry((value) => value + 1);
        }}
      />
      {!loading && !error && data && (
        <>
          <ApiState
            loading={false}
            error={studentsError}
            onRetry={() => void refreshStudents()}
          />
          <ApiState
            loading={false}
            error={attendanceError}
            onRetry={() => {
              setAttendanceLoading(true);
              setAttendanceError(null);
              setAttendanceRetry((value) => value + 1);
            }}
          />
          <ApiState
            loading={false}
            error={materialsError}
            onRetry={() => {
              setMaterialsLoading(true);
              setMaterialsError(null);
              setMaterialsRetry((value) => value + 1);
            }}
          />
          <section className="portal-hero relative overflow-hidden rounded-[28px] p-7 text-white shadow-xl shadow-blue-600/15 sm:p-8">
            <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/10" />
            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <p className="text-sm font-semibold text-blue-100">
                  Every learner, a new possibility
                </p>
                <h2 className="mt-2 text-3xl font-extrabold">
                  Ready to make a difference?
                </h2>
                <p className="mt-3 text-sm text-blue-100">
                  {pending.length} submissions are waiting for your feedback
                  across {programs.length} learning programs.
                </p>
                <Link
                  href="/teacher/learner-accounts/mapping"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-700"
                >
                  Map learner manually <ArrowRight size={16} />
                </Link>
              </div>
              <div className="rounded-2xl bg-white/10 p-6 ring-1 ring-white/20">
                <CalendarDays size={24} />
                <p className="mt-3 text-3xl font-bold">{agenda.length}</p>
                <p className="mt-1 text-sm text-blue-100">
                  Scheduled assessments
                </p>
                <Link
                  href="/teacher/calendar"
                  className="mt-4 block text-sm font-semibold underline underline-offset-4"
                >
                  Open your calendar
                </Link>
              </div>
            </div>
          </section>
          <div className="my-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Enrolled learners",
                value: studentsLoading
                  ? "…"
                  : studentsError
                    ? "Unavailable"
                    : enrolled.length,
                icon: Users,
                href: "/teacher/learner-accounts",
              },
              {
                label: "Published materials",
                value: materialsLoading
                  ? "…"
                  : materialsError
                    ? "Unavailable"
                    : publishedMaterials.length,
                icon: BookOpen,
                href: "/teacher/lesson-content",
              },
              {
                label: "Awaiting review",
                value: pending.length,
                icon: ClipboardCheck,
                href: "/teacher/submissions",
              },
              {
                label: "Recorded attendance",
                value: attendanceLoading
                  ? "…"
                  : attendanceError
                    ? "Unavailable"
                    : attendanceRate === null
                      ? "—"
                      : `${attendanceRate}%`,
                icon: CalendarDays,
                href: "/teacher/attendance",
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <item.icon className="text-blue-600" size={22} />
                <p className="mt-4 text-3xl font-extrabold">{item.value}</p>
                <p className="mt-1 text-sm text-slate-500">{item.label}</p>
              </Link>
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <section
              className={
                "rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              }
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Your learning programs</h2>
                <Link
                  className="text-sm font-semibold text-blue-600"
                  href="/teacher/learner-accounts"
                >
                  View directory →
                </Link>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {programs.map((p) => (
                  <Link
                    href="/teacher/learner-accounts"
                    key={p.category_id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-blue-50"
                  >
                    <BookOpen className="mb-5 text-blue-600" />
                    <h3 className="font-bold">{p.name}</h3>
                    <p className="mt-3 text-sm text-slate-500">
                      {studentsLoading
                        ? "…"
                        : studentsError
                          ? "Unavailable"
                          : enrolled.filter(
                              (student) => student.user_category === p.code,
                            ).length}{" "}
                      learners
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {
                        tasks.filter(
                          (t) =>
                            !t.target_category || t.target_category === p.code,
                        ).length
                      }{" "}
                      assessments ·{" "}
                      {materialsLoading
                        ? "…"
                        : materialsError
                          ? "materials unavailable"
                          : `${publishedMaterials.filter((m) => matchMaterialToCategory(m, p)).length} published`}
                    </p>
                    <span className="mt-5 block text-sm font-semibold text-blue-600">
                      Open directory →
                    </span>
                  </Link>
                ))}
              </div>
              {!programs.length && (
                <p className="py-6 text-sm text-slate-500">
                  No learning programs available.
                </p>
              )}
              <h2 className="mb-3 mt-7 text-lg font-bold">
                Recent submissions
              </h2>
              {validSubmissions.length ? (
                [...validSubmissions]
                  .sort(
                    (a, b) =>
                      Date.parse(b.submitted_at || "") -
                      Date.parse(a.submitted_at || ""),
                  )
                  .slice(0, 4)
                  .map((s) => {
                    const learner = students.find(student => student.account_id === s.account_id);
                    return <Link
                      href={learner ? `/teacher/learner-accounts/${encodeURIComponent(learner.id)}` : '/teacher/submissions'}
                      key={s.submission_id}
                      className="flex items-center justify-between gap-3 border-t border-slate-100 py-4"
                    >
                      <div>
                        <p className="text-sm font-bold">
                          {s.student_name ||
                            learner?.first_name ||
                            s.account_id || 'Learner'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {
                            tasks.find(
                              (t) => t.assessment_id === s.assessment_id,
                            )?.title
                          }
                        </p>
                      </div>
                      <span className="inline-block rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                        {s.status === "GRADED" ? "Graded" : "Needs review"}
                      </span>
                    </Link>;
                  })
              ) : (
                <p className="py-10 text-center text-sm text-slate-500">
                  No submissions yet.
                </p>
              )}
            </section>
            <section
              className={
                "rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              }
            >
              <h2 className="text-xl font-bold">Assessment agenda</h2>
              <p className="mt-1 text-sm text-slate-500">
                Published activities, quizzes, and exams.
              </p>
              <div className="mt-5 space-y-3">
                {agenda.slice(0, 4).map((t) => (
                  <Link
                    key={t.assessment_id}
                    href="/teacher/calendar"
                    className="block rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <span className="inline-block rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                      {t.assessment_type}
                    </span>
                    <h3 className="mt-2 text-sm font-bold">{t.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {subjectName(subjects, t.subject_code, t.target_category)}
                    </p>
                    <p className="mt-2 text-xs font-medium text-blue-600">
                      {formatTime(t.start_date || t.end_date)}
                    </p>
                  </Link>
                ))}
                {!agenda.length && (
                  <p className="py-10 text-center text-sm text-slate-500">
                    Publish an assessment to add it to your agenda.
                  </p>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
