import { useState, useCallback } from "react";
import type { JSONContent } from "@tiptap/react";
import { getCurrentUser } from "./auth-api";
import type { WorkspaceModule, LibraryModule } from "../data/mockTeacher";
import { CATEGORY_LABELS, type TargetCategory } from "../data/mockAssessment";

/**
 * Dual-Backend Base URLs:
 * - THESIS_BACKEND_URL: Primary Thesis-Project backend (:8989 / /api/v1)
 * - DOCS_MS_URL: Document Processing microservice (:9090 / /api/v1)
 */
export const THESIS_BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL || "/api/v1"
).replace(/\/$/, "");
export const DOCS_MS_URL = (
  process.env.NEXT_PUBLIC_DOCS_PROCESSING_URL || "http://localhost:9090/api/v1"
).replace(/\/$/, "");

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
  timeoutMs?: number;
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
  if (body && typeof body === "object") {
    const detail = (body as { detail?: unknown }).detail;
    if (Array.isArray(detail)) {
      const messages = detail.flatMap((item: unknown) => {
        if (
          !item ||
          typeof item !== "object" ||
          !("msg" in item) ||
          typeof item.msg !== "string"
        )
          return [];
        const location =
          "loc" in item && Array.isArray(item.loc)
            ? item.loc.slice(1).join(".")
            : "field";
        return [`${location || "field"}: ${item.msg}`];
      });
      if (messages.length) return messages.join("; ");
    }
    if (typeof detail === "string") return detail;
    const message = (body as { message?: string }).message;
    if (typeof message === "string") return message;
  }
  return `Document processing failed with status ${status}.`;
}

export class DocumentServiceError extends Error {
  constructor(
    message: string,
    public status = 0,
    public outcomeUnknown = false,
  ) {
    super(message);
    this.name = "DocumentServiceError";
  }
}

// Bound both the request and response-body read. Component cleanup may cancel a
// read, but a disconnected write must be reconciled rather than called a failure.
async function requestDocumentJson(
  url: string,
  init: RequestInit,
  timeoutMs = 15000,
): Promise<{ response: Response; body: unknown }> {
  const controller = new AbortController();
  const abort = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) abort();
  else init.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    const body = await response.json().catch((error: unknown) => {
      if (controller.signal.aborted) throw error;
      return null;
    });
    return { response, body };
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new DocumentServiceError(
      controller.signal.aborted
        ? "The document service took too long to respond."
        : "The document service could not be reached. Please check your connection.",
      0,
      true,
    );
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", abort);
  }
}

/**
 * Maps the ALS Program string from the backend into the frontend's TargetCategory union type.
 */
export function normalizeProgramToCategory(
  program?: string | null,
): TargetCategory {
  const norm = (program || "").toLowerCase();
  if (norm.includes("elem")) return "elementary";
  if (norm.includes("basic") || norm.includes("blp")) return "basic_literacy";
  return "junior";
}

/**
 * Maps the extracted Learning Strand to the frontend's subject code.
 */
export function matchStrandToSubjectCode(
  strand?: string | null,
  fallback = "ALS-LS1-COMM",
): string {
  const norm = (strand || "").toUpperCase();
  if (norm.includes("LS1") || norm.includes("COMMUNICATION"))
    return "ALS-LS1-COMM";
  if (norm.includes("LS2") || norm.includes("SCIENTIFIC")) return "ALS-LS2-SCI";
  if (norm.includes("LS3") || norm.includes("MATHEMATICAL"))
    return "ALS-LS3-MATH";
  if (norm.includes("LS4") || norm.includes("LIFE") || norm.includes("CAREER"))
    return "ALS-LS4-LIFE";
  if (norm.includes("LS5") || norm.includes("SELF") || norm.includes("SOCIETY"))
    return "ALS-LS5-SELF";
  if (norm.includes("LS6") || norm.includes("DIGITAL"))
    return "ALS-LS6-DIGITAL";
  if (norm.includes("BLP") || norm.includes("FOUNDATIONAL"))
    return "ALS-BLP-101";
  return fallback;
}

/**
 * Determines whether a backend DocumentItem belongs to the specified ALS TargetCategory.
 * Uses als_program metadata, R2 folder keys (ELEMENTARY/, BLP/, SECONDARY/), and filename patterns.
 */
