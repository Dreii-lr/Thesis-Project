import { CATEGORY_LABELS, listAssessmentRecords, type AssessmentRow, type StudentTask, type TaskType } from './assessments-api';
import { listSubjects, type SubjectRecord } from './subjects-api';
import { listUserCategories, type UserCategoryRecord } from './user-categories-api';
import { scheduledEnd } from './assessment-timing';

export const CALENDAR_ZONE = 'Asia/Manila';
export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  subject: string;
  subjectName: string;
  program: string;
  programName: string;
  day: string | null;
  dateLabel: 'Starts' | 'Due' | 'Opens';
  start: string | null;
  end: string | null;
  status: string;
  submissions?: number;
  duration: number | null;
  grace: number;
  maxScore: number;
  href: string;
  action: string;
}

export function calendarDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: CALENDAR_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function calendarDays(month: string) {
  const [year, number] = month.split('-').map(Number);
  const offset = new Date(Date.UTC(year, number - 1, 1)).getUTCDay();
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(year, number - 1, 1 - offset + index));
    return { key: date.toISOString().slice(0, 10), day: date.getUTCDate() };
  });
}

export function calendarMonth(month: string, change: number) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1 + change, 1)).toISOString().slice(0, 7);
}

export function calendarDayLabel(day: string, short = false) {
  return new Date(`${day}T12:00:00+08:00`).toLocaleDateString('en-PH', {
    timeZone: CALENDAR_ZONE, weekday: short ? 'short' : 'long', month: short ? 'short' : 'long', day: 'numeric',
  });
}

export function calendarClock(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not set';
  return new Date(value).toLocaleTimeString('en-PH', { timeZone: CALENDAR_ZONE, hour: 'numeric', minute: '2-digit' });
}

