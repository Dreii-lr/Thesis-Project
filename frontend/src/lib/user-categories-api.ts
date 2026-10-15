// frontend/src/lib/user-categories-api.ts
import { authenticatedFetch, authenticatedRequest } from './auth-api';
import type { SubjectRecord } from './subjects-api';

export interface UserCategorySubject {
  subject_id: string;
  category_id: string;
  code?: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface UserCategoryItem {
  category_id: string;
  code: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
  subjects?: UserCategorySubject[];
}

export type UserCategoryRecord = UserCategoryItem;

export interface UserCategoryDetails extends UserCategoryRecord {
  subjects: SubjectRecord[];
}

interface ListCategoriesResponse {
  categories: UserCategoryRecord[];
  total: number;
  offset: number;
  limit: number;
}

export const DEFAULT_USER_CATEGORIES: UserCategoryItem[] = [
  {
    category_id: '0d615797-1cb6-492b-816e-4406cff865ce',
    code: 'ELEMENTARY',
    name: 'Elementary',
    description: 'DepEd ALS Elementary Level',
    created_at: new Date().toISOString(),
    subjects: [],
  },
  {
    category_id: '93ab0649-9a90-4055-839a-a1e0c253da58',
    code: 'SECONDARY',
    name: 'Secondary',
    description: 'DepEd ALS Secondary Level',
    created_at: new Date().toISOString(),
    subjects: [],
  },
  {
    category_id: '7b48f930-4b98-41e0-bfe4-a9313dfc61f1',
    code: 'BLP',
    name: 'Basic Literacy Program',
    description: 'DepEd ALS Basic Literacy Program',
    created_at: new Date().toISOString(),
    subjects: [],
  },
];

/**
 * Fetches all user categories from the backend API.
 * Includes nested subjects and provides graceful fallback to default ALS categories.
 */
export async function getUserCategories(): Promise<UserCategoryItem[]> {
  try {
    const response = await authenticatedFetch('/user-categories/');
    if (!response.ok) {
      // Fallback attempt via public route rewrite
      const publicRes = await fetch('/api/v1/user-categories/');
      if (publicRes.ok) {
        const body = await publicRes.json();
        const categories = body?.data?.resources?.categories;
        if (Array.isArray(categories) && categories.length > 0) {
          return categories;
        }
      }
      return DEFAULT_USER_CATEGORIES;
    }

    const body = await response.json();
    const categories = body?.data?.resources?.categories;
    if (Array.isArray(categories) && categories.length > 0) {
      return categories;
    }
    return DEFAULT_USER_CATEGORIES;
  } catch (err) {
    console.warn('Failed to fetch user categories from API, using defaults:', err);
    return DEFAULT_USER_CATEGORIES;
  }
}

/**
 * Lists all user categories with pagination support.
 */
export async function listUserCategories(): Promise<UserCategoryRecord[]> {
  const categories: UserCategoryRecord[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await authenticatedRequest<ListCategoriesResponse>(`/user-categories/?offset=${offset}&limit=500`);
    categories.push(...result.categories);
    if (categories.length >= result.total) return categories;
    if (!result.categories.length) throw new Error('Learning programs changed while loading. Please refresh.');
  }
}

export interface UserCategoryCreatePayload {
  code: string;
  name: string;
  description?: string;
}

export function createUserCategory(payload: UserCategoryCreatePayload): Promise<UserCategoryRecord> {
  return authenticatedRequest<UserCategoryRecord>('/user-categories/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      description: payload.description?.trim() || '',
    }),
  });
}

/**
 * Fetches details for a single category including its subjects.
 */
export function getUserCategory(id: string): Promise<UserCategoryDetails> {
  return authenticatedRequest<UserCategoryDetails>(`/user-categories/${encodeURIComponent(id)}`);
}

/**
 * Fetches a single category with its nested subjects by ID or code.
 */
export async function getUserCategoryById(
  idOrCode: string
): Promise<UserCategoryItem | null> {
  try {
    const response = await authenticatedFetch(`/user-categories/${encodeURIComponent(idOrCode)}`);
    if (!response.ok) return null;
    const body = await response.json();
    return body?.data?.resources || null;
  } catch {
    return null;
  }
}
