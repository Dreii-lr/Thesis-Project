"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
  FileText,
} from "lucide-react";
import ContentSidebar from "@/src/components/layout/teacher/lesson-content/ContentSidebar";
import TiptapEditor from "@/src/components/ui/teacher/lesson-content/TiptapEditor";
import { ContentFile, LessonFolder } from "@/src/data/mockModules";
import {
  getFileTiptapJson,
  tiptapJsonToParagraphs,
} from "@/src/utils/tiptapJsonHelpers";
import {
  getMaterialById,
  getLessonsByMaterial,
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

export default function StudentModuleDetailPage({
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

  // Load actual material and its generated lessons from backend
  const loadMaterialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch material record with structured topics
      const mat = await getMaterialById(materialId);
      setMaterial(mat);

      // 2. Fetch generated lessons for this material from database
      let generatedLessons: GeneratedLessonItem[] = [];
      try {
        const genRes = await getLessonsByMaterial(materialId);
        generatedLessons = genRes?.lessons || [];
      } catch {
        generatedLessons = [];
      }

      // Map structured_records into LessonFolder[]
      const mappedLessons: LessonFolder[] = (mat.structured_records || []).map(
        (rec: MaterialTopic, idx: number) => {
          const lessonId = `topic-${idx + 1}`;
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

          // Topic awaiting lesson publication
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
          : "Failed to load curriculum module from the server.";
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

  // Select lesson folder from sidebar
  const handleSelectLesson = (lessonId: string) => {
    const target = lessons.find((l) => l.id === lessonId);
    if (!target) return;
    setActiveLesson(target);
    if (target.files.length > 0) {
      setActiveContent(target.files[0]);
      setActiveFileId(target.files[0].id);
    } else {
      setActiveContent(null);
      setActiveFileId("");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-72px)] w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={28} className="animate-spin text-blue-600" />
          <p className="text-sm font-semibold">Loading learning module…</p>
        </div>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="flex h-[calc(100vh-72px)] w-full items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-inset ring-red-100">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Learning Module Not Found
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {error ||
              "The requested curriculum module could not be retrieved from the server."}
          </p>
          <div className="mt-5 flex justify-center gap-2.5">
            <Link
              href="/student/modules"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={13} /> Back to My Learning
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

  const moduleTitle =
    material.learning_strand ||
    material.main_learning_goal ||
    "Curriculum Module";

  return (
    <div className="flex h-[calc(100vh-72px)] flex-col overflow-hidden bg-white">
      {/* Student View-Only Top Navigation Bar */}
      <header className="flex h-14 w-full shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/student/modules"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors shrink-0"
            title="Return to modules list"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">My Learning</span>
          </Link>

          <div className="h-4 w-px bg-slate-200 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="truncate text-xs sm:text-sm font-bold text-slate-900">
              {moduleTitle}
            </h1>
            {material.als_program && (
              <span className="hidden md:inline-flex shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
                {material.als_program}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            <BookOpen size={13} className="text-blue-600" />
            <span className="hidden sm:inline">Student View •</span> Read Only
          </span>
        </div>
      </header>

      {/* Main Split Layout: Read-Only Sidebar + Reading Content Pane */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Outline Sidebar in Read-Only Mode */}
        <ContentSidebar
          lessons={lessons}
          activeFileId={activeFileId}
          activeLessonId={activeLesson?.id}
          onFileSelect={(fileId) => setActiveFileId(fileId)}
          onSelectLesson={handleSelectLesson}
          readOnly={true}
        />

        {/* Right Content Pane: View-Only Content Reader */}
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-50/50">
          {activeContent && activeLesson ? (
            <article className="min-h-0 flex-1 overflow-y-auto bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
              {/* Header Title Area */}
              <div className="mb-7 border-b border-slate-100 pb-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
                    {activeLesson.title}
                  </span>
                  {activeLesson.delivery_mode && (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {activeLesson.delivery_mode}
                    </span>
                  )}
                  {activeLesson.duration && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      <Clock size={11} />
                      {activeLesson.duration}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {activeContent.title}
                </h1>

                <p className="mt-2 text-xs text-slate-400">
                  Read through the explanations, examples, and try out the practice exercises.
                </p>
              </div>

              {/* Tiptap Rich Content Viewer (Strictly Non-Editable) */}
              <div className="prose prose-slate max-w-none">
                <TiptapEditor
                  content={getFileTiptapJson(activeContent)}
                  editable={false}
                />
              </div>
            </article>
          ) : activeLesson ? (
            /* Selected Topic Awaiting Publication */
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center bg-white">
              <div className="max-w-md">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100">
                  <Clock size={24} />
                </div>
                <span className="inline-block rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-200 mb-2">
                  Lesson In Preparation
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  {activeLesson.title}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Your ALS teacher is currently preparing the reading module and learning materials for this topic. Please check back soon or choose another lesson from the outline.
                </p>

                {activeLesson.sub_topics &&
                  activeLesson.sub_topics.length > 0 && (
                    <div className="mt-5">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Included Subtopics
                      </p>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {activeLesson.sub_topics.map((sub, sIdx) => (
                          <span
                            key={sIdx}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
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
    </div>
  );
}
