import { useState, useCallback } from 'react';
import { getCurrentUser } from './auth-api';
import { getDemoSession } from '../components/auth/DemoAuthGuard';
import type { WorkspaceModule, LibraryModule } from '../data/mockTeacher';
import { CATEGORY_LABELS, type TargetCategory } from '../data/mockAssessment';

/**
 * Dual-Backend Base URLs:
 * - THESIS_BACKEND_URL: Primary Thesis-Project backend (:8989 / /api/v1)
 * - DOCS_MS_URL: Document Processing microservice (:9090 / /api/v1)
 */
export const THESIS_BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/$/, '');
export const DOCS_MS_URL = (process.env.NEXT_PUBLIC_DOCS_PROCESSING_URL || 'http://localhost:9090/api/v1').replace(/\/$/, '');

export interface ModuleLesson {
  main_topic?: string | null;
  sub_topics?: string[];
  recognize_competencies?: boolean | null;
  delivery_mode?: string | null;
  duration?: string | null;
  expected_output?: string | null;
  start_date?: string | null;
  finished_date?: string | null;
  status?: string;
}

export interface StructuresProcessedLessons {
  document_id?: string | null;
  materials_id?: string | null;
  user_id?: string | null;
  filename?: string | null;
  storage_url?: string | null;
  storage_key?: string | null;
  learner_name?: string | null;
  cls_name?: string | null;
  als_program?: string | null;
  learning_strand?: string | null;
  main_learning_goal?: string | null;
  records: ModuleLesson[];
  is_existing?: boolean;
  message?: string | null;
}

export interface UploadModuleOptions {
  userId?: string | null;
  baseUrl?: string; // Allows targeting document-processing-ms (:9090) or thesis backend (:8989)
  signal?: AbortSignal;
}

export interface DocumentDeleteResponse {
  success: boolean;
  message: string;
  deleted_document_id: string;
  filename: string;
  deleted_materials_count: number;
  deleted_lessons_count: number;
  storage_cleaned: boolean;
}

export interface DeleteDocumentOptions {
  baseUrl?: string;
  deleteFromStorage?: boolean;
  signal?: AbortSignal;
}

export interface EnrichedWorkspaceModule extends WorkspaceModule {
  materials_id?: string | null;
  document_id?: string | null;
  records?: ModuleLesson[];
  main_learning_goal?: string | null;
  storage_url?: string | null;
}

/**
 * Extracts error messages from FastAPI 422 validation arrays or domain exceptions.
 */
function extractErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const detail = (body as { detail?: unknown }).detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item: { loc?: string[]; msg: string }) => `${item.loc?.slice(1).join('.') || 'field'}: ${item.msg}`)
        .join('; ');
    }
    if (typeof detail === 'string') return detail;
    const message = (body as { message?: string }).message;
    if (typeof message === 'string') return message;
  }
  return `Document processing failed with status ${status}.`;
}

/**
 * Maps the ALS Program string from the backend into the frontend's TargetCategory union type.
 */
export function normalizeProgramToCategory(program?: string | null): TargetCategory {
  const norm = (program || '').toLowerCase();
  if (norm.includes('elem')) return 'elementary';
  if (norm.includes('basic') || norm.includes('blp')) return 'basic_literacy';
  return 'junior';
}

/**
 * Maps the extracted Learning Strand to the frontend's subject code.
 */
export function matchStrandToSubjectCode(strand?: string | null, fallback = 'ALS-LS1-COMM'): string {
  const norm = (strand || '').toUpperCase();
  if (norm.includes('LS1') || norm.includes('COMMUNICATION')) return 'ALS-LS1-COMM';
  if (norm.includes('LS2') || norm.includes('SCIENTIFIC')) return 'ALS-LS2-SCI';
  if (norm.includes('LS3') || norm.includes('MATHEMATICAL')) return 'ALS-LS3-MATH';
  if (norm.includes('LS4') || norm.includes('LIFE') || norm.includes('CAREER')) return 'ALS-LS4-LIFE';
  if (norm.includes('LS5') || norm.includes('SELF') || norm.includes('SOCIETY')) return 'ALS-LS5-SELF';
  if (norm.includes('LS6') || norm.includes('DIGITAL')) return 'ALS-LS6-DIGITAL';
  if (norm.includes('BLP') || norm.includes('FOUNDATIONAL')) return 'ALS-BLP-101';
  return fallback;
}

/**
 * Adapts backend StructuresProcessedLessons into WorkspaceModule (used by TeacherContext & page).
 */
