import { Suspense } from 'react';
import AdminRequirementsCatalog from '@/src/components/requirements/AdminRequirementsCatalog';

export default function AdminRequirementsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
      <Suspense fallback={<p role="status" className="p-8 text-sm text-slate-500">Loading requirements catalog…</p>}>
        <AdminRequirementsCatalog />
      </Suspense>
    </div>
  );
}
