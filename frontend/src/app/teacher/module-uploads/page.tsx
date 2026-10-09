'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BookOpen, FolderOpen, Loader2, UploadCloud, RefreshCw } from 'lucide-react';
import { CATEGORY_LABELS } from '@/src/data/mockAssessment';
import {
  formatTime,
  programs,
  type WorkspaceModule,
} from '@/src/data/mockTeacher';
import { useTeacher } from '@/src/context/TeacherContext';
import {
  useModuleUploader,
  toWorkspaceModule,
  getModuleDocuments,
  getModuleDocumentById,
  matchDocumentToProgram,
  type DocumentItem,
  type EnrichedWorkspaceModule,
} from '@/src/lib/document-processor-api';

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500';
const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40';

function ModuleDirectory() {
  const { modules, setModules } = useTeacher();
  const params = useSearchParams();
  const requested = params.get('program');
  const program = programs.find((p) => p === requested);
  const [search, setSearch] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<EnrichedWorkspaceModule | null>(null);

  // Backend documents state
  const [backendDocs, setBackendDocs] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docsError, setDocsError] = useState<string | null>(null);

  const { upload: uploadDoc, deleteDoc, isUploading } = useModuleUploader();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load all documents from the document-processing backend
  const loadBackendDocs = useCallback(async () => {
    setLoadingDocs(true);
    setDocsError(null);
    try {
      const res = await getModuleDocuments({ pageSize: 100 });
      setBackendDocs(res.items || []);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to retrieve documents from backend.';
      setDocsError(errMsg);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    loadBackendDocs();
  }, [loadBackendDocs]);

  const chooseFile = (candidate?: File) => {
    setMessage('');
    setFile(null);
    if (!candidate) return;
    if (!/\.(pdf|docx|txt|png|jpg|jpeg)$/i.test(candidate.name)) {
      setMessage('Choose a PDF, DOCX, TXT, or image file (PNG, JPG).');
      return;
    }
    if (!candidate.size || candidate.size > 50 * 1024 * 1024) {
      setMessage('Choose a file up to 50 MB.');
      return;
    }
    setFile(candidate);
  };

  const upload = async () => {
    if (!file || !program) {
      setMessage('Choose a file first.');
      return;
    }
    setBusy(true);
    setMessage('Uploading and analyzing module with AI parser…');
    try {
      const parsedData = await uploadDoc(file);
      const item = toWorkspaceModule(parsedData, program);

      setModules([item, ...modules]);
      setMessage('Module uploaded and parsed successfully! Review the extracted curriculum below.');
      setFile(null);
      if (input.current) input.current.value = '';

      // Immediately re-sync document library from backend
      await loadBackendDocs();
      setPreview(item);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Upload failed.';
      setMessage(`Upload error: ${errMsg}`);
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = (id: string) => {
    setModules(
      modules.map((m) => (m.id === id ? { ...m, status: 'Published' } : m)),
    );
    setMessage('Module status updated to Published.');
  };

  const removeDoc = async (targetId: string, filename: string) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to remove "${filename}"? This will permanently delete the curriculum and file from the system.`
    );
    if (!isConfirmed) return;

    setDeletingId(targetId);
    setMessage('Deleting module from server and storage…');
    try {
      await deleteDoc(targetId);
      setMessage(`Module "${filename}" and its digitized curriculum were permanently deleted.`);
      setBackendDocs((prev) => prev.filter((d) => d.id !== targetId));
      setModules(modules.filter((m) => m.id !== targetId));
      if (preview?.id === targetId || preview?.document_id === targetId) {
        setPreview(null);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Deletion failed.';
      setMessage(`Delete error: ${errMsg}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleReviewDoc = async (doc: DocumentItem) => {
    // If we have an enriched local module matching this id or doc id, load its detailed records
    const localMatch = modules.find(
      (m) => m.id === doc.id || (m as EnrichedWorkspaceModule).document_id === doc.id,
    ) as EnrichedWorkspaceModule | undefined;

    if (localMatch) {
      setPreview(localMatch);
      return;
    }

    // Otherwise construct preview from the backend document and fetch details
    const initialPreview: EnrichedWorkspaceModule = {
      id: doc.id,
      filename: doc.filename,
      target_category: program || 'junior',
      subject_code: doc.learning_strand || 'ALS-LS1-COMM',
      uploaded_at: doc.created_at,
      status: doc.status === 'COMPLETED' ? 'Published' : 'Pending',
      file_data: doc.storage_url || '',
      document_id: doc.id,
      storage_url: doc.storage_url,
    };
    setPreview(initialPreview);

    try {
      const detail = await getModuleDocumentById(doc.id);
      if (detail && detail.materials && detail.materials.length > 0) {
        const mat = detail.materials[0];
        setPreview((prev) =>
          prev
            ? {
                ...prev,
                main_learning_goal: mat.main_learning_goal || prev.main_learning_goal,
                subject_code: mat.learning_strand || prev.subject_code,
              }
            : null,
        );
      }
    } catch {
      // Keep initial preview
    }
  };

  // Program-specific documents filtered from backend GET
  const programDocuments = program
    ? backendDocs.filter(
        (d) =>
          matchDocumentToProgram(d, program) &&
          d.filename.toLowerCase().includes(search.toLowerCase()),
      )
    : [];

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">
            Teacher workspace · Document processing
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {program ? CATEGORY_LABELS[program] : 'Curriculum & modules'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {program
              ? `Manage digitized curriculum and learning materials for ${CATEGORY_LABELS[program]}.`
              : 'Choose a program directory to manage its learning materials and view ingested documents.'}
          </p>
        </div>
        {program && (
          <Link
            href="/teacher/module-uploads"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            ← All programs
          </Link>
        )}
      </div>

      {message && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-800"
        >
          {message}
        </p>
      )}

      {docsError && (
        <div className="mb-5 flex items-center justify-between rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          <span>{docsError}</span>
          <button
            onClick={loadBackendDocs}
            className="inline-flex items-center gap-1 font-semibold text-amber-900 hover:underline"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {!program ? (
        <div className="grid gap-5 md:grid-cols-3">
          {programs.map((p, i) => {
            const programDocCount = backendDocs.filter((d) => matchDocumentToProgram(d, p)).length;
            const awaitingReviewCount = backendDocs.filter(
              (d) => matchDocumentToProgram(d, p) && d.status !== 'COMPLETED',
            ).length;

            return (
              <Link
                href={`/teacher/module-uploads?program=${p}`}
                key={p}
                className="group rounded-[24px] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
              >
                <span
                  className={`mb-7 flex h-14 w-14 items-center justify-center rounded-2xl ${
                    ['bg-blue-50 text-blue-600', 'bg-violet-50 text-violet-600', 'bg-emerald-50 text-emerald-600'][i]
                  }`}
                >
                  <FolderOpen size={28} />
                </span>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Program directory
                </p>
                <h2 className="mt-2 text-xl font-bold">{CATEGORY_LABELS[p]}</h2>
                <p className="mt-4 text-sm text-slate-500">
                  {programDocCount} {programDocCount === 1 ? 'document' : 'documents'}
                  {awaitingReviewCount > 0 && ` · ${awaitingReviewCount} pending`}
                </p>
                <span className="mt-8 flex items-center justify-between text-sm font-bold text-blue-600">
                  Open directory <span>→</span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <>
          {/* Upload Section - Destination Subject Removed */}
          <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div>
                <BookOpen className="text-blue-600" />
                <h2 className="mt-3 text-lg font-bold">
                  Upload to {CATEGORY_LABELS[program]}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Upload ALS learning materials for automated curriculum parsing.
                  PDF, DOCX, TXT, or scanned image · up to 50 MB per file.
                  The AI parser will automatically extract competencies and topics.
                </p>
              </div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!busy && !isUploading) chooseFile(e.dataTransfer.files[0]);
                }}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-6 text-center"
              >
                <UploadCloud className="text-blue-600" size={32} />
                <p className="mt-3 max-w-full break-all text-sm font-semibold">
                  {file ? file.name : 'Drop your module here'}
                </p>
                <input
                  ref={input}
                  aria-label="Select module file"
                  type="file"
                  accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                  disabled={busy || isUploading}
                  onChange={(e) => chooseFile(e.target.files?.[0])}
                  className="mt-4 block w-full max-w-xs text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-blue-600"
                />
                <button
                  className={`mt-5 ${buttonClass}`}
                  disabled={busy || isUploading || !file}
                  onClick={upload}
                >
                  {busy || isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Analyzing &amp; uploading…</span>
                    </>
                  ) : (
                    'Upload for review'
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Program Document Library - Filtered to Current Category */}
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{CATEGORY_LABELS[program]} documents</h2>
                <p className="mt-1 text-sm text-slate-500">
                  All documents for this program · {programDocuments.length}{' '}
                  {programDocuments.length === 1 ? 'document' : 'documents'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={loadBackendDocs}
                  disabled={loadingDocs}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  title="Refresh document list"
                >
                  <RefreshCw size={13} className={loadingDocs ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
                <input
                  aria-label="Search modules"
                  placeholder="Search filenames…"
                  className={`${fieldClass} sm:!w-64`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {loadingDocs && !programDocuments.length ? (
              <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                <Loader2 size={20} className="mr-2 animate-spin text-blue-600" />
                <span>Loading documents for {CATEGORY_LABELS[program]}…</span>
              </div>
            ) : (
              <div className="space-y-3">
                {programDocuments.map((doc) => {
                  const isCompleted = doc.status === 'COMPLETED';
                  const isPending = doc.status === 'PENDING';
                  return (
                    <article
                      key={doc.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:shadow-xs"
                    >
                      <div className="min-w-0">
                        <span
                          className={`inline-block rounded-lg px-2 py-1 text-[11px] font-bold ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700'
                              : isPending
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {doc.status}
                        </span>
                        <h3 className="mt-2 break-all text-sm font-bold text-slate-900">
                          {doc.filename}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {doc.file_size_bytes
                            ? `${(doc.file_size_bytes / 1024).toFixed(1)} KB · `
                            : ''}
                          {doc.materials_count !== undefined && doc.materials_count > 0
                            ? `${doc.materials_count} ${doc.materials_count === 1 ? 'curriculum material' : 'curriculum materials'} · `
                            : ''}
                          Uploaded {formatTime(doc.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                        <button
                          type="button"
                          onClick={() => handleReviewDoc(doc)}
                          className="text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          Review
                        </button>
                        {doc.storage_url && (
                          <a
                            href={doc.storage_url}
                            download={doc.filename}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Download
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => removeDoc(doc.id, doc.filename)}
                          disabled={deletingId === doc.id}
                          className="inline-flex cursor-pointer items-center gap-1 text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === doc.id && <Loader2 size={13} className="animate-spin" />}
                          <span>{deletingId === doc.id ? 'Deleting…' : 'Remove'}</span>
                        </button>
                      </div>
                    </article>
                  );
                })}

                {!programDocuments.length && !loadingDocs && (
                  <p className="py-10 text-center text-sm text-slate-500">
                    No documents in {CATEGORY_LABELS[program]} yet. Upload your first module above.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Preview Section */}
          {preview && (
            <section className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <span className="inline-block rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                    {preview.status}
                  </span>
                  <h2 className="mt-2 break-all text-xl font-bold text-slate-900">{preview.filename}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Uploaded {formatTime(preview.uploaded_at)}
                  </p>
                </div>
                <button
                  onClick={() => setPreview(null)}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close preview
                </button>
              </div>

              {preview.main_learning_goal && (
                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    Curriculum Competency &amp; Learning Goal
                  </p>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-blue-950">
                    {preview.main_learning_goal}
                  </p>
                </div>
              )}

              {preview.records && preview.records.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                      Digitized Lessons &amp; Topics ({preview.records.length})
                    </h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {preview.records.map((rec, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:bg-white hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {rec.main_topic || `Lesson ${idx + 1}`}
                          </h4>
                          {rec.delivery_mode && (
                            <span className="shrink-0 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {rec.delivery_mode}
                            </span>
                          )}
                        </div>
                        {rec.sub_topics && rec.sub_topics.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {rec.sub_topics.map((sub, sIdx) => (
                              <span
                                key={sIdx}
                                className="inline-block rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-100"
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60 pt-2">
                          <span>{rec.duration || 'Flexible duration'}</span>
                          {rec.expected_output && (
                            <span className="truncate max-w-[150px]" title={rec.expected_output}>
                              Output: {rec.expected_output}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="text-sm font-bold text-slate-800 mb-2">Original Document</h3>
                {preview.storage_url || preview.file_data ? (
                  /\.(txt|pdf)$/i.test(preview.filename) ? (
                    <iframe
                      title={`Preview ${preview.filename}`}
                      sandbox="allow-scripts allow-same-origin"
                      src={preview.storage_url || preview.file_data}
                      className="h-96 w-full rounded-xl border border-slate-200"
                    />
                  ) : (
                    <p className="text-sm text-slate-500">
                      Download this document to review it in your desktop viewer.
                    </p>
                  )
                ) : (
                  <p className="text-sm text-slate-500">
                    No document preview available.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  {(preview.storage_url || preview.file_data) && (
                    <a
                      href={preview.storage_url || preview.file_data}
                      download={preview.filename}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Download original file →
                    </a>
                  )}
                  {preview.status === 'Pending' && (
                    <button
                      onClick={() => changeStatus(preview.id)}
                      className={buttonClass}
                    >
                      Publish this module
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeDoc(preview.document_id || preview.id, preview.filename)}
                    disabled={deletingId === (preview.document_id || preview.id)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === (preview.document_id || preview.id) && (
                      <Loader2 size={15} className="animate-spin" />
                    )}
                    <span>
                      {deletingId === (preview.document_id || preview.id)
                        ? 'Deleting…'
                        : 'Delete module'}
                    </span>
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default function ModuleUploadsPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading module directory…</p>}>
      <ModuleDirectory />
    </Suspense>
  );
}
