export default function StudentLoading({ label = 'Loading records...' }: { label?: string }) {
  return <div role="status" aria-busy="true" className="space-y-4 p-6">
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
      <div className="h-4 w-1/3 rounded bg-slate-100" />
      <div className="h-16 rounded-xl bg-slate-100" />
      <div className="h-16 rounded-xl bg-slate-100" />
      <div className="h-16 rounded-xl bg-slate-100" />
    </div>
  </div>;
}
