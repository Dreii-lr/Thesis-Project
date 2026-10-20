import { useState, useCallback } from 'react';
import { getCurrentUser } from './auth-api';
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

export interface DocumentItem {
  id: string;
  user_id?: string | null;
  filename: string;
  file_size_bytes?: number;
  storage_provider?: string;
  storage_key?: string | null;
  storage_url?: string | null;
  storage_bucket?: string | null;
  file_hash?: string | null;
  status: string;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  materials_count?: number;
  lessons_count?: number;
  als_program?: string | null;
  learning_strand?: string | null;
}

export interface DocumentListResponse {
  items: DocumentItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GetDocumentsOptions {
  userId?: string | null;
  status?: string;
  program?: string;
  page?: number;
  pageSize?: number;
  baseUrl?: string;
  signal?: AbortSignal;
}

export interface DocumentDetailResponse extends DocumentItem {
  materials: {
    id: string;
    learner_name?: string | null;
    cls_name?: string | null;
    als_program?: string | null;
    learning_strand?: string | null;
    main_learning_goal?: string | null;
    topics_count: number;
    created_at?: string | null;
  }[];
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
 * Determines whether a backend DocumentItem belongs to the specified ALS TargetCategory.
 * Uses als_program metadata, R2 folder keys (ELEMENTARY/, BLP/, SECONDARY/), and filename patterns.
 */
export function matchDocumentToProgram(doc: DocumentItem, targetProgram: TargetCategory): boolean {
  if (doc.als_program) {
    if (normalizeProgramToCategory(doc.als_program) === targetProgram) return true;
  }
  if (doc.storage_key) {
    const folder = doc.storage_key.split('/')[0];
    if (normalizeProgramToCategory(folder) === targetProgram) return true;
  }
  const normFile = doc.filename.toLowerCase();
  if (targetProgram === 'elementary' && normFile.includes('elem')) return true;
  if (targetProgram === 'basic_literacy' && (normFile.includes('blp') || normFile.includes('basic'))) return true;
  if (targetProgram === 'junior' && (normFile.includes('junior') || normFile.includes('secondary') || normFile.includes('jhs'))) return true;
  return false;
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
  try {
    const user = await getCurrentUser();
    if (user?.user_id) return String(user.user_id);
    if (user?.id) return String(user.id);
  } catch {
    // Unauthenticated or network error; proceed without header
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
 * Retrieves all ingested documents from the document-processing backend, optionally filtered by ALS program.
 * Route: GET /document-processor/documents/
 */
export async function getModuleDocuments(
  options: GetDocumentsOptions = {}
): Promise<DocumentListResponse> {
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const params = new URLSearchParams();
  if (options.userId) params.set('user_id', options.userId);
  if (options.status) params.set('status', options.status);
  if (options.program) params.set('program', options.program);
  if (options.page) params.set('page', String(options.page));
  if (options.pageSize) params.set('page_size', String(options.pageSize));

  const queryString = params.toString();
  const targetUrl = `${baseUrl}/document-processor/documents/${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(extractErrorMessage(body, response.status));
  }

  return body as DocumentListResponse;
}

/**
 * Retrieves a single document along with its child material summaries.
 * Route: GET /document-processor/documents/{document_id}
 */
export async function getModuleDocumentById(
  documentId: string,
  options: { baseUrl?: string; signal?: AbortSignal } = {}
): Promise<DocumentDetailResponse> {
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const targetUrl = `${baseUrl}/document-processor/documents/${encodeURIComponent(documentId)}`;

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(extractErrorMessage(body, response.status));
  }

  return body as DocumentDetailResponse;
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

export interface MaterialTopic {
  main_topic: string;
  sub_topics?: string[];
  recognize_competencies?: boolean | null;
  delivery_mode?: string | null;
  duration?: string | null;
  expected_output?: string | null;
  start_date?: string | null;
  finished_date?: string | null;
  status?: string | null;
}

export interface MaterialItem {
  id: string;
  document_id: string;
  learner_name?: string | null;
  cls_name?: string | null;
  als_program?: string | null;
  learning_strand?: string | null;
  main_learning_goal?: string | null;
  status?: string | null;
  structured_records: MaterialTopic[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface GeneratedLessonItem {
  id: string;
  material_id: string;
  main_topic: string;
  module_title: string;
  lesson_title: string;
  content: {
    type: string;
    content?: any[];
    [key: string]: any;
  };
  keywords?: string[];
  sub_topics_breakdown?: Array<{
    sub_topic_title: string;
    explanation: any;
    concrete_example: any;
    sub_topic_summary?: any;
  }>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MaterialLessonsResponse {
  materials_id: string;
  learning_strand?: string | null;
  als_program?: string | null;
  main_learning_goal?: string | null;
  total_lessons: number;
  lessons: GeneratedLessonItem[];
}

export interface GeneratedLessonUpdatePayload {
  lesson_title?: string;
  main_topic?: string;
  sub_topics?: string[];
  content: any;
  sync_to_material?: boolean;
}

export interface GetMaterialsOptions {
  documentId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  baseUrl?: string;
  signal?: AbortSignal;
}

/**
 * Retrieves all curriculum materials from the document processor microservice.
 * Route: GET /document-processor/
 */
export async function getMaterials(
  options: GetMaterialsOptions = {}
): Promise<MaterialItem[]> {
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const params = new URLSearchParams();
  if (options.documentId) params.set('document_id', options.documentId);
  if (options.status) params.set('status', options.status);
  if (options.page) params.set('page', String(options.page));
  if (options.pageSize) params.set('page_size', String(options.pageSize));

  const queryString = params.toString();
  const targetUrl = `${baseUrl}/document-processor/${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(extractErrorMessage(body, response.status));
  }

  return (Array.isArray(body) ? body : []) as MaterialItem[];
}

/**
 * Retrieves a single material with its structured main topics and subtopics.
 * Route: GET /document-processor/materials/{material_id}
 */
export async function getMaterialById(
  materialId: string,
  options: { baseUrl?: string; signal?: AbortSignal } = {}
): Promise<MaterialItem> {
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const targetUrl = `${baseUrl}/document-processor/materials/${encodeURIComponent(materialId)}`;

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(extractErrorMessage(body, response.status));
  }

  return body as MaterialItem;
}

/**
 * Updates the publication status ('DRAFT', 'PUBLISHED', 'ARCHIVED') of a curriculum material.
 * Route: PATCH /document-processor/materials/{material_id}/status
 */
export async function updateMaterialStatus(
  materialId: string,
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string,
  options: { baseUrl?: string; signal?: AbortSignal } = {}
): Promise<MaterialItem> {
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const targetUrl = `${baseUrl}/document-processor/materials/${encodeURIComponent(materialId)}/status`;

  const response = await fetch(targetUrl, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
    signal: options.signal,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(extractErrorMessage(body, response.status));
  }

  return body as MaterialItem;
}

/**
 * Normalizes a raw material status string from database or API into a strict status union.
 * Safely handles null, undefined, 'None', 'null', empty strings, or case differences,
 * guaranteeing existing un-published records default safely to 'DRAFT'.
 */
export function normalizeMaterialStatus(
  status?: string | null
): 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' {
  if (!status || typeof status !== 'string') return 'DRAFT';
  const clean = status.trim().toUpperCase();
  if (clean === 'PUBLISHED') return 'PUBLISHED';
  if (clean === 'ARCHIVED') return 'ARCHIVED';
  return 'DRAFT';
}

/**
 * Matches a material item to a category by program code, name, learning strand, or subjects.
 */
export function matchMaterialToCategory(
  mat?: MaterialItem | null,
  cat?: { code?: string; name?: string; subjects?: { name: string }[] } | null
): boolean {
  if (!mat || !cat) return false;
  const code = (cat.code || "").toUpperCase();
  const name = (cat.name || "").toLowerCase();

  if (mat.als_program) {
    const p = mat.als_program.toUpperCase();
    if (p === code || p.includes(code)) return true;
    if (
      code === "SECONDARY" &&
      (p.includes("JUNIOR") || p.includes("JHS") || p.includes("SEC"))
    )
      return true;
    if (code === "BLP" && (p.includes("BLP") || p.includes("BASIC")))
      return true;
    if (code === "ELEMENTARY" && p.includes("ELEM")) return true;
  }

  const strand = (mat.learning_strand || "").toLowerCase();
  const goal = (mat.main_learning_goal || "").toLowerCase();

  if (code === "ELEMENTARY" && (strand.includes("elem") || goal.includes("elem")))
    return true;
  if (
    code === "BLP" &&
    (strand.includes("blp") ||
      strand.includes("basic") ||
      goal.includes("blp") ||
      goal.includes("basic"))
  )
    return true;
  if (
    code === "SECONDARY" &&
    (strand.includes("junior") ||
      strand.includes("secondary") ||
      strand.includes("jhs") ||
      strand.includes("sec") ||
      goal.includes("junior") ||
      goal.includes("secondary"))
  )
    return true;

  if (name && (strand.includes(name) || goal.includes(name))) return true;

  if (cat.subjects && cat.subjects.length > 0) {
    const matchesSubject = cat.subjects.some((sub) => {
      const subName = sub.name.toLowerCase();
      return strand.includes(subName) || goal.includes(subName);
    });
    if (matchesSubject) return true;
  }

  return false;
}

/**
 * Determines whether a MaterialItem corresponds to a specific Subject.
 * Matches by exact or partial name/code, DepEd ALS strand indicators (LS1-LS6),
 * and standard curriculum topic keywords.
 */
export function matchMaterialToSubject(
  mat?: MaterialItem | null,
  subject?: { name?: string; code?: string; subject_id?: string } | null,
): boolean {
  if (!mat || !subject) return false;
  const sName = (subject.name || '').toLowerCase().trim();
  const sCode = (subject.code || '').toLowerCase().trim();
  const strand = (mat.learning_strand || '').toLowerCase().trim();
  const goal = (mat.main_learning_goal || '').toLowerCase().trim();
  const cls = (mat.cls_name || '').toLowerCase().trim();

  // 1. Direct substring matching
  if (sName && (strand.includes(sName) || goal.includes(sName) || cls.includes(sName))) return true;
  if (sCode && (strand.includes(sCode) || goal.includes(sCode) || cls.includes(sCode))) return true;

  // 2. DepEd ALS Strand Number matching (LS1, LS2, LS3, LS4, LS5, LS6)
  const sLsMatch = sName.match(/ls\s*([1-6])/i) || sCode.match(/ls\s*([1-6])/i);
  if (sLsMatch) {
    const lsNum = sLsMatch[1];
    const mLsMatch = strand.match(/ls\s*([1-6])/i) || goal.match(/ls\s*([1-6])/i) || cls.match(/ls\s*([1-6])/i);
    if (mLsMatch && mLsMatch[1] === lsNum) return true;
  }

  // 3. Domain keyword fallbacks
  if (sName.includes('filipino') || sName.includes('tagalog')) {
    if (strand.includes('filipino') || goal.includes('filipino') || strand.includes('ls1') || goal.includes('ls1') || cls.includes('filipino')) return true;
  }
  if (sName.includes('english')) {
    if (strand.includes('english') || goal.includes('english') || strand.includes('ls1') || goal.includes('ls1')) return true;
  }
  if (sName.includes('math') || sName.includes('problem solving') || sName.includes('arithmetic')) {
    if (strand.includes('math') || strand.includes('ls3') || goal.includes('math') || goal.includes('fraction') || goal.includes('number')) return true;
  }
  if (sName.includes('scien') || sName.includes('critical thinking')) {
    if (strand.includes('scien') || strand.includes('ls2') || goal.includes('scien') || goal.includes('plant') || goal.includes('ecosystem')) return true;
  }
  if (sName.includes('comm') || sName.includes('reading') || sName.includes('writing')) {
    if (strand.includes('comm') || strand.includes('ls1') || goal.includes('comm') || goal.includes('reading')) return true;
  }
  if (sName.includes('digit') || sName.includes('computer') || sName.includes('ict') || sName.includes('technology')) {
    if (strand.includes('digit') || strand.includes('ls6') || goal.includes('digit') || goal.includes('computer') || goal.includes('online')) return true;
  }
  if (sName.includes('life') || sName.includes('career') || sName.includes('employ')) {
    if (strand.includes('life') || strand.includes('career') || strand.includes('ls4')) return true;
  }
  if (sName.includes('self') || sName.includes('society') || sName.includes('community')) {
    if (strand.includes('self') || strand.includes('society') || strand.includes('ls5')) return true;
  }
  if (sName.includes('basic') || sName.includes('literacy') || sName.includes('foundational')) {
    if (strand.includes('blp') || strand.includes('basic') || goal.includes('patinig') || goal.includes('sound')) return true;
  }

  return false;
}

/**
 * Fetches all generated TipTap lessons for a given material.
 * Attempts enhanced V2 endpoint first (which includes rich sub_topics_breakdown),
 * falling back to legacy endpoint if unavailable.
 */
export async function getLessonsByMaterial(
  materialsId: string,
  options: { baseUrl?: string; signal?: AbortSignal } = {}
): Promise<MaterialLessonsResponse> {
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const targetUrl = `${baseUrl}/document-processor/lessons/${encodeURIComponent(materialsId)}`;

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(extractErrorMessage(body, response.status));
  }

