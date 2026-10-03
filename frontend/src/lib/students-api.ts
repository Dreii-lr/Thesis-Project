// frontend/src/lib/students-api.ts
import { authenticatedFetch } from './auth-api';

export interface PersonalDetails {
  user_id?: string | null;
  student_id?: string | null;
  gender: string;
  birth_date: string;
  nationality: string;
  civil_status: string;
  religion: string;
  place_of_birth: string;
  lrn_number: string;
}

export interface ContactDetails {
  street_building_no: string;
  municipality: string;
  province: string;
  contact_no: string;
}

export interface FamilyDetails {
  mother_name: string;
  father_name: string;
  guardian_name: string;
  guardian_relation: string;
  contact_no: string;
}

export interface Student {
  id: string;          // Primary key UUID (user_id) used for GET/PATCH /users/{user_id}
  student_id: string;  // Generated Student ID (e.g. 2026-0001) displayed in UI
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  suffix: string;
  user_category: string;
  personal_details: PersonalDetails;
  contact_details: ContactDetails;
  family_details: FamilyDetails;
  generated_password?: string;
}

export type StudentCreatePayload = Omit<
  Student,
  'id' | 'student_id' | 'generated_password'
>;

export type StudentUpdatePayload = Partial<StudentCreatePayload>;

/**
 * Formats backend UserCategory values into human-readable labels
 */
export function formatCategoryLevel(category?: string): string {
  switch ((category || '').toLowerCase()) {
    case 'elementary':
    case 'primary':
      return 'Elementary';
    case 'secondary':
      return 'Secondary (High School)';
    case 'junior':
      return 'Junior High School';
    case 'senior':
      return 'Senior High School';
    default:
      return category || 'N/A';
  }
}

async function extractApiError(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const body = await response.json();
    // FastAPI 422 Pydantic validation array
    if (Array.isArray(body?.detail)) {
      const first = body.detail[0];
      const field = first?.loc?.slice(1)?.join('.') || '';
      return field ? `${field}: ${first.msg}` : first?.msg || fallback;
    }
    return (
      body?.message ||
      body?.detail ||
      body?.error?.message ||
      (typeof body?.detail === 'string' ? body.detail : fallback)
    );
  } catch {
    return fallback;
  }
}

/**
 * Unwraps FastAPI SuccessfulResponseSchema:
 * { message, message_status, status_code, data: { resources: ... } }
 */
function unwrapData<T>(json: any): T {
  if (json && typeof json === 'object' && 'data' in json && json.data !== null && json.data !== undefined) {
    if (typeof json.data === 'object' && 'resources' in json.data && json.data.resources !== undefined) {
      return json.data.resources as T;
    }
    return json.data as T;
  }
  return json as T;
}

/**
 * Maps the backend UserRead response to the Student interface
 */
export function normalizeStudentRecord(raw: any): Student {
  const personal = raw?.personal_details || {};
  const contact = raw?.contact_details || {};
  const family = raw?.family_details || {};

  // Always preserve the actual UUID user_id for API operations
  const resolvedUserId = String(
    raw?.user_id ?? raw?.id ?? personal?.user_id ?? ''
  );

  // Use the backend-generated student_id for display
  const resolvedStudentId = String(
    raw?.student_id ?? personal?.student_id ?? resolvedUserId
  );

  return {
    id: resolvedUserId,
    student_id: resolvedStudentId,
    email: raw?.email ?? '',
    first_name: raw?.first_name ?? '',
    last_name: raw?.last_name ?? '',
    middle_name: raw?.middle_name ?? '',
    suffix: raw?.suffix ?? '',
    user_category: raw?.user_category ?? 'secondary',
    personal_details: {
      user_id: resolvedUserId,
      student_id: resolvedStudentId,
      gender: personal?.gender ?? '',
      birth_date: personal?.birth_date ? String(personal.birth_date).slice(0, 10) : '',
      nationality: personal?.nationality ?? 'Filipino',
      civil_status: personal?.civil_status ?? '',
      religion: personal?.religion ?? '',
      place_of_birth: personal?.place_of_birth ?? '',
      lrn_number: personal?.lrn_number ?? '',
    },
    contact_details: {
      street_building_no: contact?.street_building_no ?? '',
      municipality: contact?.municipality ?? '',
      province: contact?.province ?? '',
      contact_no: contact?.contact_no ?? '',
    },
    family_details: {
      mother_name: family?.mother_name ?? '',
      father_name: family?.father_name ?? '',
      guardian_name: family?.guardian_name ?? '',
      guardian_relation: family?.guardian_relation ?? '',
      contact_no: family?.contact_no ?? '',
    },
    generated_password: raw?.password || raw?.default_password || undefined,
  };
}

/**
 * GET /api/v1/users/ — Fetches all students from FastAPI
 */
export async function fetchStudentsFromApi(offset = 0, limit = 100): Promise<Student[]> {
  const response = await authenticatedFetch(`/users/?offset=${offset}&limit=${limit}`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      await extractApiError(response, 'Failed to fetch students from backend.')
    );
  }

  const json = await response.json();
  const unwrapped = unwrapData<any>(json);

  // Matches ListUserRead: { users: [...], total, offset, limit }
  const items = Array.isArray(unwrapped)
    ? unwrapped
    : Array.isArray(unwrapped?.users)
    ? unwrapped.users
    : Array.isArray(unwrapped?.items)
    ? unwrapped.items
    : [];

  return items.map(normalizeStudentRecord);
}

/**
 * GET /api/v1/users/{user_id} — Fetches a single student by UUID user_id
 */
export async function fetchStudentByIdFromApi(id: string): Promise<Student> {
  const response = await authenticatedFetch(
    `/users/${encodeURIComponent(id)}`,
    {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(
      await extractApiError(response, 'Failed to load student details.')
    );
  }

  const json = await response.json();
  return normalizeStudentRecord(unwrapData<any>(json));
}

/**
 * POST /api/v1/users/ — Registers a new student in FastAPI
 */
export async function createStudentInApi(
  payload: StudentCreatePayload
): Promise<Student> {
  const response = await authenticatedFetch('/users/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await extractApiError(response, 'Failed to register student.')
    );
  }

  const json = await response.json();
  const created = unwrapData<any>(json);

  return normalizeStudentRecord({
    ...payload,
    ...(created && typeof created === 'object' ? created : {}),
  });
}

/**
 * PATCH /api/v1/users/{user_id} — Updates an existing student in FastAPI
 * (Changed from PUT to PATCH to match @router.patch("/{user_id}"))
 */
export async function updateStudentInApi(
  id: string,
  payload: StudentUpdatePayload
): Promise<Student> {
  const response = await authenticatedFetch(
    `/users/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(
      await extractApiError(response, 'Failed to update student.')
    );
  }

  const json = await response.json();
  const updated = unwrapData<any>(json);

  return normalizeStudentRecord({
    ...payload,
    ...(updated && typeof updated === 'object' ? updated : {}),
    user_id: id,
  });
}
