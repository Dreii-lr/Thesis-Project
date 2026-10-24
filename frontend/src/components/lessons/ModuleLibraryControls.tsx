"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowDownUp,
  CalendarDays,
  Check,
  ChevronDown,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { MaterialItem } from "@/src/lib/document-processor-api";
import type { SubjectRecord } from "@/src/lib/subjects-api";
import {
  dateRangeLabel,
  emptyModuleFilters,
  filterCount,
  filterLibraryModules,
  MODULE_SORTS,
  MODULE_STATUSES,
  validateModuleDates,
  type ModuleFilters,
  type ModuleSort,
} from "@/src/lib/module-library";

export function ModuleFilterChips({
  filters,
  subjects,
  onChange,
}: {
  filters: ModuleFilters;
  subjects: SubjectRecord[];
  onChange: (filters: ModuleFilters) => void;
}) {
  const chips = [
    ...(filters.dateFrom || filters.dateTo
      ? [
          {
            key: "dates",
            label: dateRangeLabel(filters.dateFrom, filters.dateTo),
            remove: () => onChange({ ...filters, dateFrom: "", dateTo: "" }),
          },
        ]
      : []),
    ...filters.subjectIds.map((id) => ({
      key: id,
      label:
        subjects.find((subject) => subject.subject_id === id)?.name ||
        "Unavailable subject",
      remove: () =>
        onChange({
          ...filters,
          subjectIds: filters.subjectIds.filter((value) => value !== id),
        }),
    })),
    ...filters.statuses.map((status) => ({
      key: status,
      label: MODULE_STATUSES.find((item) => item.value === status)!.label,
      remove: () =>
        onChange({
          ...filters,
          statuses: filters.statuses.filter((value) => value !== status),
        }),
    })),
  ];
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Selected filters">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.remove}
          aria-label={`Remove ${chip.label} filter`}
          className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50/70 py-1 pl-2.5 pr-1.5 text-[11px] font-medium text-blue-800 transition hover:border-blue-200 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          <span className="truncate">{chip.label}</span>
          <X size={11} className="shrink-0 opacity-60" />
        </button>
      ))}
    </div>
  );
}

const summaryClass =
  "flex cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 shadow-xs transition hover:border-blue-200 hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 [&::-webkit-details-marker]:hidden";
const sectionClass =
  "group/section border-t border-slate-100 py-4 first:border-0";
const sectionSummary =
  "flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-slate-800 [&::-webkit-details-marker]:hidden";

function popupLayout(element: HTMLDetailsElement) {
  const rect = element.querySelector("summary")!.getBoundingClientRect();
  const width = element
    .querySelector<HTMLElement>(":scope > div")!
    .getBoundingClientRect().width;
  const below = window.innerHeight - rect.bottom - 16;
  const spaceAbove = Math.max(0, rect.top - 88);
  const above = below < 340 && spaceAbove > below;
  return {
    above,
    right: Math.min(0, rect.right - width - 16),
    maxHeight: Math.max(160, Math.min(560, above ? spaceAbove : below)),
  };
}

