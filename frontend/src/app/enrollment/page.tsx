import { Suspense } from 'react';
import EnrollmentForm from '@/src/components/enrollment/EnrollmentForm';

export default function EnrollmentPage() {
  return <Suspense fallback={<p role="status" className="p-8 text-sm text-slate-500">Opening enrollment…</p>}><EnrollmentForm /></Suspense>;
}
