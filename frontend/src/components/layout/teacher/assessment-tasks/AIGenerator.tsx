"use client";

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function AIGenerator() {
  return <div className="rounded-2xl border border-purple-200 bg-white p-6 space-y-4">
    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Sparkles size={18} className="text-purple-600" /> AI Assessment Generator</h2>
    <p className="text-sm text-slate-500">AI generation is not available yet. You can create a quiz manually and save your questions.</p>
    <Link href="/teacher/assessment-tasks/quizzes" className="inline-block rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white">Create quiz manually</Link>
  </div>;
}
