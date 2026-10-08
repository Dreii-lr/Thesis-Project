'use client';

import { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BookOpen, FolderOpen, Loader2, UploadCloud } from 'lucide-react';
import { CATEGORY_LABELS } from '@/src/data/mockAssessment';
import {
  formatTime,
  programs,
  subjects,
  subjectName,
  type WorkspaceModule,
} from '@/src/data/mockTeacher';
import { useTeacher } from '@/src/context/TeacherContext';
import {
  useModuleUploader,
  toWorkspaceModule,
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
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<EnrichedWorkspaceModule | null>(null);

  const { upload: uploadDoc, deleteDoc, isUploading } = useModuleUploader();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    if (!file || !program || !subject) {
      setMessage('Choose a subject and a file first.');
      return;
    }
    setBusy(true);
    setMessage('Uploading and analyzing module with AI parser…');
    try {
      const parsedData = await uploadDoc(file);
      const item = toWorkspaceModule(parsedData, program, subject);

      if (!setModules([item, ...modules])) {
        setMessage('Unable to save module locally.');
        setBusy(false);
        return;
      }
      setMessage('Module uploaded and parsed successfully! Review the extracted curriculum below and publish when ready.');
      setFile(null);
      if (input.current) input.current.value = '';
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
    setMessage('Module published to this program and subject.');
  };
  const remove = async (target: WorkspaceModule | EnrichedWorkspaceModule | string) => {
    const targetModule = typeof target === 'string'
      ? modules.find((m) => m.id === target)
      : target;

    const filename = targetModule?.filename || 'this module';
    const isConfirmed = window.confirm(
      `Are you sure you want to remove "${filename}"? This will permanently delete the curriculum and file from the system.`
    );
    if (!isConfirmed) return;

    const targetId = typeof target === 'string' ? target : target.id;
    const docId = (targetModule as EnrichedWorkspaceModule)?.document_id;
    const isBackendDoc = docId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docId);

    setDeletingId(targetId);
    setMessage('Deleting module from server and storage…');
    try {
      if (isBackendDoc) {
        await deleteDoc(docId);
        setMessage(`Module "${filename}" and its digitized curriculum were permanently deleted.`);
      } else {
        setMessage(`Module "${filename}" removed.`);
      }
      setModules(modules.filter((m) => m.id !== targetId));
      if (preview?.id === targetId) {
        setPreview(null);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Deletion failed.';
      setMessage(`Delete error: ${errMsg}`);
    } finally {
      setDeletingId(null);
    }
  };
  const directory = modules.filter(
    (m) =>
      m.target_category === program &&
      (!subject || m.subject_code === subject) &&
      m.filename.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">
            Teacher workspace · Demo data
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {program ? CATEGORY_LABELS[program] : 'Curriculum & modules'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {program
              ? 'Choose a subject, upload a module, and review it before publishing. Demo files are stored in this browser.'
              : 'Choose a program directory to manage its subjects and learning materials.'}
          </p>
        </div>
        {program && (
          <Link
            href="/teacher/module-uploads"
            className="text-sm font-semibold text-blue-600"
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
      {!program ? (
        <div className="grid gap-5 md:grid-cols-3">
          {programs.map((p, i) => (
            <Link
              href={`/teacher/module-uploads?program=${p}`}
              key={p}
              className="group rounded-[24px] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
            >
              <span
                className={`mb-7 flex h-14 w-14 items-center justify-center rounded-2xl ${['bg-blue-50 text-blue-600', 'bg-violet-50 text-violet-600', 'bg-emerald-50 text-emerald-600'][i]}`}
              >
                <FolderOpen size={28} />
              </span>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Program directory
              </p>
              <h2 className="mt-2 text-xl font-bold">{CATEGORY_LABELS[p]}</h2>
              <p className="mt-4 text-sm text-slate-500">
                {modules.filter((m) => m.target_category === p).length} modules
                ·{' '}
                {
                  modules.filter(
                    (m) => m.target_category === p && m.status === 'Pending',
                  ).length
                }{' '}
                awaiting review
              </p>
              <span className="mt-8 flex items-center justify-between text-sm font-bold text-blue-600">
                Open directory <span>→</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <>
          <section
            className={
              'rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6' +
              ' ' +
              'mb-6'
            }
          >
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div>
                <BookOpen className="text-blue-600" />
                <h2 className="mt-3 text-lg font-bold">
                  Upload to {CATEGORY_LABELS[program]}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Your chosen subject determines where the module belongs. PDF,
                  DOCX, TXT, or scanned image · up to 50 MB per file.
                </p>
                <label className="mt-5 block text-sm font-semibold">
                  Destination subject
                  <select
                    className={`mt-2 ${fieldClass}`}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  >
                    <option value="">Choose a subject</option>
                    {subjects.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
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
                  disabled={busy || isUploading || !file || !subject}
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
          <section
            className={
              'rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6'
            }
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Module library</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {subject ? subjectName(subject) : 'All subjects'} ·{' '}
                  {directory.length} modules
                </p>
              </div>
              <input
                aria-label="Search modules"
                placeholder="Search filenames…"
                className={`${fieldClass} sm:!w-64`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {subject && (
              <button
                className="mb-4 text-sm font-semibold text-blue-600"
                onClick={() => setSubject('')}
              >
                Show all subjects
              </button>
            )}
            <div className="space-y-3">
              {directory.map((m) => (
                <article
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                >
                  <div className="min-w-0">
                    <span className="inline-block rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                      {m.status}
                    </span>
                    <h3 className="mt-2 break-all text-sm font-bold">
                      {m.filename}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {subjectName(m.subject_code)} ·{' '}
                      {formatTime(m.uploaded_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                    <button
                      onClick={() => setPreview(m)}
                      className="text-blue-600"
                    >
                      Review
                    </button>
                    <a
                      href={m.file_data}
                      download={m.filename}
                      className="text-blue-600"
                    >
                      Download
                    </a>
                    {m.status === 'Pending' && (
                      <button
                        onClick={() => changeStatus(m.id)}
                        className={buttonClass}
                      >
                        Publish
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(m)}
                      disabled={deletingId === m.id}
                      className="inline-flex cursor-pointer items-center gap-1 text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === m.id && <Loader2 size={13} className="animate-spin" />}
                      <span>{deletingId === m.id ? 'Deleting…' : 'Remove'}</span>
                    </button>
                  </div>
                </article>
              ))}
              {!directory.length && (
                <p className="py-10 text-center text-sm text-slate-500">
                  No modules here yet. Choose a subject and upload your first
                  file.
                </p>
              )}
            </div>
          </section>
          {preview && preview.target_category === program && (
            <section
              className={
                'rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6' +
                ' ' +
                'mt-6'
              }
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <span className="inline-block rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                    {preview.status}
                  </span>
                  <h2 className="mt-2 break-all text-xl font-bold text-slate-900">{preview.filename}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {subjectName(preview.subject_code)} · Uploaded {formatTime(preview.uploaded_at)}
                  </p>
                </div>
                <button
                  onClick={() => setPreview(null)}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
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
                {/\.(txt|pdf)$/i.test(preview.filename) ? (
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
                )}
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <a
                    href={preview.storage_url || preview.file_data}
                    download={preview.filename}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Download original file →
                  </a>
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
                    onClick={() => preview && remove(preview)}
                    disabled={deletingId === preview.id}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === preview.id && <Loader2 size={15} className="animate-spin" />}
                    <span>{deletingId === preview.id ? 'Deleting…' : 'Delete module'}</span>
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
