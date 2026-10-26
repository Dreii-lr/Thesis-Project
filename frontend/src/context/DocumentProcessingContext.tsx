'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  parseModuleDocument,
  generateLessonForMaterial,
  getModuleDocuments,
  getMaterialById,
  type DocumentItem,
  type StructuresProcessedLessons,
  type MaterialItem,
} from '@/src/lib/document-processor-api';
import type { UserCategoryItem } from '@/src/lib/user-categories-api';

export interface ActiveUploadJob {
  filename: string;
  program?: string;
  documentId?: string;
  materialsId?: string;
  status: 'UPLOADING' | 'PARSING' | 'COMPLETED' | 'ERROR';
  message: string;
  startedAt: number;
  error?: string;
  result?: StructuresProcessedLessons;
}

export interface ActiveLessonJob {
  materialId: string;
  title?: string;
  status: 'GENERATING' | 'COMPLETED' | 'ERROR';
  message: string;
  startedAt: number;
  error?: string;
}

interface DocumentProcessingContextType {
  activeUpload: ActiveUploadJob | null;
  activeLessonGenerations: Record<string, ActiveLessonJob>;
  backendProcessingDocs: DocumentItem[];
  isBackendProcessing: boolean;
  startModuleUpload: (
    file: File,
    program: string,
    category?: UserCategoryItem
  ) => Promise<StructuresProcessedLessons>;
  startLessonGeneration: (
    materialId: string,
    title?: string
  ) => Promise<any>;
  dismissUploadNotification: () => void;
  dismissLessonNotification: (materialId: string) => void;
  refreshBackendProcessingDocs: () => Promise<void>;
  isMaterialGenerating: (materialId: string) => boolean;
}

const STORAGE_KEY_UPLOAD = 'als_active_upload_job_v1';
const STORAGE_KEY_LESSONS = 'als_active_lesson_jobs_v1';
const JOB_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes expiration

const DocumentProcessingContext = createContext<DocumentProcessingContextType | undefined>(undefined);

function loadStoredUpload(): ActiveUploadJob | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UPLOAD);
    if (!raw) return null;
    const job: ActiveUploadJob = JSON.parse(raw);
    if (Date.now() - job.startedAt > JOB_TIMEOUT_MS) {
      localStorage.removeItem(STORAGE_KEY_UPLOAD);
      return null;
    }
    return job;
  } catch {
    return null;
  }
}

function loadStoredLessons(): Record<string, ActiveLessonJob> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LESSONS);
    if (!raw) return {};
    const jobs: Record<string, ActiveLessonJob> = JSON.parse(raw);
    const valid: Record<string, ActiveLessonJob> = {};
    for (const [id, job] of Object.entries(jobs)) {
      if (Date.now() - job.startedAt <= JOB_TIMEOUT_MS) {
        valid[id] = job;
      }
    }
    return valid;
  } catch {
    return {};
  }
}

