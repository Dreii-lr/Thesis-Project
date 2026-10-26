import {
  matchMaterialToSubject,
  normalizeMaterialStatus,
  type MaterialItem,
} from "./document-processor-api";
import type { SubjectRecord } from "./subjects-api";

export type ModuleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ModuleSort =
  "newest" | "oldest" | "title-asc" | "title-desc" | "topics";
export interface ModuleFilters {
  subjectIds: string[];
  statuses: ModuleStatus[];
  dateFrom: string;
  dateTo: string;
}

export const MODULE_STATUSES: { value: ModuleStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];
export const MODULE_SORTS: {
  value: ModuleSort;
  label: string;
  description: string;
}[] = [
  {
    value: "newest",
    label: "Newest first",
    description: "Recently uploaded modules",
  },
  {
    value: "oldest",
    label: "Oldest first",
    description: "Earlier uploads first",
  },
  { value: "title-asc", label: "Title A–Z", description: "Alphabetical order" },
  {
    value: "title-desc",
    label: "Title Z–A",
    description: "Reverse alphabetical order",
  },
  {
    value: "topics",
    label: "Most topics",
    description: "Largest curriculum first",
  },
];

export function emptyModuleFilters(): ModuleFilters {
  return { subjectIds: [], statuses: [], dateFrom: "", dateTo: "" };
}

export function moduleTitle(material: MaterialItem) {
  return (
    material.main_learning_goal?.trim() ||
    material.structured_records?.[0]?.main_topic ||
    material.learning_strand ||
    "Untitled module"
  );
}

export function filterCount(filters: ModuleFilters) {
  return (
    filters.subjectIds.length +
    filters.statuses.length +
    Number(Boolean(filters.dateFrom || filters.dateTo))
  );
}

function calendarDay(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function validateModuleDates(from: string, to: string): string | null {
  for (const value of [from, to]) {
    if (!value) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Enter a valid upload date.";
    const date = new Date(`${value}T12:00:00`);
    if (calendarDay(date.toString()) !== value)
      return "Enter a valid upload date.";
  }
  return from && to && from > to
    ? "The From date must be on or before the To date."
    : null;
}

export function moduleDateLabel(value?: string | null) {
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date unavailable";
}

export function dateRangeLabel(from: string, to: string) {
  const format = (value: string) => moduleDateLabel(`${value}T12:00:00`);
  if (from && to) return `${format(from)} – ${format(to)}`;
  return from ? `From ${format(from)}` : `Until ${format(to)}`;
}

export function filterLibraryModules(
  materials: MaterialItem[],
  subjects: SubjectRecord[],
  filters: ModuleFilters,
  query = "",
): MaterialItem[] {
  if (validateModuleDates(filters.dateFrom, filters.dateTo)) return [];
  const term = query.trim().toLocaleLowerCase();
  const selectedSubjects = subjects.filter((subject) =>
    filters.subjectIds.includes(subject.subject_id),
  );
  return materials.filter((material) => {
    if (
      filters.statuses.length &&
      !filters.statuses.includes(normalizeMaterialStatus(material.status))
    )
      return false;
    if (
      filters.subjectIds.length &&
      !selectedSubjects.some((subject) =>
        matchMaterialToSubject(material, subject),
      )
    )
      return false;
    if (filters.dateFrom || filters.dateTo) {
      const day = calendarDay(material.created_at);
      if (
        !day ||
        (filters.dateFrom && day < filters.dateFrom) ||
        (filters.dateTo && day > filters.dateTo)
      )
        return false;
    }
    if (!term) return true;
    return [
      moduleTitle(material),
      material.learning_strand,
      ...(material.structured_records || []).flatMap((topic) => [
        topic.main_topic,
        ...(topic.sub_topics || []),
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase()
      .includes(term);
  });
}

export function sortLibraryModules(
  materials: MaterialItem[],
  sort: ModuleSort,
) {
  return [...materials].sort((a, b) => {
    let difference = 0;
    if (sort === "title-asc" || sort === "title-desc") {
      difference = moduleTitle(a).localeCompare(moduleTitle(b), "en", {
        sensitivity: "base",
        numeric: true,
      });
      if (sort === "title-desc") difference *= -1;
    } else if (sort === "topics") {
      difference =
        (b.structured_records?.length || 0) -
        (a.structured_records?.length || 0);
    } else {
      const first = Date.parse(a.created_at || "");
      const second = Date.parse(b.created_at || "");
      if (!Number.isFinite(first) || !Number.isFinite(second)) {
        difference =
          Number(!Number.isFinite(first)) - Number(!Number.isFinite(second));
      } else difference = sort === "oldest" ? first - second : second - first;
    }
    return difference || a.id.localeCompare(b.id);
  });
}
