// frontend/src/lib/requirements-api.ts
import { authenticatedFetch, authenticatedRequest } from './auth-api';

export interface RequirementItem {
  requirement_id: string;
  id: string;
  code: string;
  title: string;
  description?: string | null;
  guidance?: string | null;
  accepted_document_types: string[];
  types: string[];
  is_required: boolean;
  is_conditional: boolean;
  conditional: boolean;
  allow_assistance: boolean;
  max_file_size_mb: number;
  allowed_extensions: string[];
  sample_document_url?: string | null;
  order_index: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string | null;
}

export interface RequirementCreatePayload {
  code: string;
  title: string;
  description?: string;
  guidance?: string;
  accepted_document_types?: string[];
  allowed_extensions?: string[];
  is_required?: boolean;
  is_conditional?: boolean;
  allow_assistance?: boolean;
  max_file_size_mb?: number;
  sample_document_url?: string;
  order_index?: number;
  is_active?: boolean;
}

export interface RequirementUpdatePayload {
  code?: string;
  title?: string;
  description?: string;
  guidance?: string;
  accepted_document_types?: string[];
  allowed_extensions?: string[];
  is_required?: boolean;
  is_conditional?: boolean;
  allow_assistance?: boolean;
  max_file_size_mb?: number;
  sample_document_url?: string;
  order_index?: number;
  is_active?: boolean;
}

export interface RequirementStats {
  total_requirements: number;
  active_requirements: number;
  inactive_requirements: number;
  mandatory_requirements: number;
  conditional_requirements: number;
  assistance_allowed_requirements: number;
}

interface ListRequirementsResponse {
  requirements: RequirementItem[];
  total: number;
  offset: number;
  limit: number;
}

