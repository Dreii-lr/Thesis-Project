"use client";

import { useState, useEffect, use, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resolveGeneratedSubject } from "@/src/lib/module-library";
import { JSONContent } from "@tiptap/react";
import DocumentSidebar from "@/src/components/layout/teacher/lesson-content/ContentSidebar";
import ContentHeader from "@/src/components/layout/teacher/lesson-content/ContentHeader";
import TiptapEditor from "@/src/components/ui/teacher/lesson-content/TiptapEditor";
import Modal from "@/src/components/ui/Modal";
import {
  Edit2,
  Check,
  X,
  Sparkles,
  Loader2,
  ArrowLeft,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { ContentFile, LessonFolder } from "@/src/data/mockModules";
import { processTiptapImagesForCloudinary } from "@/src/utils/cloudinaryUpload";
import {
  getFileTiptapJson,
  tiptapJsonToParagraphs,
} from "@/src/utils/tiptapJsonHelpers";
import {
  getMaterialById,
  deleteMaterialById,
  deleteModuleDocument,
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
  forgetLessonGeneration,
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
  const router = useRouter();

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
  const [actionError, setActionError] = useState("");
  const category = categories.find((item) =>
    programMatches(material?.als_program, item),
  );
  const programSubjects = useMemo(
    () => (category ? subjectsForProgram(subjects, category) : []),
    [subjects, category],
  );
  const selectedSubject = useMemo(
    () =>
      resolveGeneratedSubject(material, programSubjects) ||
      programSubjects.find((subject) =>
        matchMaterialToSubject(material, subject),
      ),
    [material, programSubjects],
  );
  const effectiveSubjectId = selectedSubject?.subject_id || "";
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
    } catch {
      /* Subject metadata is optional on the lesson editor page. */
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
    void Promise.resolve().then(() => {
      if (active) return loadMaterialData();
    });
    return () => {
      active = false;
      loadVersion.current += 1;
    };
  }, [loadMaterialData]);

  // Update material status handler (Publish, Save as Draft, or Archive)
  const handleUpdateStatus = async (
    newStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED",
  ) => {
    if (!material || busy || isEditing) return;
    if (
      newStatus === "PUBLISHED" &&
      (!allTopicsGenerated || generationBlocked)
    ) {
      setActionError(
        "Generate all topics and save your edits before publishing.",
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
          : newStatus === "ARCHIVED"
            ? "Module archived. It is now hidden from learners and moved to your Archived library."
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

  // Delete module state & handler
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingModule, setIsDeletingModule] = useState(false);

  const handleConfirmDelete = async () => {
    if (!material || isDeletingModule) return;
    setIsDeletingModule(true);
    setActionError("");
    try {
      if (material.document_id) {
        await deleteModuleDocument(material.document_id);
      } else {
        await deleteMaterialById(material.id);
      }
      forgetLessonGeneration(owner, material.id);
      router.push(
        category
          ? `/teacher/lesson-content?program=${category.code.toLowerCase()}`
          : "/teacher/lesson-content",
      );
    } catch (err) {
      console.error("Error deleting module:", err);
      setIsDeletingModule(false);
      setShowDeleteModal(false);
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to delete module and uploaded document.",
      );
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
              generationBlocked ||
              busy ||
              isEditing ||
              normalizeMaterialStatus(material.status) !== "DRAFT"
            }
            publishDisabled={
              !allTopicsGenerated ||
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
            onDelete={() => setShowDeleteModal(true)}
            isDeleting={isDeletingModule}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            materialTitle={
              material.learning_strand ||
              material.main_learning_goal ||
              "Curriculum Material"
            }
          />

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
                    : "This curriculum topic does not have saved lesson content yet. Use Generate Content in the header above to generate lesson materials tailored for ALS learners."}
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
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-slate-400">
              Select a lesson or file from the outline to view content.
            </div>
          )}
        </div>
      </div>

      {showDeleteModal && material && (
        <Modal
          title="Delete this module?"
          onClose={() => {
            if (!isDeletingModule) setShowDeleteModal(false);
          }}
          pending={isDeletingModule}
        >
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/60 p-4">
            <span className="rounded-lg bg-white p-2 text-rose-600">
              <Trash2 size={18} />
            </span>
            <div className="min-w-0">
              <p className="line-clamp-3 text-sm font-semibold leading-6 text-slate-800">
                {material.learning_strand ||
                  material.main_learning_goal ||
                  "Untitled Module"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {material.structured_records?.length || 0} topics ·{" "}
                {normalizeMaterialStatus(material.status).toLowerCase()} ·{" "}
                {category?.name || "Curriculum"}
              </p>
            </div>
          </div>
          <p className="text-sm leading-7 text-slate-600">
            This will permanently delete the module, all generated lesson
            content, and the uploaded document from storage. This action cannot
            be undone.
          </p>
          {normalizeMaterialStatus(material.status) === "PUBLISHED" && (
            <p className="mt-2 text-xs leading-6 text-amber-700">
              This module is published. Learners will lose access to its lesson
              content.
            </p>
          )}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isDeletingModule}
              onClick={() => setShowDeleteModal(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeletingModule}
              onClick={() => void handleConfirmDelete()}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
            >
              {isDeletingModule ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Deleting…</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>Delete permanently</span>
                </>
              )}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
