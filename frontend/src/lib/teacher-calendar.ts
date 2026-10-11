import type { AssessmentRow } from './assessments-api';

export function dateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}
export function formatTime(value?: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not scheduled';
  return new Date(value).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}
export function assessmentWindow(task: AssessmentRow): { start: string; end: string } | null {
  const start = task.start_date || task.end_date;
  const end = task.end_date || task.start_date;
  if (!start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end))) return null;
  if (Date.parse(end) < Date.parse(start)) return null;
  return { start: dateKey(new Date(start)), end: dateKey(new Date(end)) };
}
export function scheduledTasks(tasks: AssessmentRow[]): AssessmentRow[] {
  return tasks.filter(task => task.status !== 'DRAFT' && assessmentWindow(task))
    .sort((a, b) => Date.parse(a.start_date || a.end_date || '') - Date.parse(b.start_date || b.end_date || ''));
}
