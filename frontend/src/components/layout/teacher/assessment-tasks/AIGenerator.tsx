'use client';

import React, { useState } from 'react';
import { UploadCloud, Sparkles, Loader2 } from 'lucide-react';
import { Task } from '@/src/data/mockAssessment';

export default function AIGenerator({ onSave }: { onSave: (t: Task) => void }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    
    // Simulate AI Generation time
    setTimeout(() => {
      setIsGenerating(false);
      onSave({
        id: Math.random().toString(36).substr(2, 9),
        title: 'AI Generated Quiz - Application Level',
        subject: 'General Upload',
        type: 'Quiz',
        deadline: 'No Deadline',
        submissions: 0,
        status: 'Draft'
      });
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-950">AI Quiz Generator</h2>
        <p className="text-[13px] text-slate-500 mt-1.5">Upload learning materials and let AI draft questions for your review.</p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="mb-8 border-b border-slate-100 pb-8">
          <h3 className="text-[14px] font-semibold text-slate-900 mb-4">1. Provide Source Material</h3>
          <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:border-purple-300 hover:bg-purple-50/50 transition-colors cursor-pointer group">
            <UploadCloud size={40} className="text-slate-400 mb-4 group-hover:text-purple-500 transition-colors" />
            <p className="text-[14px] font-bold text-slate-700">Click to upload reference material</p>
            <p className="text-[12px] text-slate-500 mt-2">Supported: PDF, DOCX, PPTX (Max 10MB)</p>
          </div>
        </div>

        <div>
          <h3 className="text-[14px] font-semibold text-slate-900 mb-4">2. Generation Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 border border-slate-200 rounded-xl p-6">
            <div>
              <p className="text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-wider">Question Types</p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-600" />
                  <span className="text-[13px] font-medium text-slate-700">Multiple Choice</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-600" />
                  <span className="text-[13px] font-medium text-slate-700">True or False</span>
                </label>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Question Pool Size</label>
                <input type="number" defaultValue="15" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-purple-600 px-6 text-[13px] font-semibold text-white shadow-sm shadow-purple-600/20 transition-all hover:bg-purple-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-100 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <><Loader2 size={16} className="animate-spin" /> Analyzing Document...</>
            ) : (
              <><Sparkles size={16} /> Generate Questions</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}