export const DEFAULT_REQUIREMENTS: RequirementItem[] = [
  {
    requirement_id: 'default-rpl',
    id: 'rpl',
    code: 'rpl',
    title: 'RPL (Recognition of Prior Learning)',
    description: 'Documentation of prior learning, life experience, and informal training (ALS RPL Forms 1-4).',
    accepted_document_types: [
      'RPL Form 1 (Life Experiences)',
      'RPL Form 2 (Record of Training/Skills)',
      'RPL Form 3 (Summary of Work History)',
      'RPL Form 4 (Competency Assessment)',
      'Alternative RPL Documentation',
    ],
    types: [
      'RPL Form 1 (Life Experiences)',
      'RPL Form 2 (Record of Training/Skills)',
      'RPL Form 3 (Summary of Work History)',
      'RPL Form 4 (Competency Assessment)',
      'Alternative RPL Documentation',
    ],
    guidance: 'Upload completed RPL assessments: Form 1 (Life Experiences), Form 2 (Skills & Training), Form 3 (Work History), or Form 4 (Assessment of Knowledge/Competencies).',
    is_required: true,
    is_conditional: false,
    conditional: false,
    allow_assistance: true,
    max_file_size_mb: 10,
    allowed_extensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
    order_index: 1,
    is_active: true,
  },
  {
    requirement_id: 'default-af1',
    id: 'af1',
    code: 'af1',
    title: 'AF1 (ALS Form 1 - Learner Profile)',
    description: 'Official DepEd ALS Form 1 containing the learner profile, basic demographics, and enrollment information.',
    accepted_document_types: [
      'ALS Form 1 (Learner Profile)',
      'DepEd Enrollment Intake Sheet',
    ],
    types: [
      'ALS Form 1 (Learner Profile)',
      'DepEd Enrollment Intake Sheet',
    ],
    guidance: 'Submit a signed and completed ALS Form 1 (Learner Profile). Ensure personal data matches your official identity records.',
    is_required: true,
    is_conditional: false,
    conditional: false,
    allow_assistance: false,
    max_file_size_mb: 10,
    allowed_extensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
    order_index: 2,
    is_active: true,
  },
  {
    requirement_id: 'default-af2',
    id: 'af2',
    code: 'af2',
    title: 'AF2 (ALS Form 2 - Learner\'s Record)',
    description: 'DepEd ALS Form 2 Assessment of Basic Literacy Sheet / Learner\'s Continuing Record.',
    accepted_document_types: [
      'ALS Form 2 (Learner\'s Record)',
      'Assessment of Basic Literacy Sheet',
    ],
    types: [
      'ALS Form 2 (Learner\'s Record)',
      'Assessment of Basic Literacy Sheet',
    ],
    guidance: 'Submit the official ALS Form 2 documenting your literacy level, learning modules, or assessment history.',
    is_required: true,
    is_conditional: false,
    conditional: false,
    allow_assistance: false,
    max_file_size_mb: 10,
    allowed_extensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
    order_index: 3,
    is_active: true,
  },
  {
    requirement_id: 'default-flt',
    id: 'flt',
    code: 'flt',
    title: 'FLT (Functional Literacy Test)',
    description: 'DepEd Functional Literacy Test (FLT) pre-assessment sheet or diagnostic test results.',
    accepted_document_types: [
      'FLT Pre-Test Answer Sheet',
      'FLT Score Summary Sheet',
      'FLT Assessment Result',
    ],
    types: [
      'FLT Pre-Test Answer Sheet',
      'FLT Score Summary Sheet',
      'FLT Assessment Result',
    ],
    guidance: 'Submit the verified FLT pre-test answer sheet or score assessment sheet signed by your ALS teacher / facilitator.',
    is_required: true,
    is_conditional: false,
    conditional: false,
    allow_assistance: true,
    max_file_size_mb: 10,
    allowed_extensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
    order_index: 4,
    is_active: true,
  },
  {
    requirement_id: 'default-psa-police',
    id: 'psa_police_clearance',
    code: 'psa_police_clearance',
    title: 'PSA / Police Clearance',
    description: 'Valid civil status or identity verification: PSA Birth Certificate or official Police / NBI / Barangay Clearance.',
    accepted_document_types: [
      'PSA Birth Certificate',
      'Police Clearance',
      'NBI Clearance',
      'Local Civil Registrar (LCR) Birth Certificate',
      'Barangay Clearance',
    ],
    types: [
      'PSA Birth Certificate',
      'Police Clearance',
      'NBI Clearance',
      'Local Civil Registrar (LCR) Birth Certificate',
      'Barangay Clearance',
    ],
    guidance: 'Upload a clear copy of your PSA Birth Certificate. If a birth certificate is unavailable, a valid Police Clearance or Barangay Clearance is accepted.',
    is_required: true,
    is_conditional: false,
    conditional: false,
    allow_assistance: false,
    max_file_size_mb: 10,
    allowed_extensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
    order_index: 5,
    is_active: true,
  },
  {
    requirement_id: 'default-proof-of-education',
    id: 'proof_of_education',
    code: 'proof_of_education',
    title: 'Proof of Education - Old ID / Old Card',
    description: 'Proof of previous educational attainment: previous School ID, Report Card (Form 138), or Permanent Record (Form 137).',
    accepted_document_types: [
      'Form 138 / Report Card',
      'Form 137 / Permanent Record',
      'Old School ID',
      'Certificate of Non-Completion',
      'Alternative proof for staff review',
    ],
    types: [
      'Form 138 / Report Card',
      'Form 137 / Permanent Record',
      'Old School ID',
      'Certificate of Non-Completion',
      'Alternative proof for staff review',
    ],
    guidance: 'Upload your last report card (Form 138), transcript/permanent record (Form 137), or old school ID. If unavailable, request teacher assistance for alternative validation or exemption.',
    is_required: true,
    is_conditional: true,
    conditional: true,
    allow_assistance: true,
    max_file_size_mb: 10,
    allowed_extensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
    order_index: 6,
    is_active: true,
  },
];

/**
 * Publicly fetches all active requirements from the master catalog.
 * Does not require cookies or authorization headers.
 * Falls back to DEFAULT_REQUIREMENTS if backend is unreachable.
 */
