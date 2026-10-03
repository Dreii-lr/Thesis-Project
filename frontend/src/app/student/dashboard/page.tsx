'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Flame,
  Play,
  Trophy,
} from 'lucide-react';
import { getDemoSession } from '@/src/components/auth/DemoAuthGuard';

const modules = [
  {
    title: 'Introduction to Computing',
    subject: 'Digital Literacy',
    progress: 72,
    lesson: 'Lesson 4 · Computer Hardware',
    time: '18 min left',
  },
  {
    title: 'Communication Skills',
    subject: 'English',
    progress: 45,
    lesson: 'Lesson 3 · Effective Communication',
    time: '25 min left',
  },
  {
    title: 'Practical Mathematics',
    subject: 'Mathematics',
    progress: 30,
    lesson: 'Lesson 2 · Fractions and Decimals',
    time: '32 min left',
  },
];

const upcoming = [
  { title: 'Digital Literacy Quiz', meta: 'Today · 3:00 PM', type: 'Quiz' },
  { title: 'Written Activity 2', meta: 'Tomorrow · 11:59 PM', type: 'Activity' },
  { title: 'Math Module Checkpoint', meta: 'Oct 4 · 5:00 PM', type: 'Assessment' },
];

export default function StudentDashboardPage() {
  const [identity, setIdentity] = useState('Learner');

  useEffect(() => {
    const session = getDemoSession();
    if (session?.identity) setIdentity(session.identity);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1f5fe0] via-[#2d6af0] to-[#4f46e5] px-6 py-7 text-white shadow-[0_24px_60px_rgba(37,99,235,0.20)] sm:px-8 sm:py-8">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 right-24 h-44 w-44 rounded-full bg-cyan-300/10" />
        <div className="relative z-10 flex flex-col justify-between gap-8 xl:flex-row xl:items-center">
          <div>
            <p className="text-sm font-semibold text-blue-100">Welcome back,</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{identity}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
              Keep your momentum going. Continue your lessons, complete upcoming activities, and track your learning progress.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:min-w-[390px]">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
              <BookOpen size={20} />
              <p className="mt-3 text-2xl font-bold">3</p>
              <p className="mt-1 text-[11px] text-blue-100">Active modules</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
              <Flame size={20} />
              <p className="mt-3 text-2xl font-bold">6</p>
              <p className="mt-1 text-[11px] text-blue-100">Day streak</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
              <Trophy size={20} />
              <p className="mt-3 text-2xl font-bold">78%</p>
              <p className="mt-1 text-[11px] text-blue-100">Overall progress</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Lessons completed', value: '18', note: '+4 this week', icon: CheckCircle2 },
          { label: 'Activities submitted', value: '12', note: '2 pending', icon: FileText },
          { label: 'Attendance', value: '94%', note: 'This month', icon: CalendarDays },
          { label: 'Learning time', value: '14h 20m', note: 'This month', icon: Clock3 },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <item.icon size={19} />
              </div>
              <span className="text-xs font-medium text-slate-400">{item.note}</span>
            </div>
            <p className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">{item.value}</p>
            <p className="mt-1 text-sm text-slate-500">{item.label}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Continue learning</h2>
              <p className="mt-1 text-sm text-slate-500">Pick up where you left off.</p>
            </div>
            <Link href="/student/modules" className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
              View all <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {modules.map((module) => (
              <article key={module.title} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                  <BookOpen size={20} />
                </div>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">{module.subject}</p>
                <h3 className="mt-1.5 min-h-12 text-[15px] font-bold leading-5 text-slate-900">{module.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{module.lesson}</p>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>{module.progress}% complete</span>
                    <span>{module.time}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${module.progress}%` }} />
                  </div>
                </div>

                <button type="button" className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-blue-600 ring-1 ring-inset ring-slate-200 hover:bg-blue-50 hover:ring-blue-100">
                  <Play size={15} fill="currentColor" /> Continue
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Upcoming</h2>
              <p className="mt-1 text-sm text-slate-500">Activities that need attention.</p>
            </div>
            <CalendarDays size={20} className="text-slate-400" />
          </div>

          <div className="mt-5 space-y-3">
            {upcoming.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
                  </div>
                  <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-600 ring-1 ring-slate-200">
                    {item.type}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Link href="/student/activities" className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            View activities <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </div>
  );
}