export function matchDocumentToProgram(
  doc: DocumentItem,
  targetProgram: TargetCategory,
): boolean {
  if (doc.als_program) {
    if (normalizeProgramToCategory(doc.als_program) === targetProgram)
      return true;
  }
  if (doc.storage_key) {
    const folder = doc.storage_key.split("/")[0];
    if (normalizeProgramToCategory(folder) === targetProgram) return true;
  }
  const normFile = doc.filename.toLowerCase();
  if (targetProgram === "elementary" && normFile.includes("elem")) return true;
  if (
    targetProgram === "basic_literacy" &&
    (normFile.includes("blp") || normFile.includes("basic"))
  )
    return true;
  if (
    targetProgram === "junior" &&
    (normFile.includes("junior") ||
      normFile.includes("secondary") ||
      normFile.includes("jhs"))
  )
    return true;
  return false;
}

/**
 * Adapts backend StructuresProcessedLessons into WorkspaceModule (used by TeacherContext & page).
 */
export function toWorkspaceModule(
  result: StructuresProcessedLessons,
  fallbackCategory?: TargetCategory,
  fallbackSubject?: string,
): EnrichedWorkspaceModule {
  const targetCategory =
    fallbackCategory || normalizeProgramToCategory(result.als_program);
  const subjectCode =
    fallbackSubject || matchStrandToSubjectCode(result.learning_strand);

  return {
    id: result.materials_id || result.document_id || crypto.randomUUID(),
    filename: result.filename || "Untitled Module",
    target_category: targetCategory,
    subject_code: subjectCode,
    uploaded_at: new Date().toISOString(),
    status: "Pending",
    file_data: result.storage_url || "",
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
  fallbackSubject?: string,
): LibraryModule {
  const targetCategory = normalizeProgramToCategory(result.als_program);
  return {
    id: result.materials_id || result.document_id || crypto.randomUUID(),
    filename: result.filename || "Untitled Module",
    subject: fallbackSubject || result.learning_strand || "General Strand",
    level:
      fallbackLevel || CATEGORY_LABELS[targetCategory] || "Junior High School",
    uploadDate: new Date().toISOString(),
    status: "Pending",
  };
}

/**
 * Resolves the active user ID from session state or the Thesis backend.
 */
async function resolveEffectiveUserId(
  providedUserId?: string | null,
): Promise<string | undefined> {
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
  options: UploadModuleOptions = {},
): Promise<StructuresProcessedLessons> {
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const targetUrl = `${baseUrl}/document-processor/parser`;

  const formData = new FormData();
  formData.append(
    "file",
    file,
    file.name.replace(/\.[^.]+$/, (extension) => extension.toLowerCase()),
  );

  const effectiveUserId = await resolveEffectiveUserId(options.userId);
  const headers: Record<string, string> = {};
  if (effectiveUserId) {
    headers["X-User-Id"] = effectiveUserId;
  }

  const { response, body } = await requestDocumentJson(
    targetUrl,
    {
      method: "POST",
      headers,
      body: formData,
      signal: options.signal,
    },
    options.timeoutMs ?? 180000,
  );

  if (!response.ok) {
    throw new DocumentServiceError(
      extractErrorMessage(body, response.status),
      response.status,
    );
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("records" in body) ||
    !Array.isArray(body.records)
  )
    throw new DocumentServiceError(
      "The upload response could not be verified. Refresh the module library before uploading again.",
      0,
      true,
    );
  return body as StructuresProcessedLessons;
}

/**
 * Deletes a document and cascades deletion across materials, lessons, and Cloudflare R2 storage.
 * Route: DELETE /document-processor/documents/{document_id}
 */
export async function deleteModuleDocument(
  documentId: string,
  options: DeleteDocumentOptions = {},
): Promise<DocumentDeleteResponse> {
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const deleteFromStorage = options.deleteFromStorage ?? true;
  const targetUrl = `${baseUrl}/document-processor/documents/${encodeURIComponent(documentId)}?delete_from_storage=${deleteFromStorage}`;

  const response = await fetch(targetUrl, {
    method: "DELETE",
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
  options: GetDocumentsOptions = {},
): Promise<DocumentListResponse> {
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const params = new URLSearchParams();
  if (options.userId) params.set("user_id", options.userId);
  if (options.status) params.set("status", options.status);
  if (options.program) params.set("program", options.program);
  if (options.page) params.set("page", String(options.page));
  if (options.pageSize) params.set("page_size", String(options.pageSize));

  const queryString = params.toString();
  const targetUrl = `${baseUrl}/document-processor/documents/${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(targetUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
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
  options: { baseUrl?: string; signal?: AbortSignal } = {},
): Promise<DocumentDetailResponse> {
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const targetUrl = `${baseUrl}/document-processor/documents/${encodeURIComponent(documentId)}`;

  const response = await fetch(targetUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
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

  const upload = useCallback(
    async (file: File, options?: UploadModuleOptions) => {
      setIsUploading(true);
      setError(null);
      try {
        const data = await parseModuleDocument(file, options);
        setResult(data);
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Module upload failed.";
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  const deleteDoc = useCallback(
    async (documentId: string, options?: DeleteDocumentOptions) => {
      setIsDeleting(true);
      setError(null);
      try {
        const data = await deleteModuleDocument(documentId, options);
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Document deletion failed.";
        setError(message);
        throw err;
      } finally {
        setIsDeleting(false);
      }
    },
    [],
  );

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
  content: JSONContent;
  keywords?: string[];
  sub_topics_breakdown?: Array<{
    sub_topic_title: string;
    explanation: unknown;
    concrete_example: unknown;
    sub_topic_summary?: unknown;
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
  content: JSONContent;
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
  options: GetMaterialsOptions = {},
): Promise<MaterialItem[]> {
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const params = new URLSearchParams();
  if (options.documentId) params.set("document_id", options.documentId);
  if (options.status) params.set("status", options.status);
  if (options.page) params.set("page", String(options.page));
  if (options.pageSize) params.set("page_size", String(options.pageSize));

  const queryString = params.toString();
  const targetUrl = `${baseUrl}/document-processor/${queryString ? `?${queryString}` : ""}`;

  const { response, body } = await requestDocumentJson(targetUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new DocumentServiceError(
      extractErrorMessage(body, response.status),
      response.status,
    );
  }
  if (!Array.isArray(body))
    throw new DocumentServiceError(
      "The module library returned an invalid response.",
    );
  return body as MaterialItem[];
}

/** Read the full library, including services that ignore pagination parameters. */
export async function getAllMaterials(
  options: Omit<GetMaterialsOptions, "page"> = {},
): Promise<MaterialItem[]> {
  const items = new Map<string, MaterialItem>();
  const pageSize = options.pageSize || 100;
  for (let page = 1; ; page++) {
    const batch = await getMaterials({ ...options, page, pageSize });
    const before = items.size;
    for (const item of batch) items.set(item.id, item);
    if (batch.length < pageSize || items.size === before)
      return [...items.values()];
  }
}

/**
 * Deletes one curriculum material and its associated data through the material
 * endpoint. The parent document and sibling materials are separate resources.
 */
export async function deleteMaterialById(
  materialId: string,
  options: { baseUrl?: string; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<void> {
  if (!materialId.trim()) throw new Error("Select a module to delete.");
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  try {
    const { response, body } = await requestDocumentJson(
      `${baseUrl}/document-processor/materials/${encodeURIComponent(materialId)}`,
      {
        method: "DELETE",
        headers: { Accept: "application/json" },
        signal: options.signal,
      },
      options.timeoutMs ?? 20000,
    );
    if (
      !response.ok ||
      (body &&
        typeof body === "object" &&
        "success" in body &&
        body.success === false)
    ) {
      throw new DocumentServiceError(
        extractErrorMessage(body, response.status),
        response.status,
      );
    }
    if (response.status !== 204 && (!body || typeof body !== "object"))
      throw new DocumentServiceError(
        "The deletion response could not be confirmed.",
        0,
        true,
      );
  } catch (error) {
    if (
      !(error instanceof DocumentServiceError) ||
      (!error.outcomeUnknown && error.status !== 404 && error.status < 500)
    )
      throw error;
    // A timed-out DELETE may already have committed. Only a confirmed missing
    // material permits removing the card; never fall back to deleting its document.
    try {
      await getMaterialById(materialId, { ...options, timeoutMs: 8000 });
    } catch (checkError) {
      if (
        checkError instanceof DocumentServiceError &&
        checkError.status === 404
      )
        return;
      throw new DocumentServiceError(
        "Deletion could not be confirmed. Check the module's status before trying again.",
        0,
        true,
      );
    }
    // A received server rejection plus a confirmed existing item is a failed
    // deletion, not an unknown outcome. Preserve its reason so it can be fixed.
    if (!error.outcomeUnknown) throw error;
    throw new DocumentServiceError(
      "The module is still available, but deletion has not been confirmed. Check its status before trying again.",
      error.status,
      true,
    );
  }
}

/** Retrieves a material with its structured main topics and subtopics. */
export async function getMaterialById(
  materialId: string,
  options: { baseUrl?: string; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<MaterialItem> {
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const targetUrl = `${baseUrl}/document-processor/materials/${encodeURIComponent(materialId)}`;

  const { response, body } = await requestDocumentJson(
    targetUrl,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: options.signal,
    },
    options.timeoutMs,
  );

  if (!response.ok) {
    throw new DocumentServiceError(
      extractErrorMessage(body, response.status),
      response.status,
    );
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("id" in body) ||
    body.id !== materialId ||
    !("structured_records" in body) ||
    !Array.isArray(body.structured_records)
  )
    throw new DocumentServiceError(
      "The document service returned an invalid module response.",
    );
  return body as MaterialItem;
}

/**
 * Updates the publication status ('DRAFT', 'PUBLISHED', 'ARCHIVED') of a curriculum material.
 * Route: PATCH /document-processor/materials/{material_id}/status
 */
export async function updateMaterialStatus(
  materialId: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | string,
  options: { baseUrl?: string; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<MaterialItem> {
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const targetUrl = `${baseUrl}/document-processor/materials/${encodeURIComponent(materialId)}/status`;

  try {
    const { response, body } = await requestDocumentJson(
      targetUrl,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
        signal: options.signal,
      },
      options.timeoutMs ?? 20000,
    );
    if (!response.ok)
      throw new DocumentServiceError(
        extractErrorMessage(body, response.status),
        response.status,
      );
    if (
      !body ||
      typeof body !== "object" ||
      !("id" in body) ||
      body.id !== materialId ||
      !("status" in body) ||
      body.status !== status
    )
      throw new DocumentServiceError(
        "The publication response could not be verified.",
        0,
        true,
      );
    return body as MaterialItem;
  } catch (error) {
    if (
      !(error instanceof DocumentServiceError) ||
      (!error.outcomeUnknown && error.status < 500)
    )
      throw error;
    try {
      const saved = await getMaterialById(materialId, {
        ...options,
        timeoutMs: 8000,
      });
      if (saved.status === status) return saved;
    } catch {
      /* Keep the original error when verification is unavailable. */
    }
    throw error;
  }
}

/**
 * Normalizes a raw material status string from database or API into a strict status union.
 * Safely handles null, undefined, 'None', 'null', empty strings, or case differences,
 * guaranteeing existing un-published records default safely to 'DRAFT'.
 */
export function normalizeMaterialStatus(
  status?: string | null,
): "DRAFT" | "PUBLISHED" | "ARCHIVED" {
  if (!status || typeof status !== "string") return "DRAFT";
  const clean = status.trim().toUpperCase();
  if (clean === "PUBLISHED") return "PUBLISHED";
  if (clean === "ARCHIVED") return "ARCHIVED";
  return "DRAFT";
}

/**
 * Matches a material item to a category by program code, name, learning strand, or subjects.
 */
export function matchMaterialToCategory(
  mat?: MaterialItem | null,
  cat?: { code?: string; name?: string; subjects?: { name: string }[] } | null,
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

  if (
    code === "ELEMENTARY" &&
    (strand.includes("elem") || goal.includes("elem"))
  )
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
  const sName = (subject.name || "").toLowerCase().trim();
  const sCode = (subject.code || "").toLowerCase().trim();
  const strand = (mat.learning_strand || "").toLowerCase().trim();
  const goal = (mat.main_learning_goal || "").toLowerCase().trim();
  const cls = (mat.cls_name || "").toLowerCase().trim();

  // 1. Direct substring matching
  if (
    sName &&
    (strand.includes(sName) || goal.includes(sName) || cls.includes(sName))
  )
    return true;
  if (
    sCode &&
    (strand.includes(sCode) || goal.includes(sCode) || cls.includes(sCode))
  )
    return true;

  // 2. DepEd ALS Strand Number matching (LS1, LS2, LS3, LS4, LS5, LS6)
  const sLsMatch = sName.match(/ls\s*([1-6])/i) || sCode.match(/ls\s*([1-6])/i);
  if (sLsMatch) {
    const lsNum = sLsMatch[1];
    const mLsMatch =
      strand.match(/ls\s*([1-6])/i) ||
      goal.match(/ls\s*([1-6])/i) ||
      cls.match(/ls\s*([1-6])/i);
    if (mLsMatch && mLsMatch[1] === lsNum) return true;
  }

  // 3. Domain keyword fallbacks
  if (sName.includes("filipino") || sName.includes("tagalog")) {
    if (
      strand.includes("filipino") ||
      goal.includes("filipino") ||
      strand.includes("ls1") ||
      goal.includes("ls1") ||
      cls.includes("filipino")
    )
      return true;
  }
  if (sName.includes("english")) {
    if (
      strand.includes("english") ||
      goal.includes("english") ||
      strand.includes("ls1") ||
      goal.includes("ls1")
    )
      return true;
  }
  if (
    sName.includes("math") ||
    sName.includes("problem solving") ||
    sName.includes("arithmetic")
  ) {
    if (
      strand.includes("math") ||
      strand.includes("ls3") ||
      goal.includes("math") ||
      goal.includes("fraction") ||
      goal.includes("number")
    )
      return true;
  }
  if (sName.includes("scien") || sName.includes("critical thinking")) {
    if (
      strand.includes("scien") ||
      strand.includes("ls2") ||
      goal.includes("scien") ||
      goal.includes("plant") ||
      goal.includes("ecosystem")
    )
      return true;
  }
  if (
    sName.includes("comm") ||
    sName.includes("reading") ||
    sName.includes("writing")
  ) {
    if (
      strand.includes("comm") ||
      strand.includes("ls1") ||
      goal.includes("comm") ||
      goal.includes("reading")
    )
      return true;
  }
  if (
    sName.includes("digit") ||
    sName.includes("computer") ||
    sName.includes("ict") ||
    sName.includes("technology")
  ) {
    if (
      strand.includes("digit") ||
      strand.includes("ls6") ||
      goal.includes("digit") ||
      goal.includes("computer") ||
      goal.includes("online")
    )
      return true;
  }
  if (
    sName.includes("life") ||
    sName.includes("career") ||
    sName.includes("employ")
  ) {
    if (
      strand.includes("life") ||
      strand.includes("career") ||
      strand.includes("ls4")
    )
      return true;
  }
  if (
    sName.includes("self") ||
    sName.includes("society") ||
    sName.includes("community")
  ) {
    if (
      strand.includes("self") ||
      strand.includes("society") ||
      strand.includes("ls5")
    )
      return true;
  }
  if (
    sName.includes("basic") ||
    sName.includes("literacy") ||
    sName.includes("foundational")
  ) {
    if (
      strand.includes("blp") ||
      strand.includes("basic") ||
      goal.includes("patinig") ||
      goal.includes("sound")
    )
      return true;
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
  options: { baseUrl?: string; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<MaterialLessonsResponse> {
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const targetUrl = `${baseUrl}/document-processor/lessons/${encodeURIComponent(materialsId)}`;

  const { response, body } = await requestDocumentJson(
    targetUrl,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: options.signal,
    },
    options.timeoutMs,
  );

  if (!response.ok) {
    throw new DocumentServiceError(
      extractErrorMessage(body, response.status),
      response.status,
    );
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("materials_id" in body) ||
    body.materials_id !== materialsId ||
    !("lessons" in body) ||
    !Array.isArray(body.lessons)
  )
    throw new DocumentServiceError(
      "Saved lesson content could not be verified. Please check again.",
    );
  return body as MaterialLessonsResponse;
}

/**
 * Triggers AI TipTap lesson module generation for a material.
 * Calls enhanced V2 endpoint with guaranteed subtopic expansion,
 * falling back only when the enhanced route is unavailable.
 */
export async function generateLessonForMaterial(
  materialsId: string,
  options: {
    baseUrl?: string;
    signal?: AbortSignal;
    preferEnhanced?: boolean;
  } = {},
): Promise<unknown> {
  const preferEnhanced = options.preferEnhanced ?? true;
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const msHost = baseUrl.replace(/\/api\/v1\/?$/, "");
  const enhancedUrl = `${msHost}/api/v2/enhanced-lesson-generation/generate-lesson/${encodeURIComponent(materialsId)}`;
  const legacyUrl = `${baseUrl}/document-processor/generate-lesson/${encodeURIComponent(materialsId)}`;

  if (preferEnhanced) {
    const response = await fetch(enhancedUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: options.signal,
    });

    const body = await response.json().catch(() => null);
    if (response.ok) {
      return body;
    }
    // Only an unavailable route justifies a second generation request.
    if (response.status !== 404 && response.status !== 405) {
      throw new DocumentServiceError(
        extractErrorMessage(body, response.status),
        response.status,
      );
    }
  }

  const response = await fetch(legacyUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    signal: options.signal,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new DocumentServiceError(
      extractErrorMessage(body, response.status),
      response.status,
    );
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
  options: {
    baseUrl?: string;
    signal?: AbortSignal;
    preferEnhanced?: boolean;
    timeoutMs?: number;
  } = {},
): Promise<GeneratedLessonItem> {
  const preferEnhanced = options.preferEnhanced ?? true;
  const baseUrl = options.baseUrl || DOCS_MS_URL;
  const msHost = baseUrl.replace(/\/api\/v1\/?$/, "");
  const enhancedUrl = `${msHost}/api/v2/enhanced-lesson-generation/lessons/${encodeURIComponent(lessonId)}`;
  const legacyUrl = `${baseUrl}/document-processor/lessons/${encodeURIComponent(lessonId)}`;

  const matches = (value: unknown): value is GeneratedLessonItem => {
    if (
      !value ||
      typeof value !== "object" ||
      !("id" in value) ||
      value.id !== lessonId
    )
      return false;
    const saved = value as GeneratedLessonItem;
    return (
      sameJson(saved.content, payload.content) &&
      (payload.lesson_title === undefined ||
        saved.lesson_title === payload.lesson_title) &&
      (payload.main_topic === undefined ||
        saved.main_topic === payload.main_topic)
    );
  };
  try {
    const urls = preferEnhanced ? [enhancedUrl, legacyUrl] : [legacyUrl];
    for (let index = 0; index < urls.length; index++) {
      const { response, body } = await requestDocumentJson(
        urls[index],
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: options.signal,
        },
        options.timeoutMs ?? 30000,
      );
      if (!response.ok) {
        if (
          index === 0 &&
          urls.length > 1 &&
          [404, 405].includes(response.status)
        )
          continue;
        throw new DocumentServiceError(
          extractErrorMessage(body, response.status),
          response.status,
        );
      }
      if (!matches(body))
        throw new DocumentServiceError(
          "The lesson save could not be verified. Your edits are still open.",
          0,
          true,
        );
      return body;
    }
    throw new DocumentServiceError("The lesson save endpoint is unavailable.");
  } catch (error) {
    if (
      !(error instanceof DocumentServiceError) ||
      (!error.outcomeUnknown && error.status < 500)
    )
      throw error;
    try {
      const { response, body } = await requestDocumentJson(
        `${baseUrl}/document-processor/lessons/detail/${encodeURIComponent(lessonId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: options.signal,
        },
        8000,
      );
      if (response.ok && matches(body)) return body;
    } catch {
      /* A failed read must not discard unsaved editor content. */
    }
    throw error;
  }
}

function sameJson(first: unknown, second: unknown): boolean {
  if (first === second) return true;
  if (
    !first ||
    !second ||
    typeof first !== "object" ||
    typeof second !== "object"
  )
    return false;
  if (Array.isArray(first) || Array.isArray(second))
    return (
      Array.isArray(first) &&
      Array.isArray(second) &&
      first.length === second.length &&
      first.every((item, index) => sameJson(item, second[index]))
    );
  const left = first as Record<string, unknown>;
  const right = second as Record<string, unknown>;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) => Object.hasOwn(right, key) && sameJson(left[key], right[key]),
    )
  );
}
