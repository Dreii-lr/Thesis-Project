import type { AssessmentRow, SubmissionDetail, TeacherSubmission } from './assessments-api';
import type { Student } from './students-api';
import type { SubjectRecord } from './subjects-api';
import type { UserCategoryItem } from './user-categories-api';
import { calculateGrade, type ComponentAssignments, type GradeGroup, type GradeWeights } from './grading';

export interface GradebookScope { category: UserCategoryItem; subject: SubjectRecord; subjects: SubjectRecord[] }
export interface RosterGradeGroup extends GradeGroup {
  studentId: string;
  expectedTasks: AssessmentRow[];
  missingCount: number;
  unavailableCount: number;
  unmatched: boolean;
}
export interface GradebookEntry { key: string; group: RosterGradeGroup; task: AssessmentRow; submission: SubmissionDetail | null; unavailable: boolean }
export type GradebookTab = 'learners' | 'records';
export type GradebookSort = 'name-asc' | 'name-desc' | 'newest' | 'oldest';
export interface GradebookFilters { statuses: string[]; types: string[]; dateFrom: string; dateTo: string }
export const emptyGradebookFilters = (): GradebookFilters => ({ statuses: [], types: [], dateFrom: '', dateTo: '' });
export const GRADEBOOK_STATUSES = [
  ['NO_SUBMISSION', 'No submission'], ['IN_PROGRESS', 'In progress'], ['SUBMITTED', 'Awaiting review'],
  ['GRADED', 'Graded'], ['INCOMPLETE', 'Incomplete'], ['UNAVAILABLE', 'Unavailable'], ['NO_ASSESSMENTS', 'No assessments'],
] as const;
export const gradebookProgramHref = (code: string) => `/teacher/grades/${encodeURIComponent(code.toLowerCase())}`;
export const gradebookSubjectHref = (code: string, id: string) => `${gradebookProgramHref(code)}/${encodeURIComponent(id)}`;
const normalize = (value: string) => value.trim().toLocaleLowerCase();

export function gradebookSubjects(subjects: SubjectRecord[], category: UserCategoryItem) {
  return subjects.filter(subject => subject.is_active && (subject.category_id === category.category_id || subject.category_code?.toUpperCase() === category.code.toUpperCase()));
}

export function taskInGradebook(task: AssessmentRow, scope: GradebookScope, teacherId: string) {
  if (task.teacher_id !== teacherId || task.status === 'DRAFT') return false;
  if (!gradebookSubjects(scope.subjects, scope.category).some(subject => subject.subject_id === scope.subject.subject_id)) return false;
  if (task.target_category && task.target_category.toUpperCase() !== scope.category.code.toUpperCase()) return false;
  if (task.subject_code === scope.subject.subject_id) return true;
  const code = normalize(task.subject_code);
  if (!task.target_category && scope.subjects.filter(subject => subject.is_active && [subject.code, subject.name].some(value => value && normalize(value) === code)).length !== 1) return false;
  const matches = gradebookSubjects(scope.subjects, scope.category).filter(subject => [subject.code, subject.name].some(value => value && normalize(value) === code));
  return matches.length === 1 && matches[0].subject_id === scope.subject.subject_id;
}

export function buildGradebookRoster(students: Student[], records: TeacherSubmission[], tasks: AssessmentRow[], scope: GradebookScope, teacherId: string, failedIds: string[] = []): RosterGradeGroup[] {
  const expectedTasks = tasks.filter(task => taskInGradebook(task, scope, teacherId));
  const ids = new Set(expectedTasks.map(task => task.assessment_id));
  const eligible = students.filter(student => student.user_category.toUpperCase() === scope.category.code.toUpperCase());
  const accounts = new Set(eligible.map(student => student.account_id));
  const scoped = records.filter(record => ids.has(record.task.assessment_id)
    && (!record.submission.student_category || record.submission.student_category.toUpperCase() === scope.category.code.toUpperCase())
    && (accounts.has(record.submission.account_id || '') || !!record.submission.student_category || record.task.target_category === scope.category.code));
  const groups: RosterGradeGroup[] = eligible.map(student => ({
    key: JSON.stringify([teacherId, scope.category.code, scope.subject.subject_id, student.id]),
    studentId: student.id, accountId: student.account_id, name: [student.first_name, student.middle_name, student.last_name, student.suffix].filter(Boolean).join(' '),
    teacherId, program: scope.category.code, subjectCode: scope.subject.subject_id, records: [], expectedTasks, missingCount: 0, unavailableCount: 0, unmatched: false,
  }));
  const byAccount = new Map(groups.filter(group => group.accountId).map(group => [group.accountId, group]));
  for (const record of scoped) {
    const accountId = record.submission.account_id || '';
    let group = accountId ? byAccount.get(accountId) : undefined;
    if (!group) {
      group = { key: `unmatched:${accountId || record.submission.submission_id}`, studentId: '', accountId, name: record.submission.student_name || accountId || 'Unmatched learner', teacherId, program: scope.category.code, subjectCode: scope.subject.subject_id, records: [], expectedTasks, missingCount: 0, unavailableCount: 0, unmatched: true };
      groups.push(group);
      if (accountId) byAccount.set(accountId, group);
    }
    group.records.push(record);
  }
  const failed = new Set(failedIds);
  for (const group of groups) {
    const submitted = new Set(group.records.map(record => record.task.assessment_id));
    group.unavailableCount = expectedTasks.filter(task => failed.has(task.assessment_id)).length;
    group.missingCount = expectedTasks.filter(task => !submitted.has(task.assessment_id) && !failed.has(task.assessment_id)).length;
  }
  return groups.sort((a, b) => a.name.localeCompare(b.name) || a.accountId.localeCompare(b.accountId));
}

