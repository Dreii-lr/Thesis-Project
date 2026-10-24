"use client";

import StudentLoading from '@/src/components/layout/student/StudentLoading';

import { useState, useEffect, use, useCallback, useRef } from "react";
import Link from "next/link";

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
  normalizeMaterialStatus,
  type MaterialItem,
  type MaterialTopic,
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
  const [activeLessonId, setActiveLessonId] = useState("");
  const activeLesson = lessons.find((lesson) => lesson.files.some((file) => file.id === activeFileId)) || lessons.find((lesson) => lesson.id === activeLessonId) || null;
  const activeContent = activeLesson?.files.find((file) => file.id === activeFileId) || null;
  const loadVersion = useRef(0);

  // Load actual material and its generated lessons from backend
  const loadMaterialData = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch material record with structured topics
      const mat = await getMaterialById(materialId);
      if (version !== loadVersion.current) return;

      // Verify that this material is published by the teacher
      const materialStatus = normalizeMaterialStatus(mat?.status);
      if (materialStatus !== "PUBLISHED") {
        setError(
          "This learning module is not published yet. Please check back once your teacher has published the lesson."
        );
        setMaterial(null);
        return;
      }

      setMaterial(mat);

      // 2. Fetch generated lessons for this material from database
      const genRes = await getLessonsByMaterial(materialId);
      if (version !== loadVersion.current) return;
      const generatedLessons = genRes.lessons;

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
        setActiveLessonId(first.id);
        if (first.files.length > 0) {
          setActiveFileId(first.files[0].id);
        } else {
          setActiveFileId("");
        }
      }
    } catch (err) {
      if (version !== loadVersion.current) return;
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to load curriculum module from the server.";
      setError(msg);
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) return loadMaterialData(); });
    return () => { active = false; loadVersion.current += 1; };
  }, [loadMaterialData]);

  // Select lesson folder from sidebar
  const handleSelectLesson = (lessonId: string) => {
    const target = lessons.find((l) => l.id === lessonId);
    if (!target) return;
    setActiveLessonId(target.id);
    if (target.files.length > 0) {
      setActiveFileId(target.files[0].id);
    } else {
      setActiveFileId("");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-72px)] w-full items-center justify-center bg-slate-50">
        <StudentLoading label="Loading learning module..." />
      </div>
    );
  }

  if (error || !material) {
    const isUnpublished = error?.includes("not published");
    return (
      <div className="flex h-[calc(100vh-72px)] w-full items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">

          <h2 className="text-sm font-semibold text-slate-900">
            {isUnpublished ? "Module Not Published Yet" : "Learning Module Not Found"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {error ||
              "The requested curriculum module could not be retrieved from the server."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/student/modules"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
               Back to My Learning
            </Link>
            {!isUnpublished && (
              <button
                onClick={loadMaterialData}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Retry
              </button>
            )}
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
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors shrink-0"
            title="Return to modules list"
          >

            <span className="inline">My Learning</span>
          </Link>

          <div className="h-4 w-px bg-slate-200 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="truncate text-xs sm:text-sm font-semibold text-slate-900">
              {moduleTitle}
            </h1>
            {material.als_program && (
              <span className="hidden md:inline-flex shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
                {material.als_program}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">

            <span className="hidden sm:inline">Student View •</span> Read Only
          </span>
        </div>
      </header>

      {/* Main Split Layout: Read-Only Sidebar + Reading Content Pane */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
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
            <article className="min-h-0 flex-1 overflow-y-auto bg-white  px-6 py-6 sm:px-8 sm:py-8 lg:px-12">
              {/* Header Title Area */}
              <div className="mb-6 border-b border-slate-100 pb-6">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
                    {activeLesson.title}
                  </span>
                  {activeLesson.delivery_mode && (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {activeLesson.delivery_mode}
                    </span>
                  )}
                  {activeLesson.duration && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">

                      {activeLesson.duration}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {activeContent.title}
                </h2>

                <p className="mt-2 text-xs text-slate-500">
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

                <span className="inline-block rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200 mb-2">
                  Lesson In Preparation
                </span>
                <h2 className="text-lg font-semibold text-slate-900">
                  {activeLesson.title}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Your ALS teacher is currently preparing the reading module and learning materials for this topic. Please check back soon or choose another lesson from the outline.
                </p>

                {activeLesson.sub_topics &&
                  activeLesson.sub_topics.length > 0 && (
                    <div className="mt-6">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Included Subtopics
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {activeLesson.sub_topics.map((sub, sIdx) => (
                          <span
                            key={sIdx}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
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
            <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-slate-500">
              Select a lesson or file from the outline to view content.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
