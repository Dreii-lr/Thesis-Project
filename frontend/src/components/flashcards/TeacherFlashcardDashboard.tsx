"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileEdit,
  Globe2,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  getUserCategories,
  DEFAULT_USER_CATEGORIES,
} from "@/src/lib/user-categories-api";
import { listSubjects } from "@/src/lib/subjects-api";
import { getAllMaterials } from "@/src/lib/document-processor-api";
import { useApiData } from "@/src/lib/use-api-data";
import { programMatches, subjectsForProgram } from "@/src/lib/lesson-workflow";
import { moduleDateLabel, moduleTitle } from "@/src/lib/module-library";
import {
  createCuratedCardId,
  type CuratedStudyDeck,
} from "@/src/lib/curated-flashcards";
import {
  createFlashcardDraft,
  deleteFlashcardDraft,
  draftFromPublishedDeck,
  type FlashcardDraftInput,
} from "@/src/lib/flashcard-drafts";
import {
  createFlashcardSession,
  flashcardStudyReducer,
  type FlashcardSession,
  type StudyAction,
} from "@/src/lib/flashcard-study";
import StudentPageHeader from "@/src/components/layout/student/StudentPageHeader";
import Modal from "@/src/components/ui/Modal";
import FlashcardGeneratorModal from "./FlashcardGeneratorModal";
import FlashcardStudy from "./FlashcardStudy";
import {
  useCuratedFlashcards,
  useFlashcardDrafts,
} from "./useCuratedFlashcards";

interface DashboardProps {
  authorName: string;
  authorId?: string;
  authorRole: "teacher" | "admin";
}
const actionClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-40";

