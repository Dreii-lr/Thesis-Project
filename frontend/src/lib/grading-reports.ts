import type { TeacherSubmission } from './assessments-api';
import { assessmentComponent, GRADE_COMPONENTS, type ComponentAssignments, type GradeWeights } from './grading';

export function csvCell(value: unknown) {
  const text = String(value ?? '');
  const safe = /^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export interface GradeReportContext {
  generatedAt: string;
  filters: string;
  notices: string[];
  weights: GradeWeights | null;
  assignments: ComponentAssignments;
  teacherName: (id: string) => string;
  subjectName: (code: string, program?: string) => string;
}

export function gradeReportCsv(records: TeacherSubmission[], context: GradeReportContext) {
  const rows: unknown[][] = [
    ['Assessment score review — not an official final grade report'],
    ['Generated', context.generatedAt], ['Filters', context.filters], ['Record count', records.length],
    ['Data scope', 'Available submissions only; expected submissions unavailable.'],
    ['Preview weights', context.weights ? GRADE_COMPONENTS.map(({ key, shortLabel }) => `${shortLabel}: ${context.weights![key]}%`).join(' / ') : 'Calculation settings unavailable'],
    ...context.notices.map(notice => ['Notice', notice]), [],
    ['Teacher', 'Learner', 'Account ID', 'Program', 'Subject', 'Assessment ID', 'Assessment', 'Type', 'Preview component', 'Score', 'Maximum points', 'Status'],
  ];
  for (const { task, submission } of records) {
    const component = context.weights ? assessmentComponent(task, context.assignments) : '';
    rows.push([context.teacherName(task.teacher_id), submission.student_name || '', submission.account_id || '', task.target_category || submission.student_category || '',
      context.subjectName(task.subject_code, task.target_category || undefined), task.assessment_id, task.title, task.assessment_type,
      GRADE_COMPONENTS.find(item => item.key === component)?.shortLabel || 'Unassigned / unavailable',
      submission.status === 'GRADED' && Number.isFinite(submission.final_score) ? submission.final_score : '', task.max_score, submission.status]);
  }
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