export function toWorkspaceModule(
  result: StructuresProcessedLessons,
  fallbackCategory?: TargetCategory,
  fallbackSubject?: string
): EnrichedWorkspaceModule {
  const targetCategory = fallbackCategory || normalizeProgramToCategory(result.als_program);
  const subjectCode = fallbackSubject || matchStrandToSubjectCode(result.learning_strand);

  return {
    id: result.materials_id || result.document_id || crypto.randomUUID(),
    filename: result.filename || 'Untitled Module',
    target_category: targetCategory,
    subject_code: subjectCode,
    uploaded_at: new Date().toISOString(),
    status: 'Pending',
    file_data: result.storage_url || '',
    materials_id: result.materials_id,
    document_id: result.document_id,
    records: result.records,
    main_learning_goal: result.main_learning_goal,
    storage_url: result.storage_url,
  };
}

/**
 * Adapts backend StructuresProcessedLessons into LibraryModule (used by DigitizedLibrary / PendingApprovals).
 */
export function toLibraryModule(
  result: StructuresProcessedLessons,
  fallbackLevel?: string,
  fallbackSubject?: string
): LibraryModule {
  const targetCategory = normalizeProgramToCategory(result.als_program);
  return {
    id: result.materials_id || result.document_id || crypto.randomUUID(),
    filename: result.filename || 'Untitled Module',
    subject: fallbackSubject || result.learning_strand || 'General Strand',
    level: fallbackLevel || CATEGORY_LABELS[targetCategory] || 'Junior High School',
    uploadDate: new Date().toISOString(),
    status: 'Pending',
  };
}

/**
 * Resolves the active user ID from session state or the Thesis backend.
 */
async function resolveEffectiveUserId(providedUserId?: string | null): Promise<string | undefined> {
  if (providedUserId) return providedUserId;
  const demoSession = getDemoSession();
  if (demoSession?.identity) {
    try {
      const user = await getCurrentUser();
      if (user?.user_id) return user.user_id;
    } catch {
      // Fallback to demo identity
    }
    return demoSession.identity;
  }
  return undefined;
}

/**
 * Uploads and parses a learning module file.
 * Route: POST /document-processor/parser
 * Works with both document-processing-ms (:9090) and thesis backend (:8989).
 */
export async function parseModuleDocument(
  file: File,
  options: UploadModuleOptions = {}
): Promise<StructuresProcessedLessons> {
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const targetUrl = `${baseUrl}/document-processor/parser`;

  const formData = new FormData();
  formData.append('file', file);

  const effectiveUserId = await resolveEffectiveUserId(options.userId);
  const headers: Record<string, string> = {};
  if (effectiveUserId) {
    headers['X-User-Id'] = effectiveUserId;
  }

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body: formData,
    signal: options.signal,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(extractErrorMessage(body, response.status));
  }

  return body as StructuresProcessedLessons;
}

/**
 * Deletes a document and cascades deletion across materials, lessons, and Cloudflare R2 storage.
 * Route: DELETE /document-processor/documents/{document_id}
 */
export async function deleteModuleDocument(
  documentId: string,
  options: DeleteDocumentOptions = {}
): Promise<DocumentDeleteResponse> {
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const deleteFromStorage = options.deleteFromStorage ?? true;
  const targetUrl = `${baseUrl}/document-processor/documents/${encodeURIComponent(documentId)}?delete_from_storage=${deleteFromStorage}`;

  const response = await fetch(targetUrl, {
    method: 'DELETE',
    signal: options.signal,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(extractErrorMessage(body, response.status));
  }

  return body as DocumentDeleteResponse;
}

/**
 * Custom React Hook to inject module uploading and deletion functionality into any page or component.
 */
export function useModuleUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StructuresProcessedLessons | null>(null);

  const upload = useCallback(async (file: File, options?: UploadModuleOptions) => {
    setIsUploading(true);
    setError(null);
    try {
      const data = await parseModuleDocument(file, options);
      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Module upload failed.';
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const deleteDoc = useCallback(async (documentId: string, options?: DeleteDocumentOptions) => {
    setIsDeleting(true);
    setError(null);
    try {
      const data = await deleteModuleDocument(documentId, options);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Document deletion failed.';
      setError(message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsUploading(false);
    setIsDeleting(false);
    setError(null);
    setResult(null);
  }, []);

  return {
    upload,
    deleteDoc,
    isUploading,
    isDeleting,
    error,
    result,
    reset,
  };
}
