"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  FolderOpen,
  Plus,
  BookOpen,
  Layers,
  ArrowLeft,
} from "lucide-react";
import ModuleCard from "@/src/components/ui/ModuleCard";
import {
  getMaterials,
  normalizeMaterialStatus,
  matchMaterialToCategory,
  type MaterialItem,
} from "@/src/lib/document-processor-api";
import {
  getUserCategories,
  type UserCategoryItem,
  type UserCategorySubject,
  DEFAULT_USER_CATEGORIES,
} from "@/src/lib/user-categories-api";

function matchMaterialToSubject(
  mat: MaterialItem,
  subject: UserCategorySubject,
): boolean {
  const sName = subject.name.toLowerCase();
  const strand = (mat.learning_strand || "").toLowerCase();
  const goal = (mat.main_learning_goal || "").toLowerCase();
  return strand.includes(sName) || goal.includes(sName);
}

function LessonContentDirectory() {
  const [categories, setCategories] = useState<UserCategoryItem[]>(
    DEFAULT_USER_CATEGORIES,
  );
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PUBLISHED" | "DRAFT"
  >("ALL");

  const searchParams = useSearchParams();
  const requested = searchParams.get("program");

  // Load user categories from main Thesis backend
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await getUserCategories();
      if (data && data.length > 0) {
        setCategories(data);
      }
    } catch {
      // Fallback already handled in getUserCategories
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // Load materials from document-processing microservice backend
  const fetchMaterials = useCallback(async () => {
    setLoadingMaterials(true);
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
      setLoadingMaterials(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchMaterials();
  }, [fetchCategories, fetchMaterials]);

  // Reset selected subject when program changes
  useEffect(() => {
    setSelectedSubjectId(null);
  }, [requested]);

  const activeCategory = categories.find(
    (c) =>
      c.category_id === requested ||
      c.code.toLowerCase() === requested?.toLowerCase() ||
      c.name.toLowerCase() === requested?.toLowerCase() ||
      (requested?.toLowerCase() === "junior" &&
        c.code.toLowerCase() === "secondary") ||
      (requested?.toLowerCase() === "basic_literacy" &&
        c.code.toLowerCase() === "blp"),
  );

  const handleRefreshAll = () => {
    fetchCategories();
    fetchMaterials();
  };

  // Materials for active category
  const categoryMaterials = activeCategory
    ? materials.filter((m) => matchMaterialToCategory(m, activeCategory))
    : [];

  // Active subject for filtering
  const activeSubject = activeCategory?.subjects?.find(
    (s) => s.subject_id === selectedSubjectId,
  );

  // Final filtered list based on subject selection
  const displayedMaterials = activeSubject
    ? categoryMaterials.filter((m) => matchMaterialToSubject(m, activeSubject))
    : categoryMaterials;

  // Filtered by status (All, Published, Draft)
  const filteredByStatus = displayedMaterials.filter((m) => {
    if (statusFilter === "ALL") return true;
    const actualStatus = normalizeMaterialStatus(m.status);
    if (statusFilter === "PUBLISHED") return actualStatus === "PUBLISHED";
    if (statusFilter === "DRAFT") return actualStatus === "DRAFT";
    return true;
  });

  const isLoading = loadingCategories || loadingMaterials;

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
              {activeCategory ? activeCategory.name : "Lesson Content"}
            </h1>
            <p className="mt-1.5 text-[13px] leading-6 text-slate-500 sm:text-sm">
              {activeCategory
                ? `Review and generate structured lesson content for ${activeCategory.name} modules and curriculum subjects.`
                : "Choose a program directory to review its learning materials and generate structured lessons."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {activeCategory && (
              <Link
                href="/teacher/lesson-content"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
              >
                <ArrowLeft size={13} />
                All programs
              </Link>
            )}

            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50"
              title="Refresh materials and categories"
            >
              <RefreshCw
                size={13}
                className={isLoading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            {/* <Link
              href={
                activeCategory
                  ? `/teacher/module-uploads?program=${activeCategory.code.toLowerCase()}`
                  : "/teacher/module-uploads"
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
            >
              <Plus size={14} />
              Upload Module
            </Link> */}
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <span>{error}</span>
            <button
              onClick={handleRefreshAll}
              className="inline-flex items-center gap-1 font-semibold text-amber-900 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* View 1: Program Directory Cards (When no category is selected) */}
        {!activeCategory ? (
          <div>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Program Directories
              </h2>
              <p className="text-xs text-slate-500">
                Select an ALS program level to view its subjects and curriculum
                materials.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {categories.map((cat, i) => {
                const programMaterialCount = materials.filter((m) =>
                  matchMaterialToCategory(m, cat),
                ).length;

                return (
                  <Link
                    href={`/teacher/lesson-content?program=${cat.code.toLowerCase()}`}
                    key={cat.category_id || cat.code}
                    className="group rounded-[24px] border border-slate-200 bg-white p-7 shadow-xs transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
                  >
                    <span
                      className={`mb-7 flex h-14 w-14 items-center justify-center rounded-2xl ${
                        [
                          "bg-blue-50 text-blue-600",
                          "bg-violet-50 text-violet-600",
                          "bg-emerald-50 text-emerald-600",
                        ][i % 3]
                      }`}
                    >
                      <FolderOpen size={28} />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Program directory
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">
                      {cat.name}
                    </h2>
                    <p className="mt-4 text-sm text-slate-500">
                      {cat.subjects && cat.subjects.length > 0
                        ? `${cat.subjects.length} subjects · `
                        : ""}
                      {programMaterialCount}{" "}
                      {programMaterialCount === 1 ? "material" : "materials"}
                    </p>
                    <span className="mt-8 flex items-center justify-between text-sm font-bold text-blue-600">
                      Open directory <span>→</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          /* View 2: Selected Category View (Subjects & Materials) */
          <div className="space-y-6">
            {/* Category Subjects Filter */}
            {activeCategory.subjects && activeCategory.subjects.length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-blue-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {activeCategory.name} Subjects
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Filter by subject
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSubjectId(null)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      selectedSubjectId === null
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>All Subjects</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        selectedSubjectId === null
                          ? "bg-blue-500 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {categoryMaterials.length}
                    </span>
                  </button>

                  {activeCategory.subjects.map((sub) => {
                    const count = categoryMaterials.filter((m) =>
                      matchMaterialToSubject(m, sub),
                    ).length;
                    const isSelected = selectedSubjectId === sub.subject_id;

                    return (
                      <button
                        key={sub.subject_id}
                        type="button"
                        onClick={() =>
                          setSelectedSubjectId(
                            isSelected ? null : sub.subject_id,
                          )
                        }
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <BookOpen size={12} />
                        <span>{sub.name}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                            isSelected
                              ? "bg-blue-500 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Materials Grid */}
            <section className="rounded-2xl border border-slate-200/80 bg-white/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900">
                    Curriculum Materials ({activeCategory.name}
                    {activeSubject ? ` · ${activeSubject.name}` : ""})
                  </h2>
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    Open a material to review topics, edit content, and publish
                    lessons.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Status Filter Segmented Control */}
                  <div className="inline-flex items-center rounded-xl border border-slate-200/80 bg-slate-50 p-1 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setStatusFilter("ALL")}
                      className={`rounded-lg px-2.5 py-1 transition-all ${
                        statusFilter === "ALL"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      All ({displayedMaterials.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("PUBLISHED")}
                      className={`rounded-lg px-2.5 py-1 transition-all ${
                        statusFilter === "PUBLISHED"
                          ? "bg-white text-emerald-700 shadow-2xs ring-1 ring-inset ring-emerald-100"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Published (
                      {
                        displayedMaterials.filter(
                          (m) =>
                            normalizeMaterialStatus(m.status) === "PUBLISHED",
                        ).length
                      }
                      )
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("DRAFT")}
                      className={`rounded-lg px-2.5 py-1 transition-all ${
                        statusFilter === "DRAFT"
                          ? "bg-white text-amber-700 shadow-2xs ring-1 ring-inset ring-amber-100"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Draft (
                      {
                        displayedMaterials.filter(
                          (m) => normalizeMaterialStatus(m.status) === "DRAFT",
                        ).length
                      }
                      )
                    </button>
                  </div>

                  <span className="self-start rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 sm:self-auto">
                    {loadingMaterials ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2
                          size={11}
                          className="animate-spin text-blue-600"
                        />
                        Loading…
                      </span>
                    ) : (
                      `${filteredByStatus.length} ${
                        filteredByStatus.length === 1 ? "material" : "materials"
                      }`
                    )}
                  </span>
                </div>
              </div>

              {loadingMaterials ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2
                    size={24}
                    className="animate-spin text-blue-600 mb-2"
                  />
                  <p className="text-sm">
                    Retrieving curriculum materials from server…
                  </p>
                </div>
              ) : displayedMaterials.length > 0 ? (
                filteredByStatus.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {filteredByStatus.map((material) => {
                      const topicsCount =
                        material.structured_records?.length || 0;
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
                          href={`/teacher/lesson-content/${material.id}`}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      No {statusFilter.toLowerCase()} materials in this
                      category.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("ALL")}
                      className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Show all materials
                    </button>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100 mb-3">
                    <FolderOpen size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    No curriculum materials found for {activeCategory.name}
                    {activeSubject ? ` (${activeSubject.name})` : ""}
                  </h3>
                  <p className="mt-1 max-w-sm text-xs text-slate-500">
                    Upload and parse an ALS module file for{" "}
                    {activeCategory.name} to extract structured curriculum
                    topics and generate lessons.
                  </p>
                  {/* <Link
                    href={`/teacher/module-uploads?program=${activeCategory.code.toLowerCase()}`}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                  >
                    Upload Module for {activeCategory.name} →
                  </Link> */}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LessonContentDirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 w-full items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={28} />
        </div>
      }
    >
      <LessonContentDirectory />
    </Suspense>
  );
}
