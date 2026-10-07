'use client';

import React from 'react';
import { FileText, ListTodo, GraduationCap, Sparkles, PenTool } from 'lucide-react';

export default function TypeSelector({ onViewChange }: { onViewChange: (view: string) => void }) {
  return (
    <div className="max-w-4xl">
      <h2 className="text-[15px] font-semibold text-slate-900 mb-1">What would you like to create?</h2>
      <p className="text-[13px] text-slate-500 mb-6">Select an assessment type to configure workflows, schedules, and questions.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Activity Card */}
        <div
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-blue-300 hover:shadow-md cursor-pointer transition-all group"
          onClick={() => onViewChange('create-activity')}
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100 flex items-center justify-center mb-5">
            <FileText size={22} />
          </div>
          <h3 className="text-[15px] font-bold text-slate-900 mb-2">Activity</h3>
          <p className="text-[13px] text-slate-500 leading-relaxed">Assign activities with instructions and a deadline. Manual grading workflow.</p>
        </div>

        {/* Quiz Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 ring-1 ring-inset ring-purple-100 flex items-center justify-center mb-5">
            <ListTodo size={22} />
          </div>
          <h3 className="text-[15px] font-bold text-slate-900 mb-2">Quiz</h3>
          <p className="text-[13px] text-slate-500 mb-6 leading-relaxed flex-1">Objective assessment. Auto-graded.</p>

          <div className="space-y-2.5">
            <button
              onClick={() => onViewChange('create-quiz-manual')}
              className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 py-2.5 rounded-xl text-[13px] font-semibold transition-colors hover:bg-slate-50 hover:text-slate-900 shadow-sm"
            >
              <PenTool size={16} className="text-purple-600" /> Create Manually
            </button>
            <button
              disabled title="AI generation is not available yet"
              className="w-full flex items-center justify-center gap-2 bg-purple-100 text-purple-500 cursor-not-allowed py-2.5 rounded-xl text-[13px] font-semibold transition-colors shadow-sm shadow-purple-600/20 focus-visible:ring-4 focus-visible:ring-purple-100"
            >
              <Sparkles size={16} /> AI Coming Soon
            </button>
          </div>
        </div>

        {/* Exam Card */}
        <div
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-orange-300 hover:shadow-md cursor-pointer transition-all group"
          onClick={() => onViewChange('create-exam')}
        >
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 ring-1 ring-inset ring-orange-100 flex items-center justify-center mb-5">
            <GraduationCap size={22} />
          </div>
          <h3 className="text-[15px] font-bold text-slate-900 mb-2">Exam</h3>
          <p className="text-[13px] text-slate-500 leading-relaxed">Formal assessment. Large question pools, strict timers, and grace periods.</p>
        </div>

      </div>
    </div>
  );
}
