"use client";

import StudentPageHeader, { studentHeaderActionClass } from '@/src/components/layout/student/StudentPageHeader';

import StudentLoading from '@/src/components/layout/student/StudentLoading';

import { useEffect, useState, useCallback, useMemo } from "react";

import ModuleCard from "@/src/components/ui/ModuleCard";
import {
  getAllMaterials,
  normalizeMaterialStatus,
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
      const data = await getAllMaterials({ pageSize: 100, status: "PUBLISHED" });
      const published = (data || []).filter(
        (m) => normalizeMaterialStatus(m.status) === "PUBLISHED"
      );
      setMaterials(published);
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
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return fetchMaterials();
    });
    return () => { active = false; };
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
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Page Header */}
      <StudentPageHeader eyebrow="Self-Learning Modules" title="My Learning" description="Read your published learning modules and lessons." actions={<button type="button" onClick={fetchMaterials} disabled={loading} className={studentHeaderActionClass} title="Refresh learning materials">Refresh</button>} />

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-center gap-2">

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
      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        {/* Search and Counts Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <label className="block w-full max-w-sm"><span className="mb-2 block text-xs font-medium text-slate-600">Search modules</span>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by strand, topic, or level…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-3.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <span className="self-start rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 sm:self-auto">
            {loading ? (
              <span className="flex items-center gap-2">

                Loading…
              </span>
            ) : (
              `${filteredMaterials.length} ${filteredMaterials.length === 1 ? "module" : "modules"}`
            )}
          </span>
        </div>

        {/* Content Section */}
        {loading ? (
          <StudentLoading label="Loading learning modules..." />
        ) : filteredMaterials.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredMaterials.map((material) => {
              const topicsCount = material.structured_records?.length || 0;
              const title =
                material.learning_strand ||
                material.main_learning_goal ||
                "Curriculum Material";
              const programSuffix = material.als_program
                ? ` (${material.als_program})`
                : "";
              const subtitle = material.als_program
                ? `${material.als_program} Curriculum`
                : "Curriculum Material";

              return (
                <ModuleCard
                  key={material.id}
                  id={material.id}
                  title={`${title}${programSuffix}`}
                  subtitle={subtitle}
                  fileCount={topicsCount}
                  status={material.status}
                  href={`/student/modules/${material.id}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">

            <h3 className="text-sm font-semibold text-slate-800">
              {searchQuery ? "No matching learning modules" : "No published learning modules"}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {searchQuery
                ? "Try searching with different keywords or clear your search."
                : "Your teacher has not published any curriculum modules yet. Check back soon for new learning materials once published."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
