"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  Layers3,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import {
  getAllMaterials,
  getMaterialById,
  getLessonsByMaterial,
  matchMaterialToSubject,
  normalizeMaterialStatus,
  type GeneratedLessonItem,
  type MaterialItem,
} from "@/src/lib/document-processor-api";
import {
  materialInProgram,
  subjectsForProgram,
} from "@/src/lib/lesson-workflow";
import { moduleTitle } from "@/src/lib/module-library";
import { generateFlashcardsAIApi } from "@/src/lib/curated-flashcards-api";
import { type FlashcardDraftInput } from "@/src/lib/flashcard-drafts";
import {
  DEFAULT_USER_CATEGORIES,
  type UserCategoryItem,
} from "@/src/lib/user-categories-api";
import type { SubjectRecord } from "@/src/lib/subjects-api";

interface GeneratorProps {
  categories?: UserCategoryItem[];
  activeCategory?: UserCategoryItem;
  initialProgramCode?: string;
  subjects: SubjectRecord[];
  initialSubjectId?: string;
  initialLessonId?: string;
  initialMaterialId?: string;
  initialTopic?: string;
  onGenerated: (draft: FlashcardDraftInput) => void | Promise<void>;
  onClose: () => void;
}
type GenerationResult = Awaited<ReturnType<typeof generateFlashcardsAIApi>>;
const inputClass =
  "mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400";

