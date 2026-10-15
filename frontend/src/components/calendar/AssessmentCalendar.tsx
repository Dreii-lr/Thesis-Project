'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, RefreshCw, Search } from 'lucide-react';
import ApiState from '@/src/components/ui/ApiState';
import { calendarClock, calendarDate, calendarDayLabel, calendarDays, calendarEventStatus, calendarEventTime, calendarMonth, calendarStatusMatches, CALENDAR_ZONE, type CalendarEvent } from '@/src/lib/assessment-calendar';
import type { TaskType } from '@/src/lib/assessments-api';

const typeNames: Record<TaskType, string> = { ACTIVITY: 'Activity', QUIZ: 'Quiz', EXAM: 'Exam' };
const typeStyles = {
  ACTIVITY: { dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-800', line: 'border-l-amber-400' },
  QUIZ: { dot: 'bg-blue-500', chip: 'bg-blue-50 text-blue-700', line: 'border-l-blue-500' },
  EXAM: { dot: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700', line: 'border-l-violet-400' },
};
const statusStyles = { blue: 'bg-blue-50 text-blue-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-800', gray: 'bg-slate-100 text-slate-500', red: 'bg-rose-50 text-rose-700' };
const fieldClass = 'w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50';
type ScheduledEvent = CalendarEvent & { day: string };

export default function AssessmentCalendar({ role, events, loading, error, onRefresh, programs = [], warning }: {
  role: 'teacher' | 'student';
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  programs?: { value: string; label: string }[];
  warning?: string | null;
}) {
  const teacher = role === 'teacher';
  const [now, setNow] = useState(() => Date.now());
  const today = calendarDate(new Date(now));
  const [month, setMonth] = useState(() => calendarDate().slice(0, 7));
  const [selected, setSelected] = useState(() => calendarDate());
  const [search, setSearch] = useState('');
  const [program, setProgram] = useState('ALL');
  const [subject, setSubject] = useState('ALL');
  const [type, setType] = useState<'ALL' | TaskType>('ALL');
  const [status, setStatus] = useState('ALL');
  const ready = !loading && !error;
  const subjects = Array.from(new Map(events.filter(event => program === 'ALL' || event.program === program).map(event => [event.subject, event.subjectName])).entries()).sort((a, b) => a[1].localeCompare(b[1]));
  const visible = ready ? events.filter(event => (program === 'ALL' || event.program === program) && (subject === 'ALL' || event.subject === subject) && (type === 'ALL' || event.type === type) &&
    calendarStatusMatches(event, status, now) && `${event.title} ${event.subjectName} ${event.programName}`.toLowerCase().includes(search.trim().toLowerCase())) : [];
  const dated = visible.filter((event): event is ScheduledEvent => event.day !== null).sort((a, b) => a.day.localeCompare(b.day) || calendarEventTime(a) - calendarEventTime(b));
  const monthly = dated.filter(event => event.day.startsWith(month));
  const selectedEvents = dated.filter(event => event.day === selected);
  const unscheduled = visible.length - dated.length;
  const upcoming = dated.filter(event => event.day >= today && !['DRAFT', 'COMPLETED', 'SUBMITTED', 'GRADED'].includes(event.status) && calendarEventTime(event) >= now).slice(0, 3);
  const monthLabel = new Date(`${month}-01T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: CALENDAR_ZONE, month: 'long', year: 'numeric' });
  const hasFilters = !!search.trim() || program !== 'ALL' || subject !== 'ALL' || type !== 'ALL' || status !== 'ALL';
  const clearFilters = () => { setSearch(''); setProgram('ALL'); setSubject('ALL'); setType('ALL'); setStatus('ALL'); };
  const selectDay = (day: string) => { setSelected(day); setMonth(day.slice(0, 7)); };
  const moveMonth = (change: number) => { const next = calendarMonth(month, change); setMonth(next); setSelected(`${next}-01`); };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    const focus = () => { setNow(Date.now()); onRefresh(); };
    window.addEventListener('focus', focus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [onRefresh]);

  return <div className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <section className={`relative isolate overflow-hidden rounded-3xl p-6 text-white shadow-lg shadow-blue-900/10 ${teacher ? 'portal-hero' : 'bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700'}`}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 -z-10 h-72 w-72 rounded-full border-[32px] border-white/5" />
      <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-blue-100"><CalendarDays size={13} />{teacher ? 'Teacher workspace' : 'Learning schedule'}</p><h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{teacher ? 'Teaching Calendar' : 'My Calendar'}</h1><p className="mt-2 text-xs leading-6 text-blue-100/80">{teacher ? 'Plan assessments and keep every learning program on track.' : 'Keep your quizzes, exams, and activity deadlines in view.'}</p></div><div className="space-y-4"><div className="flex flex-wrap gap-2 sm:justify-end"><button type="button" onClick={onRefresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-[11px] font-semibold hover:bg-white/20 disabled:opacity-50"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} />Refresh</button>{teacher && <Link href="/teacher/assessment-tasks/choice" className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"><Plus size={14} />New assessment</Link>}</div>
      <div className="flex flex-wrap gap-x-5 gap-y-3">{[
        ['This month', monthly.length], ['Selected day', selectedEvents.length], [teacher ? 'Drafts this month' : 'Submitted this month', monthly.filter(event => teacher ? event.status === 'DRAFT' : ['SUBMITTED', 'GRADED'].includes(event.status)).length],
      ].map(([label, value]) => <div key={label}><span className="mr-2 text-lg font-bold">{ready ? value : '—'}</span><span className="text-[10px] text-blue-100/80">{label}</span></div>)}</div></div></div>
    </section>

    <section aria-label="Calendar filters" className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className={`grid gap-3 md:grid-cols-2 ${teacher ? 'xl:grid-cols-4' : ''}`}><div className="relative min-w-0"><Search size={14} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><input aria-label="Search calendar" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search assessments or subjects" className={`${fieldClass} pl-9`} /></div>
        {teacher && <select aria-label="Filter by program" value={program} onChange={event => { setProgram(event.target.value); setSubject('ALL'); }} className={fieldClass}><option value="ALL">All learning programs</option>{programs.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>}
        <select aria-label="Filter by subject" value={subject} onChange={event => setSubject(event.target.value)} className={fieldClass}><option value="ALL">All subjects</option>{subjects.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        {teacher && <select aria-label="Filter by publishing status" value={status} onChange={event => setStatus(event.target.value)} className={fieldClass}><option value="ALL">All publishing statuses</option><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="UPCOMING">Upcoming dates</option><option value="COMPLETED">Completed</option></select>}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-1 rounded-xl bg-slate-50 p-1" aria-label="Filter by assessment type">{(['ALL', 'ACTIVITY', 'QUIZ', 'EXAM'] as const).map(value => <button key={value} type="button" aria-pressed={type === value} onClick={() => setType(value)} className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors ${type === value ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/70' : 'text-slate-400 hover:text-slate-700'}`}>{value === 'ALL' ? 'All types' : value === 'ACTIVITY' ? 'Activities' : value === 'QUIZ' ? 'Quizzes' : 'Exams'}</button>)}</div>{hasFilters ? <button type="button" onClick={clearFilters} className="text-[11px] font-semibold text-blue-600">Clear filters</button> : <p className="inline-flex items-center gap-1.5 text-[10px] text-slate-400"><Clock3 size={12} />All times UTC+8</p>}</div>
    </section>

    <ApiState loading={loading} error={error} onRetry={onRefresh} />
    {ready && warning && <p role="status" className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-6 text-amber-800">{warning}</p>}
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section aria-label="Monthly assessment calendar" aria-busy={loading} className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-5"><div><h2 className="text-lg font-bold tracking-tight text-slate-800">{monthLabel}</h2><p className="mt-1 text-[10px] text-slate-400">Select a date to see its agenda</p></div><div className="flex items-center gap-1.5"><button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><ChevronLeft size={15} /></button><button type="button" onClick={() => selectDay(calendarDate())} className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Today</button><button type="button" aria-label="Next month" onClick={() => moveMonth(1)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><ChevronRight size={15} /></button></div></div>
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day} className="py-3 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-400">{day}</span>)}</div>
        <div className="grid grid-cols-7">{calendarDays(month).map(cell => {
          const daily = dated.filter(event => event.day === cell.key);
          const current = cell.key === selected;
          return <button key={cell.key} type="button" aria-label={`${calendarDayLabel(cell.key)}, ${cell.key.slice(0, 4)}, ${daily.length} assessment${daily.length === 1 ? '' : 's'}`} aria-pressed={current} aria-current={cell.key === today ? 'date' : undefined} onClick={() => selectDay(cell.key)} title={daily.map(event => event.title).join('\n')} className={`flex min-h-[64px] min-w-0 flex-col items-stretch justify-start border-b border-r border-slate-100 p-1.5 text-left transition-colors sm:min-h-[64px] sm:p-2 [&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0 ${current ? 'bg-blue-50/70 ring-1 ring-inset ring-blue-300' : cell.key.startsWith(month) ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/60 hover:bg-slate-100'}`}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${cell.key === today ? 'bg-blue-600 text-white' : current ? 'text-blue-700' : cell.key.startsWith(month) ? 'text-slate-600' : 'text-slate-300'}`}>{cell.day}</span>
            <span className="mt-1 hidden space-y-1 sm:block">{daily.slice(0, 2).map(event => <span key={event.id} className={`block truncate rounded-md px-1.5 py-0.5 text-[9px] font-medium leading-3 ${teacher && event.status === 'DRAFT' ? 'border border-dashed border-slate-300 bg-slate-50 text-slate-400' : typeStyles[event.type].chip}`}>{event.title}</span>)}{daily.length > 2 && <span className="block px-1 text-[8px] font-semibold text-slate-400">+{daily.length - 2} more</span>}</span>
            <span className="mt-2 flex flex-wrap items-center gap-1 sm:hidden">{daily.slice(0, 3).map(event => <span key={event.id} className={`h-1.5 w-1.5 rounded-full ${teacher && event.status === 'DRAFT' ? 'bg-slate-300' : typeStyles[event.type].dot}`} />)}{daily.length > 3 && <span className="text-[8px] text-slate-400">+{daily.length - 3}</span>}</span>
          </button>;
        })}</div>
        <div className="space-y-3 border-t border-slate-100 px-4 py-4 sm:px-5"><div className="flex flex-wrap gap-x-4 gap-y-2">{(['ACTIVITY', 'QUIZ', 'EXAM'] as const).map(value => <span key={value} className="inline-flex items-center gap-1.5 text-[10px] text-slate-500"><span className={`h-2 w-2 rounded-full ${typeStyles[value].dot}`} />{value === 'ACTIVITY' ? 'Activity deadline' : typeNames[value]}</span>)}{teacher && <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400"><span className="h-2 w-2 rounded-sm border border-dashed border-slate-400" />Private draft</span>}</div><p className="text-[10px] leading-5 text-slate-400">Quizzes and exams appear on their start date. Activities appear on their deadline, or opening date if no deadline is set.</p></div>
      </section>

      <aside className="min-w-0 space-y-4">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 bg-blue-50/40 p-5"><p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">{selected === today ? 'Today’s agenda' : 'Daily agenda'}</p><h2 className="mt-2 text-base font-bold text-slate-800">{calendarDayLabel(selected)}</h2><p className="mt-1 text-[10px] text-slate-400">{ready ? `${selectedEvents.length} assessment${selectedEvents.length === 1 ? '' : 's'}` : 'Records unavailable'}</p></div><div className="space-y-3 p-4 xl:max-h-[500px] xl:overflow-y-auto">{ready && selectedEvents.map(event => <EventCard key={event.id} event={event} teacher={teacher} now={now} />)}{ready && !selectedEvents.length && <div className="py-7 text-center"><CalendarDays size={25} className="mx-auto text-blue-300" /><h3 className="mt-3 text-xs font-semibold text-slate-700">{hasFilters ? 'No matching assessments' : 'Nothing scheduled for this day'}</h3><p className="mt-2 text-[11px] leading-6 text-slate-400">{hasFilters ? 'Try changing your filters or selecting another date.' : teacher ? 'Choose another date or create a new assessment.' : 'Select another date to check your assessments.'}</p></div>}{!ready && <p className="py-6 text-center text-xs text-slate-400">{loading ? 'Loading your agenda...' : 'Retry loading your calendar to view this agenda.'}</p>}</div></section>
        {ready && upcoming.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xs font-bold text-slate-700">Coming up</h2><div className="mt-4 space-y-2">{upcoming.map(event => <button key={event.id} type="button" onClick={() => selectDay(event.day)} className="flex w-full items-start gap-2.5 rounded-xl p-2 text-left hover:bg-slate-50"><span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${typeStyles[event.type].dot}`} /><span className="min-w-0"><span className="block text-[11px] font-semibold leading-5 text-slate-600">{event.title}</span><span className="mt-1 block text-[10px] text-slate-400">{calendarDayLabel(event.day, true)} · {calendarClock(event.dateLabel === 'Due' ? event.end : event.start)}</span></span><ChevronRight size={12} className="ml-auto mt-1 shrink-0 text-slate-300" /></button>)}</div></section>}
        {teacher && <Link href="/teacher/assessment-tasks" className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs font-semibold text-blue-700">Manage all assessments<ArrowRight size={14} /></Link>}
      </aside>
    </div>
    {ready && unscheduled > 0 && <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] leading-6 text-slate-500">{unscheduled} assessment{unscheduled === 1 ? '' : 's'} {unscheduled === 1 ? 'has' : 'have'} no valid calendar date yet.{teacher ? <Link href="/teacher/assessment-tasks" className="ml-1 font-semibold text-blue-600">Review schedules</Link> : ' Your teacher will need to set the schedule.'}</div>}
  </div>;
}

