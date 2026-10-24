"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileEdit,
  FolderArchive,
  FolderOpen,
  Layers3,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Modal from "@/src/components/ui/Modal";
import {
  deleteMaterialById,
  DocumentServiceError,
  getMaterialById,
  getLessonsByMaterial,
  matchMaterialToSubject,
  normalizeMaterialStatus,
  type MaterialItem,
} from "@/src/lib/document-processor-api";
import type { SubjectRecord } from "@/src/lib/subjects-api";
import type { UserCategoryItem } from "@/src/lib/user-categories-api";
import { flashcardHref } from "@/src/lib/lesson-workflow";
import { useOptionalAuth } from "@/src/context/AuthContext";
import {
  forgetLessonGeneration,
  hasPendingLessonGeneration,
  isLessonGenerationActive,
  useLessonGeneration,
} from "@/src/lib/lesson-generation";
import {
  emptyModuleFilters,
  filterCount,
  filterLibraryModules,
  MODULE_SORTS,
  moduleDateLabel,
  moduleTitle,
  sortLibraryModules,
  type ModuleFilters,
  type ModuleSort,
} from "@/src/lib/module-library";
import ModuleLibraryControls, {
  ModuleFilterChips,
} from "./ModuleLibraryControls";

export interface ModuleActionNotice {
  title: string;
  message: string;
  kind: "success" | "info";
}