export default function FlashcardGeneratorModal({
  categories,
  activeCategory: passedCategory,
  initialProgramCode = "SECONDARY",
  subjects,
  initialSubjectId,
  initialLessonId,
  initialMaterialId,
  onGenerated,
  onClose,
}: GeneratorProps) {
  const availableCategories = categories?.length
    ? categories
    : DEFAULT_USER_CATEGORIES;
  const category =
    passedCategory ||
    availableCategories.find((item) => item.code === initialProgramCode) ||
    availableCategories[0];
  const categorySubjects = useMemo(
    () =>
      subjectsForProgram(
        subjects.length ? subjects : category.subjects || [],
        category,
      ),
    [subjects, category],
  );
  const [subjectId, setSubjectId] = useState(initialSubjectId || "");
  const [materialId, setMaterialId] = useState(initialMaterialId || "");
  const [lessonId, setLessonId] = useState(initialLessonId || "");
  const [scope, setScope] = useState<"FULL_MODULE" | "SINGLE_TOPIC">(
    initialLessonId ? "SINGLE_TOPIC" : "FULL_MODULE",
  );
  const [count, setCount] = useState("5");
  const [forceFresh, setForceFresh] = useState(false);
  const [version, setVersion] = useState(0);
  const [materials, setMaterials] = useState<{
    items: MaterialItem[];
    loading: boolean;
    error: string;
  }>({ items: [], loading: true, error: "" });
  const [lessons, setLessons] = useState<{
    materialId: string;
    items: GeneratedLessonItem[];
    error: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cached, setCached] = useState<GenerationResult | null>(null);
  const [pendingDraft, setPendingDraft] = useState<FlashcardDraftInput | null>(
    null,
  );
  const lock = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const subject = categorySubjects.find(
    (item) => item.subject_id === subjectId,
  );
  const selectedMaterial = materials.items.find(
    (item) => item.id === materialId,
  );
  const visibleMaterials = initialMaterialId
    ? materials.items
    : materials.items.filter(
        (item) => !subject || matchMaterialToSubject(item, subject),
      );
  const currentLessons =
    lessons?.materialId === materialId ? lessons.items : [];
  const lessonsLoading = Boolean(
    materialId && lessons?.materialId !== materialId,
  );
  const selectedLesson = currentLessons.find((item) => item.id === lessonId);
  const cardCount = Number(count);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve()
      .then(async () => {
        if (controller.signal.aborted) return;
        setMaterials((previous) => ({ ...previous, loading: true, error: "" }));
        const records = initialMaterialId
          ? [
              await getMaterialById(initialMaterialId, {
                signal: controller.signal,
              }),
            ]
          : await getAllMaterials({
              status: "PUBLISHED",
              signal: controller.signal,
            });
        const available = records.filter(
          (item) =>
            normalizeMaterialStatus(item.status) === "PUBLISHED" &&
            materialInProgram(item, category),
        );
        if (initialMaterialId && !available.length)
          throw new Error(
            "This module must be published in the selected learning program before flashcards can be generated.",
          );
        if (controller.signal.aborted) return;
        setMaterials({ items: available, loading: false, error: "" });
        const source = available.find((item) => item.id === initialMaterialId);
        if (source) {
          const matched = categorySubjects.find((item) =>
            matchMaterialToSubject(source, item),
          );
          setSubjectId((previous) => previous || matched?.subject_id || "");
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setMaterials({
            items: [],
            loading: false,
            error:
              err instanceof Error
                ? err.message
                : "Modules could not be loaded.",
          });
      });
    return () => controller.abort();
  }, [initialMaterialId, category, categorySubjects, version]);

  useEffect(() => {
    if (!materialId) return;
    const controller = new AbortController();
    getLessonsByMaterial(materialId, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        const items = (result.lessons || []).filter(
          (item) => item.material_id === materialId,
        );
        setLessons({ materialId, items, error: "" });
        if (
          initialLessonId &&
          items.some((item) => item.id === initialLessonId)
        )
          setLessonId(initialLessonId);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setLessons({
            materialId,
            items: [],
            error:
              err instanceof Error
                ? err.message
                : "Lesson content could not be loaded.",
          });
      });
    return () => controller.abort();
  }, [materialId, initialLessonId, version]);

  const close = () => {
    if (!lock.current) onClose();
  };
  const resetResult = () => {
    setCached(null);
    setPendingDraft(null);
    setError("");
  };
  const toDraft = (result: GenerationResult): FlashcardDraftInput => ({
    title:
      result.title ||
      `${selectedMaterial ? moduleTitle(selectedMaterial) : "Module"} flashcards`,
    description: result.description || "",
    categoryId: category.category_id,
    programCode: category.code,
    programName: category.name,
    subjectId,
    subject: subject?.name || "",
    cards: result.cards,
    materialId,
    lessonId: scope === "SINGLE_TOPIC" ? lessonId : null,
    generationScope: scope,
    sourceDeckId: result.existingDeckId,
    moduleTitle: selectedMaterial ? moduleTitle(selectedMaterial) : undefined,
    topicTitle:
      scope === "SINGLE_TOPIC"
        ? selectedLesson?.lesson_title || selectedLesson?.main_topic
        : undefined,
    requestedCardCount: cardCount,
    generationNote:
      result.cards.length !== cardCount
        ? `You requested ${cardCount} cards. The ${result.isExisting ? "existing set contains" : "generator returned"} ${result.cards.length}; review the draft before publishing.`
        : undefined,
  });
  const openEditor = async (draft: FlashcardDraftInput) => {
    setPendingDraft(draft);
    await onGenerated(draft);
  };
  const generate = async (fresh = forceFresh) => {
    if (lock.current) return;
    setError("");
    if (!subject) {
      setError("Choose a subject for this learning program.");
      return;
    }
    if (
      !selectedMaterial ||
      !visibleMaterials.some((item) => item.id === materialId) ||
      !matchMaterialToSubject(selectedMaterial, subject)
    ) {
      setError("Choose a published module that belongs to this subject.");
      return;
    }
    if (!Number.isInteger(cardCount) || cardCount < 2 || cardCount > 20) {
      setError("Choose a whole number from 2 to 20 cards.");
      return;
    }
    if (
      !currentLessons.length ||
      (scope === "SINGLE_TOPIC" && !selectedLesson)
    ) {
      setError(
        scope === "SINGLE_TOPIC"
          ? "Choose one topic from this module."
          : "This module needs generated lesson content first.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setCached(null);
    setPendingDraft(null);
    try {
      const [material, content] = await Promise.all([
        getMaterialById(materialId),
        getLessonsByMaterial(materialId),
      ]);
      if (
        normalizeMaterialStatus(material.status) !== "PUBLISHED" ||
        !materialInProgram(material, category) ||
        !matchMaterialToSubject(material, subject)
      )
        throw new Error(
          "The module is no longer published for this program and subject.",
        );
      const sourceLessons = (content.lessons || []).filter(
        (item) => item.material_id === materialId,
      );
      if (
        !sourceLessons.length ||
        (scope === "SINGLE_TOPIC" &&
          !sourceLessons.some((item) => item.id === lessonId))
      )
        throw new Error(
          "The selected lesson content is no longer available. Refresh the source and try again.",
        );
      const result = await generateFlashcardsAIApi({
        topic:
          scope === "SINGLE_TOPIC"
            ? selectedLesson?.lesson_title || selectedLesson?.main_topic
            : moduleTitle(material),
        materialId,
        lessonId: scope === "SINGLE_TOPIC" ? lessonId : undefined,
        generationScope: scope,
        programCode: category.code,
        program: category.code,
        subjectId,
        subject: subject.name,
        numCards: cardCount,
        forceRegenerate: fresh,
      });
      if (
        result.cards.length < 2 ||
        result.cards.some(
          (card) => !card.term.trim() || !card.definition.trim(),
        )
      )
        throw new Error(
          "The generator did not return at least two complete cards. Try again or choose another topic.",
        );
      if (result.isExisting && !fresh) setCached(result);
      else await openEditor(toDraft(result));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Flashcards could not be generated. Please try again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const accept = async (draft: FlashcardDraftInput) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await openEditor(draft);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The draft could not be opened. Your generated content is still here.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%_-_1.5rem)] max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl open:grid open:grid-rows-[auto_minmax(0,1fr)_auto] backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-blue-100 bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Sparkles size={22} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
              Flashcard studio
            </p>
            <h2
              id={titleId}
              className="mt-1 text-xl font-semibold tracking-tight"
            >
              Generate a study set
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Choose your source. We’ll open the results in a private draft.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={close}
          aria-label="Close generation settings"
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
        >
          <X size={19} />
        </button>
      </div>
      <div className="min-h-0 space-y-6 overflow-y-auto p-5 sm:p-7">
        <ol
          aria-label="Flashcard creation steps"
          className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-400"
        >
          <li className="flex items-center gap-2 text-blue-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold">
              1
            </span>{" "}
            Generation settings
          </li>
          <ChevronRight size={13} aria-hidden />
          <li>2. Review draft</li>
          <ChevronRight size={13} aria-hidden />
          <li>3. Publish</li>
        </ol>
        <fieldset disabled={busy} className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-blue-700">
              <BookOpen size={15} /> {category.name}
            </p>
            <h3 className="mt-2 break-words text-base font-semibold leading-6 text-slate-900">
              {selectedMaterial
                ? moduleTitle(selectedMaterial)
                : initialMaterialId && materials.loading
                  ? "Loading source module…"
                  : "Build from your lesson content"}
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {subject?.name || "Choose a subject below"}
              {selectedMaterial &&
                ` · ${currentLessons.length} generated topics`}
            </p>
          </section>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600">
              Subject
              <select
                aria-label="Flashcard subject"
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  if (!initialMaterialId) {
                    setMaterialId("");
                    setLessonId("");
                  }
                  resetResult();
                }}
                className={inputClass}
              >
                <option value="">Choose subject</option>
                {categorySubjects.map((item) => (
                  <option key={item.subject_id} value={item.subject_id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Number of cards
              <input
                aria-label="Number of cards"
                type="number"
                min={2}
                max={20}
                step={1}
                value={count}
                onChange={(event) => {
                  setCount(event.target.value);
                  resetResult();
                }}
                className={inputClass}
              />
              <span className="mt-2 block text-[11px] font-normal text-slate-400">
                Generate 2–20 cards at a time.
              </span>
            </label>
          </div>
          <label className="block text-xs font-semibold text-slate-600">
            Source module
            <select
              aria-label="Source module"
              value={materialId}
              disabled={
                Boolean(initialMaterialId) || materials.loading || !subjectId
              }
              onChange={(event) => {
                setMaterialId(event.target.value);
                setLessonId("");
                resetResult();
              }}
              className={inputClass}
            >
              <option value="">Choose a published module</option>
              {visibleMaterials.map((item) => (
                <option key={item.id} value={item.id}>
                  {moduleTitle(item)}
                </option>
              ))}
            </select>
          </label>
          {materials.loading || lessonsLoading ? (
            <p
              role="status"
              className="flex items-center gap-2 text-xs text-slate-500"
            >
              <Loader2 size={14} className="animate-spin" /> Loading published
              lesson content…
            </p>
          ) : materials.error ||
            (lessons?.materialId === materialId && lessons.error) ? (
            <div
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-xs leading-6 text-red-700"
            >
              {materials.error || lessons?.error}{" "}
              <button
                type="button"
                onClick={() => setVersion((value) => value + 1)}
                className="font-semibold underline"
              >
                Retry source
              </button>
            </div>
          ) : materialId && !currentLessons.length ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-800">
              Generate the lesson content for this module before creating
              flashcards.
            </p>
          ) : (
            !materials.items.length && (
              <p className="text-xs text-slate-500">
                No published modules are available for this program yet.
              </p>
            )
          )}
          <div>
            <p className="text-xs font-semibold text-slate-600">
              What should this set cover?
            </p>
            <div
              role="group"
              aria-label="Generation scope"
              className="mt-3 grid gap-3 sm:grid-cols-2"
            >
              {(
                [
                  {
                    value: "FULL_MODULE",
                    title: "Entire module",
                    description: "Key ideas across all generated lessons.",
                    icon: Layers3,
                  },
                  {
                    value: "SINGLE_TOPIC",
                    title: "One topic",
                    description: "Focus on one lesson in this module.",
                    icon: FileText,
                  },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={scope === option.value}
                  onClick={() => {
                    setScope(option.value);
                    resetResult();
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${scope === option.value ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200" : "border-slate-200 bg-white hover:border-blue-200"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <option.icon
                      size={19}
                      className={
                        scope === option.value
                          ? "text-blue-600"
                          : "text-slate-400"
                      }
                    />
                    {scope === option.value && (
                      <CheckCircle2 size={16} className="text-blue-600" />
                    )}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    {option.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
          {scope === "SINGLE_TOPIC" && (
            <label className="block text-xs font-semibold text-slate-600">
              Lesson topic
              <select
                aria-label="Lesson topic"
                value={lessonId}
                disabled={!currentLessons.length}
                onChange={(event) => {
                  setLessonId(event.target.value);
                  resetResult();
                }}
                className={inputClass}
              >
                <option value="">Choose one topic</option>
                {currentLessons.map((lesson, index) => (
                  <option key={lesson.id} value={lesson.id}>
                    {index + 1}. {lesson.lesson_title || lesson.main_topic}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs leading-5 text-slate-500">
            <input
              type="checkbox"
              checked={forceFresh}
              onChange={(event) => {
                setForceFresh(event.target.checked);
                resetResult();
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
            />
            <span>
              <strong className="block font-semibold text-slate-700">
                Generate fresh cards
              </strong>
              Request new cards even if this source already has a published set.
              Changes stay private until you publish.
            </span>
          </label>
        </fieldset>
        {selectedMaterial && subject && (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
            Generate{" "}
            <strong className="text-slate-800">{count || "—"} cards</strong> for{" "}
            <strong className="text-slate-800">{subject.name}</strong>, covering{" "}
            {scope === "FULL_MODULE"
              ? "the entire module"
              : selectedLesson
                ? `“${selectedLesson.lesson_title || selectedLesson.main_topic}”`
                : "one selected topic"}
            .
          </p>
        )}
        {cached && (
          <section className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
            <div>
              <p className="text-sm font-semibold text-blue-900">
                A published set already exists
              </p>
              <p className="mt-2 text-xs leading-6 text-blue-800">
                “{cached.title}” contains {cached.cards.length} cards. You
                requested {cardCount}. Open a private copy to edit, or generate
                fresh cards for this request.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => accept(toDraft(cached))}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Open as draft
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => generate(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-semibold text-blue-700 disabled:opacity-50"
              >
                <RefreshCw size={14} /> Generate fresh cards
              </button>
            </div>
          </section>
        )}
        {pendingDraft && error && (
          <button
            type="button"
            disabled={busy}
            onClick={() => accept(pendingDraft)}
            className="w-full rounded-xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700"
          >
            Try opening the generated draft again
          </button>
        )}
      </div>
      <div className="space-y-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-6 text-red-700"
          >
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xs text-[11px] leading-5 text-slate-400">
            Generating does not publish. Review and save your draft before
            sharing it with learners.
          </p>
          <button
            type="button"
            disabled={
              busy ||
              materials.loading ||
              lessonsLoading ||
              !selectedMaterial ||
              !subject ||
              !currentLessons.length ||
              (scope === "SINGLE_TOPIC" && !selectedLesson)
            }
            onClick={() => generate()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {busy ? "Preparing your draft…" : "Generate draft"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