export async function getPublicRequirements(includeInactive = false): Promise<RequirementItem[]> {
  try {
    const query = includeInactive ? '?include_inactive=true' : '';
    // Use authenticatedFetch if available to forward admin credentials when requesting inactive items
    const res = await authenticatedFetch(`/requirements${query}`).catch(() => null);

    if (res && res.ok) {
      const body = await res.json();
      const requirements = body?.data?.resources?.requirements;
      if (Array.isArray(requirements) && requirements.length > 0) {
        return requirements;
      }
    }

    // Public unauthenticated fallback
    const publicRes = await fetch(`/api/v1/requirements${query}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (publicRes.ok) {
      const body = await publicRes.json();
      const requirements = body?.data?.resources?.requirements;
      if (Array.isArray(requirements) && requirements.length > 0) {
        return requirements;
      }
    }

    return DEFAULT_REQUIREMENTS;
  } catch (err) {
    console.warn('Failed to fetch requirements from backend API, using defaults:', err);
    return DEFAULT_REQUIREMENTS;
  }
}

/**
 * Publicly fetch default active requirements from the master catalog directly from the database.
 */
export async function getDefaultRequirements(): Promise<RequirementItem[]> {
  try {
    const authRes = await authenticatedFetch('/requirements/defaults').catch(() => null);
    if (authRes && authRes.ok) {
      const body = await authRes.json();
      const requirements = body?.data?.resources?.requirements;
      if (Array.isArray(requirements) && requirements.length > 0) {
        return requirements;
      }
    }

    const res = await fetch('/api/v1/requirements/defaults', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    }).catch(() => null);
    if (res && res.ok) {
      const body = await res.json();
      const requirements = body?.data?.resources?.requirements;
      if (Array.isArray(requirements) && requirements.length > 0) {
        return requirements;
      }
    }
    return DEFAULT_REQUIREMENTS;
  } catch (err) {
    console.warn('Failed to fetch default requirements from backend API:', err);
    return DEFAULT_REQUIREMENTS;
  }
}

/**
 * Publicly fetch a single requirement definition by its UUID or unique slug/code.
 */
export async function getRequirementByIdOrCode(idOrCode: string): Promise<RequirementItem | null> {
  try {
    const res = await fetch(`/api/v1/requirements/${encodeURIComponent(idOrCode)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.data?.resources || null;
  } catch {
    return null;
  }
}

/**
 * Admin: List requirements directly from the backend API.
 * Never falls back to mock data — returns the actual database list.
 */
export async function adminListRequirements(includeInactive = true): Promise<RequirementItem[]> {
  const query = includeInactive ? '?include_inactive=true' : '';
  const res = await authenticatedRequest<ListRequirementsResponse>(`/requirements${query}`);
  return res?.requirements ?? [];
}

/**
 * Admin: Create a new requirement in the master catalog.
 */
export async function adminCreateRequirement(payload: RequirementCreatePayload): Promise<RequirementItem> {
  return authenticatedRequest<RequirementItem>('/requirements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Admin: Update existing requirement fields.
 */
export async function adminUpdateRequirement(id: string, payload: RequirementUpdatePayload): Promise<RequirementItem> {
  return authenticatedRequest<RequirementItem>(`/requirements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Admin: Delete or archive a requirement.
 */
export async function adminDeleteRequirement(id: string, permanent = false): Promise<void> {
  const query = permanent ? '?permanent=true' : '';
  await authenticatedRequest<void>(
    `/requirements/${id}${query}`,
    { method: 'DELETE' },
    false
  );
}

/**
 * Admin: Toggle requirement between active and inactive.
 */
export async function adminToggleRequirementStatus(id: string): Promise<RequirementItem> {
  return authenticatedRequest<RequirementItem>(`/requirements/${id}/toggle-status`, {
    method: 'PATCH',
  });
}

/**
 * Admin: Bulk reorder requirements sequence.
 */
export async function adminReorderRequirements(items: { requirement_id: string; order_index: number }[]): Promise<void> {
  await authenticatedRequest<void>(
    '/requirements/reorder',
    {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    },
    false
  );
}

/**
 * Admin: Synchronize and verify standard DepEd ALS master requirements in the database.
 */
export async function adminSeedDefaultRequirements(): Promise<{ active_count?: number; created_count?: number }> {
  return authenticatedRequest<{ active_count?: number; created_count?: number }>('/requirements/seed-defaults', {
    method: 'POST',
  });
}

/**
 * Admin / Teacher: Get overview statistics.
 */
export async function adminGetRequirementStats(): Promise<RequirementStats> {
  return authenticatedRequest<RequirementStats>('/requirements/admin/stats');
}
