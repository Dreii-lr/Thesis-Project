import type { AssessmentRow, SubmissionDetail, TeacherSubmission } from './assessments-api';

export const GRADE_COMPONENTS = [
  { key: 'portfolio', label: 'Portfolio / Activities / Quiz / Exam', shortLabel: 'Portfolio & assessments' },
  { key: 'performance', label: 'Performance task', shortLabel: 'Performance task' },
  { key: 'ae', label: 'A&E test', shortLabel: 'A&E test' },
] as const;

export type GradeComponent = typeof GRADE_COMPONENTS[number]['key'];
export type GradeWeights = Record<GradeComponent, number>;
export type ComponentAssignments = Record<string, GradeComponent | ''>;
export const DEFAULT_WEIGHTS: GradeWeights = { portfolio: 20, performance: 20, ae: 60 };

export interface GradeIssue {
  key: string;
  message: string;
  assessmentId?: string;
  submissionId?: string;
}

export interface GradeGroup {
  key: string;
  accountId: string;
  name: string;
  teacherId: string;
  subjectCode: string;
  program: string;
  records: TeacherSubmission[];
}

export interface ComponentTotal {
  earned: number;
  possible: number;
  percentage: number | null;
  contribution: number | null;
  count: number;
  pending: number;
}

export function formatGrade(value: number) {
  return Number.isFinite(value) ? value.toLocaleString('en-PH', { maximumFractionDigits: 2 }) : '—';
}

export function validateWeights(weights: GradeWeights): string | null {
  if (GRADE_COMPONENTS.some(({ key }) => !Number.isFinite(weights[key]) || weights[key] < 0 || weights[key] > 100)) {
    return 'Enter a percentage from 0 to 100 for each component.';
  }
  const total = GRADE_COMPONENTS.reduce((sum, { key }) => sum + weights[key], 0);
  return Math.abs(total - 100) > 0.000001 ? 'Component weights must add up to 100%.' : null;
}

export function assessmentComponent(task: Pick<AssessmentRow, 'assessment_id' | 'assessment_type'>, assignments: ComponentAssignments): GradeComponent | '' {
  if (Object.hasOwn(assignments, task.assessment_id)) return assignments[task.assessment_id];
  return ['ACTIVITY', 'QUIZ', 'EXAM'].includes(task.assessment_type) ? 'portfolio' : '';
}

export function scoreIssue(task: Pick<AssessmentRow, 'max_score'>, submission: Pick<SubmissionDetail, 'status' | 'final_score'>): string | null {
  if (!Number.isFinite(task.max_score) || task.max_score <= 0) return 'Maximum points must be greater than zero.';
  if (submission.status === 'GRADED' && (!Number.isFinite(submission.final_score) || submission.final_score < 0 || submission.final_score > task.max_score)) {
    return 'Graded score is outside the allowed points.';
  }
  return null;
}

// Keep each teacher, program, subject, and account in its own calculation scope.
export function groupGradeRecords(records: TeacherSubmission[]): GradeGroup[] {
  const groups = new Map<string, GradeGroup>();
  for (const record of records) {
    const { task, submission } = record;
    const accountId = submission.account_id?.trim() || '';
    const program = task.target_category || submission.student_category || '';
    const key = JSON.stringify([task.teacher_id, program, task.subject_code, accountId || `unmatched:${submission.submission_id}`]);
    let group = groups.get(key);
    if (!group) {
      group = { key, accountId, name: submission.student_name || accountId || 'Unmatched learner', teacherId: task.teacher_id,
        subjectCode: task.subject_code, program, records: [] };
      groups.set(key, group);
    }
    group.records.push(record);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name) || a.subjectCode.localeCompare(b.subjectCode));
}

export function calculateGrade(records: TeacherSubmission[], weights: GradeWeights, assignments: ComponentAssignments, sourceIncomplete = false) {
  const totals = Object.fromEntries(GRADE_COMPONENTS.map(({ key }) => [key, {
    earned: 0, possible: 0, percentage: null, contribution: null, count: 0, pending: 0,
  }])) as Record<GradeComponent, ComponentTotal>;
  const reasons: string[] = [];
  const weightError = validateWeights(weights);
  if (weightError) reasons.push(weightError);
  if (sourceIncomplete) reasons.push('Some assessment records could not be loaded.');
  const seen = new Set<string>();
  for (const { task, submission } of records) {
    if (task.status === 'DRAFT') continue;
    if (seen.has(submission.submission_id)) {
      reasons.push('Duplicate submission records need review.');
      continue;
    }
    seen.add(submission.submission_id);
    if (!submission.account_id) reasons.push('A learner identifier is missing.');
    if (submission.student_category && task.target_category && submission.student_category !== task.target_category) reasons.push('A learner program does not match its assessment.');
    const component = assessmentComponent(task, assignments);
    if (!component) { reasons.push('An assessment needs a component assignment.'); continue; }
    const total = totals[component];
    total.count++;
    const issue = scoreIssue(task, submission);
    if (issue) { reasons.push(issue); continue; }
    if (submission.status !== 'GRADED') {
      total.pending++;
      if (weights[component] > 0) reasons.push('Some scores are still awaiting review.');
      continue;
    }
    total.earned += submission.final_score;
    total.possible += task.max_score;
  }
  for (const { key, shortLabel } of GRADE_COMPONENTS) {
    const total = totals[key];
    if (total.possible > 0) total.percentage = total.earned / total.possible * 100;
    if (weights[key] === 0) total.contribution = 0;
    else if (total.percentage !== null && !total.pending) total.contribution = total.percentage * weights[key] / 100;
    if (weights[key] > 0 && total.possible === 0) reasons.push(`${shortLabel} scores are missing.`);
  }
  const uniqueReasons = [...new Set(reasons)];
  const final = uniqueReasons.length ? null : GRADE_COMPONENTS.reduce((sum, { key }) => sum + (totals[key].contribution || 0), 0);
  return { totals, final, reasons: uniqueReasons };
}

export function reviewGradeRecords(records: TeacherSubmission[]): GradeIssue[] {
  const issues: GradeIssue[] = [];
  const seen = new Set<string>();
  for (const { task, submission } of records) {
    const prefix = `${submission.student_name || submission.account_id || 'Unmatched learner'} · ${task.title}`;
    const add = (code: string, message: string) => issues.push({ key: `${task.assessment_id}:${submission.submission_id}:${code}`, message: `${prefix}: ${message}`, assessmentId: task.assessment_id, submissionId: submission.submission_id });
    if (seen.has(submission.submission_id)) add('duplicate', 'duplicate submission identifier.');
    seen.add(submission.submission_id);
    if (!submission.account_id) add('identity', 'learner identifier unavailable.');
    if (submission.student_category && task.target_category && submission.student_category !== task.target_category) add('program', 'learner program does not match this assessment.');
    const issue = scoreIssue(task, submission);
    if (issue) add('score', issue);
    if (submission.status === 'SUBMITTED') add('pending', 'awaiting teacher review.');
  }
  return issues;
}