  return body as MaterialLessonsResponse;
}

/**
 * Triggers AI TipTap lesson module generation for a material.
 * Calls enhanced V2 endpoint with guaranteed subtopic expansion,
 * falling back to legacy generation if unreachable or failed.
 */
export async function generateLessonForMaterial(
  materialsId: string,
  options: { baseUrl?: string; signal?: AbortSignal; preferEnhanced?: boolean } = {}
): Promise<any> {
  const preferEnhanced = options.preferEnhanced ?? true;
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const msHost = baseUrl.replace(/\/api\/v1\/?$/, '');
  const enhancedUrl = `${msHost}/api/v2/enhanced-lesson-generation/generate-lesson/${encodeURIComponent(materialsId)}`;
  const legacyUrl = `${baseUrl}/document-processor/generate-lesson/${encodeURIComponent(materialsId)}`;

  if (preferEnhanced) {
    try {
      const response = await fetch(enhancedUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        signal: options.signal,
      });

      const body = await response.json().catch(() => null);
      if (response.ok) {
        return body;
      }
      console.warn(`Enhanced lesson generation returned ${response.status}, falling back to legacy:`, body);
    } catch (err) {
      console.warn('Enhanced lesson generation call unreachable, falling back to legacy:', err);
    }
  }

  const response = await fetch(legacyUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    signal: options.signal,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(extractErrorMessage(body, response.status));
  }

  return body;
}

/**
 * Updates a generated lesson's title and TipTap document content.
 * Attempts enhanced V2 endpoint first, falling back to legacy endpoint.
 */
export async function updateGeneratedLesson(
  lessonId: string,
  payload: GeneratedLessonUpdatePayload,
  options: { baseUrl?: string; signal?: AbortSignal; preferEnhanced?: boolean } = {}
): Promise<GeneratedLessonItem> {
  const preferEnhanced = options.preferEnhanced ?? true;
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const msHost = baseUrl.replace(/\/api\/v1\/?$/, '');
  const enhancedUrl = `${msHost}/api/v2/enhanced-lesson-generation/lessons/${encodeURIComponent(lessonId)}`;
  const legacyUrl = `${baseUrl}/document-processor/lessons/${encodeURIComponent(lessonId)}`;

  if (preferEnhanced) {
    try {
      const response = await fetch(enhancedUrl, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: options.signal,
      });

      const body = await response.json().catch(() => null);
      if (response.ok) {
        return body as GeneratedLessonItem;
      }
    } catch {
      // Fall through to legacy endpoint
    }
  }

  const response = await fetch(legacyUrl, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(extractErrorMessage(body, response.status));
  }

  return body as GeneratedLessonItem;
}
