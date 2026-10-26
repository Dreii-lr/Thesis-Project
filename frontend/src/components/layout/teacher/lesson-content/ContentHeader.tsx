// src/components/layout/teacher/lesson-content/ContentHeader.tsx
"use client";

import Link from "next/link";
import {
  Sparkles,
  Loader2,
  Database,
  ArrowLeft,
  Globe,
  FileText,
  CheckCircle2,
  PanelLeftDashed,
} from "lucide-react";
import { normalizeMaterialStatus } from "@/src/lib/document-processor-api";

interface ContentHeaderProps {
  onGenerateContent?: () => void;
  hasGeneratedContent?: boolean;
  isGenerating?: boolean;
  hideWhenGenerated?: boolean;
  onExportDatabaseJson?: () => void;
  status?: string | null;
  onUpdateStatus?: (newStatus: "DRAFT" | "PUBLISHED") => Promise<void> | void;
  isUpdatingStatus?: boolean;
  generationDisabled?: boolean;
  publishDisabled?: boolean;
  actionsDisabled?: boolean;
  materialTitle?: string;
  backHref?: string;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function ContentHeader({
  onGenerateContent,
  hasGeneratedContent = false,
  isGenerating = false,
  hideWhenGenerated = false,
  onExportDatabaseJson,
  status,
  onUpdateStatus,
  isUpdatingStatus = false,
  generationDisabled = false,
  publishDisabled = false,
  actionsDisabled = false,
  materialTitle,
  backHref = "/teacher/lesson-content",
  isSidebarOpen = true,
  onToggleSidebar,
}: ContentHeaderProps) {
  const normStatus = normalizeMaterialStatus(status);
  const isPublished = normStatus === "PUBLISHED";
  const isArchived = normStatus === "ARCHIVED";

  return (
    <header className="flex min-h-14 w-full shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-100 bg-white px-3 py-2 sm:px-5">
      {/* Left: Navigation, Sidebar Toggle, Status Badge, Title */}
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-2.5">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors shadow-2xs ${
              isSidebarOpen
                ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
            title={
              isSidebarOpen
                ? "Collapse outline sidebar"
                : "Expand outline sidebar"
            }
            aria-label="Toggle document outline sidebar"
          >
            <PanelLeftDashed size={14} />
          </button>
        )}

        <Link
          href={backHref}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
        >
          <ArrowLeft size={13} />
          <span className="hidden sm:inline">Materials</span>
        </Link>

        {/* Live Status Badge */}
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
            isPublished
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
              : isArchived
                ? "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200"
                : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isPublished
                ? "bg-emerald-500 animate-pulse"
                : isArchived
                  ? "bg-slate-400"
                  : "bg-amber-500"
            }`}
          />
          {normStatus}
        </span>

        {materialTitle && (
          <span className="hidden max-w-[130px] truncate text-xs font-medium text-slate-400 md:inline lg:max-w-[200px] xl:max-w-[320px]">
            {materialTitle}
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {onExportDatabaseJson && (
          <button
            type="button"
            onClick={onExportDatabaseJson}
            className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900 lg:inline-flex"
            title="Download JSON payload for Database"
          >
            <Database size={13} className="text-slate-500" />
            <span className="hidden xl:inline">Export DB JSON</span>
            <span className="xl:hidden">DB JSON</span>
          </button>
        )}

        {onUpdateStatus && (
          <>
            <button
              type="button"
              onClick={() => onUpdateStatus("DRAFT")}
              disabled={actionsDisabled || isUpdatingStatus || !isPublished}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 sm:px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all ${
                !isPublished
                  ? "border-slate-200 bg-slate-50 text-slate-400 cursor-default"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.98]"
              } disabled:opacity-50`}
              title={
                !isPublished
                  ? "Material is currently in draft"
                  : "Revert material to draft"
              }
            >
              {isUpdatingStatus ? (
                <Loader2 size={13} className="animate-spin text-slate-400" />
              ) : (
                <FileText size={13} className="text-slate-500" />
              )}
              <span className="hidden sm:inline">Save as </span>
              <span>Draft</span>
            </button>

            <button
              type="button"
              onClick={() => onUpdateStatus("PUBLISHED")}
              disabled={
                publishDisabled ||
                actionsDisabled ||
                isUpdatingStatus ||
                isPublished
              }
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 sm:px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-all ${
                isPublished
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default"
                  : "border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 active:scale-[0.98]"
              } disabled:opacity-50`}
              title={
                isPublished
                  ? "Material is published and active"
                  : "Publish lesson content to learners"
              }
            >
              {isUpdatingStatus ? (
                <Loader2 size={13} className="animate-spin" />
              ) : isPublished ? (
                <CheckCircle2 size={13} className="text-emerald-600" />
              ) : (
                <Globe size={13} />
              )}
              <span>{isPublished ? "Published" : "Publish"}</span>
            </button>
          </>
        )}

        {onGenerateContent && !(hasGeneratedContent && hideWhenGenerated) && (
          <button
            type="button"
            onClick={onGenerateContent}
            disabled={generationDisabled || hasGeneratedContent || isGenerating}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold transition-all ${
              hasGeneratedContent
                ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 opacity-60 shadow-none"
                : "border border-blue-600 bg-blue-600 text-white shadow-xs hover:bg-blue-700 hover:border-blue-700 active:scale-[0.98]"
            }`}
            title={
              hasGeneratedContent
                ? "Lesson content has already been generated"
                : "Generate lesson content with AI"
            }
          >
            {isGenerating ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span className="hidden sm:inline">Generating…</span>
                <span className="sm:hidden">Gen…</span>
              </>
            ) : (
              <>
                <Sparkles
                  size={13}
                  className={
                    hasGeneratedContent ? "text-slate-400" : "text-blue-100"
                  }
                />
                {hasGeneratedContent ? (
                  <>
                    <span className="hidden sm:inline">Content </span>
                    <span>Generated</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Generate </span>
                    <span>Content</span>
                  </>
                )}
              </>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
