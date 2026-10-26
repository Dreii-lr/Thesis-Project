"use client";

import { useEffect, useState } from "react";
import { AlertCircle, BookOpen, Loader2 } from "lucide-react";
import type { GeneratedLessonItem } from "@/src/lib/document-processor-api";
import { lessonText } from "@/src/lib/lesson-workflow";

export default function GenerationReader({
  lessons,
  message,
  processing = true,
  checking = false,
}: {
  lessons: GeneratedLessonItem[];
  message?: string;
  processing?: boolean;
  checking?: boolean;
}) {
  const text = lessons
    .map((lesson) => `${lesson.lesson_title}\n\n${lessonText(lesson.content)}`)
    .join("\n\n");
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setVisible((count) => Math.min(text.length, count + 80)),
      35,
    );
    return () => window.clearInterval(timer);
  }, [text]);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <section className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
        <div
          role="status"
          className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-5"
        >
          <span className="rounded-xl bg-blue-50 p-3 text-blue-600">
            {processing || checking ? (
              <Loader2
                size={20}
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <AlertCircle size={20} />
            )}
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {processing
                ? "Writing your lesson content"
                : checking
                  ? "Checking generation progress"
                  : "Generation status unavailable"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {message ||
                (lessons.length
                  ? `${lessons.length} lessons available to read. Checking for more…`
                  : "Preparing your topics. Content appears as lessons become available.")}
            </p>
          </div>
        </div>
        {text ? (
          <div className="whitespace-pre-wrap text-sm leading-8 text-slate-700">
            {text.slice(0, reducedMotion ? text.length : visible)}
            {processing && (
              <span
                aria-hidden="true"
                className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-blue-600"
              />
            )}
          </div>
        ) : (
          <div className="space-y-4 py-8">
            <BookOpen className="mx-auto mb-6 text-blue-200" size={36} />
            <p className="text-center text-sm text-slate-500">
              {processing || checking
                ? "You can read along here while the content is prepared."
                : "Use Check progress to look for saved results."}
            </p>
            {[100, 95, 80, 90].map((width, index) => (
              <div
                key={index}
                style={{ width: `${width}%` }}
                className={`h-3 rounded-full bg-slate-100 ${processing || checking ? "animate-pulse motion-reduce:animate-none" : ""}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