function EventCard({ event, teacher, now }: { event: CalendarEvent; teacher: boolean; now: number }) {
  const state = calendarEventStatus(event, teacher, now);
  const endDay = event.end && Number.isFinite(Date.parse(event.end)) ? calendarDate(new Date(event.end)) : null;
  return <article className={`rounded-2xl border border-l-[3px] border-slate-200 bg-white p-4 ${teacher && event.status === 'DRAFT' ? 'border-l-slate-300' : typeStyles[event.type].line}`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-lg px-2 py-1 text-[9px] font-semibold ${typeStyles[event.type].chip}`}>{typeNames[event.type]}</span><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${statusStyles[state.color]}`}>{state.label}</span></div>
    <h3 className="mt-3 break-words text-sm font-semibold leading-6 text-slate-800">{event.title}</h3><p className="mt-1 text-[10px] leading-5 text-slate-400">{event.subjectName}{teacher ? ` · ${event.programName}` : ''}</p>
    <p className="mt-3 flex items-start gap-1.5 text-[11px] font-medium leading-5 text-slate-600"><Clock3 size={13} className="mt-1 shrink-0 text-blue-500" /><span>{event.dateLabel === 'Due' ? `Due ${calendarClock(event.end)}` : event.dateLabel === 'Opens' ? `Opens ${calendarClock(event.start)}` : <>{calendarClock(event.start)}{event.end ? ` – ${calendarClock(event.end)}` : ''}{endDay && endDay !== event.day ? ` (ends ${calendarDayLabel(endDay, true)})` : ''}</>}</span></p>
    {event.description && <p className="mt-3 line-clamp-3 whitespace-pre-line break-words text-[11px] leading-6 text-slate-500">{event.description}</p>}
    <p className="mt-3 text-[10px] leading-5 text-slate-400">{event.maxScore} points{event.type !== 'ACTIVITY' && event.duration !== null ? ` · ${event.duration} min` : ''}{event.type !== 'ACTIVITY' ? ` · ${event.grace} min start grace` : ''}{teacher && typeof event.submissions === 'number' ? ` · ${event.submissions} submitted` : ''}</p>
    {teacher && event.status === 'DRAFT' && <p className="mt-2 text-[10px] text-slate-400">Private draft · not visible to students</p>}
    <Link href={event.href} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-[10px] font-semibold text-blue-700 hover:bg-blue-100">{event.action}<ArrowRight size={12} /></Link>
  </article>;
}
