"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Sparkles, Loader2, RefreshCw, FolderOpen, Plus } from "lucide-react";
import ModuleCard from "@/src/components/ui/ModuleCard";
import {
  getMaterials,
  type MaterialItem,
} from "@/src/lib/document-processor-api";

export default function LessonContentDirectoryPage() {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMaterials({ pageSize: 100 });
      setMaterials(data || []);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to load materials from the server.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1480px]">
        {/* Header */}
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
              <Sparkles size={13} strokeWidth={2} />
              Curriculum Materials &amp; Lessons
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">
              Lesson Content
            </h1>
            <p className="mt-1.5 text-[13px] leading-6 text-slate-500 sm:text-sm">
              Review and generate structured lesson content and presentation materials from your digitized curriculum modules.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchMaterials}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50"
              title="Refresh materials list"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link
              href="/teacher/module-uploads"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
            >
              <Plus size={14} />
              Upload Module
            </Link>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <span>{error}</span>
            <button
              onClick={fetchMaterials}
              className="inline-flex items-center gap-1 font-semibold text-amber-900 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Materials Grid */}
        <section className="rounded-2xl border border-slate-200/80 bg-white/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">
                Curriculum Materials
              </h2>
              <p className="mt-0.5 text-[12px] text-slate-500">
                Open a material to review topics and generate lesson content.
              </p>
            </div>

            <span className="self-start rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 sm:self-auto">
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin text-blue-600" />
                  Loading…
                </span>
              ) : (
                `${materials.length} ${materials.length === 1 ? "material" : "materials"}`
              )}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 size={24} className="animate-spin text-blue-600 mb-2" />
              <p className="text-sm">Retrieving curriculum materials from server…</p>
            </div>
          ) : materials.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {materials.map((material) => {
                const topicsCount = material.structured_records?.length || 0;
                const title =
                  material.learning_strand ||
                  material.main_learning_goal ||
                  "Curriculum Material";
                const programSuffix = material.als_program
                  ? ` (${material.als_program})`
                  : "";
                const subtitle = `${material.learner_name || "ALS Learner"} • ${
                  material.cls_name || "Community Learning Center"
                }`;

                return (
                  <ModuleCard
                    key={material.id}
                    id={material.id}
                    title={`${title}${programSuffix}`}
                    subtitle={subtitle}
                    fileCount={topicsCount}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100 mb-3">
                <FolderOpen size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                No curriculum materials found
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Upload and parse an ALS module file to extract structured curriculum topics and generate lessons.
              </p>
              <Link
                href="/teacher/module-uploads"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
              >
                Go to Module Uploads →
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
