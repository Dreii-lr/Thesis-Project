import { authenticatedRequest } from './auth-api';

export interface SubjectRecord {
  subject_id: string;
  category_id: string;
  code?: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
  category_name?: string | null;
  category_code?: string | null;
}
interface ListSubjectsResponse {
  subjects: SubjectRecord[];
  total: number;
  offset: number;
  limit: number;
}
export async function listSubjects(categoryId?: string): Promise<SubjectRecord[]> {
  const subjects: SubjectRecord[] = [];
  const query = categoryId ? `&category_id=${encodeURIComponent(categoryId)}` : '';
  for (let offset = 0; ; offset += 500) {
    const result = await authenticatedRequest<ListSubjectsResponse>(`/subjects/?offset=${offset}&limit=500${query}`);
    subjects.push(...result.subjects);
    if (subjects.length >= result.total) return subjects;
    if (!result.subjects.length) throw new Error('Subjects changed while loading. Please refresh.');
  }
}
export function subjectName(subjects: SubjectRecord[], code: string, category?: string | null): string {
  return (
    subjects.find(
      (subject) =>
        (subject.code === code || subject.name === code || subject.subject_id === code) &&
        (!category || subject.category_code === category)
    )?.name ||
    subjects.find(
      (subject) => subject.code === code || subject.name === code || subject.subject_id === code
    )?.name ||
    code
  );
}

export interface SubjectCreatePayload {
  category_id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
}
export type SubjectUpdatePayload = Partial<SubjectCreatePayload>;

function subjectPayload(payload: SubjectUpdatePayload) {
  // Send only fields accepted by the active subject schemas.
  return {
    ...(payload.category_id !== undefined ? { category_id: payload.category_id } : {}),
    ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
    ...(payload.description !== undefined ? { description: payload.description?.trim() ?? '' } : {}),
    ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
  };
}

export function createSubject(payload: SubjectCreatePayload): Promise<SubjectRecord> {
  return authenticatedRequest<SubjectRecord>('/subjects/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subjectPayload(payload)),
  });
}

export function updateSubject(id: string, payload: SubjectUpdatePayload): Promise<SubjectRecord> {
  return authenticatedRequest<SubjectRecord>(`/subjects/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subjectPayload(payload)),
  });
}

export function deleteSubject(id: string): Promise<void> {
  return authenticatedRequest<void>(`/subjects/${encodeURIComponent(id)}`, { method: 'DELETE' }, false);
}
