import { getCurrentUser, normalizeUserRole, type UserRead } from './auth-api';
import { listAssessmentRecords, listAssessmentSubmissions, type AssessmentRow, type TeacherSubmission } from './assessments-api';
import { type SubjectRecord } from './subjects-api';
import { fetchStudentsFromApi, type Student } from './students-api';
import { taskInGradebook, type GradebookScope } from './gradebook-view';
import type { GradeIssue } from './grading';

export interface GradebookData {
  tasks: AssessmentRow[];
  records: TeacherSubmission[];
  subjects: SubjectRecord[];
  students: Student[];
  teachers: Record<string, string>;
  issues: GradeIssue[];
  warnings: string[];
  failedAssessmentIds: string[];
  loadedAt: string;
}

export async function verifyGradebookSession(expected: UserRead, role: 'teacher') {
  const current = await getCurrentUser(true, true);
  if (!expected.user_id || !current || current.user_id !== expected.user_id || role !== 'teacher' || normalizeUserRole(current) !== 'teacher') {
    throw new Error('Your account changed. Reload this page before viewing or saving grades.');
  }
}

export async function loadGradebook(user: UserRead, role: 'teacher', scope: GradebookScope): Promise<GradebookData> {
  await verifyGradebookSession(user, role);
  const [taskResult, studentsResult] = await Promise.allSettled([
    listAssessmentRecords(), fetchStudentsFromApi(),
  ]);
  if (taskResult.status === 'rejected') throw taskResult.reason;
  if (studentsResult.status === 'rejected') throw new Error('The learner roster could not be loaded. Refresh to show all learners, including those without submissions.');
  const warnings: string[] = [];
  const issues: GradeIssue[] = [];
  const tasks: AssessmentRow[] = [];
  const seen = new Set<string>();
  for (const task of taskResult.value) {
    if (!taskInGradebook(task, scope, user.user_id!)) continue;
    if (seen.has(task.assessment_id)) {
      issues.push({ key: `duplicate-task:${task.assessment_id}`, assessmentId: task.assessment_id, message: `${task.title}: duplicate assessment identifier; only one copy is displayed.` });
      continue;
    }
    seen.add(task.assessment_id);
    tasks.push(task);
  }
  const teachers: Record<string, string> = { [user.user_id!]: user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.account_id || user.user_id! };
  const students = studentsResult.value;
  const accounts = new Map(students.filter(student => student.account_id).map(student => [student.account_id, student]));
  const records: TeacherSubmission[] = [];
  const failedAssessmentIds: string[] = [];
  const submissionSources = new Map<string, string>();
  for (let offset = 0; offset < tasks.length; offset += 6) {
    const batch = tasks.slice(offset, offset + 6);
    const results = await Promise.allSettled(batch.map(task => listAssessmentSubmissions(task.assessment_id)));
    for (let index = 0; index < batch.length; index++) {
      const task = batch[index];
      const result = results[index];
      if (result.status === 'rejected' || !Array.isArray(result.value)) {
        failedAssessmentIds.push(task.assessment_id);
        issues.push({ key: `failed:${task.assessment_id}`, assessmentId: task.assessment_id, message: `${task.title}: submissions could not be loaded. Refresh to retry.` });
        continue;
      }
      for (const submission of result.value) {
        if (!submission.submission_id || submission.assessment_id !== task.assessment_id) {
          failedAssessmentIds.push(task.assessment_id);
          issues.push({ key: `mismatch:${task.assessment_id}`, assessmentId: task.assessment_id, message: `${task.title}: a submission did not match its assessment and was excluded.` });
          continue;
        }
        const student = submission.account_id ? accounts.get(submission.account_id) : undefined;
        const previousSource = submissionSources.get(submission.submission_id);
        if (previousSource) {
          for (const assessmentId of new Set([previousSource, task.assessment_id])) issues.push({
            key: `duplicate-submission:${assessmentId}:${submission.submission_id}`, assessmentId, submissionId: submission.submission_id,
            message: `${task.title}: a submission identifier appears more than once. Learner identity and scores need review.`,
          });
        } else submissionSources.set(submission.submission_id, task.assessment_id);
        if (studentsResult.status === 'fulfilled' && !student) issues.push({ key: `learner:${submission.submission_id}`, assessmentId: task.assessment_id, submissionId: submission.submission_id, message: `${task.title}: learner ${submission.account_id || 'identifier unavailable'} was not found in the learner directory.` });
        records.push({ task, submission: { ...submission, student_name: submission.student_name || (student ? [student.first_name, student.last_name].filter(Boolean).join(' ') : null) } });
      }
    }
  }
  await verifyGradebookSession(user, role);
  return { tasks, records, subjects: scope.subjects, students, teachers, issues, warnings,
    failedAssessmentIds: [...new Set(failedAssessmentIds)], loadedAt: new Date().toISOString() };
}
