import { Suspense } from 'react';
import ApplicationStatus from '@/src/components/enrollment/ApplicationStatus';

export default function ApplicationStatusPage() {
  return <Suspense fallback={<p role="status" className="p-8 text-sm text-slate-500">Opening application progress…</p>}><ApplicationStatus /></Suspense>;
}
