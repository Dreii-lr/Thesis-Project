export default function ApiState({ loading, error, onRetry }: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) return <p role="status" className="p-6 text-sm text-slate-500">Loading records...</p>;
  if (!error) return null;
  return (
    <div role="alert" className="m-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
      {error}
      <button onClick={onRetry} className="ml-3 underline">Retry</button>
    </div>
  );
}
