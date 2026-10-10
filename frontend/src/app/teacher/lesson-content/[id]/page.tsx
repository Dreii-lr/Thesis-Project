"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
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
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { ContentFile, LessonFolder, Module } from "@/src/data/mockModules";
import { processTiptapImagesForCloudinary } from "@/src/utils/cloudinaryUpload";
import {
  getFileTiptapJson,
  tiptapJsonToParagraphs,
  buildDatabasePayload,
} from "@/src/utils/tiptapJsonHelpers";
import {
  getMaterialById,
  getLessonsByMaterial,
  generateLessonForMaterial,
  updateGeneratedLesson,
  type MaterialItem,
  type MaterialTopic,
  type GeneratedLessonItem,
} from "@/src/lib/document-processor-api";

function normalizeTopicForMatch(str?: string | null): string {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/^\d+\.\s*/, "")
    .replace(/[:.,;]+$/, "")
    .trim();
}

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
  const [activeLesson, setActiveLesson] = useState<LessonFolder | null>(null);
  const [activeContent, setActiveContent] = useState<ContentFile | null>(null);

  // Tiptap JSON Editing States
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftJson, setDraftJson] = useState<JSONContent | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(
    null,
  );

  // Load actual material and its generated lessons from backend
  const loadMaterialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch the material record with structured topics
      const mat = await getMaterialById(materialId);
      setMaterial(mat);

      // 2. Fetch any already-generated lessons for this material from database
      let generatedLessons: GeneratedLessonItem[] = [];
      try {
        const genRes = await getLessonsByMaterial(materialId);
        generatedLessons = genRes?.lessons || [];
      } catch {
        // No generated lessons yet or endpoint returned empty
        generatedLessons = [];
      }

      // Map structured_records into LessonFolder[]
      const mappedLessons: LessonFolder[] = (mat.structured_records || []).map(
        (rec: MaterialTopic, idx: number) => {
          const lessonId = `topic-${idx + 1}`;
          // Match with any generated lesson for this topic using resilient normalization
          const recNorm = normalizeTopicForMatch(rec.main_topic);
          const matchingGen = generatedLessons.find((g) => {
            const mainNorm = normalizeTopicForMatch(g.main_topic);
            const titleNorm = normalizeTopicForMatch(g.lesson_title);
            return (
              (recNorm && (mainNorm === recNorm || titleNorm === recNorm)) ||
              g.main_topic?.trim().toLowerCase() ===
                rec.main_topic?.trim().toLowerCase() ||
              g.lesson_title?.trim().toLowerCase() ===
                rec.main_topic?.trim().toLowerCase()
            );
          });

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
              title: rec.main_topic,
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
            status: "NOT_GENERATED",
            files: [],
          };
        },
      );

      setLessons(mappedLessons);

      // Default select the first lesson and its first file (if available)
      if (mappedLessons.length > 0) {
        const first = mappedLessons[0];
        setActiveLesson(first);
        if (first.files.length > 0) {
          setActiveContent(first.files[0]);
          setActiveFileId(first.files[0].id);
        } else {
          setActiveContent(null);
          setActiveFileId("");
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to load material from the server.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    loadMaterialData();
  }, [loadMaterialData]);

  // Keep activeLesson and activeContent synchronized when activeFileId changes
  useEffect(() => {
    if (!activeFileId) return;
    for (const lesson of lessons) {
      const foundFile = lesson.files.find((file) => file.id === activeFileId);
      if (foundFile) {
        setActiveLesson(lesson);
        setActiveContent(foundFile);
        break;
      }
    }
  }, [activeFileId, lessons]);

  // Determine whether current selection has generated content
  const hasGeneratedContent = Boolean(
    // Check if active content file has paragraphs or contentJson
    (activeContent &&
      ((activeContent.paragraphs &&
        activeContent.paragraphs.length > 0 &&
        activeContent.paragraphs.some((p) => p.trim() !== "")) ||
        (activeContent.contentJson &&
          activeContent.contentJson.content &&
          activeContent.contentJson.content.length > 0))) ||
    // Or check if active lesson has status GENERATED or has files
    (activeLesson &&
      (activeLesson.status === "GENERATED" ||
        (activeLesson.files &&
          activeLesson.files.length > 0 &&
          activeLesson.files.some(
            (f) => (f.paragraphs && f.paragraphs.length > 0) || f.contentJson,
          )))) ||
    // Or check if any lesson in the material is generated
    (lessons.length > 0 &&
      lessons.some(
        (l) =>
          l.status === "GENERATED" ||
          (l.files &&
            l.files.length > 0 &&
            l.files.some(
              (f) => (f.paragraphs && f.paragraphs.length > 0) || f.contentJson,
            )),
      )),
  );

  // Sync updated lessons to backend
  const syncToDatabase = async (updatedLessons: LessonFolder[]) => {
    if (!material) return;
    const moduleLike: Module = {
      id: material.id,
      materials_id: material.id,
      learner_name: material.learner_name || undefined,
      cls_name: material.cls_name || undefined,
      als_program: material.als_program || undefined,
      learning_strand: material.learning_strand || undefined,
      main_learning_goal: material.main_learning_goal,
      title: material.learning_strand || "ALS Curriculum Material",
      subtitle: `${material.learner_name || "ALS Learner"} • ${material.cls_name || ""}`,
      lessons: updatedLessons,
    };
    const dbPayload = buildDatabasePayload(moduleLike, updatedLessons);
    console.log("Updated database payload:", dbPayload);
    return dbPayload;
  };

  // Generate lesson content handler: calls backend API and reloads latest data for all lessons
  const handleGenerateContent = async () => {
    if (!material) return;
    setIsGenerating(true);
    setGenerationMessage(null);

    try {
      // 1. Trigger backend lesson generation
      try {
        await generateLessonForMaterial(material.id);
      } catch (genErr) {
        console.warn("Backend generate-lesson call returned status:", genErr);
      }

      // 2. Query backend API to retrieve latest actual data for ALL lessons from database
      await loadMaterialData();

      setGenerationMessage(
        "Successfully retrieved latest lesson content from database for all topics.",
      );
    } catch (err) {
      console.error("Error generating lesson content:", err);
      alert("Failed to generate lesson content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Select lesson folder (supports ungenerated lessons with 0 files)
  const handleSelectLesson = (lessonId: string) => {
    const target = lessons.find((l) => l.id === lessonId);
    if (!target) return;
    setActiveLesson(target);
    setIsEditing(false);
    if (target.files.length > 0) {
      setActiveContent(target.files[0]);
      setActiveFileId(target.files[0].id);
    } else {
      setActiveContent(null);
      setActiveFileId("");
    }
  };

  // Rename Main Topic from Sidebar
  const handleRenameLesson = (lessonId: string, newTitle: string) => {
    setLessons((prevLessons) => {
      const nextLessons = prevLessons.map((lesson) =>
        lesson.id === lessonId ? { ...lesson, title: newTitle } : lesson,
      );
      syncToDatabase(nextLessons);
      return nextLessons;
    });
  };

  // Rename Sub-Topic from Sidebar
  const handleRenameFile = (
    lessonId: string,
    fileId: string,
    newTitle: string,
  ) => {
    setLessons((prevLessons) => {
      const nextLessons = prevLessons.map((lesson) => {
        if (lesson.id !== lessonId) return lesson;

        const updatedFiles = lesson.files.map((file) =>
          file.id === fileId ? { ...file, title: newTitle } : file,
        );

        return {
          ...lesson,
          sub_topics: updatedFiles.map((f) => f.title),
          files: updatedFiles,
        };
      });
      syncToDatabase(nextLessons);
      return nextLessons;
    });
  };

  const handleStartEdit = () => {
    if (!activeContent) return;
    setDraftJson(getFileTiptapJson(activeContent));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftJson(null);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!activeLesson || !activeContent || !draftJson) return;

    try {
      setIsSaving(true);
      const cleanJsonWithCloudinaryUrls =
        await processTiptapImagesForCloudinary(draftJson);

      // Attempt to save to backend if lesson id is a UUID
      if (activeContent.id && !activeContent.id.startsWith("gen-")) {
        try {
          await updateGeneratedLesson(activeContent.id, {
            lesson_title: activeContent.title,
            main_topic: activeLesson.title,
            content: cleanJsonWithCloudinaryUrls,
          });
        } catch (apiErr) {
          console.warn("Backend update-lesson call failed:", apiErr);
        }
      }

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

        syncToDatabase(nextLessons);
        return nextLessons;
      });

      setIsEditing(false);
    } catch (error) {
      console.error("Error saving content:", error);
      alert("Failed to save content. Check console for details.");
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
            Material Not Found
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
              onClick={loadMaterialData}
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
    <div className="h-screen overflow-hidden">
      <div className="flex h-full min-h-0 w-full overflow-hidden bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        {/* Outline Sidebar */}
        <DocumentSidebar
          lessons={lessons}
          activeFileId={activeFileId}
          activeLessonId={activeLesson?.id}
          onFileSelect={(fileId) => {
            setActiveFileId(fileId);
            setIsEditing(false);
          }}
          onSelectLesson={handleSelectLesson}
          onRenameLesson={handleRenameLesson}
          onRenameFile={handleRenameFile}
        />

        {/* Content Pane */}
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-50/50">
          <ContentHeader
            onGenerateContent={handleGenerateContent}
            hasGeneratedContent={hasGeneratedContent}
            isGenerating={isGenerating}
          />

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

          {activeContent && activeLesson ? (
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
                    <button
                      onClick={handleStartEdit}
                      className="inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3.5 text-[12px] font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                    >
                      <Edit2 size={14} className="text-slate-400" />
                      Edit Content
                    </button>
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
                  Awaiting Content Generation
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  {activeLesson.title}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  This curriculum topic does not have generated reading or
                  presentation content yet. Click below to generate lesson
                  materials tailored for ALS learners.
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
                    disabled={isGenerating}
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