export default function ModuleLibrary({
  materials,
  category,
  subjects,
  loading,
  unavailable,
  initialSubjectId,
  onUpload,
  onDeleted,
  onUpdated,
  onNotice,
  renderHeader,
}: {
  renderHeader: (overview: ReactNode) => ReactNode;
  materials: MaterialItem[];
  category: UserCategoryItem;
  subjects: SubjectRecord[];
  loading: boolean;
  unavailable: boolean;
  initialSubjectId?: string;
  onUpload: () => void;
  onDeleted: (id: string) => void;
  onUpdated: (material: MaterialItem) => void;
  onNotice: (notice: ModuleActionNotice) => void;
}) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ModuleFilters>(() => ({
    ...emptyModuleFilters(),
    subjectIds: initialSubjectId ? [initialSubjectId] : [],
  }));
  const [sort, setSort] = useState<ModuleSort>("newest");
  const [visibleCount, setVisibleCount] = useState(12);
  const [deleting, setDeleting] = useState<MaterialItem | null>(null);
  const [pending, setPending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteUncertain, setDeleteUncertain] = useState(false);
  const [deleteStillExists, setDeleteStillExists] = useState(false);
  const user = useOptionalAuth()?.user;
  const owner = String(user?.user_id || user?.id || "");
  const deleteLock = useRef(false);
  const uncertainDeletes = useRef(new Set<string>());
  function deletionKey(id: string) {
    return `als-module-delete:v1:${encodeURIComponent(owner)}:${encodeURIComponent(id)}`;
  }
  function rememberDeletion(id: string, unconfirmed: boolean) {
    if (unconfirmed) uncertainDeletes.current.add(id);
    else uncertainDeletes.current.delete(id);
    try {
      if (unconfirmed) localStorage.setItem(deletionKey(id), "pending");
      else localStorage.removeItem(deletionKey(id));
    } catch {
      /* The current page still prevents repeated deletion requests. */
    }
  }
  function deletionPending(id: string) {
    try {
      return (
        uncertainDeletes.current.has(id) ||
        localStorage.getItem(deletionKey(id)) === "pending"
      );
    } catch {
      return uncertainDeletes.current.has(id);
    }
  }
  const results = useMemo(
    () =>
      sortLibraryModules(
        filterLibraryModules(materials, subjects, filters, query),
        sort,
      ),
    [materials, subjects, filters, query, sort],
  );
  const filtered = filterCount(filters) > 0 || Boolean(query.trim());

  function changeFilters(next: ModuleFilters) {
    setFilters(next);
    setVisibleCount(12);
  }
  function closeDelete() {
    if (!deleteLock.current) {
      setDeleting(null);
      setDeleteError("");
      setDeleteUncertain(false);
    }
  }
  async function confirmDelete() {
    if (!deleting || deleteLock.current) return;
    if (isLessonGenerationActive(owner, deleting)) {
      setDeleteError(
        "Content generation is still running in this browser. Wait for it to finish before deleting this module.",
      );
      return;
    }
    if (!deleting.id?.trim()) {
      setDeleteError(
        "This module has no valid ID. Refresh your library and try again.",
      );
      return;
    }
    deleteLock.current = true;
    setPending(true);
    setDeleteError("");
    try {
      if (deleteUncertain || deletionPending(deleting.id)) {
        setDeleteUncertain(true);
        try {
          await getMaterialById(deleting.id, { timeoutMs: 8000 });
          setDeleteStillExists(true);
          setDeleteError(
            "The server still lists this module. The earlier delete may still be waiting on generation. Check again after processing finishes; if it remains blocked, the document service needs attention.",
          );
          return;
        } catch (error) {
          if (!(error instanceof DocumentServiceError) || error.status !== 404)
            throw error;
        }
      } else {
        const submit = async () => {
          if (deletionPending(deleting.id))
            throw new DocumentServiceError(
              "Another deletion is awaiting confirmation. Check its status first.",
              0,
              true,
            );
          rememberDeletion(deleting.id, true);
          await deleteMaterialById(deleting.id);
        };
        if (navigator.locks)
          await navigator.locks.request(
            `als-module-delete:${deleting.id}`,
            { ifAvailable: true },
            async (lock) => {
              if (!lock)
                throw new DocumentServiceError(
                  "Deletion is already running in another tab. Check its status before trying again.",
                  0,
                  true,
                );
              await submit();
            },
          );
        else await submit();
      }
      rememberDeletion(deleting.id, false);
      forgetLessonGeneration(owner, deleting.id);
      onDeleted(deleting.id);
      onNotice({
        kind: "success",
        title: "Module deleted",
        message: `“${moduleTitle(deleting)}” was removed from your module library.`,
      });
      setDeleting(null);
      setDeleteUncertain(false);
    } catch (err) {
      const uncertain =
        deleteUncertain ||
        (err instanceof DocumentServiceError && err.outcomeUnknown);
      rememberDeletion(deleting.id, uncertain);
      setDeleteUncertain(uncertain);
      setDeleteError(
        err instanceof Error
          ? err.message
          : "The module could not be deleted. Please try again.",
      );
    } finally {
      deleteLock.current = false;
      setPending(false);
    }
  }

  const summaries = [
    {
      label: "All modules",
      status: null,
      icon: BookOpen,
    },
    {
      label: "Drafts",
      status: "DRAFT" as const,
      icon: FileEdit,
    },
    {
      label: "Published",
      status: "PUBLISHED" as const,
      icon: CheckCircle2,
    },
    {
      label: "Archived",
      status: "ARCHIVED" as const,
      icon: FolderArchive,
    },
  ];

  const overview = (
    <div
      role="group"
      aria-label="Module overview"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {summaries.map((summary) => {
        const active = summary.status
          ? filters.statuses.length === 1 &&
            filters.statuses[0] === summary.status
          : filters.statuses.length === 0;
        const count = summary.status
          ? materials.filter(
              (material) =>
                normalizeMaterialStatus(material.status) === summary.status,
            ).length
          : materials.length;
        return (
          <button
            key={summary.label}
            type="button"
            aria-pressed={active}
            disabled={loading}
            onClick={() =>
              changeFilters({
                ...filters,
                statuses: summary.status ? [summary.status] : [],
              })
            }
            className={`relative flex min-h-20 w-full min-w-0 flex-col items-start justify-between gap-1 rounded-2xl border px-4 py-3 text-left shadow-sm backdrop-blur-md transition-colors duration-150 ${active ? "border-white/40 bg-white/20" : "border-white/20 bg-white/10 hover:border-white/35 hover:bg-white/15"} disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
          >
            <summary.icon
              size={18}
              strokeWidth={1.75}
              aria-hidden="true"
              className="absolute right-4 top-4 text-blue-100"
            />
            <span className="max-w-full truncate pr-8 text-xl font-semibold leading-7 tracking-tight text-white tabular-nums">
              {loading ? "—" : count}
            </span>
            <span className="text-xs font-medium leading-4 text-blue-50">
              {summary.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5">
      {renderHeader(overview)}

      <section
        className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_16px_-10px_rgba(15,23,42,0.12)]"
        aria-label="Module library"
      >
        <div className="space-y-4 border-b border-slate-100 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-slate-900">Your modules</h2>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500">
                {materials.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              All your lesson content, in one place
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="relative block min-w-0 flex-1 basis-52">
              <span className="sr-only">Search modules</span>
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-3 text-slate-400"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleCount(12);
                }}
                placeholder="Search modules or topics…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-50"
              />
            </label>
            <ModuleLibraryControls
              materials={materials}
              subjects={subjects}
              filters={filters}
              query={query}
              sort={sort}
              onChange={changeFilters}
              onSort={(next) => {
                setSort(next);
                setVisibleCount(12);
              }}
            />
          </div>
          {filterCount(filters) > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <ModuleFilterChips
                filters={filters}
                subjects={subjects}
                onChange={changeFilters}
              />
              <button
                type="button"
                onClick={() => changeFilters(emptyModuleFilters())}
                className="px-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-1 pt-4 sm:px-6">
          <p aria-live="polite" className="text-[11px] text-slate-400">
            {loading
              ? "Loading your library…"
              : `Showing ${Math.min(visibleCount, results.length)} of ${results.length} ${results.length === 1 ? "module" : "modules"}`}
            {filtered && !loading
              ? ` · ${materials.length} in this program`
              : ""}
          </p>
          <span className="text-[10px] text-slate-400">
            {MODULE_SORTS.find((option) => option.value === sort)?.label}
          </span>
        </div>
        {loading ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2.5 py-20 text-xs text-slate-500"
          >
            <Loader2 size={18} className="animate-spin text-blue-600" />
            Loading module library…
          </div>
        ) : results.length ? (
          <div className="space-y-3 p-4 sm:p-5">
            {results.slice(0, visibleCount).map((material) => {
              const status = normalizeMaterialStatus(material.status);
              const subject = subjects.find((item) =>
                matchMaterialToSubject(material, item),
              );
              const href = `/teacher/lesson-content/${encodeURIComponent(material.id)}?${new URLSearchParams({ program: category.code.toLowerCase(), ...(subject ? { subject: subject.subject_id } : {}) })}`;
              const topics = material.structured_records || [];
              const title = moduleTitle(material);
              const statusClass =
                status === "PUBLISHED"
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                  : status === "ARCHIVED"
                    ? "bg-slate-100 text-slate-500 ring-slate-200/70"
                    : "bg-amber-50 text-amber-700 ring-amber-100";
              return (
                <article
                  key={material.id}
                  className="group rounded-xl border border-slate-200/80 bg-white p-4 transition hover:border-blue-200 hover:shadow-[0_4px_20px_-14px_rgba(50,105,77,0.4)] sm:p-5"
                >
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50/80 text-blue-600 ring-1 ring-inset ring-blue-100/70">
                      <BookOpen size={21} strokeWidth={1.7} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                          {material.learning_strand || "Curriculum material"}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold ring-1 ring-inset ${statusClass}`}
                        >
                          <span
                            className={`size-1 rounded-full ${status === "PUBLISHED" ? "bg-emerald-500" : status === "ARCHIVED" ? "bg-slate-400" : "bg-amber-500"}`}
                          />
                          {status.charAt(0) + status.slice(1).toLowerCase()}
                        </span>
                      </div>
                      <h3>
                        <Link
                          href={href}
                          title={title}
                          className="line-clamp-2 text-sm font-semibold leading-6 text-slate-900 transition hover:text-blue-700 sm:text-[15px]"
                        >
                          {title}
                        </Link>
                      </h3>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Layers3 size={12} />
                          {topics.length}{" "}
                          {topics.length === 1 ? "topic" : "topics"}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={12} />
                          Created {moduleDateLabel(material.created_at)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete ${title}`}
                      title="Delete module"
                      disabled={pending}
                      onClick={() => {
                        const uncertain = deletionPending(material.id);
                        setDeleteError(
                          uncertain
                            ? "A previous deletion is awaiting server confirmation. Check its status before sending another request."
                            : "",
                        );
                        setDeleteUncertain(uncertain);
                        setDeleteStillExists(false);
                        setDeleting(material);
                      }}
                      className="-mr-1 -mt-1 shrink-0 rounded-lg p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-rose-400 disabled:opacity-40"
                    >
                      <Trash2 size={16} strokeWidth={1.7} />
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100/80 pt-3.5">
                    <ModuleGenerationStatus
                      material={material}
                      onUpdated={onUpdated}
                    />
                    <div className="flex min-w-0 flex-wrap gap-1.5">
                      {topics.slice(0, 2).map((topic, index) => (
                        <span
                          key={index}
                          title={topic.main_topic}
                          className="max-w-44 truncate rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-500"
                        >
                          {topic.main_topic}
                        </span>
                      ))}
                      {topics.length > 2 && (
                        <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-400">
                          +{topics.length - 2} more
                        </span>
                      )}
                    </div>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      <ModuleFlashcardAction
                        material={material}
                        program={category.code}
                        subjectId={subject?.subject_id}
                        onNotice={onNotice}
                      />
                      <Link
                        href={href}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-700"
                      >
                        {status === "DRAFT" ? "Continue draft" : "Open module"}
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
            {results.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount((value) => value + 12)}
                className="mt-2 w-full rounded-xl border border-dashed border-slate-200 py-3 text-xs font-semibold text-slate-500 transition hover:border-blue-200 hover:bg-blue-50/40 hover:text-blue-700"
              >
                Load more modules · {results.length - visibleCount} remaining
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="mb-4 rounded-2xl bg-blue-50 p-4 text-blue-500">
              <FolderOpen size={28} strokeWidth={1.5} />
            </span>
            <h3 className="text-sm font-semibold text-slate-800">
              {unavailable
                ? "Your library is unavailable"
                : filtered
                  ? "No modules match these filters"
                  : "Make room for your next lesson"}
            </h3>
            <p className="mt-2 max-w-xs text-xs leading-6 text-slate-400">
              {unavailable
                ? "Use Retry above to reconnect and load your saved modules."
                : filtered
                  ? "Try a different subject or status, or broaden the upload date range."
                  : "Upload an ALS ILA document to start building a new lesson module."}
            </p>
            {!unavailable && (
              <button
                type="button"
                onClick={() => {
                  if (filtered) {
                    changeFilters(emptyModuleFilters());
                    setQuery("");
                  } else onUpload();
                }}
                className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                {filtered ? "Clear filters & search" : "Upload a document"}
              </button>
            )}
          </div>
        )}
      </section>
      {deleting && (
        <Modal
          title="Delete this module?"
          onClose={closeDelete}
          pending={pending}
        >
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/60 p-4">
            <span className="rounded-lg bg-white p-2 text-rose-600">
              <Trash2 size={18} />
            </span>
            <div className="min-w-0">
              <p className="line-clamp-3 text-sm font-semibold leading-6 text-slate-800">
                {moduleTitle(deleting)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {deleting.structured_records?.length || 0} topics ·{" "}
                {normalizeMaterialStatus(deleting.status).toLowerCase()} ·{" "}
                {category.name}
              </p>
            </div>
          </div>
          <p className="text-sm leading-7 text-slate-600">
            This will permanently delete the module and its generated lesson
            content. This action cannot be undone.
          </p>
          {hasPendingLessonGeneration(owner, deleting) &&
            !isLessonGenerationActive(owner, deleting) && (
              <p className="mt-2 text-xs leading-6 text-amber-700">
                The earlier generation request has an unverified status.
                Deletion will be sent to the server; any processing conflict
                will be shown here.
              </p>
            )}
          {normalizeMaterialStatus(deleting.status) === "PUBLISHED" && (
            <p className="mt-2 text-xs leading-6 text-amber-700">
              This module is published. Learners will lose access to its lesson
              content.
            </p>
          )}
          {deleteError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs leading-6 text-rose-700"
            >
              <AlertCircle size={15} className="mt-1 shrink-0" />
              <span>
                {deleteError}{" "}
                {deleteUncertain
                  ? "The item stays visible until deletion is confirmed."
                  : "The item has not been removed from this view."}
              </span>
            </div>
          )}
          {deleteUncertain && deleteStillExists && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
              If the document service has recovered and the earlier request has
              stopped, you can prepare a new deletion.
              <button
                type="button"
                disabled={pending}
                className="mt-2 block font-semibold underline underline-offset-2 disabled:opacity-50"
                onClick={() => {
                  if (!deleting) return;
                  rememberDeletion(deleting.id, false);
                  setDeleteUncertain(false);
                  setDeleteStillExists(false);
                  setDeleteError(
                    "A new deletion is ready. Confirm below after checking that processing has stopped.",
                  );
                }}
              >
                Retry after service recovery
              </button>
            </div>
          )}
          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={closeDelete}
              disabled={pending}
              autoFocus
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Keep module
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              {pending
                ? deleteUncertain
                  ? "Checking deletion…"
                  : "Deleting module…"
                : deleteUncertain
                  ? "Check deletion status"
                  : deleteError
                    ? "Try deleting again"
                    : "Delete module"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ModuleGenerationStatus({
  material,
  onUpdated,
}: {
  material: MaterialItem;
  onUpdated: (material: MaterialItem) => void;
}) {
  const { state } = useLessonGeneration(material, true);
  useEffect(() => {
    if (state?.phase !== "ready") return;
    let active = true;
    void getMaterialById(material.id)
      .then((updated) => {
        if (active) onUpdated(updated);
      })
      .catch(() => {
        /* Keep the last verified module metadata. */
      });
    return () => {
      active = false;
    };
  }, [state?.phase, material.id, onUpdated]);
  if (
    !state ||
    (state.phase === "checking" && !state.pending) ||
    state.phase === "idle"
  )
    return null;
  const processing = state.phase === "processing";
  const checking = state.phase === "checking";
  return (
    <span
      role="status"
      className={`inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${state.phase === "ready" ? "bg-emerald-50 text-emerald-700" : state.phase === "failed" || state.phase === "unknown" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-700"}`}
      title={state.message}
    >
      {processing || checking ? (
        <Loader2
          size={12}
          className="shrink-0 animate-spin motion-reduce:animate-none"
        />
      ) : state.phase === "ready" ? (
        <CheckCircle2 size={12} />
      ) : (
        <AlertCircle size={12} />
      )}
      {processing
        ? "Processing lesson content"
        : checking
          ? "Checking generation progress"
          : state.phase === "ready"
            ? "Content ready"
            : state.phase === "partial"
              ? "Partial content saved"
              : state.phase === "failed"
                ? "Generation failed"
                : "Progress unavailable"}
      {state.completed > 0 && (
        <span className="tabular-nums">
          · {state.completed}/{state.total} topics saved
        </span>
      )}
    </span>
  );
}

function ModuleFlashcardAction({
  material,
  program,
  subjectId,
  onNotice,
}: {
  material: MaterialItem;
  program: string;
  subjectId?: string;
  onNotice: (notice: ModuleActionNotice) => void;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const lock = useRef(false);
  const published = normalizeMaterialStatus(material.status) === "PUBLISHED";
  async function open() {
    if (lock.current || !published) return;
    lock.current = true;
    setChecking(true);
    try {
      const [current, content] = await Promise.all([
        getMaterialById(material.id),
        getLessonsByMaterial(material.id),
      ]);
      if (normalizeMaterialStatus(current.status) !== "PUBLISHED")
        throw new Error("Publish this module before creating flashcards.");
      if (
        !content.lessons?.some((lesson) => lesson.material_id === material.id)
      )
        throw new Error(
          "Generate the lesson content for this module before creating flashcards.",
        );
      router.push(flashcardHref(material, program, subjectId));
    } catch (err) {
      onNotice({
        kind: "info",
        title: "Flashcards are not ready yet",
        message:
          err instanceof Error
            ? err.message
            : "The source content could not be checked. Please try again.",
      });
    } finally {
      lock.current = false;
      setChecking(false);
    }
  }
  return (
    <button
      type="button"
      disabled={!published || checking}
      onClick={open}
      title={
        published
          ? "Create flashcards from this module’s generated lessons"
          : "Publish this module and generate its lesson content first"
      }
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
    >
      {checking ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <Layers3 size={13} />
      )}
      {checking ? "Checking lessons…" : "Create flashcards"}
    </button>
  );
}

export function ModuleNotice({
  notice,
  onDismiss,
}: {
  notice: ModuleActionNotice;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-blue-200/70 bg-blue-50/80 px-4 py-3.5"
    >
      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-600" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-blue-900">{notice.title}</p>
        <p className="mt-1 text-xs leading-6 text-blue-800/75">
          {notice.message}
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="rounded-lg p-1 text-blue-600/60 hover:bg-blue-100"
      >
        <X size={15} />
      </button>
    </div>
  );
}
