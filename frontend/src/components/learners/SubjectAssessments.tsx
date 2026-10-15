'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, BookOpen, CalendarDays, CheckCircle2, ClipboardList, Clock3, GraduationCap, ListTodo } from 'lucide-react';
import { listStudentTasks, type StudentTask, type TaskType } from '@/src/lib/assessments-api';
import type { SubjectRecord } from '@/src/lib/subjects-api';
import { assessmentCompleted, assessmentOnDay, assessmentState, subjectTasks } from '@/src/lib/student-subjects';
import { assessmentStartMessage, scheduledEnd } from '@/src/lib/assessment-timing';
import { useApiData } from '@/src/lib/use-api-data';
import ApiState from '@/src/components/ui/ApiState';
import { useAuth } from '@/src/context/AuthContext';

const typeNames: Record<TaskType, string> = { ACTIVITY: 'Activity', QUIZ: 'Quiz', EXAM: 'Examination' };
const formatDate = (value: string | number) => new Date(value).toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: 'numeric', minute: '2-digit' });
const statusStyles = {
  red: { card: 'border-rose-200 bg-gradient-to-br from-rose-50/70 to-white', icon: 'bg-rose-100 text-rose-600', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  yellow: { card: 'border-amber-200 bg-gradient-to-br from-amber-50/80 to-white', icon: 'bg-amber-100 text-amber-600', badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  green: { card: 'border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white', icon: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  gray: { card: 'border-slate-200 bg-gradient-to-br from-slate-100/80 to-white', icon: 'bg-slate-200 text-slate-500', badge: 'bg-slate-200 text-slate-600', dot: 'bg-slate-400' },
};

export default function SubjectAssessments({ subject, programName }: { subject: SubjectRecord; programName: string }) {
  const { user } = useAuth();
  const loadTasks = useCallback(() => listStudentTasks(user), [user]);
  const records = useApiData(loadTasks);
  const [filter, setFilter] = useState<'ALL' | TaskType>('ALL');
  const [now, setNow] = useState(() => Date.now());
  const tasks = subjectTasks(records.data || [], subject);
  const filtered = tasks.filter(task => filter === 'ALL' || task.assessment_type === filter);
  const completed = tasks.filter(assessmentCompleted);
  const graded = tasks.filter(task => task.submission_status === 'GRADED');
  const earned = graded.reduce((sum, task) => sum + (task.final_score ?? 0), 0);
  const possible = graded.reduce((sum, task) => sum + task.max_score, 0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Refresh posted assessments when the student returns to this tab.
  useEffect(() => {
    window.addEventListener('focus', records.reload);
    return () => window.removeEventListener('focus', records.reload);
  }, [records.reload]);

  return <div className="space-y-6">
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_270px]">
      <div className="min-w-0 space-y-5">
        <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-blue-600 p-6 text-white shadow-lg shadow-blue-900/10 sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full border-[35px] border-white/5" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-28 -z-10 h-56 w-56 rounded-full bg-blue-400/10" />
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-blue-100"><BookOpen size={12} />{programName}</p>
          <h1 className="mt-5 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{subject.name}</h1>
          {subject.description && <p className="mt-3 max-w-xl text-xs leading-6 text-blue-100/80">{subject.description}</p>}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
            <p className="text-xs text-blue-100/80">{records.loading ? 'Loading your assessments...' : records.error ? 'Assessment records unavailable' : <><span className="font-semibold text-white">{completed.length} of {tasks.length}</span> assessments completed</>}</p>
            <a href="#subject-performance" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2.5 text-[11px] font-semibold text-white ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/20"><BadgeCheck size={14} /> My Performance <ArrowRight size={12} /></a>
          </div>
        </section>
        <div className="flex flex-wrap items-end justify-between gap-3 pt-1"><div><h2 className="text-base font-bold tracking-tight text-slate-800">Your assessments</h2><p className="mt-1 text-[11px] text-slate-400">Keep track of what is next and what you have completed.</p></div><span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">{filter === 'ALL' ? 'All types' : typeNames[filter]}</span></div>
        <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200/80 bg-white p-1.5" aria-label="Filter assessments">
          {(['ALL', 'ACTIVITY', 'QUIZ', 'EXAM'] as const).map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`flex-1 rounded-xl px-3 py-2.5 text-[11px] font-semibold transition-colors ${filter === value ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}>{value === 'ALL' ? 'All Assessments' : value === 'ACTIVITY' ? 'Activities' : value === 'QUIZ' ? 'Quizzes' : 'Exams'}</button>)}
        </div>
        <ApiState loading={records.loading} error={records.error} onRetry={records.reload} />
        {!records.loading && !records.error && <div className="space-y-4" aria-label="Assigned assessments">
          {filtered.map(task => <AssessmentPost key={task.assessment_id} task={task} now={now} />)}
          {!filtered.length && <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center"><BookOpen size={26} className="mx-auto text-blue-500" /><h2 className="mt-3 text-base font-bold text-slate-900">{tasks.length ? 'No assessments match this filter' : 'No assessments assigned yet'}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{tasks.length ? 'Choose another assessment type to view your tasks.' : 'Activities, quizzes, and exams posted by your teacher for this subject will appear here.'}</p></div>}
        </div>}
      </div>
      <aside className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><CalendarDays size={18} /></span><div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Your day</p><h2 className="mt-0.5 text-base font-bold text-slate-700">{new Date(now).toLocaleDateString([], { weekday: 'long' })}</h2></div></div><p className="text-[11px] text-slate-400">{new Date(now).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <ApiState loading={records.loading} error={records.error} onRetry={records.reload} />
          {!records.loading && !records.error && (['QUIZ', 'EXAM', 'ACTIVITY'] as const).map(type => {
            const todayTasks = tasks.filter(task => task.assessment_type === type && assessmentOnDay(task, new Date(now)));
            return <div key={type} className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-[11px] font-bold text-slate-600">{type === 'ACTIVITY' ? 'Activities Due' : typeNames[type]}</h3>{todayTasks.length ? <ul className="mt-3 space-y-3">{todayTasks.map(task => <li key={task.assessment_id} className="flex items-start gap-2.5 text-[11px] leading-5"><span aria-hidden="true" className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${statusStyles[assessmentState(task, now).color].dot}`} /><div><p className="font-medium text-slate-700">{task.title}</p><p className="text-slate-400">{new Date((type === 'ACTIVITY' ? task.end_date : task.start_date)!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}{assessmentCompleted(task) ? ' · Done' : ''}</p></div></li>)}</ul> : <p className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-[11px] leading-5 text-slate-400">{type === 'ACTIVITY' ? 'No activities due today.' : `No scheduled ${typeNames[type].toLowerCase()} for today.`}</p>}</div>;
          })}
        </section>
        <section id="subject-performance" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-700"><BadgeCheck size={17} className="text-blue-600" />My Performance</h2>
          {records.loading ? <p className="mt-4 text-xs text-slate-400">Loading your records...</p> : records.error ? <p className="mt-4 text-xs text-slate-500">Your performance records could not be loaded.</p> : <dl className="mt-4 space-y-3 text-xs"><div className="flex justify-between gap-3"><dt className="text-slate-500">Assigned assessments</dt><dd className="font-bold text-slate-700">{tasks.length}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Completed</dt><dd className="font-bold text-slate-700">{completed.length} / {tasks.length}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Graded points</dt><dd className="font-bold text-blue-600">{graded.length ? `${earned} / ${possible}` : 'Not graded yet'}</dd></div></dl>}
        </section>
      </aside>
    </div>
  </div>;
}

