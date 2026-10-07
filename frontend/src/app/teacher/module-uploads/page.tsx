'use client';

import { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BookOpen, FolderOpen, UploadCloud } from 'lucide-react';
import { CATEGORY_LABELS } from '@/src/data/mockAssessment';
import {
  formatTime,
  programs,
  subjects,
  subjectName,
  type WorkspaceModule,
} from '@/src/data/mockTeacher';
import { useTeacher } from '@/src/context/TeacherContext';

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
  const [preview, setPreview] = useState<WorkspaceModule | null>(null);
  const chooseFile = (candidate?: File) => {
    setMessage('');
    setFile(null);
    if (!candidate) return;
    if (!/\.(pdf|docx|txt)$/i.test(candidate.name)) {
      setMessage('Choose a PDF, DOCX, or TXT file.');
      return;
    }
    if (!candidate.size || candidate.size > 2 * 1024 * 1024) {
      setMessage('Choose a non-empty file up to 2 MB for this browser demo.');
      return;
    }
    setFile(candidate);
  };
  const upload = () => {
    if (!file || !program || !subject) {
      setMessage('Choose a subject and a file first.');
      return;
    }
    setBusy(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setBusy(false);
      setMessage('The file could not be read. Please try again.');
    };
    reader.onload = () => {
      const data = String(reader.result);
      const item: WorkspaceModule = {
        id: crypto.randomUUID(),
        filename: file.name,
        target_category: program,
        subject_code: subject,
        uploaded_at: new Date().toISOString(),
        status: 'Pending',
        file_data: data,
      };
      // Check quota before claiming success; file contents must survive navigation.
      try {
        if (!setModules([item, ...modules])) {
          setBusy(false);
          return;
        }
        setMessage('Module uploaded. Review it below and publish when ready.');
        setFile(null);
        if (input.current) input.current.value = '';
      } catch {
        setMessage(
          'Browser storage is full or unavailable. Remove an unused module or try a smaller file.',
        );
      }
      setBusy(false);
    };
    reader.readAsDataURL(file);
  };
  const changeStatus = (id: string) => {
    setModules(
      modules.map((m) => (m.id === id ? { ...m, status: 'Published' } : m)),
    );
    setMessage('Module published to this program and subject.');
  };
  const remove = (id: string) => {
    if (window.confirm('Remove this module from the demo library?')) {
      setModules(modules.filter((m) => m.id !== id));
      setPreview(null);
      setMessage('Module removed.');
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
                  DOCX, or TXT · up to 2 MB per file.
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
                  if (!busy) chooseFile(e.dataTransfer.files[0]);
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
                  accept=".pdf,.docx,.txt"
                  disabled={busy}
                  onChange={(e) => chooseFile(e.target.files?.[0])}
                  className="mt-4 block w-full max-w-xs text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-blue-600"
                />
                <button
                  className={`mt-5 ${buttonClass}`}
                  disabled={busy || !file || !subject}
                  onClick={upload}
                >
                  {busy ? 'Saving file…' : 'Upload for review'}
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
                      onClick={() => remove(m.id)}
                      className="text-red-600"
                    >
                      Remove
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
              <div className="flex justify-between gap-3">
                <h2 className="break-all font-bold">{preview.filename}</h2>
                <button
                  onClick={() => setPreview(null)}
                  className="text-sm font-semibold text-blue-600"
                >
                  Close preview
                </button>
              </div>
              {/\.(txt|pdf)$/i.test(preview.filename) ? (
                <iframe
                  title={`Preview ${preview.filename}`}
                  sandbox=""
                  src={preview.file_data}
                  className="mt-4 h-96 w-full rounded-xl border"
                />
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Download this DOCX file to review it in your document editor.
                </p>
              )}
              <a
                href={preview.file_data}
                download={preview.filename}
                className="mt-4 inline-block text-sm font-semibold text-blue-600"
              >
                Download original file →
              </a>
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