export function calendarEventTime(event: CalendarEvent) {
  const timestamp = Date.parse((event.dateLabel === 'Due' ? event.end : event.start) || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function calendarStatusMatches(event: CalendarEvent, filter: string, now = Date.now()) {
  if (filter === 'ALL') return true;
  const published = event.status === 'ACTIVE' || event.status === 'SCHEDULED';
  if (filter === 'PUBLISHED') return published;
  if (filter === 'UPCOMING') return published && calendarEventTime(event) >= now;
  return event.status === filter;
}

function assessmentDate(task: StudentTask | AssessmentRow) {
  const start = task.start_date || null;
  const valid = (value: string | null) => !!value && Number.isFinite(Date.parse(value));
  if (task.assessment_type === 'ACTIVITY') {
    const end = task.end_date || null;
    const date = end || start;
    return { day: valid(date) ? calendarDate(new Date(date!)) : null, dateLabel: end ? 'Due' as const : 'Opens' as const, start, end };
  }
  const endTime = scheduledEnd({ start_date: start, end_date: task.end_date || null, duration_minutes: task.duration_minutes ?? null, grace_period_minutes: task.grace_period_minutes });
  const validSchedule = valid(start) && (!Number.isFinite(endTime) || endTime > Date.parse(start!));
  return { day: validSchedule ? calendarDate(new Date(start!)) : null, dateLabel: 'Starts' as const, start, end: Number.isFinite(endTime) ? new Date(endTime).toISOString() : null };
}

function resolveSubject(code: string, subjects: SubjectRecord[]) {
  const normalize = (value: string) => value.trim().normalize('NFKC').replace(/\s+/g, ' ').toLowerCase();
  return subjects.find(subject => [subject.subject_id, subject.code, subject.name].some(value => value && normalize(value) === normalize(code)));
}

export function studentCalendarEvents(tasks: StudentTask[], subjects: SubjectRecord[], program: string, programName: string): CalendarEvent[] {
  return tasks.map(task => {
    const subject = resolveSubject(task.subject_code, subjects);
    const done = task.submission_status === 'SUBMITTED' || task.submission_status === 'GRADED';
    return {
      id: task.assessment_id, title: task.title, description: task.description || '', type: task.assessment_type,
      subject: subject?.subject_id || task.subject_code, subjectName: subject?.name || task.subject_code,
      program, programName, ...assessmentDate(task), status: task.submission_status || 'NOT_STARTED',
      duration: task.duration_minutes, grace: task.grace_period_minutes, maxScore: task.max_score,
      href: task.assessment_type === 'ACTIVITY' ? subject ? `/student/subjects/${encodeURIComponent(subject.subject_id)}` : '/student/subjects' : `/student/activities/assessment/${encodeURIComponent(task.assessment_id)}`,
      action: task.assessment_type === 'ACTIVITY' ? 'View subject' : done ? 'View result' : task.submission_status === 'IN_PROGRESS' ? 'Continue assessment' : 'View assessment',
    };
  });
}

export async function loadTeacherCalendar() {
  const [tasksResult, categoriesResult, subjectsResult] = await Promise.allSettled([listAssessmentRecords(), listUserCategories(), listSubjects()]);
  if (tasksResult.status === 'rejected') throw tasksResult.reason;
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
  const subjects = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];
  const events = teacherCalendarEvents(tasksResult.value, categories, subjects);
  const programs = new Map(categories.map(category => [category.code, category.name]));
  for (const event of events) if (!programs.has(event.program)) programs.set(event.program, event.programName);
  return {
    events,
    programs: Array.from(programs, ([value, label]) => ({ value, label })),
    warning: categoriesResult.status === 'rejected' || subjectsResult.status === 'rejected' ? 'Some program or subject names could not be loaded. Your assessment dates are still available.' : null,
  };
}

export function teacherCalendarEvents(tasks: AssessmentRow[], categories: UserCategoryRecord[], subjects: SubjectRecord[]): CalendarEvent[] {
  return tasks.map(task => {
    const category = categories.find(item => item.code === task.target_category);
    const scopedSubjects = subjects.filter(subject => !task.target_category || subject.category_code === task.target_category || subject.category_id === category?.category_id);
    const subject = resolveSubject(task.subject_code, scopedSubjects);
    return {
      id: task.assessment_id, title: task.title, description: task.description || '', type: task.assessment_type,
      subject: subject?.subject_id || task.subject_code, subjectName: subject?.name || task.subject_code,
      program: task.target_category || 'UNASSIGNED', programName: category?.name || (task.target_category ? CATEGORY_LABELS[task.target_category] : 'Program not set'),
      ...assessmentDate(task), status: task.status, submissions: task.submissions_count,
      duration: task.duration_minutes ?? null, grace: task.grace_period_minutes, maxScore: task.max_score,
      href: `/teacher/assessment-tasks/${task.assessment_type === 'ACTIVITY' ? 'activity' : task.assessment_type === 'QUIZ' ? 'quizzes' : 'exam'}?edit=${encodeURIComponent(task.assessment_id)}`,
      action: 'Manage assessment',
    };
  });
}

export function calendarEventStatus(event: CalendarEvent, teacher: boolean, now = Date.now()) {
  if (teacher && event.status === 'DRAFT') return { label: 'Draft', color: 'gray' } as const;
  if (event.status === 'COMPLETED' || event.status === 'GRADED') return { label: 'Completed', color: 'green' } as const;
  if (event.status === 'SUBMITTED') return { label: 'Awaiting review', color: 'amber' } as const;
  const end = event.end ? Date.parse(event.end) : NaN;
  const start = event.start ? Date.parse(event.start) : NaN;
  if (Number.isFinite(end) && now >= end) return { label: event.type === 'ACTIVITY' ? 'Deadline passed' : 'Ended', color: 'gray' } as const;
  if (event.status === 'IN_PROGRESS') return { label: 'In progress', color: 'blue' } as const;
  if (!teacher && event.type === 'ACTIVITY') return { label: 'Not submitted', color: 'red' } as const;
  if (Number.isFinite(start) && now >= start && event.type !== 'ACTIVITY') {
    if (!teacher && now > start + event.grace * 60000) return { label: 'Entry closed', color: 'gray' } as const;
    return { label: teacher ? 'Live' : 'Open now', color: 'green' } as const;
  }
  return { label: 'Scheduled', color: 'blue' } as const;
}
