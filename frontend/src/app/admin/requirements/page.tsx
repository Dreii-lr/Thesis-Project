import { Suspense } from 'react';
import StaffRequirements from '@/src/components/requirements/StaffRequirements';

export default function Page() {
  return <Suspense fallback={<p role="status" className="p-8 text-sm text-slate-500">Opening requirements & verification…</p>}><StaffRequirements role="admin" /></Suspense>;
}
