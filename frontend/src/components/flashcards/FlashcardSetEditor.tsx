"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileEdit,
  Globe2,
  Layers3,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { useApiData } from "@/src/lib/use-api-data";
import { getUserCategories } from "@/src/lib/user-categories-api";
import { listSubjects } from "@/src/lib/subjects-api";
import {
  getMaterialById,
  getLessonsByMaterial,
  normalizeMaterialStatus,
} from "@/src/lib/document-processor-api";
import {
  materialInProgram,
  programMatches,
  subjectsForProgram,
} from "@/src/lib/lesson-workflow";
import { moduleTitle } from "@/src/lib/module-library";
import {
  createCuratedCardId,
  type CuratedStudyDeck,
} from "@/src/lib/curated-flashcards";
import { listAllFlashcardsApi } from "@/src/lib/curated-flashcards-api";
import {
  readFlashcardDrafts,
  saveFlashcardDraft,
  deleteFlashcardDraft,
  draftPublicationInput,
  findDraftPublicationTarget,
  type FlashcardDraft,
} from "@/src/lib/flashcard-drafts";
import StudentPageHeader from "@/src/components/layout/student/StudentPageHeader";
import Modal from "@/src/components/ui/Modal";
import FlipCard from "./FlipCard";
import { useCuratedFlashcards } from "./useCuratedFlashcards";

const inputClass =
  "mt-2 block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500";
const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50";
const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50";

export default function FlashcardSetEditor() {
  const { user, role, isLoading } = useAuth();
  const { draftId } = useParams<{ draftId: string }>();
  if (isLoading)
    return (
      <p role="status" className="p-12 text-center text-sm text-slate-500">
        Opening your draft…
      </p>
    );
  if (!user?.user_id || !["teacher", "admin"].includes(role || ""))
    return (
      <p role="alert" className="p-8">
        Sign in with your teaching account to open this draft.
      </p>
    );
  return (
    <DraftLoader
      key={`${user.user_id}:${draftId}`}
      ownerId={user.user_id}
      draftId={draftId}
      authorName={
        user.full_name ||
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        "ALS Teacher"
      }
      authorRole={role === "admin" ? "admin" : "teacher"}
    />
  );
}

function DraftLoader({
  ownerId,
  draftId,
  authorName,
  authorRole,
}: {
  ownerId: string;
  draftId: string;
  authorName: string;
  authorRole: "teacher" | "admin";
}) {
  const load = useCallback(async () => {
    const draft = readFlashcardDrafts(ownerId).find(
      (item) => item.id === draftId,
    );
    if (!draft)
      throw new Error(
        "This draft is not available for your account in this browser.",
      );
    return draft;
  }, [ownerId, draftId]);
  const result = useApiData(load);
  if (result.loading)
    return (
      <p role="status" className="p-12 text-center text-sm text-slate-500">
        Opening your draft…
      </p>
    );
  if (!result.data)
    return (
      <div className="m-6 rounded-2xl border border-slate-200 bg-white p-8">
        <p role="alert" className="text-sm text-slate-600">
          {result.error}
        </p>
        <Link
          href={`/${authorRole}/flashcards?view=drafts`}
          className="mt-4 inline-flex text-sm font-semibold text-blue-600"
        >
          Back to flashcards
        </Link>
      </div>
    );
  return (
    <DraftEditor
      initial={result.data}
      authorName={authorName}
      authorRole={authorRole}
    />
  );
}