function AssessmentPost({ task, now }: { task: StudentTask; now: number }) {
  const done = assessmentCompleted(task);
  const timed = task.assessment_type !== 'ACTIVITY';
  const startMessage = timed ? assessmentStartMessage(task, now) : null;
  const inProgress = task.submission_status === 'IN_PROGRESS';
  const state = assessmentState(task, now);
  const styles = statusStyles[state.color];
  const upcoming = task.start_date && now < Date.parse(task.start_date);
  const Icon = task.assessment_type === 'ACTIVITY' ? ClipboardList : task.assessment_type === 'QUIZ' ? ListTodo : GraduationCap;
  const deadline = timed ? scheduledEnd(task) : task.end_date ? Date.parse(task.end_date) : NaN;
  return <article data-status-color={state.color} className={`rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6 ${styles.card}`}>
    <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}><Icon size={18} /></span><div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{typeNames[task.assessment_type]}</p><h3 className="mt-1 text-base font-semibold leading-6 text-slate-800">{task.title}</h3></div></div><span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide ${styles.badge}`}>{done ? <CheckCircle2 size={11} /> : <span aria-hidden="true" className={`h-1 w-1 rounded-full ${styles.dot}`} />}{state.label}</span></div>
    {task.description && <p className="mt-4 whitespace-pre-line text-xs leading-6 text-slate-500">{task.description}</p>}
    <div className="mt-5 space-y-2 text-xs">
      {timed && task.start_date && <p className="flex items-start gap-2 text-slate-500"><Clock3 size={14} className="mt-0.5 shrink-0" /><span>Starts: {formatDate(task.start_date)}</span></p>}
      {Number.isFinite(deadline) && <p className="flex items-start gap-2 font-medium text-slate-600"><CalendarDays size={14} className="mt-0.5 shrink-0 text-slate-400" /><span>{timed ? 'Ends' : 'Deadline'}: {formatDate(deadline)}</span></p>}
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
      <p className="text-[10px] text-slate-400">{task.max_score} points{timed && task.duration_minutes ? ` · ${task.duration_minutes} minutes` : ''}{timed ? ` · ${task.grace_period_minutes} min start grace` : ''}</p>
      {timed && <Link href={`/student/activities/assessment/${encodeURIComponent(task.assessment_id)}`} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-50">{done ? 'View result' : inProgress ? 'Continue' : upcoming ? 'View schedule' : startMessage ? 'View details' : `Open ${typeNames[task.assessment_type]}`}<ArrowRight size={12} /></Link>}
      {timed && !done && !inProgress && startMessage && !upcoming && <p className="w-full text-[11px] text-slate-400">{startMessage}</p>}
      {task.submission_status === 'GRADED' && <p className="text-xs font-semibold text-emerald-700">Score: {task.final_score ?? 0} / {task.max_score}</p>}
      {task.submission_status === 'SUBMITTED' && <p className="text-xs font-medium text-slate-500">Submitted · Awaiting teacher review</p>}
    </div>
  </article>;
}
