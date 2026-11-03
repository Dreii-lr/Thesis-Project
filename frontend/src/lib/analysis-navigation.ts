import type { AssessmentRow } from './assessments-api';
import type { SubjectRecord } from './subjects-api';
import type { UserCategoryRecord } from './user-categories-api';
import { programMatches, subjectsForProgram } from './lesson-workflow';

export function analysisRoute(params: Pick<URLSearchParams, 'get'>, categories: UserCategoryRecord[], subjects: SubjectRecord[]) {
  const requestedProgram = params.get('program')?.trim() || '';
  const requestedSubject = params.get('subject')?.trim() || '';
  let category = requestedProgram ? categories.find(item => item.category_id === requestedProgram || programMatches(requestedProgram, item)) : undefined;
  const subject = requestedSubject ? subjects.find(item => item.subject_id === requestedSubject && item.is_active) : undefined;
  let error = '';
  if (requestedProgram && !category) error = 'This learning program is unavailable. Choose a program from the list.';
  else if (requestedSubject && !subject) error = 'This subject is unavailable. Choose a subject from the list.';
  else if (subject) {
    if (!category) category = categories.find(item => subjectsForProgram([subject], item).length > 0);
    if (!category || !subjectsForProgram([subject], category).length) error = 'This subject does not belong to the selected program. Choose the correct subject.';
  }
  const type = (params.get('type') || 'ALL').toUpperCase();
  if (!error && !['ALL', 'QUIZ', 'EXAM', 'TEST'].includes(type)) error = 'This assessment type is unavailable. Clear the filters and try again.';
  return {
    category, subject, error, type,
    program: category?.code || '',
    subjects: category ? subjectsForProgram(subjects, category) : subjects.filter(item => item.is_active),
  };
}

export function analysisSubjectMatches(task: Pick<AssessmentRow, 'subject_code' | 'target_category'>, subject: SubjectRecord) {
  const normalize = (value: string) => value.trim().toLowerCase();
  return (!task.target_category || !subject.category_code || task.target_category.toUpperCase() === subject.category_code.toUpperCase())
    && [subject.subject_id, subject.code, subject.name].some(value => !!value && normalize(value) === normalize(task.subject_code));
}

export function analysisHref(pathname: string, current: string, changes: Record<string, string | null>) {
  const query = new URLSearchParams(current);
  for (const [key, value] of Object.entries(changes)) {
    if (!value || value === 'ALL') query.delete(key);
    else query.set(key, key === 'program' ? value.toLowerCase() : value);
  }
  return pathname + (query.size ? '?' + query.toString() : '');
}
