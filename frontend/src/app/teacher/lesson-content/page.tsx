"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import PageHeader, {
  studentHeaderActionClass,
} from "@/src/components/layout/student/StudentPageHeader";
import IlaUploadModal from "@/src/components/lessons/IlaUploadModal";
import ModuleLibrary, {
  ModuleNotice,
  type ModuleActionNotice,
} from "@/src/components/lessons/ModuleLibrary";
import {
  getAllMaterials,
  type MaterialItem,
} from "@/src/lib/document-processor-api";
import {
  getUserCategories,
  type UserCategoryItem,
} from "@/src/lib/user-categories-api";
import { listSubjects, type SubjectRecord } from "@/src/lib/subjects-api";
import {
  materialInProgram,
  programMatches,
  subjectsForProgram,
} from "@/src/lib/lesson-workflow";

function ModuleDashboard() {
  const params = useSearchParams();
  const requested = params.get("program");
  const [categories, setCategories] = useState<UserCategoryItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [notice, setNotice] = useState<ModuleActionNotice | null>(null);
  const requestVersion = useRef(0);
  const deletedIds = useRef(new Set<string>());
  const category = categories.find(
    (item) => item.category_id === requested || programMatches(requested, item),
  );
  const availableSubjects = useMemo(
    () => (category ? subjectsForProgram(subjects, category) : []),
    [subjects, category],
  );
  const programMaterials = useMemo(
    () =>
      category
        ? materials.filter((item) => materialInProgram(item, category))
        : [],
    [materials, category],
  );

  const reload = useCallback(async () => {
    const version = ++requestVersion.current;
    const results = await Promise.allSettled([
      getUserCategories(),
      listSubjects(),
      getAllMaterials(),
    ]);
    if (version !== requestVersion.current) return;
    const issues: string[] = [];
    if (results[0].status === "fulfilled") setCategories(results[0].value);
    else issues.push("Programs could not be loaded.");
    if (results[1].status === "fulfilled") setSubjects(results[1].value);
    else
      issues.push(
        "Subjects could not be loaded. Retry to restore subject filters.",
      );
    if (results[2].status === "fulfilled") {
      setMaterials(
        results[2].value.filter((item) => !deletedIds.current.has(item.id)),
      );
      setUnavailable(false);
    } else {
      setUnavailable(true);
      issues.push(
        results[2].reason instanceof Error
          ? results[2].reason.message
          : "Your module library could not be loaded.",
      );
    }
    setError(issues.join(" "));
    setLoading(false);
  }, [
    setCategories,
    setSubjects,
    setMaterials,
    setUnavailable,
    setError,
    setLoading,
  ]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return reload();
    });
    return () => {
      active = false;
      requestVersion.current += 1;
    };
  }, [reload]);

  function refresh() {
    setLoading(true);
    setError("");
    void reload();
  }
  function removeModule(id: string) {
    deletedIds.current.add(id);
    setMaterials((previous) => previous.filter((item) => item.id !== id));
  }
  const updateModule = useCallback(
    (material: MaterialItem) => {
      if (!deletedIds.current.has(material.id))
        setMaterials((previous) =>
          previous.map((item) => (item.id === material.id ? material : item)),
        );
    },
    [setMaterials],
  );

  function renderHeader(overview?: ReactNode) {
    return (
      <>
        <PageHeader
          eyebrow={
            category
              ? `Content management · ${category.name}`
              : "Content management"
          }
          title="Lesson modules"
          description="From your ILA document to a lesson ready for learners. Keep every step in one place."
          actions={
            <>
              <button
                type="button"
                aria-label="Refresh modules"
                title="Refresh module library"
                disabled={loading}
                onClick={refresh}
                className={studentHeaderActionClass}
              >
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                />
              </button>
              <button
                type="button"
                disabled={!category || loading}
                onClick={() => {
                  setNotice(null);
                  setUploadOpen(true);
                }}
                className={`${studentHeaderActionClass} gap-2`}
              >
                <Plus size={16} />
                Upload ILA document
              </button>
            </>
          }
        >
          {overview}
        </PageHeader>
        {notice && (
          <ModuleNotice notice={notice} onDismiss={() => setNotice(null)} />
        )}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800"
          >
            <AlertCircle size={15} className="mt-1 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              disabled={loading}
              onClick={refresh}
              className="shrink-0 font-semibold underline underline-offset-2 disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {category ? (
        <ModuleLibrary
          key={`${category.category_id}:${params.get("subject") || ""}`}
          renderHeader={renderHeader}
          materials={programMaterials}
          category={category}
          subjects={availableSubjects}
          initialSubjectId={params.get("subject") || undefined}
          loading={loading}
          unavailable={unavailable}
          onUpload={() => setUploadOpen(true)}
          onDeleted={removeModule}
          onUpdated={updateModule}
          onNotice={setNotice}
        />
      ) : (
        <>
          {renderHeader()}
          <section
            aria-label="ALS program libraries"
            className="grid gap-4 md:grid-cols-3"
          >
            {categories.map((item) => (
              <Link
                key={item.category_id}
                href={`/teacher/lesson-content?program=${item.code.toLowerCase()}`}
                className="group rounded-2xl border border-slate-200/80 bg-white p-6 transition hover:border-blue-200 hover:shadow-md"
              >
                <span className="mb-5 inline-flex rounded-xl bg-blue-50 p-3 text-blue-600">
                  <FolderOpen size={23} strokeWidth={1.6} />
                </span>
                <h2 className="text-base font-semibold text-slate-900">
                  {item.name}
                </h2>
                <p className="mt-2 text-xs text-slate-400">
                  {loading
                    ? "Loading modules…"
                    : `${materials.filter((material) => materialInProgram(material, item)).length} modules in your library`}
                </p>
                <span className="mt-6 flex items-center gap-2 text-[11px] font-semibold text-blue-600">
                  Open library
                  <ArrowRight size={13} />
                </span>
              </Link>
            ))}
          </section>
        </>
      )}
      {uploadOpen && category && (
        <IlaUploadModal
          key={category.category_id}
          category={category}
          onClose={() => setUploadOpen(false)}
          onUploaded={(result) => {
            setNotice({
              kind: result.isExisting ? "info" : "success",
              title: result.isExisting
                ? "Document already in your library"
                : "Document uploaded successfully",
              message: result.isExisting
                ? `“${result.filename}” is ready to review. Its existing modules are available in your library.`
                : `“${result.filename}” was saved. Review the extracted curriculum before continuing to your draft.`,
            });
            void reload();
          }}
        />
      )}
    </div>
  );
}

export default function LessonContentPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="flex items-center justify-center gap-2 p-16 text-xs text-slate-400"
        >
          <Loader2 size={18} className="animate-spin text-blue-600" />
          Opening module library…
        </div>
      }
    >
      <ModuleDashboard />
    </Suspense>
  );
}
