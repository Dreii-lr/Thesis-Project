import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface StudentStatItem {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  loading?: boolean;
  description?: string;
}

export default function StudentStatCards({ label, items }: {
  label: string;
  items: StudentStatItem[];
}) {
  return (
    <div role="group" aria-label={label} className="w-full overflow-x-auto pb-1">
      <ul className={`flex w-full gap-3 ${items.length > 4 ? 'min-w-3xl' : 'min-w-xl'}`}>
        {items.map(({ label: title, value, icon: Icon, loading, description }) => (
          <li key={title} className="min-w-0 flex-1">
            <div
              data-student-stat-card
              title={description}
              className="relative flex h-full min-h-20 w-full min-w-0 flex-col items-start justify-between gap-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-left shadow-sm backdrop-blur-md"
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" className="absolute right-4 top-4 text-blue-100" />
              <span data-overview-value className="max-w-full truncate pr-8 text-xl font-semibold leading-7 tracking-tight text-white tabular-nums">
                {loading ? (
                  <span role="status">
                    <span className="sr-only">Loading {title.toLowerCase()}</span>
                    <span aria-hidden="true" className="block h-5 w-6 animate-pulse rounded-md bg-white/20 motion-reduce:animate-none" />
                  </span>
                ) : value}
              </span>
              <span data-overview-label className="text-xs font-medium leading-4 text-blue-50">{title}</span>
              {description && <span className="sr-only">{description}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
