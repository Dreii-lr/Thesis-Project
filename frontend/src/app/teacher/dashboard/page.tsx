'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Users,
} from 'lucide-react';
import { useTeacher } from '@/src/context/TeacherContext';
import { mockStudents } from '@/src/data/mockStudents';
import { CATEGORY_LABELS } from '@/src/data/mockAssessment';
import {
  backendCategories,
  programs,
  formatTime,
  scheduledTasks,
  studentName,
  subjectName,
} from '@/src/data/mockTeacher';

export default function TeacherDashboard() {
  const { tasks, submissions, attendance, modules } = useTeacher();
  const validSubmissions = submissions.filter((s) =>
    tasks.some((t) => t.id === s.assessment_id),
  );
  const pending = validSubmissions.filter((s) => s.status === 'SUBMITTED');
  const records = attendance
    .filter((a) => a.status === 'COMPLETED')
    .flatMap((a) => a.records);
  const attendanceRate = records.length
    ? Math.round(
        (records.filter((r) => r.status === 'Present').length /
          records.length) *
          100,
      )
    : 0;
  const agenda = scheduledTasks(tasks);
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">
            Teacher workspace · Demo data
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {'Your teaching overview'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {
              'A clear view of your learners, lessons, and the work that needs your attention.'
            }
          </p>
        </div>
      </div>
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1f5fe0] via-[#2d6af0] to-[#4f46e5] p-7 text-white shadow-xl shadow-blue-600/15 sm:p-8">
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
              {pending.length} submissions are waiting for your feedback across{' '}
              {programs.length} learning programs.
            </p>
            <Link
              href="/teacher/submissions"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-700"
            >
              Review submissions <ArrowRight size={16} />
            </Link>
          </div>
          <div className="rounded-2xl bg-white/10 p-6 ring-1 ring-white/20">
            <CalendarDays size={24} />
            <p className="mt-3 text-3xl font-bold">{agenda.length}</p>
            <p className="mt-1 text-sm text-blue-100">Scheduled assessments</p>
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
            label: 'Enrolled learners',
            value: mockStudents.length,
            icon: Users,
            href: '/teacher/attendance',
          },
          {
            label: 'Published modules',
            value: modules.filter((m) => m.status === 'Published').length,
            icon: BookOpen,
            href: '/teacher/module-uploads',
          },
          {
            label: 'Awaiting review',
            value: pending.length,
            icon: ClipboardCheck,
            href: '/teacher/submissions',
          },
          {
            label: 'Recorded attendance',
            value: records.length ? `${attendanceRate}%` : '—',
            icon: CalendarDays,
            href: '/teacher/attendance',
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
            'rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6'
          }
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Your learning programs</h2>
            <Link
              className="text-sm font-semibold text-blue-600"
              href="/teacher/module-uploads"
            >
              Manage modules →
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {programs.map((p) => (
              <Link
                href={`/teacher/module-uploads?program=${p}`}
                key={p}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-blue-50"
              >
                <BookOpen className="mb-5 text-blue-600" />
                <h3 className="font-bold">{CATEGORY_LABELS[p]}</h3>
                <p className="mt-3 text-sm text-slate-500">
                  {
                    mockStudents.filter(
                      (s) => s.user_category === backendCategories[p],
                    ).length
                  }{' '}
                  learners
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {tasks.filter((t) => t.target_category === p).length}{' '}
                  assessments ·{' '}
                  {modules.filter((m) => m.target_category === p).length}{' '}
                  modules
                </p>
                <span className="mt-5 block text-sm font-semibold text-blue-600">
                  Open directory →
                </span>
              </Link>
            ))}
          </div>
          <h2 className="mb-3 mt-7 text-lg font-bold">Recent submissions</h2>
          {validSubmissions.length ? (
            [...validSubmissions]
              .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
              .slice(0, 4)
              .map((s) => (
                <Link
                  href="/teacher/submissions"
                  key={s.submission_id}
                  className="flex items-center justify-between gap-3 border-t border-slate-100 py-4"
                >
                  <div>
                    <p className="text-sm font-bold">
                      {studentName(s.student_id)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {tasks.find((t) => t.id === s.assessment_id)?.title}
                    </p>
                  </div>
                  <span className="inline-block rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                    {s.status === 'GRADED' ? 'Graded' : 'Needs review'}
                  </span>
                </Link>
              ))
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">
              No submissions yet.
            </p>
          )}
        </section>
        <section
          className={
            'rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6'
          }
        >
          <h2 className="text-xl font-bold">Assessment agenda</h2>
          <p className="mt-1 text-sm text-slate-500">
            Published activities, quizzes, and exams.
          </p>
          <div className="mt-5 space-y-3">
            {agenda.slice(-4).map((t) => (
              <Link
                key={t.id}
                href="/teacher/calendar"
                className="block rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <span className="inline-block rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                  {t.assessment_type}
                </span>
                <h3 className="mt-2 text-sm font-bold">{t.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {subjectName(t.subject_code)}
                </p>
                <p className="mt-2 text-xs font-medium text-blue-600">
                  {formatTime(t.start_date)}
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
    </div>
  );
}