export function DocumentProcessingProvider({ children }: { children: ReactNode }) {
  const [activeUpload, setActiveUpload] = useState<ActiveUploadJob | null>(null);
  const [activeLessonGenerations, setActiveLessonGenerations] = useState<Record<string, ActiveLessonJob>>({});
  const [backendProcessingDocs, setBackendProcessingDocs] = useState<DocumentItem[]>([]);
  const isPollingRef = useRef(false);

  // Initialize from localStorage on browser mount
  useEffect(() => {
    const initialUpload = loadStoredUpload();
    if (initialUpload) setActiveUpload(initialUpload);

    const initialLessons = loadStoredLessons();
    if (Object.keys(initialLessons).length > 0) setActiveLessonGenerations(initialLessons);
  }, []);

  // Save activeUpload to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeUpload) {
      localStorage.setItem(STORAGE_KEY_UPLOAD, JSON.stringify(activeUpload));
    } else {
      localStorage.removeItem(STORAGE_KEY_UPLOAD);
    }
  }, [activeUpload]);

  // Save activeLessonGenerations to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (Object.keys(activeLessonGenerations).length > 0) {
      localStorage.setItem(STORAGE_KEY_LESSONS, JSON.stringify(activeLessonGenerations));
    } else {
      localStorage.removeItem(STORAGE_KEY_LESSONS);
    }
  }, [activeLessonGenerations]);

  // Query backend database for any documents in PROCESSING or PENDING state
  const refreshBackendProcessingDocs = useCallback(async () => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    try {
      const res = await getModuleDocuments({ pageSize: 50 });
      const items = res?.items || [];
      const inFlight = items.filter(
        (doc) => doc.status === 'PROCESSING' || doc.status === 'PENDING'
      );
      setBackendProcessingDocs(inFlight);

      // Check if our activeUpload document has completed on the backend
      setActiveUpload((current) => {
        if (!current) return null;
        if (current.status === 'UPLOADING' || current.status === 'PARSING') {
          // Look for this file in the backend list
          const matchingDoc = items.find(
            (d) =>
              (current.documentId && d.id === current.documentId) ||
              d.filename.toLowerCase() === current.filename.toLowerCase()
          );

          if (matchingDoc) {
            if (matchingDoc.status === 'COMPLETED') {
              return {
                ...current,
                documentId: matchingDoc.id,
                status: 'COMPLETED',
                message: `Module "${current.filename}" processed successfully!`,
              };
            }
            if (matchingDoc.status === 'FAILED') {
              return {
                ...current,
                documentId: matchingDoc.id,
                status: 'ERROR',
                error: matchingDoc.error_message || 'Processing failed on server.',
                message: `Processing failed: ${matchingDoc.error_message || 'Server error'}`,
              };
            }
          }
        }
        return current;
      });

      // Check if any generating lessons have completed
      setActiveLessonGenerations((current) => {
        const updated = { ...current };
        let changed = false;

        for (const [matId, job] of Object.entries(current)) {
          if (job.status === 'GENERATING') {
            getMaterialById(matId)
              .then((mat) => {
                if (mat && mat.status !== 'GENERATING') {
                  setActiveLessonGenerations((prev) => ({
                    ...prev,
                    [matId]: {
                      ...prev[matId],
                      status: 'COMPLETED',
                      message: `Lesson content generation completed for ${job.title || 'material'}!`,
                    },
                  }));
                }
              })
              .catch(() => {});
          }
        }

        return changed ? updated : current;
      });
    } catch {
      // Backend might be offline or starting up
    } finally {
      isPollingRef.current = false;
    }
  }, []);

  // Poll backend status periodically while any job is active or processing
  const hasActiveWork =
    Boolean(activeUpload && (activeUpload.status === 'UPLOADING' || activeUpload.status === 'PARSING')) ||
    backendProcessingDocs.length > 0 ||
    Object.values(activeLessonGenerations).some((j) => j.status === 'GENERATING');

  useEffect(() => {
    refreshBackendProcessingDocs();
    const intervalTime = hasActiveWork ? 3500 : 20000;
    const interval = setInterval(() => {
      refreshBackendProcessingDocs();
    }, intervalTime);

    return () => clearInterval(interval);
  }, [hasActiveWork, refreshBackendProcessingDocs]);

  // Start uploading and parsing a module file
  const startModuleUpload = useCallback(
    async (file: File, program: string, category?: UserCategoryItem): Promise<StructuresProcessedLessons> => {
      const newJob: ActiveUploadJob = {
        filename: file.name,
        program,
        status: 'UPLOADING',
        message: `Uploading "${file.name}" to server...`,
        startedAt: Date.now(),
      };
      setActiveUpload(newJob);

      try {
        newJob.status = 'PARSING';
        newJob.message = `Analyzing "${file.name}" with AI (Docling & Gemini)...`;
        setActiveUpload({ ...newJob });

        const result = await parseModuleDocument(file);

        const completedJob: ActiveUploadJob = {
          ...newJob,
          documentId: result.document_id || undefined,
          materialsId: result.materials_id || undefined,
          status: 'COMPLETED',
          message: `Module "${file.name}" analyzed and curriculum extracted successfully!`,
          result,
        };
        setActiveUpload(completedJob);
        refreshBackendProcessingDocs();
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Module upload and analysis failed.';
        const failedJob: ActiveUploadJob = {
          ...newJob,
          status: 'ERROR',
          error: errorMsg,
          message: errorMsg,
        };
        setActiveUpload(failedJob);
        refreshBackendProcessingDocs();
        throw err;
      }
    },
    [refreshBackendProcessingDocs]
  );

  // Start generating lessons for a material
  const startLessonGeneration = useCallback(
    async (materialId: string, title?: string): Promise<any> => {
      const job: ActiveLessonJob = {
        materialId,
        title: title || 'Curriculum Material',
        status: 'GENERATING',
        message: `Generating AI lesson content for "${title || 'Material'}"...`,
        startedAt: Date.now(),
      };

      setActiveLessonGenerations((prev) => ({
        ...prev,
        [materialId]: job,
      }));

      try {
        const result = await generateLessonForMaterial(materialId);

        setActiveLessonGenerations((prev) => ({
          ...prev,
          [materialId]: {
            ...job,
            status: 'COMPLETED',
            message: `Lesson content generated successfully for "${title || 'Material'}"!`,
          },
        }));

        refreshBackendProcessingDocs();
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Lesson generation failed.';
        setActiveLessonGenerations((prev) => ({
          ...prev,
          [materialId]: {
            ...job,
            status: 'ERROR',
            error: errorMsg,
            message: errorMsg,
          },
        }));
        refreshBackendProcessingDocs();
        throw err;
      }
    },
    [refreshBackendProcessingDocs]
  );

  const dismissUploadNotification = useCallback(() => {
    setActiveUpload(null);
  }, []);

  const dismissLessonNotification = useCallback((materialId: string) => {
    setActiveLessonGenerations((prev) => {
      const copy = { ...prev };
      delete copy[materialId];
      return copy;
    });
  }, []);

  const isMaterialGenerating = useCallback(
    (materialId: string): boolean => {
      const job = activeLessonGenerations[materialId];
      return Boolean(job && job.status === 'GENERATING');
    },
    [activeLessonGenerations]
  );

  const isBackendProcessing =
    Boolean(activeUpload && (activeUpload.status === 'UPLOADING' || activeUpload.status === 'PARSING')) ||
    backendProcessingDocs.length > 0;

  return (
    <DocumentProcessingContext.Provider
      value={{
        activeUpload,
        activeLessonGenerations,
        backendProcessingDocs,
        isBackendProcessing,
        startModuleUpload,
        startLessonGeneration,
        dismissUploadNotification,
        dismissLessonNotification,
        refreshBackendProcessingDocs,
        isMaterialGenerating,
      }}
    >
      {children}
    </DocumentProcessingContext.Provider>
  );
}

export function useDocumentProcessing() {
  const context = useContext(DocumentProcessingContext);
  if (!context) {
    throw new Error('useDocumentProcessing must be used within a DocumentProcessingProvider');
  }
  return context;
}
