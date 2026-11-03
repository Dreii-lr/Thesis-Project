'use client';

import { Suspense } from 'react';
import AnalysisWorkspace from '@/src/components/layout/teacher/item-analysis/ItemAnalysis';

export default function AssessmentAnalysisView({ role }: { role: 'admin' | 'teacher' }) {
  return <Suspense fallback={<p role="status" className="p-6 text-sm text-slate-500">Loading analysis selections…</p>}><AnalysisWorkspace role={role} /></Suspense>;
}