export default function ModuleLibraryControls({
  materials,
  subjects,
  filters,
  query,
  sort,
  onChange,
  onSort,
}: {
  materials: MaterialItem[];
  subjects: SubjectRecord[];
  filters: ModuleFilters;
  query: string;
  sort: ModuleSort;
  onChange: (filters: ModuleFilters) => void;
  onSort: (sort: ModuleSort) => void;
}) {
  const filterRef = useRef<HTMLDetailsElement>(null);
  const sortRef = useRef<HTMLDetailsElement>(null);
  const [draft, setDraft] = useState<ModuleFilters>(emptyModuleFilters);
  const [layout, setLayout] = useState({
    above: false,
    maxHeight: 560,
    right: 0,
  });
  const id = useId();
  const count = filterCount(filters);
  const invalidDates = validateModuleDates(draft.dateFrom, draft.dateTo);
  const resultCount = filterLibraryModules(
    materials,
    subjects,
    draft,
    query,
  ).length;
  const statusMaterials = filterLibraryModules(
    materials,
    subjects,
    { ...draft, statuses: [] },
    query,
  );
  const subjectMaterials = filterLibraryModules(
    materials,
    subjects,
    { ...draft, subjectIds: [] },
    query,
  );

  useEffect(() => {
    const close = () => {
      if (filterRef.current) filterRef.current.open = false;
      if (sortRef.current) sortRef.current.open = false;
    };
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (
        !filterRef.current?.contains(event.target) &&
        !sortRef.current?.contains(event.target)
      )
        close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const open = filterRef.current?.open
        ? filterRef.current
        : sortRef.current?.open
          ? sortRef.current
          : null;
      if (open) {
        event.preventDefault();
        close();
        open.querySelector("summary")?.focus();
      }
    };
    const reposition = () => {
      const open = filterRef.current?.open
        ? filterRef.current
        : sortRef.current?.open
          ? sortRef.current
          : null;
      if (open) setLayout(popupLayout(open));
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", reposition);
    };
  }, []);

  function position(element: HTMLDetailsElement) {
    setLayout(popupLayout(element));
  }
  const panelStyle = {
    right: layout.right,
    ...(layout.above
      ? { bottom: "calc(100% + 10px)" }
      : { top: "calc(100% + 10px)" }),
    maxHeight: layout.maxHeight,
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <details
        ref={sortRef}
        className="relative"
        onToggle={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.currentTarget.open) {
            if (filterRef.current) filterRef.current.open = false;
            position(event.currentTarget);
          }
        }}
      >
        <summary className={summaryClass}>
          <ArrowDownUp size={14} />
          <span>Sort by</span>
          <ChevronDown size={12} className="text-slate-400" />
        </summary>
        <div
          role="group"
          aria-label="Sort modules"
          style={panelStyle}
          className="absolute right-0 z-40 w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_50px_-12px_rgba(15,23,42,0.22)]"
        >
          <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
            Organize your library
          </p>
          {MODULE_SORTS.map((option) => (
            <button
              type="button"
              key={option.value}
              aria-pressed={sort === option.value}
              onClick={() => {
                onSort(option.value);
                if (sortRef.current) {
                  sortRef.current.open = false;
                  sortRef.current.querySelector("summary")?.focus();
                }
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${sort === option.value ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <span>
                <span className="block text-xs font-semibold">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  {option.description}
                </span>
              </span>
              {sort === option.value && (
                <Check size={15} className="shrink-0 text-blue-600" />
              )}
            </button>
          ))}
        </div>
      </details>
      <details
        ref={filterRef}
        className="relative"
        onToggle={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.currentTarget.open) {
            if (sortRef.current) sortRef.current.open = false;
            setDraft({
              ...filters,
              subjectIds: [...filters.subjectIds],
              statuses: [...filters.statuses],
            });
            position(event.currentTarget);
          }
        }}
      >
        <summary
          className={`${summaryClass} ${count ? "border-blue-200 bg-blue-50 text-blue-800" : ""}`}
        >
          <SlidersHorizontal size={14} />
          <span>Filter{count ? ` (${count})` : ""}</span>
        </summary>
        <div
          role="region"
          aria-label="Filter modules"
          style={panelStyle}
          className="absolute right-0 z-40 flex w-[350px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_50px_-12px_rgba(15,23,42,0.22)]"
        >
          <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-5">
            <h3 className="text-sm font-bold text-slate-900">Filter modules</h3>
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => {
                if (filterRef.current) {
                  filterRef.current.open = false;
                  filterRef.current.querySelector("summary")?.focus();
                }
              }}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={15} />
            </button>
          </div>
          {filterCount(draft) > 0 && (
            <div className="shrink-0 px-5 pb-3">
              <ModuleFilterChips
                filters={draft}
                subjects={subjects}
                onChange={setDraft}
              />
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
            <details open className={sectionClass}>
              <summary className={sectionSummary}>
                <span className="flex items-center gap-2">
                  <CalendarDays size={14} className="text-slate-400" />
                  Upload date
                </span>
                <ChevronDown
                  size={13}
                  className="text-slate-400 transition group-open/section:rotate-180"
                />
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  {
                    label: "From",
                    value: draft.dateFrom,
                    key: "dateFrom" as const,
                  },
                  { label: "To", value: draft.dateTo, key: "dateTo" as const },
                ].map((field) => (
                  <label
                    key={field.key}
                    className="min-w-0 text-[11px] font-medium text-slate-500"
                  >
                    {field.label}
                    <input
                      aria-label={`Upload date ${field.label.toLowerCase()}`}
                      aria-invalid={Boolean(invalidDates)}
                      aria-describedby={
                        invalidDates ? `${id}-date-error` : undefined
                      }
                      type="date"
                      value={field.value}
                      onChange={(event) =>
                        setDraft({ ...draft, [field.key]: event.target.value })
                      }
                      className="mt-1.5 block w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                ))}
              </div>
              {invalidDates && (
                <p
                  id={`${id}-date-error`}
                  role="alert"
                  className="mt-2 text-[11px] leading-5 text-rose-600"
                >
                  {invalidDates}
                </p>
              )}
            </details>
            <details open className={sectionClass}>
              <summary className={sectionSummary}>
                Subject
                <ChevronDown
                  size={13}
                  className="text-slate-400 transition group-open/section:rotate-180"
                />
              </summary>
              <div className="mt-2 space-y-0.5">
                {subjects.length ? (
                  subjects.map((subject) => (
                    <label
                      key={subject.subject_id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-2 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={draft.subjectIds.includes(subject.subject_id)}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            subjectIds: event.target.checked
                              ? [...draft.subjectIds, subject.subject_id]
                              : draft.subjectIds.filter(
                                  (value) => value !== subject.subject_id,
                                ),
                          })
                        }
                        className="size-3.5 shrink-0 rounded accent-[var(--portal-accent-600)]"
                      />
                      <span className="flex-1 text-xs text-slate-600">
                        {subject.name}
                      </span>
                      <span className="text-[11px] tabular-nums text-slate-400">
                        {
                          filterLibraryModules(subjectMaterials, subjects, {
                            ...emptyModuleFilters(),
                            subjectIds: [subject.subject_id],
                          }).length
                        }
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="py-2 text-xs leading-5 text-slate-400">
                    No active subjects are available for this program.
                  </p>
                )}
              </div>
            </details>
            <details open className={sectionClass}>
              <summary className={sectionSummary}>
                Status
                <ChevronDown
                  size={13}
                  className="text-slate-400 transition group-open/section:rotate-180"
                />
              </summary>
              <div className="mt-2 space-y-0.5">
                {MODULE_STATUSES.map((status) => (
                  <label
                    key={status.value}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-2 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={draft.statuses.includes(status.value)}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          statuses: event.target.checked
                            ? [...draft.statuses, status.value]
                            : draft.statuses.filter(
                                (value) => value !== status.value,
                              ),
                        })
                      }
                      className="size-3.5 shrink-0 rounded accent-[var(--portal-accent-600)]"
                    />
                    <span className="flex-1 text-xs text-slate-600">
                      {status.label}
                    </span>
                    <span className="text-[11px] tabular-nums text-slate-400">
                      {
                        filterLibraryModules(statusMaterials, subjects, {
                          ...emptyModuleFilters(),
                          statuses: [status.value],
                        }).length
                      }
                    </span>
                  </label>
                ))}
              </div>
            </details>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
            <button
              type="button"
              disabled={!filterCount(draft)}
              onClick={() => setDraft(emptyModuleFilters())}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-40"
            >
              Reset filters
            </button>
            <button
              type="button"
              disabled={Boolean(invalidDates)}
              onClick={() => {
                onChange(draft);
                if (filterRef.current) {
                  filterRef.current.open = false;
                  filterRef.current.querySelector("summary")?.focus();
                }
              }}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Show {resultCount} {resultCount === 1 ? "module" : "modules"}
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
