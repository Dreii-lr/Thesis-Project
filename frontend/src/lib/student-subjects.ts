import type { StudentTask } from './assessments-api';
import type { SubjectRecord } from './subjects-api';
import type { UserCategoryDetails } from './user-categories-api';
import { scheduledEnd } from './assessment-timing';

export function programSubjects(program: UserCategoryDetails): SubjectRecord[] {
  return (program.subjects || []).filter(subject => subject.is_active && subject.category_id === program.category_id);
}

export function subjectTasks(tasks: StudentTask[], subject: SubjectRecord): StudentTask[] {
  const normalize = (value: string) => value.trim().normalize('NFKC').replace(/\s+/g, ' ').toLowerCase();
  const identifiers = [subject.subject_id, subject.name, subject.code].filter((value): value is string => Boolean(value)).map(normalize);
  return tasks.filter(task => identifiers.includes(normalize(task.subject_code)));
}

export function subjectHref(subjectId: string) {
  return `/student/subjects/${encodeURIComponent(subjectId)}`;
}

export function assessmentCompleted(task: StudentTask) {
  return task.submission_status === 'SUBMITTED' || task.submission_status === 'GRADED';
}

export function assessmentState(task: StudentTask, now: number) {
  if (assessmentCompleted(task)) return { color: 'green', label: 'Done' } as const;
  if (task.status === 'COMPLETED') return { color: 'gray', label: 'Ended' } as const;
  if (task.assessment_type === 'ACTIVITY') return { color: 'red', label: 'Not submitted' } as const;
  if (task.submission_status === 'IN_PROGRESS') return { color: 'yellow', label: 'In progress' } as const;
  if (now >= scheduledEnd(task)) return { color: 'gray', label: 'Ended' } as const;
  return { color: 'yellow', label: 'Not started' } as const;
}

export function assessmentOnDay(task: StudentTask, now: Date) {
  const value = task.assessment_type === 'ACTIVITY' ? task.end_date : task.start_date;
  if (!value) return false;
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}
