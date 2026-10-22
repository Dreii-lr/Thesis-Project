import type { ReactNode } from 'react';

export const studentHeaderActionClass = 'inline-flex min-h-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50';
export const studentSummaryCardClass = 'min-h-36 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-6 shadow-sm';
export const studentContentCardClass = 'flex h-full min-h-56 min-w-0 flex-col rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white p-6 shadow-sm transition-colors duration-150 hover:border-blue-200';

export default function StudentPageHeader({ eyebrow, title, description, actions, children }: {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return <section data-student-page-header className="flex min-h-72 min-w-0 flex-col justify-between gap-6 overflow-hidden rounded-3xl border border-blue-900/10 bg-gradient-to-br from-slate-900 via-blue-900 to-blue-600 p-6 text-white shadow-sm sm:p-8">
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-xs font-medium leading-5 text-blue-100">{eyebrow}</p>
        <h1 className="mt-3 break-words text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
    {children && <div className="border-t border-white/15 pt-4">{children}</div>}
  </section>;
}
