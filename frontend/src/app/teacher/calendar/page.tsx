'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORY_LABELS, listAssessmentRecords, type AssessmentRow } from '@/src/lib/assessments-api';
import { listUserCategories, type UserCategoryRecord } from '@/src/lib/user-categories-api';
import { listSubjects, subjectName, type SubjectRecord } from '@/src/lib/subjects-api';
import { assessmentWindow, dateKey, formatTime, scheduledTasks } from '@/src/lib/teacher-calendar';
import ApiState from '@/src/components/ui/ApiState';

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500';
const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40';

const colors: Record<string, string> = {
  ACTIVITY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  QUIZ: 'bg-blue-50 text-blue-700 border-blue-200',
  EXAM: 'bg-violet-50 text-violet-700 border-violet-200',
};
export default function TeacherCalendar() {
  const [data, setData] = useState<{ tasks: AssessmentRow[]; categories: UserCategoryRecord[]; subjects: SubjectRecord[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([listAssessmentRecords(), listUserCategories(), listSubjects()])
      .then(([tasks, categories, subjects]) => { if (active) setData({ tasks, categories, subjects }); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Unable to load your calendar.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);
  const tasks = data?.tasks || [];
  const categories = data?.categories || [];
  const subjects = data?.subjects || [];
  const [month, setMonth] = useState(() => dateKey(new Date()).slice(0, 7));
  const [selected, setSelected] = useState(() => dateKey(new Date()));
  const [program, setProgram] = useState('all');
  const [type, setType] = useState('all');
  const [year, monthNumber] = month.split('-').map(Number);
  const days = new Date(year, monthNumber, 0).getDate();
  const offset = new Date(year, monthNumber - 1, 1).getDay();
  const events = scheduledTasks(tasks).filter(
    (t) =>
      (program === 'all' || !t.target_category || t.target_category === program) &&
      (type === 'all' || t.assessment_type === type),
  );
  const onDay = (day: string) => events.filter(task => {
    const window = assessmentWindow(task);
    return window && window.start <= day && window.end >= day;
  });
  const selectedEvents = onDay(selected);
  const move = (direction: number) => {
    const d = new Date(year, monthNumber - 1 + direction, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setMonth(next);
    setSelected(`${next}-01`);
  };
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">
            Teacher workspace
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {'Teaching calendar'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {
              'See assessment windows and daily agendas. Dates and times use Philippine time (UTC+8).'
            }
          </p>
        </div>
        {
          <Link href="/teacher/assessment-tasks/choice" className={buttonClass}>
            + Set an assessment
          </Link>
        }
      </div>
      <ApiState loading={loading} error={error} onRetry={() => { setLoading(true); setError(null); setRetry(value => value + 1); }} />
      {!loading && !error && data && (
        <>
          <div className="mb-5 flex flex-wrap gap-3">
            <label className="max-w-xs flex-1">
              <span className="sr-only">Program</span>
              <select
                className={fieldClass}
                value={program}
                onChange={(e) => setProgram(e.target.value)}
              >
                <option value="all">All programs</option>
                {categories.map(category => (
                  <option key={category.category_id} value={category.code}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="max-w-xs flex-1">
              <span className="sr-only">Assessment type</span>
              <select
                className={fieldClass}
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="all">All assessment types</option>
                {['ACTIVITY', 'QUIZ', 'EXAM'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <section
              className={
                'rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6'
              }
            >
              <div className="mb-5 flex items-center justify-between gap-2">
                <h2 className="text-xl font-bold">
                  {new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Previous month"
                    onClick={() => move(-1)}
                    className="rounded-lg border p-2"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => {
                      const today = dateKey(new Date());
                      setMonth(today.slice(0, 7));
                      setSelected(today);
                    }}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold"
                  >
                    Today
                  </button>
                  <button
                    aria-label="Next month"
                    onClick={() => move(1)}
                    className="rounded-lg border p-2"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div
                    key={d}
                    className="py-3 text-center text-xs font-semibold text-slate-400"
                  >
                    {d}
                  </div>
                ))}
                {Array.from({ length: offset }, (_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: days }, (_, i) => {
                  const day = `${month}-${String(i + 1).padStart(2, '0')}`;
                  const daily = onDay(day);
                  return (
                    <button
                      key={day}
                      onClick={() => setSelected(day)}
                      aria-label={`${day}, ${daily.length} assessments`}
                      aria-pressed={selected === day}
                      className={`min-h-20 min-w-0 border border-slate-100 p-1 text-left align-top sm:min-h-28 sm:p-2 ${selected === day ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : 'hover:bg-slate-50'}`}
                    >
                      <span className="text-sm font-bold">{i + 1}</span>
                      <div className="mt-1 space-y-1">
                        {daily.slice(0, 2).map((t) => (
                          <span
                            key={t.assessment_id}
                            className={`block truncate rounded px-1 py-1 text-[9px] sm:text-[10px] ${colors[t.assessment_type]}`}
                          >
                            <span className="sm:hidden">• </span>
                            <span className="hidden sm:inline">{t.title}</span>
                          </span>
                        ))}
                        {daily.length > 2 && (
                          <span className="text-[10px] text-blue-600">
                            +{daily.length - 2} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {Object.keys(colors).map((t) => (
                  <span
                    key={t}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold ${colors[t]}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>
            <section
              className={
                'rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6'
              }
            >
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                Daily agenda
              </p>
              <h2 className="mt-2 text-xl font-bold">
                {new Date(`${selected}T12:00:00+08:00`).toLocaleDateString(
                  'en-PH',
                  {
                    timeZone: 'Asia/Manila',
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  },
                )}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedEvents.length} assessment windows
              </p>
              <div className="mt-5 space-y-4">
                {selectedEvents.map((t) => (
                  <article
                    key={t.assessment_id}
                    className={`rounded-2xl border p-4 ${colors[t.assessment_type]}`}
                  >
                    <span className="inline-block rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                      {t.assessment_type}
                    </span>
                    <h3 className="mt-3 font-bold">{t.title}</h3>
                    <p className="mt-2 text-xs">
                      {t.target_category ? categories.find(category => category.code === t.target_category)?.name || CATEGORY_LABELS[t.target_category] : 'All programs'} ·{' '}
                      {subjectName(subjects, t.subject_code, t.target_category)}
                    </p>
                    <p className="mt-3 text-xs">
                      Starts: {formatTime(t.start_date)}
                    </p>
                    <p className="mt-1 text-xs">Due: {formatTime(t.end_date)}</p>
                    <p className="mt-3 text-sm leading-6">{t.description}</p>
                    <Link
                      href={`/teacher/assessment-tasks/${t.assessment_type === 'ACTIVITY' ? 'activity' : t.assessment_type === 'QUIZ' ? 'quizzes' : 'exam'}?edit=${t.assessment_id}`}
                      className="mt-4 inline-block text-sm font-bold underline underline-offset-4"
                    >
                      View assessment →
                    </Link>
                  </article>
                ))}
                {!selectedEvents.length && (
                  <p className="py-10 text-center text-sm text-slate-500">
                    No assessments on this day. Select another date or schedule a
                    new task.
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