export function gradebookEntries(groups: RosterGradeGroup[], failedIds: string[] = []): GradebookEntry[] {
  const failed = new Set(failedIds);
  return groups.flatMap(group => group.expectedTasks.flatMap((task): GradebookEntry[] => {
    const submissions = group.records.filter(record => record.task.assessment_id === task.assessment_id);
    return submissions.length ? submissions.map(({ submission }) => ({ key: `${group.key}:${submission.submission_id}`, group, task, submission, unavailable: false }))
      : [{ key: `${group.key}:${task.assessment_id}:missing`, group, task, submission: null, unavailable: failed.has(task.assessment_id) }];
  }));
}

export function gradebookGroupStatus(group: RosterGradeGroup): string {
  if (group.unavailableCount || group.unmatched) return 'UNAVAILABLE';
  if (!group.expectedTasks.length) return 'NO_ASSESSMENTS';
  if (!group.records.length) return 'NO_SUBMISSION';
  if (group.records.some(record => record.submission.status === 'SUBMITTED')) return 'SUBMITTED';
  if (group.records.some(record => record.submission.status === 'IN_PROGRESS')) return 'IN_PROGRESS';
  return group.missingCount ? 'INCOMPLETE' : 'GRADED';
}

export function calculateRosterGrade(group: RosterGradeGroup, weights: GradeWeights, assignments: ComponentAssignments) {
  const result = calculateGrade(group.records, weights, assignments, !!group.unavailableCount || group.unmatched);
  const reasons = [...result.reasons];
  if (group.missingCount) reasons.push(`${group.missingCount} assessment${group.missingCount === 1 ? '' : 's'} not submitted.`);
  if (!group.expectedTasks.length) reasons.push('No assessments have been assigned in this subject.');
  if (!group.accountId) reasons.push('The learner account ID is unavailable.');
  if (new Set(group.records.map(record => record.task.assessment_id)).size < group.records.length) reasons.push('Multiple records for the same assessment need review.');
  return { ...result, final: reasons.length ? null : result.final, reasons: [...new Set(reasons)] };
}

export function gradebookDateError(filters: GradebookFilters) {
  for (const value of [filters.dateFrom, filters.dateTo]) {
    if (!value) continue;
    const date = new Date(`${value}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return 'Enter a valid date.';
  }
  return filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo ? 'The start date must be on or before the end date.' : null;
}
export const gradebookFilterCount = (filters: GradebookFilters) => filters.statuses.length + filters.types.length + (filters.dateFrom || filters.dateTo ? 1 : 0);
export function filterGradebookGroups(groups: RosterGradeGroup[], query: string, filters: GradebookFilters, sort: GradebookSort) {
  const text = normalize(query);
  return groups.filter(group => (!text || normalize(`${group.name} ${group.accountId}`).includes(text)) && (!filters.statuses.length || filters.statuses.includes(gradebookGroupStatus(group))))
    .sort((a, b) => (sort === 'name-desc' ? -1 : 1) * (a.name.localeCompare(b.name) || a.accountId.localeCompare(b.accountId)));
}
export function filterGradebookEntries(entries: GradebookEntry[], query: string, filters: GradebookFilters, sort: GradebookSort) {
  const text = normalize(query);
  return entries.filter(entry => {
    const status = entry.unavailable ? 'UNAVAILABLE' : entry.submission?.status || 'NO_SUBMISSION';
    const date = entry.submission?.submitted_at ? new Date(entry.submission.submitted_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }) : '';
    return (!text || normalize(`${entry.group.name} ${entry.group.accountId} ${entry.task.title}`).includes(text))
      && (!filters.statuses.length || filters.statuses.includes(status)) && (!filters.types.length || filters.types.includes(entry.task.assessment_type))
      && (!(filters.dateFrom || filters.dateTo) || (!!date && (!filters.dateFrom || date >= filters.dateFrom) && (!filters.dateTo || date <= filters.dateTo)));
  }).sort((a, b) => {
    if (sort === 'name-asc' || sort === 'name-desc') return (sort === 'name-desc' ? -1 : 1) * a.group.name.localeCompare(b.group.name) || a.task.title.localeCompare(b.task.title);
    const date = (entry: GradebookEntry) => entry.submission?.submitted_at ? Date.parse(entry.submission.submitted_at) : 0;
    return (sort === 'newest' ? -1 : 1) * (date(a) - date(b)) || a.group.name.localeCompare(b.group.name);
  });
}
export function gradebookPage<T>(rows: T[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / 10));
  const current = Math.min(Math.max(1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1), totalPages), offset = (current - 1) * 10;
  const pages: (number | 'ellipsis')[] = [];
  for (let value = 1; value <= totalPages; value++) {
    if (value === 1 || value === totalPages || Math.abs(current - value) <= 1) pages.push(value);
    else if (pages[pages.length - 1] !== 'ellipsis') pages.push('ellipsis');
  }
  return { rows: rows.slice(offset, offset + 10), current, totalPages, pages, start: rows.length ? offset + 1 : 0, end: Math.min(offset + 10, rows.length), total: rows.length };
}
