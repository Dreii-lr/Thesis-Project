import { Suspense } from 'react';
import StaffRequirements from '@/src/components/requirements/StaffRequirements';

export default function Page() {
  return <Suspense fallback={<p role="status" className="p-8 text-sm text-slate-500">Opening student requirements…</p>}><StaffRequirements role="teacher" /></Suspense>;
}
