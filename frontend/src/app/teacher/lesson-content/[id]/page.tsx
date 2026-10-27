"use client";

import { useState, useEffect, use, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { resolveGeneratedSubject } from "@/src/lib/module-library";
import { JSONContent } from "@tiptap/react";
import DocumentSidebar from "@/src/components/layout/teacher/lesson-content/ContentSidebar";
import ContentHeader from "@/src/components/layout/teacher/lesson-content/ContentHeader";
import TiptapEditor from "@/src/components/ui/teacher/lesson-content/TiptapEditor";
import {
  Edit2,
  Check,
  X,
  Sparkles,
  Loader2,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { ContentFile, LessonFolder } from "@/src/data/mockModules";
import { processTiptapImagesForCloudinary } from "@/src/utils/cloudinaryUpload";
import {
  getFileTiptapJson,
  tiptapJsonToParagraphs,
} from "@/src/utils/tiptapJsonHelpers";
import {
  getMaterialById,
  updateGeneratedLesson,
  updateMaterialStatus,
  normalizeMaterialStatus,
  matchMaterialToSubject,
  type MaterialItem,
  type MaterialTopic,
} from "@/src/lib/document-processor-api";

import GenerationReader from "@/src/components/lessons/GenerationReader";
import {
  checkLessonGeneration,
  lessonMatchesTopic,
  startLessonGeneration,
  useLessonGeneration,
} from "@/src/lib/lesson-generation";
import { listSubjects, type SubjectRecord } from "@/src/lib/subjects-api";
import {
  getUserCategories,
  type UserCategoryItem,
} from "@/src/lib/user-categories-api";
import {
  flashcardHref,
  programMatches,
  subjectsForProgram,
} from "@/src/lib/lesson-workflow";

export default function DocumentViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const materialId = resolvedParams.id;

  const [material, setMaterial] = useState<MaterialItem | null>(null);
  const [lessons, setLessons] = useState<LessonFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeFileId, setActiveFileId] = useState<string>("");
  const [activeLessonId, setActiveLessonId] = useState("");
  const activeSelection = useRef({ lessonId: "", fileId: "" });
  useEffect(() => {
    activeSelection.current = {
      lessonId: activeLessonId,
      fileId: activeFileId,
    };
  }, [activeLessonId, activeFileId]);
  const activeLesson =
    lessons.find((lesson) => lesson.id === activeLessonId) || null;
  const activeContent =
    activeLesson?.files.find((file) => file.id === activeFileId) || null;

  // Tiptap JSON Editing States
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftJson, setDraftJson] = useState<JSONContent | null>(null);

  // Responsive sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const screen = window.matchMedia("(min-width: 1024px)");
    let active = true;
    const update = () => setIsSidebarOpen(screen.matches);
    void Promise.resolve().then(() => {
      if (active) update();
    });
    screen.addEventListener("change", update);
    return () => {
      active = false;
      screen.removeEventListener("change", update);
    };
  }, []);

  // Status update state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Generation state
  const { owner, state: generation } = useLessonGeneration(material);
  const isGenerating = generation?.phase === "processing";
  const generationBlocked =
    !generation ||
    generation.pending ||
    generation.phase === "checking" ||
    generation.phase === "unknown";
  const [generationMessage, setGenerationMessage] = useState<string | null>(
    null,
  );

  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [categories, setCategories] = useState<UserCategoryItem[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [subjectError, setSubjectError] = useState("");
  const [actionError, setActionError] = useState("");
  const category = categories.find((item) =>
    programMatches(material?.als_program, item),
  );
  const programSubjects = useMemo(
    () => (category ? subjectsForProgram(subjects, category) : []),
    [subjects, category],
  );
  const hasGeneratedContent = lessons.some((lesson) => lesson.files.length > 0);
  const selectedSubject = hasGeneratedContent
    ? resolveGeneratedSubject(material, programSubjects)
    : programSubjects.find((subject) => subject.subject_id === subjectId);
  const effectiveSubjectId = selectedSubject?.subject_id || "";
  const validSubject = Boolean(
    selectedSubject &&
    material &&
    matchMaterialToSubject(material, selectedSubject),
  );
  const allTopicsGenerated =
    lessons.length > 0 && lessons.every((lesson) => lesson.files.length > 0);
  const busy = Boolean(generation?.pending) || isSaving || isUpdatingStatus;

  const loadSubjects = useCallback(async () => {
    try {
      const [cats, subs] = await Promise.all([
        getUserCategories(),
        listSubjects(),
      ]);
      setCategories(cats);
      setSubjects(subs);
      setSubjectError("");
    } catch {
      setSubjectError("Subjects could not be loaded. Retry to continue.");
    }
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return loadSubjects();
    });
    return () => {
      active = false;
    };
  }, [loadSubjects]);
  useEffect(() => {
    if (!isEditing) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isEditing]);

  // Load actual material and its generated lessons from backend
  const loadVersion = useRef(0);
  const loadMaterialData = useCallback(async (automatic = false) => {
    const version = ++loadVersion.current;
    try {
      // 1. Fetch the material record with structured topics
      const mat = await getMaterialById(materialId);
      if (version !== loadVersion.current) return;
      setError(null);
      const normalizedStatus = normalizeMaterialStatus(mat.status);
      setMaterial({ ...mat, status: normalizedStatus });

      // 2. Fetch any already-generated lessons for this material from database
      const snapshot = await checkLessonGeneration(owner, mat, { automatic });
      if (version !== loadVersion.current) return;
      const generatedLessons = snapshot.lessons;

      // Map structured_records into LessonFolder[]
      const mappedLessons: LessonFolder[] = (mat.structured_records || []).map(
        (rec: MaterialTopic, idx: number) => {
          const lessonId = `topic-${idx + 1}`;
          // Match with any generated lesson for this topic using resilient normalization
          const matchingGen = generatedLessons.find((g) =>
            lessonMatchesTopic(g, rec.main_topic),
          );

          if (matchingGen && matchingGen.content) {
            const paragraphs = tiptapJsonToParagraphs(matchingGen.content);
            const file: ContentFile = {
              id: matchingGen.id || `${lessonId}-file-1`,
              title: matchingGen.lesson_title || rec.main_topic,
              paragraphs,
              contentJson: matchingGen.content,
            };
            return {
              id: lessonId,
              title: matchingGen.lesson_title || rec.main_topic,
              sub_topics: rec.sub_topics || [],
              recognize_competencies: rec.recognize_competencies
                ? "true"
                : null,
              delivery_mode: rec.delivery_mode,
              duration: rec.duration,
              expected_output: rec.expected_output,
              start_date: rec.start_date,
              finished_date: rec.finished_date,
              status: "GENERATED",
              files: [file],
            };
          }

          // Topic awaiting content generation
          return {
            id: lessonId,
            title: rec.main_topic,
            sub_topics: rec.sub_topics || [],
            recognize_competencies: rec.recognize_competencies ? "true" : null,
            delivery_mode: rec.delivery_mode,
            duration: rec.duration,
            expected_output: rec.expected_output,
            start_date: rec.start_date,
            finished_date: rec.finished_date,
            status: snapshot.phase === "unknown" ? "UNKNOWN" : "NOT_GENERATED",
            files: [],
          };
        },
      );

      setLessons(mappedLessons);

      // Default select the first lesson and its first file (if available)
      if (mappedLessons.length > 0) {
        const selected =
          mappedLessons.find(
            (lesson) => lesson.id === activeSelection.current.lessonId,
          ) || mappedLessons[0];
        setActiveLessonId(selected.id);
        setActiveFileId(
          selected.files.find(
            (file) => file.id === activeSelection.current.fileId,
          )?.id ||
            selected.files[0]?.id ||
            "",
        );
      }
    } catch (err) {
      if (version !== loadVersion.current) return;
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to load material from the server.";
      setError(msg);
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [materialId, owner]);

  const previousGenerationPhase = useRef<string | undefined>(undefined);
  useEffect(() => {
    const previous = previousGenerationPhase.current;
    previousGenerationPhase.current = generation?.phase;
    if (generation?.phase === "ready" && previous && previous !== "ready")
      void Promise.resolve().then(() => loadMaterialData(true));
  }, [generation?.phase, loadMaterialData]);

  useEffect(() => {
    let active = true;
    const savedSubject = generation?.subjectId;
    if (
      !subjectId &&
      savedSubject &&
      programSubjects.some((subject) => subject.subject_id === savedSubject)
    )
      void Promise.resolve().then(() => {
        if (active) setSubjectId(savedSubject);
      });
    return () => {
      active = false;
    };
  }, [generation?.subjectId, subjectId, programSubjects]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return loadMaterialData();
    });
    return () => {
      active = false;
      loadVersion.current += 1;
    };
  }, [loadMaterialData]);

  // Update material status handler (Publish or Save as Draft)
  const handleUpdateStatus = async (newStatus: "DRAFT" | "PUBLISHED") => {
    if (!material || busy || isEditing) return;
    if (
      newStatus === "PUBLISHED" &&
      (!allTopicsGenerated || !validSubject || generationBlocked)
    ) {
      setActionError(
        "Generate all topics, save your edits, and select a matching publication subject first.",
      );
      return;
    }
    setActionError("");
    setIsUpdatingStatus(true);
    try {
      const updated = await updateMaterialStatus(material.id, newStatus);
      const normalizedUpdatedStatus = normalizeMaterialStatus(
        updated.status || newStatus,
      );
      setMaterial((prev) =>
        prev
          ? { ...prev, status: normalizedUpdatedStatus }
          : { ...updated, status: normalizedUpdatedStatus },
      );
      setGenerationMessage(
        newStatus === "PUBLISHED"
          ? "Lesson content published successfully! It is now accessible to learners."
          : "Lesson content saved as draft.",
      );
    } catch (err) {
      console.error("Error updating material status:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to update material status.";
      setActionError(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // The shared workflow owns the POST, so route navigation only detaches this view.
  const handleGenerateContent = async () => {
    if (
      !material ||
      busy ||
      generationBlocked ||
      isEditing ||
      normalizeMaterialStatus(material.status) !== "DRAFT"
    )
      return;
    if (!validSubject) {
      setActionError(
        "Select a subject matching the document's learning strand before generating.",
      );
      return;
    }
    setGenerationMessage(null);
    setActionError("");
    try {
      await startLessonGeneration(owner, material, effectiveSubjectId);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Generation could not be started.",
      );
    }
  };

  // Select lesson folder (supports ungenerated lessons with 0 files)
  const handleSelectLesson = (lessonId: string) => {
    const target = lessons.find((l) => l.id === lessonId);
    if (!target) return;
    if (isEditing || busy) {
      setActionError(
        "Save or cancel your current edits before switching topics.",
      );
      return;
    }
    setActiveLessonId(target.id);
    setIsEditing(false);
    if (target.files.length > 0) {
      setActiveFileId(target.files[0].id);
    } else {
      setActiveFileId("");
    }
  };

  const handleRenameLesson = async (lessonId: string, newTitle: string) => {
    const target = lessons.find((lesson) => lesson.id === lessonId);
    if (!target || busy || isEditing) return;
    if (!newTitle.trim() || newTitle.trim().length > 255) {
      setActionError("Enter a lesson title between 1 and 255 characters.");
      return;
    }
    if (!target.files.length) {
      setActionError("Generate this topic before renaming it.");
      return;
    }
    setIsSaving(true);
    setActionError("");
    try {
      for (const file of target.files)
        await updateGeneratedLesson(file.id, {
          lesson_title: newTitle.trim(),
          content: getFileTiptapJson(file),
        });
      await loadMaterialData();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "The topic could not be renamed.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRenameFile = async (
    lessonId: string,
    fileId: string,
    newTitle: string,
  ) => {
    const target = lessons.find((lesson) => lesson.id === lessonId);
    const file = target?.files.find((item) => item.id === fileId);
    if (!target || !file || busy || isEditing) return;
    if (!newTitle.trim() || newTitle.trim().length > 255) {
      setActionError("Enter a lesson title between 1 and 255 characters.");
      return;
    }
    setIsSaving(true);
    setActionError("");
    try {
      await updateGeneratedLesson(file.id, {
        lesson_title: newTitle.trim(),
        content: getFileTiptapJson(file),
      });
      setLessons((previous) =>
        previous.map((lesson) =>
          lesson.id !== lessonId
            ? lesson
            : {
                ...lesson,
                files: lesson.files.map((item) =>
                  item.id === fileId ? { ...item, title: newTitle } : item,
                ),
              },
        ),
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "The lesson could not be renamed.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = () => {
    if (!activeContent || busy) return;
    setDraftJson(getFileTiptapJson(activeContent));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftJson(null);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!activeLesson || !activeContent || !draftJson || busy) return;
    setActionError("");

    try {
      setIsSaving(true);
      const cleanJsonWithCloudinaryUrls =
        await processTiptapImagesForCloudinary(draftJson);

      // Only update the local editor after persistence succeeds.
      await updateGeneratedLesson(activeContent.id, {
        lesson_title: activeContent.title,
        content: cleanJsonWithCloudinaryUrls,
      });

      setLessons((prevLessons) => {
        const nextLessons = prevLessons.map((lesson) => {
          if (lesson.id !== activeLesson.id) return lesson;

          return {
            ...lesson,
            files: lesson.files.map((file) =>
              file.id === activeContent.id
                ? {
                    ...file,
                    contentJson: cleanJsonWithCloudinaryUrls,
                    paragraphs: tiptapJsonToParagraphs(
                      cleanJsonWithCloudinaryUrls,
                    ),
                  }
                : file,
            ),
          };
        });

        return nextLessons;
      });

      setIsEditing(false);
    } catch (error) {
      console.error("Error saving content:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Content could not be saved. Your edits are still open; try saving again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={28} className="animate-spin text-blue-600" />
          <p className="text-sm font-semibold">Loading curriculum material…</p>
        </div>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-inset ring-red-100">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Module unavailable
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {error ||
              "The requested curriculum material could not be retrieved from the server."}
          </p>
          <div className="mt-5 flex justify-center gap-2.5">
            <Link
              href="/teacher/lesson-content"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={13} /> Back to Materials
            </Link>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                void loadMaterialData();
              }}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-72px)] min-h-[600px] overflow-hidden">
      <div className="relative flex h-full min-h-0 w-full overflow-hidden bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        {/* Outline Sidebar with responsive collapse */}
        <div
          className={`absolute inset-y-0 left-0 z-20 h-full shrink-0 lg:relative lg:z-auto transition-all duration-200 overflow-hidden ${
            isSidebarOpen ? "w-72" : "w-0 hidden md:hidden"
          }`}
        >
          <DocumentSidebar
            lessons={lessons}
            activeFileId={activeFileId}
            activeLessonId={activeLesson?.id}
            onFileSelect={(fileId) => {
              if (isEditing || busy) {
                setActionError(
                  "Save or cancel your current edits before switching lessons.",
                );
                return;
              }
              const lesson = lessons.find((item) =>
                item.files.some((file) => file.id === fileId),
              );
              if (lesson) setActiveLessonId(lesson.id);
              setActiveFileId(fileId);
              setIsEditing(false);
            }}
            onSelectLesson={handleSelectLesson}
            readOnly={busy || isEditing}
            onRenameLesson={handleRenameLesson}
            onRenameFile={handleRenameFile}
            onToggleCollapse={() => setIsSidebarOpen(false)}
          />
        </div>

        {/* Content Pane */}
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-50/50">
          <ContentHeader
            onGenerateContent={handleGenerateContent}
            hasGeneratedContent={allTopicsGenerated}
            generationDisabled={
              !validSubject ||
              generationBlocked ||
              busy ||
              isEditing ||
              normalizeMaterialStatus(material.status) !== "DRAFT"
            }
            publishDisabled={
              !allTopicsGenerated ||
              !validSubject ||
              busy ||
              isEditing ||
              generationBlocked
            }
            actionsDisabled={busy || isEditing}
            backHref={
              category
                ? `/teacher/lesson-content?program=${category.code.toLowerCase()}`
                : "/teacher/lesson-content"
            }
            isGenerating={isGenerating}
            status={material.status}
            onUpdateStatus={handleUpdateStatus}
            isUpdatingStatus={isUpdatingStatus}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            materialTitle={
              material.learning_strand ||
              material.main_learning_goal ||
              "Curriculum Material"
            }
          />

          <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 bg-white px-5 py-3">
            <label className="min-w-0 flex-1 text-xs font-semibold text-slate-600">
              {normalizeMaterialStatus(material.status) === "PUBLISHED"
                ? "Publication subject"
                : "Draft · Choose generation & publication subject"}
              <select
                aria-label="Generation and publication subject"
                value={hasGeneratedContent ? effectiveSubjectId : subjectId}
                disabled={busy || isEditing || hasGeneratedContent}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setActionError("");
                }}
                className="mt-1.5 block w-full max-w-lg rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">
                  {hasGeneratedContent ? "Subject could not be uniquely identified" : "Select a subject before generating or publishing"}
                </option>
                {programSubjects.map((subject) => (
                  <option
                    key={subject.subject_id}
                    value={subject.subject_id}
                    disabled={!matchMaterialToSubject(material, subject)}
                  >
                    {subject.name}
                    {!matchMaterialToSubject(material, subject)
                      ? " · Different learning strand"
                      : ""}
                  </option>
                ))}
              </select>
            </label>
            <p className="max-w-sm text-[11px] leading-5 text-slate-400">
              {hasGeneratedContent
                ? "The subject is fixed to the saved learning strand because lesson content has already been generated."
                : "Choose a subject matching the ILA learning strand. Published lessons keep the document’s saved strand."}
            </p>
            {hasGeneratedContent && !selectedSubject && !subjectError && (
              <p role="alert" className="w-full text-xs text-rose-700">
                The saved learning strand and program do not identify a unique subject.
                Check the module metadata and available subjects before generating or publishing.
              </p>
            )}
            {subjectError && (
              <p role="alert" className="w-full text-xs text-rose-700">
                {subjectError}{" "}
                <button onClick={loadSubjects} className="font-bold underline">
                  Retry subjects
                </button>
              </p>
            )}
          </div>
          {actionError && (
            <div
              role="alert"
              className="mx-5 mt-3 flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700"
            >
              <span>{actionError}</span>
              <button
                aria-label="Dismiss error"
                onClick={() => setActionError("")}
              >
                <X size={14} />
              </button>
            </div>
          )}
          {generation &&
            ["checking", "unknown", "failed", "partial"].includes(
              generation.phase,
            ) && (
              <div
                role="status"
                className="mx-5 mt-3 flex items-start justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-900"
              >
                <span>
                  {generation.message}
                  {generation.completed > 0
                    ? ` ${generation.completed} of ${generation.total} topics saved.`
                    : ""}
                </span>
                <button
                  type="button"
                  disabled={isEditing || isSaving}
                  onClick={() => {
                    void loadMaterialData();
                  }}
                  className="shrink-0 font-semibold underline underline-offset-2"
                >
                  Check progress
                </button>
              </div>
            )}
          {generationMessage && (
            <div className="mx-6 mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200 animate-in fade-in">
              <span>{generationMessage}</span>
              <button
                onClick={() => setGenerationMessage(null)}
                className="text-emerald-700 hover:text-emerald-900"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {generation?.pending ? (
            <GenerationReader
              lessons={generation.lessons}
              message={generation.message}
              processing={isGenerating}
              checking={generation.phase === "checking"}
            />
          ) : activeContent && activeLesson ? (
            <article className="min-h-0 flex-1 overflow-y-auto bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-8 sm:py-8 lg:px-10">
              <div className="mb-7 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="mb-1.5 text-[12px] font-medium text-blue-600">
                    {activeLesson.title}
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 lg:text-[28px]">
                    {activeContent.title}
                  </h1>
                </div>

                <div className="flex shrink-0 items-center gap-2 self-start">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[12px] font-semibold text-slate-600 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[12px] font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Check size={14} />
                        {isSaving ? "Uploading & Saving..." : "Save Changes"}
                      </button>
                    </>
                  ) : (
                    <>
                      {normalizeMaterialStatus(material.status) ===
                        "PUBLISHED" && (
                        <Link
                          href={flashcardHref(
                            material,
                            category?.code || material.als_program || "",
                            selectedSubject?.subject_id,
                            activeContent.id,
                          )}
                          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-indigo-200 bg-indigo-50/70 px-3.5 text-[12px] font-semibold text-indigo-700 shadow-2xs transition-colors hover:bg-indigo-100 hover:text-indigo-800"
                          title="Generate study flashcards directly from this lesson module"
                        >
                          <Sparkles size={14} className="text-indigo-600" />
                          Create flashcards
                        </Link>
                      )}
                      <button
                        onClick={handleStartEdit}
                        disabled={busy}
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3.5 text-[12px] font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                      >
                        <Edit2 size={14} className="text-slate-400" />
                        Edit Content
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Tiptap JSON Content Editor */}
              <TiptapEditor
                content={
                  isEditing && draftJson
                    ? draftJson
                    : getFileTiptapJson(activeContent)
                }
                editable={isEditing}
                onChange={(updatedJson) => setDraftJson(updatedJson)}
              />
            </article>
          ) : activeLesson ? (
            /* Selected lesson has no generated files yet */
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center bg-white">
              <div className="max-w-md">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100">
                  <Sparkles size={24} />
                </div>
                <span className="inline-block rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 mb-2">
                  {generationBlocked
                    ? "Content status unavailable"
                    : "Awaiting Content Generation"}
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  {activeLesson.title}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {generationBlocked
                    ? "Saved content could not be confirmed. Check progress before starting another generation request."
                    : "This curriculum topic does not have saved lesson content yet. Generate lesson materials tailored for ALS learners."}
                </p>

                {activeLesson.sub_topics &&
                  activeLesson.sub_topics.length > 0 && (
                    <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                      {activeLesson.sub_topics.map((sub, sIdx) => (
                        <span
                          key={sIdx}
                          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  )}

                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleGenerateContent}
                    disabled={
                      isGenerating ||
                      generationBlocked ||
                      !validSubject ||
                      normalizeMaterialStatus(material.status) !== "DRAFT"
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Generating Content…
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        Generate Lesson Content
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-slate-400">
              Select a lesson or file from the outline to view content.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