function DraftEditor({
  initial,
  authorName,
  authorRole,
}: {
  initial: FlashcardDraft;
  authorName: string;
  authorRole: "teacher" | "admin";
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const operationLock = useRef(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [publicationTarget, setPublicationTarget] =
    useState<CuratedStudyDeck | null>(null);
  const [published, setPublished] = useState<CuratedStudyDeck | null>(null);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState(initial.cards[0]?.id || "");
  const [flipped, setFlipped] = useState(false);
  const { save } = useCuratedFlashcards(undefined, {
    enabled: false,
    scopeKey: initial.ownerId,
  });
  const loadOptions = useCallback(async () => {
    const [categories, subjects] = await Promise.all([
      getUserCategories(),
      listSubjects(),
    ]);
    return { categories, subjects };
  }, []);
  const options = useApiData(loadOptions);
  const loadSource = useCallback(
    () =>
      draft.materialId
        ? getMaterialById(draft.materialId)
        : Promise.resolve(null),
    [draft.materialId],
  );
  const source = useApiData(loadSource);
  const category = options.data?.categories.find(
    (item) =>
      item.category_id === draft.categoryId ||
      programMatches(draft.programCode, item),
  );
  const subjects = category
    ? subjectsForProgram(options.data?.subjects || [], category)
    : [];
  const subject = subjects.find((item) => item.subject_id === draft.subjectId);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const libraryHref = `/${authorRole}/flashcards?program=${encodeURIComponent(draft.programCode)}&view=drafts`;
  const sourceTitle =
    draft.moduleTitle ||
    (source.data
      ? moduleTitle(source.data)
      : draft.materialId
        ? "Linked lesson module"
        : "Manually created study set");
  const card =
    draft.cards.find((item) => item.id === previewId) || draft.cards[0];
  const ready = draft.cards.filter(
    (item) => item.term.trim() && item.definition.trim(),
  ).length;

  useEffect(() => {
    if ((!dirty && !busy) || published) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onWorkspaceNavigation = (event: Event) => {
      event.preventDefault();
      if (!busy)
        setLeaveHref((event as CustomEvent<{ href: string }>).detail.href);
    };
    const onLink = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const target = new URL(anchor.href);
      if (target.origin !== location.origin || target.href === location.href)
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!busy)
        setLeaveHref(`${target.pathname}${target.search}${target.hash}`);
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener(
      "als-flashcard-draft-navigate",
      onWorkspaceNavigation,
    );
    document.addEventListener("click", onLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener(
        "als-flashcard-draft-navigate",
        onWorkspaceNavigation,
      );
      document.removeEventListener("click", onLink, true);
    };
  }, [dirty, busy, published]);

  const change = (patch: Partial<FlashcardDraft>) => {
    setDraft((previous) => ({ ...previous, ...patch }));
    setError("");
    setNotice("");
  };
  const updateCard = (
    id: string,
    patch: Partial<FlashcardDraft["cards"][number]>,
  ) =>
    change({
      cards: draft.cards.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  const saveDraft = () => {
    try {
      const record = saveFlashcardDraft(initial.ownerId, draft);
      setDraft(record);
      setSaved(record);
      setError("");
      setNotice("Draft saved in this browser. Students cannot see it yet.");
      return record;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The draft could not be saved. Check that browser storage is available.",
      );
      return null;
    }
  };
  const back = () => {
    if (!busy) {
      if (dirty) setLeaveHref(libraryHref);
      else router.push(libraryHref);
    }
  };
  const reorder = (index: number, direction: -1 | 1) => {
    const cards = [...draft.cards];
    [cards[index], cards[index + direction]] = [
      cards[index + direction],
      cards[index],
    ];
    change({ cards });
  };
  const validateSource = async () => {
    if (!category || !subject)
      throw new Error(
        "Choose a current subject for your learning program before publishing.",
      );
    if (!draft.materialId) return;
    const [material, content] = await Promise.all([
      getMaterialById(draft.materialId),
      getLessonsByMaterial(draft.materialId),
    ]);
    if (
      normalizeMaterialStatus(material.status) !== "PUBLISHED" ||
      !materialInProgram(material, category)
    )
      throw new Error(
        "The source module must still be published in this learning program.",
      );
    const sourceLessons = (content.lessons || []).filter(
      (item) => item.material_id === draft.materialId,
    );
    if (
      !sourceLessons.length ||
      (draft.lessonId &&
        !sourceLessons.some((item) => item.id === draft.lessonId))
    )
      throw new Error(
        "The source lesson is no longer available. Return to the module and check its lesson content.",
      );
  };
  const preparePublish = async () => {
    if (operationLock.current) return;
    setError("");
    setNotice("");
    try {
      draftPublicationInput(draft);
      if (!category || !subject)
        throw new Error(
          "Choose a current subject for your learning program before publishing.",
        );
      operationLock.current = true;
      setBusy(true);
      if (!saveDraft()) return;
      await validateSource();
      const decks = await listAllFlashcardsApi();
      const target = findDraftPublicationTarget(draft, decks);
      if (draft.sourceDeckId && !target)
        throw new Error(
          "The original published set is no longer available. Your draft is still saved.",
        );
      setPublicationTarget(target || null);
      setConfirmPublish(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Publication could not be prepared. Please try again.",
      );
    } finally {
      operationLock.current = false;
      setBusy(false);
    }
  };
  const publish = async () => {
    if (operationLock.current) return;
    operationLock.current = true;
    setBusy(true);
    setError("");
    try {
      const record = saveDraft();
      if (!record) return;
      await validateSource();
      const result = await save(
        draftPublicationInput(
          {
            ...record,
            programCode: category?.code || record.programCode,
            programName: category?.name || record.programName,
            subject: subject?.name || record.subject,
          },
          publicationTarget?.id,
        ),
        { authorId: initial.ownerId, authorName, authorRole },
      );
      let cleanupNotice = "";
      try {
        deleteFlashcardDraft(initial.ownerId, record.id);
      } catch {
        cleanupNotice =
          "Your set is published, but its saved browser draft could not be removed.";
      }
      setNotice(cleanupNotice);
      setPublished(result);
      setConfirmPublish(false);
      setSaved(record);
      setDraft(record);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Flashcards could not be published. Your draft is still saved.",
      );
    } finally {
      operationLock.current = false;
      setBusy(false);
    }
  };

  if (published)
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <StudentPageHeader
          eyebrow="Ready for your learners"
          title="Your flashcards are published"
          description={`${published.cards.length} cards are now available to students enrolled in ${published.programName}, under ${published.subject}.`}
        />
        <section className="rounded-3xl border border-blue-100 bg-white p-7 sm:p-10">
          <CheckCircle2 className="mb-5 text-blue-600" size={38} />
          <h2 className="text-2xl font-semibold text-slate-900">
            {published.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Students can find this set in their flashcard library and start
            studying after refreshing their sets.
          </p>
          {notice && (
            <p role="status" className="mt-3 text-sm text-amber-700">
              {notice}
            </p>
          )}
          <Link
            href={`/${authorRole}/flashcards?program=${encodeURIComponent(published.programCode)}&view=published&published=1`}
            className={`${primaryButton} mt-7`}
          >
            View published sets <ChevronRight size={16} />
          </Link>
        </section>
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-xs text-slate-500"
      >
        <button
          type="button"
          onClick={back}
          disabled={busy}
          className="inline-flex items-center gap-1.5 font-medium hover:text-blue-600"
        >
          <ArrowLeft size={14} /> Flashcards
        </button>
        <ChevronRight size={12} />
        <span>Draft editor</span>
      </nav>
      <StudentPageHeader
        eyebrow="Flashcard studio / Review & refine"
        title="Make every card count"
        description="Shape the key ideas into a study set your learners can understand. Save your progress, then publish when it is ready."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold">
            <FileEdit size={14} /> Draft · Private
          </span>
        }
      >
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-blue-50">
          <span>{draft.cards.length} cards</span>
          <span>{ready} ready to publish</span>
          <span>
            {draft.generationScope === "FULL_MODULE"
              ? "Entire module"
              : draft.generationScope === "SINGLE_TOPIC"
                ? "One topic"
                : "Manual study set"}
          </span>
        </div>
      </StudentPageHeader>
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">
            {dirty ? "Unsaved changes" : "Draft saved"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Saved in this browser · Only visible to you
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={saveDraft}
            className={secondaryButton}
          >
            <Save size={15} /> Save draft
          </button>
          <button
            type="button"
            disabled={busy || options.loading || Boolean(options.error)}
            onClick={preparePublish}
            className={primaryButton}
          >
            {busy ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Globe2 size={15} />
            )}
            {busy ? "Checking set…" : "Publish flashcards"}
          </button>
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800"
        >
          <CheckCircle2 size={17} className="mt-1 shrink-0" />
          {notice}
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
      {draft.sourceDeckId && (
        <p className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-6 text-blue-800">
          You are preparing changes to a published set. Students keep seeing its
          current version until you publish these changes.
        </p>
      )}
      {draft.generationNote && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {draft.generationNote}
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <fieldset disabled={busy} className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
              01 / Set details
            </p>
            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Study set title <span className="text-red-500">*</span>
              <input
                autoFocus
                maxLength={100}
                value={draft.title}
                onChange={(event) => change({ title: event.target.value })}
                placeholder="Give your study set a clear title"
                className={inputClass}
              />
            </label>
            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Description{" "}
              <span className="font-normal text-slate-400">(optional)</span>
              <textarea
                rows={3}
                maxLength={300}
                value={draft.description}
                onChange={(event) =>
                  change({ description: event.target.value })
                }
                placeholder="What will learners practise?"
                className={inputClass}
              />
            </label>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Learning program
                <select
                  value={category?.category_id || ""}
                  disabled={Boolean(draft.materialId) || options.loading}
                  onChange={(event) => {
                    const selected = options.data?.categories.find(
                      (item) => item.category_id === event.target.value,
                    );
                    if (selected)
                      change({
                        categoryId: selected.category_id,
                        programCode: selected.code,
                        programName: selected.name,
                        subjectId: "",
                        subject: "",
                      });
                  }}
                  className={inputClass}
                >
                  <option value="">Choose program</option>
                  {options.data?.categories.map((item) => (
                    <option key={item.category_id} value={item.category_id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                {draft.materialId && (
                  <span className="mt-2 block text-xs font-normal text-slate-400">
                    Linked to the source module’s program.
                  </span>
                )}
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Subject
                <select
                  value={subject?.subject_id || ""}
                  disabled={options.loading}
                  onChange={(event) => {
                    const selected = subjects.find(
                      (item) => item.subject_id === event.target.value,
                    );
                    change({
                      subjectId: selected?.subject_id || "",
                      subject: selected?.name || "",
                    });
                  }}
                  className={inputClass}
                >
                  <option value="">Choose subject</option>
                  {subjects.map((item) => (
                    <option key={item.subject_id} value={item.subject_id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
          <div className="flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                02 / Your flashcards
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">
                One clear idea per card
              </h2>
            </div>
            <span className="shrink-0 text-xs text-slate-400">
              {ready}/{draft.cards.length} complete
            </span>
          </div>
          {draft.cards.map((item, index) => (
            <section
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
            >
              <div className="mb-5 flex items-center justify-between gap-2">
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-blue-50 px-2 text-xs font-bold text-blue-700">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Preview card ${index + 1}`}
                    onClick={() => {
                      setPreviewId(item.id);
                      setFlipped(false);
                    }}
                    className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move card ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => reorder(index, -1)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move card ${index + 1} down`}
                    disabled={index === draft.cards.length - 1}
                    onClick={() => reorder(index, 1)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove card ${index + 1}`}
                    disabled={draft.cards.length <= 2}
                    onClick={() =>
                      change({
                        cards: draft.cards.filter(
                          (entry) => entry.id !== item.id,
                        ),
                      })
                    }
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-600">
                  Term {index + 1}
                  <textarea
                    aria-label={`Term ${index + 1}`}
                    maxLength={160}
                    rows={3}
                    value={item.term}
                    onFocus={() => {
                      setPreviewId(item.id);
                      setFlipped(false);
                    }}
                    onChange={(event) =>
                      updateCard(item.id, { term: event.target.value })
                    }
                    placeholder="A term or question"
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-600">
                  Definition {index + 1}
                  <textarea
                    aria-label={`Definition ${index + 1}`}
                    maxLength={2000}
                    rows={3}
                    value={item.definition}
                    onFocus={() => {
                      setPreviewId(item.id);
                      setFlipped(true);
                    }}
                    onChange={(event) =>
                      updateCard(item.id, { definition: event.target.value })
                    }
                    placeholder="The meaning or answer"
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="mt-4 block text-sm font-semibold text-slate-600">
                Example {index + 1}{" "}
                <span className="font-normal text-slate-400">(optional)</span>
                <input
                  maxLength={500}
                  value={item.example || ""}
                  onChange={(event) =>
                    updateCard(item.id, { example: event.target.value })
                  }
                  placeholder="Connect this idea to everyday life"
                  className={inputClass}
                />
              </label>
            </section>
          ))}
          <button
            type="button"
            disabled={draft.cards.length >= 100}
            onClick={() => {
              const added = {
                id: createCuratedCardId(),
                term: "",
                definition: "",
                example: "",
              };
              change({ cards: [...draft.cards, added] });
              setPreviewId(added.id);
              setFlipped(false);
            }}
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-40"
          >
            <Plus size={17} /> Add another card
          </button>
        </fieldset>
        <aside className="min-w-0 space-y-5 lg:sticky lg:top-24">
          <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700">
              <BookOpen size={15} /> Source content
            </div>
            <h2 className="mt-3 break-words text-sm font-semibold leading-6 text-slate-800">
              {sourceTitle}
            </h2>
            {draft.topicTitle && (
              <p className="mt-2 text-xs leading-6 text-slate-500">
                Topic: {draft.topicTitle}
              </p>
            )}
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Layers3 size={14} />
              {draft.generationScope === "FULL_MODULE"
                ? "Entire module"
                : draft.generationScope === "SINGLE_TOPIC"
                  ? "One selected topic"
                  : "Manual creation"}
            </p>
            {draft.requestedCardCount && (
              <p className="mt-2 text-xs text-slate-500">
                Requested {draft.requestedCardCount} cards ·{" "}
                {draft.cards.length} in draft
              </p>
            )}
            {draft.materialId && authorRole === "teacher" && (
              <Link
                href={`/${authorRole}/lesson-content/${encodeURIComponent(draft.materialId)}`}
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-700"
              >
                View source module <ChevronRight size={13} />
              </Link>
            )}
            {source.error && (
              <p className="mt-3 text-xs text-amber-700">
                Source unavailable.{" "}
                <button
                  type="button"
                  onClick={source.reload}
                  className="underline"
                >
                  Retry source
                </button>
              </p>
            )}
          </section>
          <div className="flex items-center justify-between px-1 text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">
              Live preview
            </span>
            <span>Card {card ? draft.cards.indexOf(card) + 1 : 0}</span>
          </div>
          {card && (
            <FlipCard
              key={card.id}
              card={card}
              flipped={flipped}
              onFlip={() => setFlipped((value) => !value)}
              preview
            />
          )}
          <p className="px-1 text-xs leading-6 text-slate-500">
            Keep each card focused. You can edit every detail before your
            learners see it.
          </p>
        </aside>
      </div>
      <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-5">
        <button
          type="button"
          disabled={busy}
          onClick={back}
          className={secondaryButton}
        >
          <ArrowLeft size={15} /> Back to flashcards
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={saveDraft}
          className={secondaryButton}
        >
          <Save size={15} /> Save draft
        </button>
      </div>
      {confirmPublish && (
        <Modal
          title={
            publicationTarget
              ? "Publish changes to this set?"
              : "Publish these flashcards?"
          }
          pending={busy}
          onClose={() => {
            if (!busy) setConfirmPublish(false);
          }}
        >
          <p className="text-sm leading-6 text-slate-500">
            {publicationTarget ? (
              <>
                This will replace the published content of{" "}
                <strong className="text-slate-800">
                  {publicationTarget.title}
                </strong>
                . Students will see the updated version.
              </>
            ) : (
              "Students in the selected learning program will be able to open and study this set."
            )}
          </p>
          <dl className="mt-5 space-y-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Program</dt>
              <dd className="text-right font-semibold text-slate-800">
                {category?.name}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Subject</dt>
              <dd className="text-right font-semibold text-slate-800">
                {subject?.name}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Cards</dt>
              <dd className="font-semibold text-slate-800">
                {draft.cards.length}
              </dd>
            </div>
          </dl>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmPublish(false)}
              className={secondaryButton}
            >
              Keep as draft
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={publish}
              className={primaryButton}
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Globe2 size={15} />
              )}
              {busy ? "Publishing…" : "Confirm publish"}
            </button>
          </div>
        </Modal>
      )}
      {leaveHref && (
        <Modal
          title="Leave your unsaved changes?"
          onClose={() => setLeaveHref(null)}
        >
          <p className="text-sm leading-6 text-slate-500">
            Save your latest edits as a private draft, or leave and keep the
            last saved version.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setLeaveHref(null)}
              className={secondaryButton}
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={() => {
                const href = leaveHref;
                setLeaveHref(null);
                router.push(href);
              }}
              className={secondaryButton}
            >
              Discard changes
            </button>
            <button
              type="button"
              onClick={() => {
                if (saveDraft()) {
                  const href = leaveHref;
                  setLeaveHref(null);
                  router.push(href);
                }
              }}
              className={primaryButton}
            >
              Save & leave
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
