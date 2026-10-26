import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";

export default function PortalActions({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href="/enrollment" className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-transparent bg-[#2f6df6] px-5 py-[13px] text-sm! font-semibold! text-white shadow-lg shadow-blue-100 transition-colors hover:bg-[#245cda] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none">Mag-enroll {compact ? "Ngayon" : "Ngayong Taon"}<ArrowRight size={18} aria-hidden="true" /></Link>
      <Link href="/login" className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-5 py-[13px] text-sm! font-semibold! text-[#17265b] transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"><LogIn size={18} aria-hidden="true" />Portal Login</Link>
    </div>
  );
}
