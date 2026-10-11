import { authenticatedRequest } from './auth-api';
import type { SubjectRecord } from './subjects-api';

export interface UserCategoryRecord {
  category_id: string;
  code: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
}
interface ListCategoriesResponse {
  categories: UserCategoryRecord[];
  total: number;
  offset: number;
  limit: number;
}
export async function listUserCategories(): Promise<UserCategoryRecord[]> {
  const categories: UserCategoryRecord[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await authenticatedRequest<ListCategoriesResponse>(`/user-categories/?offset=${offset}&limit=500`);
    categories.push(...result.categories);
    if (categories.length >= result.total) return categories;
    if (!result.categories.length) throw new Error('Learning programs changed while loading. Please refresh.');
  }
}

export interface UserCategoryDetails extends UserCategoryRecord {
  subjects: SubjectRecord[];
}

export function getUserCategory(id: string): Promise<UserCategoryDetails> {
  return authenticatedRequest<UserCategoryDetails>(`/user-categories/${encodeURIComponent(id)}`);
}
