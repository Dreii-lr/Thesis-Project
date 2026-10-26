import { AlertCircle, Check, LockKeyhole } from 'lucide-react';
import type { ReactNode } from 'react';

export const profileInputClass = 'mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400';
export const profileButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50';
export const profilePrimaryClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50';

export function ProfileMessage({ children, error = false }: { children: ReactNode; error?: boolean }) {
  const Icon = error ? AlertCircle : Check;
  return <div role={error ? 'alert' : 'status'} className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs leading-6 ${error ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-blue-100 bg-blue-50 text-blue-800'}`}><Icon size={15} className="mt-1 shrink-0" /><div>{children}</div></div>;
}

export function ProfileFields({ fields }: { fields: [string, string | null | undefined][] }) {
  return <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-[11px] font-medium text-slate-400">{label}</dt><dd className="mt-1.5 break-words text-sm font-medium leading-6 text-slate-700">{value || <span className="font-normal text-slate-400">Not provided</span>}</dd></div>)}</dl>;
}

export function ManagedNote({ children }: { children: ReactNode }) {
  return <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-6 text-slate-500"><LockKeyhole size={14} className="mt-1 shrink-0" />{children}</p>;
}

export function profileDate(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  return new Date(value.length === 10 ? `${value}T12:00:00+08:00` : value).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Singapore' });
}
