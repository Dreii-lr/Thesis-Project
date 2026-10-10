"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  BookOpen,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import ModuleCard from "@/src/components/ui/ModuleCard";
import {
  getMaterials,
  type MaterialItem,
} from "@/src/lib/document-processor-api";

export default function StudentModulesPage() {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
          : "Failed to load learning materials from the server.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Filter materials based on search query
  const filteredMaterials = useMemo(() => {
    if (!searchQuery.trim()) return materials;
    const q = searchQuery.toLowerCase().trim();
    return materials.filter((m) => {
      const strand = (m.learning_strand || "").toLowerCase();
      const goal = (m.main_learning_goal || "").toLowerCase();
      const program = (m.als_program || "").toLowerCase();
      const cls = (m.cls_name || "").toLowerCase();
      return (
        strand.includes(q) ||
        goal.includes(q) ||
        program.includes(q) ||
        cls.includes(q)
      );
    });
  }, [materials, searchQuery]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Page Header */}
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
            <BookOpen size={13} strokeWidth={2} />
            Self-Learning Modules
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            My Learning
          </h1>
          <p className="mt-1.5 text-xs leading-6 text-slate-500 sm:text-sm">
            Access your assigned curriculum modules, study structured topics, and practice with self-check exercises at your own pace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchMaterials}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition-colors"
            title="Refresh learning materials"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchMaterials}
            className="inline-flex items-center gap-1 font-semibold text-amber-900 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Container */}
      <section className="rounded-2xl border border-slate-200/80 bg-white/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        {/* Search and Counts Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="relative w-full max-w-sm">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by strand, topic, or level…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <span className="self-start rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 sm:self-auto">
            {loading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={11} className="animate-spin text-blue-600" />
                Loading…
              </span>
            ) : (
              `${filteredMaterials.length} ${filteredMaterials.length === 1 ? "module" : "modules"}`
            )}
          </span>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={26} className="animate-spin text-blue-600 mb-2.5" />
            <p className="text-sm font-medium">Retrieving your learning modules…</p>
          </div>
        ) : filteredMaterials.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredMaterials.map((material) => {
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
                  href={`/student/modules/${material.id}`}
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
              {searchQuery ? "No matching learning modules" : "No learning modules available"}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {searchQuery
                ? "Try searching with different keywords or clear your search."
                : "Your teacher has not uploaded curriculum modules yet. Check back soon for new learning materials."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