function FlashcardDashboardContent({ authorId, authorRole }: DashboardProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [selectedProgram, setSelectedProgram] = useState(
    params.get("program") || "SECONDARY",
  );
  const [selectedSubject, setSelectedSubject] = useState(
    params.get("subject") || "ALL",
  );
  const [view, setView] = useState<"published" | "drafts">(
    params.get("view") === "drafts" ? "drafts" : "published",
  );
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(
    Boolean(
      params.get("lessonId") ||
      (params.get("generate") === "1" && params.get("materialId")),
    ),
  );
  const [notice, setNotice] = useState(
    params.get("published") === "1"
      ? "Flashcards published. Learners in this program can now study the set."
      : "",
  );
  const [actionError, setActionError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    kind: "draft" | "published";
    id: string;
    title: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deleteLock = useRef(false);
  const [studyingId, setStudyingId] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [sessions, setSessions] = useState<Record<string, FlashcardSession>>(
    {},
  );
  const { allDecks, loading, error, reload, remove } = useCuratedFlashcards(
    undefined,
    { scopeKey: authorId, enabled: Boolean(authorId) },
  );
  const local = useFlashcardDrafts(authorId);
  const loadOptions = useCallback(async () => {
    const [categories, subjects] = await Promise.all([
      getUserCategories(),
      listSubjects(),
    ]);
    return { categories, subjects };
  }, []);
  const options = useApiData(loadOptions);
  const loadModules = useCallback(() => getAllMaterials(), []);
  const modules = useApiData(loadModules);
  const categories = options.data?.categories || DEFAULT_USER_CATEGORIES;
  const category =
    categories.find(
      (item) =>
        item.category_id === selectedProgram ||
        programMatches(selectedProgram, item),
    ) ||
    categories.find((item) => item.code === "SECONDARY") ||
    categories[0];
  const subjects = subjectsForProgram(options.data?.subjects || [], category);
  const subject = subjects.find((item) => item.subject_id === selectedSubject);
  const programPublished = allDecks.filter(
    (item) =>
      item.categoryId === category.category_id ||
      programMatches(item.programCode, category),
  );
  const programDrafts = local.drafts.filter(
    (item) =>
      item.categoryId === category.category_id ||
      programMatches(item.programCode, category),
  );
  const sourceName = (id?: string | null) => {
    const material = modules.data?.find((item) => item.id === id);
    return material ? moduleTitle(material) : "";
  };
  const entries =
    view === "drafts"
      ? programDrafts.map((item) => ({
          ...item,
          kind: "draft" as const,
          sourceTitle: item.moduleTitle || sourceName(item.materialId),
        }))
      : programPublished.map((item) => ({
          ...item,
          kind: "published" as const,
          sourceTitle: sourceName(item.materialId),
        }));
  const visible = entries
    .filter(
      (item) =>
        `${item.title} ${item.description} ${item.subject} ${item.sourceTitle}`
          .toLowerCase()
          .includes(search.toLowerCase().trim()) &&
        (selectedSubject === "ALL" ||
          item.subjectId === selectedSubject ||
          item.subject.trim().toLowerCase() ===
            subject?.name.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "oldest"
          ? a.updatedAt.localeCompare(b.updatedAt)
          : b.updatedAt.localeCompare(a.updatedAt),
    );
  const active = allDecks.find((item) => item.id === studyingId);
  const sessionKey = active ? `${active.id}:${active.updatedAt}` : "";
  const onAction = useCallback(
    (action: StudyAction) => {
      if (active)
        setSessions((previous) => ({
          ...previous,
          [sessionKey]: flashcardStudyReducer(
            previous[sessionKey] || createFlashcardSession(active.cards),
            action,
          ),
        }));
    },
    [active, sessionKey],
  );
  const libraryHref = `/${authorRole}/flashcards?program=${encodeURIComponent(category.code)}&view=${view}`;

  const openDraft = (input: FlashcardDraftInput) => {
    if (!authorId)
      throw new Error("Sign in again before creating a private draft.");
    const draft = createFlashcardDraft(authorId, input);
    router.push(
      `/${authorRole}/flashcards/drafts/${encodeURIComponent(draft.id)}`,
    );
  };
  const createManual = () => {
    setActionError("");
    try {
      openDraft({
        title: "",
        description: "",
        categoryId: category.category_id,
        programCode: category.code,
        programName: category.name,
        subjectId: subject?.subject_id || "",
        subject: subject?.name || "",
        cards: [0, 1].map(() => ({
          id: createCuratedCardId(),
          term: "",
          definition: "",
          example: "",
        })),
      });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "A draft could not be created.",
      );
    }
  };
  const editPublished = (deck: CuratedStudyDeck) => {
    setActionError("");
    try {
      const existing = local.drafts.find(
        (item) => item.sourceDeckId === deck.id,
      );
      if (existing) {
        router.push(
          `/${authorRole}/flashcards/drafts/${encodeURIComponent(existing.id)}`,
        );
        return;
      }
      const matched = options.data?.subjects.find(
        (item) =>
          (item.category_id === category.category_id ||
            item.category_code === category.code) &&
          item.name.trim().toLowerCase() === deck.subject.trim().toLowerCase(),
      );
      openDraft({
        ...draftFromPublishedDeck(deck, matched?.subject_id),
        moduleTitle: sourceName(deck.materialId) || undefined,
      });
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "This set could not be opened for editing.",
      );
    }
  };
  const confirmDelete = async () => {
    if (!pendingDelete || deleteLock.current || !authorId) return;
    deleteLock.current = true;
    setDeleting(true);
    setActionError("");
    try {
      if (pendingDelete.kind === "draft")
        deleteFlashcardDraft(authorId, pendingDelete.id);
      else await remove(pendingDelete.id);
      if (studyingId === pendingDelete.id) setStudyingId(null);
      setNotice(
        pendingDelete.kind === "draft"
          ? "Private draft deleted from this browser."
          : "Published flashcards deleted. The set is no longer available to learners.",
      );
      setPendingDelete(null);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "The set could not be deleted. Please try again.",
      );
    } finally {
      deleteLock.current = false;
      setDeleting(false);
    }
  };
  const closeGenerator = () => {
    setIsGeneratorOpen(false);
    router.replace(libraryHref, { scroll: false });
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <StudentPageHeader
        eyebrow={`${category.name} / Flashcard studio`}
        title="Small cards. Lasting learning."
        description="Turn your lesson modules into thoughtful study sets. Shape your ideas in a private draft, then share them when they are ready."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!authorId || options.loading}
              onClick={() => setIsGeneratorOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-40"
            >
              <Sparkles size={15} /> Generate flashcards
            </button>
            <button
              type="button"
              disabled={!authorId || options.loading}
              onClick={createManual}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-semibold text-blue-900 shadow-sm transition hover:bg-blue-50 disabled:opacity-40"
            >
              <Plus size={15} /> Create manually
            </button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Published sets",
              value: programPublished.length,
              icon: Globe2,
            },
            {
              label: "Private drafts",
              value: programDrafts.length,
              icon: FileEdit,
            },
            {
              label: "Cards for learners",
              value: programPublished.reduce(
                (sum, deck) => sum + deck.cards.length,
                0,
              ),
              icon: Layers3,
            },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <span className="rounded-xl bg-white/10 p-2.5">
                <stat.icon size={17} />
              </span>
              <div>
                <p className="text-xl font-semibold">{stat.value}</p>
                <p className="mt-1 text-xs text-blue-100">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </StudentPageHeader>
      {notice && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800"
        >
          <CheckCircle2 size={17} className="mt-1 shrink-0" />
          {notice}
        </p>
      )}
      {actionError && !pendingDelete && (
        <p
          role="alert"
          className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
        >
          {actionError}
        </p>
      )}
      {options.error && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          {options.error}{" "}
          <button
            type="button"
            onClick={options.reload}
            className="font-semibold underline"
          >
            Retry subjects
          </button>
        </div>
      )}
      {!authorId && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 p-4 text-sm text-red-700"
        >
          Your teaching profile could not be loaded. Sign in again to manage
          flashcards.
        </p>
      )}
      {active ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStudyingId(null)}
              className={actionClass}
            >
              <ArrowLeft size={15} /> Back to flashcards
            </button>
            <button
              type="button"
              onClick={() => editPublished(active)}
              className={actionClass}
            >
              <Pencil size={15} /> Edit a private draft
            </button>
          </div>
          <div className="mx-auto max-w-4xl">
            <FlashcardStudy
              key={sessionKey}
              deck={active}
              session={
                sessions[sessionKey] || createFlashcardSession(active.cards)
              }
              onAction={onAction}
              focused={focused}
              onToggleFocus={() => setFocused((value) => !value)}
            />
          </div>
        </>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div
              role="group"
              aria-label="Learning program"
              className="flex flex-wrap gap-2"
            >
              {categories.map((item) => (
                <button
                  type="button"
                  key={item.category_id}
                  aria-pressed={item.category_id === category.category_id}
                  onClick={() => {
                    setSelectedProgram(item.code);
                    setSelectedSubject("ALL");
                    setSearch("");
                  }}
                  className={`min-h-10 rounded-xl px-4 py-2 text-xs font-semibold transition ${item.category_id === category.category_id ? "bg-blue-600 text-white shadow-sm" : "bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-700"}`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </section>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 pt-2 sm:px-5">
              <div
                role="tablist"
                aria-label="Flashcard library status"
                className="flex gap-5"
              >
                {(
                  [
                    {
                      id: "published",
                      label: "Published",
                      count: programPublished.length,
                      icon: Globe2,
                    },
                    {
                      id: "drafts",
                      label: "Drafts",
                      count: programDrafts.length,
                      icon: FileEdit,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    role="tab"
                    aria-selected={view === tab.id}
                    aria-controls="flashcard-library-panel"
                    id={`flashcard-tab-${tab.id}`}
                    type="button"
                    key={tab.id}
                    onClick={() => {
                      setView(tab.id);
                      setSearch("");
                      setNotice("");
                    }}
                    className={`inline-flex min-h-12 items-center gap-2 border-b-2 py-3 text-sm font-semibold transition ${view === tab.id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                  >
                    <tab.icon size={15} />
                    {tab.label}
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] ${view === tab.id ? "bg-blue-50 text-blue-700" : "bg-slate-100"}`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  reload();
                  local.reload();
                }}
                className="inline-flex items-center gap-1.5 py-3 text-xs font-semibold text-slate-500 hover:text-blue-600"
              >
                <RefreshCw size={13} /> Refresh library
              </button>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_180px_155px] sm:p-5">
              <label className="relative">
                <span className="mb-2 block text-xs font-medium text-slate-500">
                  Search study sets
                </span>
                <Search
                  size={15}
                  className="pointer-events-none absolute bottom-3.5 left-3 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search title, module, or subject…"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-9 pr-3 text-xs outline-none focus:border-blue-400"
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-medium text-slate-500">
                  Subject
                </span>
                <select
                  value={selectedSubject}
                  onChange={(event) => setSelectedSubject(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600 outline-none focus:border-blue-400"
                >
                  <option value="ALL">All subjects</option>
                  {subjects.map((item) => (
                    <option key={item.subject_id} value={item.subject_id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-medium text-slate-500">
                  Sort by
                </span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600 outline-none focus:border-blue-400"
                >
                  <option value="newest">Recently updated</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title">Title A–Z</option>
                </select>
              </label>
            </div>
          </section>
          <section
            id="flashcard-library-panel"
            role="tabpanel"
            aria-labelledby={`flashcard-tab-${view}`}
            className="space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-xs leading-6 text-slate-500">
                {view === "drafts"
                  ? "Private drafts are saved in this browser. Only your account can open them here."
                  : `Published sets are available to learners enrolled in ${category.name}.`}
              </p>
              <span className="text-xs text-slate-400">
                {visible.length} {visible.length === 1 ? "set" : "sets"}
              </span>
            </div>
            {(view === "published" ? error : local.error) ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700"
              >
                {view === "published" ? error : local.error}
                <button
                  type="button"
                  onClick={view === "published" ? reload : local.reload}
                  className="ml-2 font-semibold underline"
                >
                  Try again
                </button>
              </div>
            ) : (view === "published" ? loading : local.loading) ||
              options.loading ? (
              <p
                role="status"
                className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"
              >
                <Loader2 size={17} className="animate-spin" /> Opening your
                study sets…
              </p>
            ) : !visible.length ? (
              <div className="rounded-3xl border border-dashed border-blue-200 bg-white p-8 text-center sm:p-14">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  {view === "drafts" ? (
                    <FileEdit size={25} />
                  ) : (
                    <Layers3 size={25} />
                  )}
                </span>
                <h2 className="mt-5 text-lg font-semibold text-slate-900">
                  {search || selectedSubject !== "ALL"
                    ? "No matching study sets"
                    : view === "drafts"
                      ? "Your next study set starts here"
                      : "Ready when you are"}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {search || selectedSubject !== "ALL"
                    ? "Try another subject or search to find a set."
                    : view === "drafts"
                      ? "Generate cards from a lesson module or start a draft of your own. Learners will see it only after you publish."
                      : "Your published flashcards will appear here. Start with a draft and make it your own."}
                </p>
                {search || selectedSubject !== "ALL" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setSelectedSubject("ALL");
                    }}
                    className={`${actionClass} mt-6`}
                  >
                    Clear filters
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsGeneratorOpen(true)}
                    className={`${actionClass} mt-6`}
                  >
                    <Sparkles size={15} /> Generate a draft
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((item) => (
                  <article
                    key={`${item.kind}:${item.id}`}
                    className="group flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.kind === "draft" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}
                      >
                        {item.kind === "draft" ? (
                          <FileEdit size={21} />
                        ) : (
                          <Layers3 size={21} />
                        )}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${item.kind === "draft" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-100 bg-blue-50 text-blue-700"}`}
                      >
                        {item.kind === "draft"
                          ? "Draft · Private"
                          : "Published"}
                      </span>
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {item.subject || "Subject not selected"}
                    </p>
                    <h2 className="mt-2 break-words text-lg font-semibold leading-7 text-slate-900">
                      {item.title || "Untitled study set"}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-500">
                      {item.description ||
                        "A few thoughtful cards can make a big difference."}
                    </p>
                    <div className="my-4 space-y-2 text-[11px] leading-5 text-slate-400">
                      <p className="flex items-start gap-2">
                        <BookOpen size={13} className="mt-0.5 shrink-0" />
                        <span className="line-clamp-1">
                          {item.sourceTitle ||
                            (item.materialId
                              ? "Linked lesson module"
                              : "Manually created")}
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <CalendarDays size={13} /> Updated{" "}
                        {moduleDateLabel(item.updatedAt)}
                      </p>
                      <p>
                        {item.cards.length} cards ·{" "}
                        {item.generationScope === "FULL_MODULE"
                          ? "Entire module"
                          : item.generationScope === "SINGLE_TOPIC"
                            ? "One topic"
                            : category.name}
                      </p>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      {item.kind === "draft" ? (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/${authorRole}/flashcards/drafts/${encodeURIComponent(item.id)}`,
                            )
                          }
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700"
                        >
                          Continue draft <ArrowUpRight size={14} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setStudyingId(item.id);
                            setFocused(false);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700"
                        >
                          Study set <ChevronRight size={14} />
                        </button>
                      )}
                      <div className="flex gap-1">
                        {item.kind === "published" && (
                          <button
                            type="button"
                            aria-label={`Edit ${item.title}`}
                            onClick={() => {
                              const deck = allDecks.find(
                                (deck) => deck.id === item.id,
                              );
                              if (deck) editPublished(deck);
                            }}
                            className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`Delete ${item.title || "untitled draft"}`}
                          onClick={() => {
                            setPendingDelete({
                              id: item.id,
                              kind: item.kind,
                              title: item.title || "Untitled study set",
                            });
                            setActionError("");
                          }}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
      {isGeneratorOpen && !options.loading && (
        <FlashcardGeneratorModal
          key={category.category_id}
          categories={categories}
          activeCategory={category}
          initialProgramCode={category.code}
          subjects={options.data?.subjects || []}
          initialSubjectId={
            selectedSubject !== "ALL" ? selectedSubject : undefined
          }
          initialMaterialId={params.get("materialId") || undefined}
          initialLessonId={params.get("lessonId") || undefined}
          initialTopic={params.get("topic") || undefined}
          onGenerated={openDraft}
          onClose={closeGenerator}
        />
      )}
      {pendingDelete && (
        <Modal
          title={
            pendingDelete.kind === "draft"
              ? "Delete this private draft?"
              : "Delete these published flashcards?"
          }
          pending={deleting}
          onClose={() => {
            if (!deleting) setPendingDelete(null);
          }}
        >
          <p className="text-sm leading-6 text-slate-500">
            {pendingDelete.kind === "draft"
              ? "This removes the draft from this browser. Your published flashcards are unaffected."
              : "This removes the set from the shared library. Learners will no longer be able to open it."}
          </p>
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-800">
            {pendingDelete.title}
          </p>
          {actionError && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {actionError}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setPendingDelete(null)}
              className={actionClass}
            >
              Keep {pendingDelete.kind === "draft" ? "draft" : "set"}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={confirmDelete}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting && <Loader2 size={14} className="animate-spin" />}
              {deleting
                ? "Deleting…"
                : pendingDelete.kind === "draft"
                  ? "Delete draft"
                  : "Delete published set"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FlashcardDashboardRoute(props: DashboardProps) {
  const params = useSearchParams();
  return <FlashcardDashboardContent key={params.toString()} {...props} />;
}
export default function TeacherFlashcardDashboard(props: DashboardProps) {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-12 text-center text-sm text-slate-500">
          Opening flashcard studio…
        </p>
      }
    >
      <FlashcardDashboardRoute {...props} />
    </Suspense>
  );
}
