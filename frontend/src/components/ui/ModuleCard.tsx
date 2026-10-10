import Link from "next/link";
import { ArrowUpRight, BookOpen, FileText } from "lucide-react";

interface ModuleCardProps {
  id: string;
  title: string;
  subtitle: string;
  fileCount: number;
  href?: string;
}

export default function ModuleCard({
  id,
  title,
  subtitle,
  fileCount,
  href,
}: ModuleCardProps) {
  const isPublished = subtitle.toLowerCase().includes("published");
  const targetHref = href || `/teacher/lesson-content/${id}`;

  return (
    <Link
      href={targetHref}
      className="group block h-full rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
    >
      <article className="flex h-full min-h-[190px] flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-blue-200 group-hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100">
            <BookOpen size={19} strokeWidth={2} />
          </div>

          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
            <ArrowUpRight size={17} strokeWidth={2} />
          </div>
        </div>

        <h3 className="line-clamp-2 text-[15px] font-semibold leading-6 text-slate-900">
          {title}
        </h3>
        <p className="mt-1.5 text-[12px] text-slate-500">{subtitle}</p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-100">
            <FileText size={13} strokeWidth={2} />
            {fileCount} {fileCount === 1 ? "file" : "files"}
          </span>

          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
              isPublished
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100"
                : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100"
            }`}
          >
            {isPublished ? "Published" : "Draft"}
          </span>
        </div>
      </article>
    </Link>
  );
}
