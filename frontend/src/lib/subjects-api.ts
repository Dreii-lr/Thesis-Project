import { authenticatedRequest } from './auth-api';

export interface SubjectRecord {
  subject_id: string;
  category_id: string;
  code: string;
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
export async function listSubjects(): Promise<SubjectRecord[]> {
  const subjects: SubjectRecord[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await authenticatedRequest<ListSubjectsResponse>(`/subjects/?offset=${offset}&limit=500`);
    subjects.push(...result.subjects);
    if (subjects.length >= result.total) return subjects;
    if (!result.subjects.length) throw new Error('Subjects changed while loading. Please refresh.');
  }
}
export function subjectName(subjects: SubjectRecord[], code: string, category?: string | null): string {
  return subjects.find(subject => subject.code === code && (!category || subject.category_code === category))?.name || code;
}
