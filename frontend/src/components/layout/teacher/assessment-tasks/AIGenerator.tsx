'use client';

import React, { useState } from 'react';
import { Sparkles, Calendar, Clock, AlertCircle } from 'lucide-react';

interface AIGeneratorProps {
  onSave: (task: any) => void;
}

interface CategoryConfig {
  id: string;
  label: string;
  maxItems: number;
  count: number;
  pointsEach: number;
  enabled: boolean;
}

export default function AIGenerator({ onSave }: AIGeneratorProps) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Moderate' | 'Challenging'>('Moderate');
  const [program, setProgram] = useState<'Elementary' | 'Junior High School' | 'Basic Literacy Program'>('Junior High School');

  const [startDate, setStartDate] = useState('2026-10-10');
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState('2026-10-10');
  const [endTime, setEndTime] = useState('10:00');

  const [categories, setCategories] = useState<CategoryConfig[]>([
    { id: 'mc', label: 'Multiple Choice (A, B, C, D)', maxItems: 30, count: 10, pointsEach: 1, enabled: true },
    { id: 'tf', label: 'True or False', maxItems: 15, count: 5, pointsEach: 1, enabled: false },
    { id: 'mt', label: 'Matching Type (Column A & B)', maxItems: 15, count: 5, pointsEach: 2, enabled: true },
    { id: 'id', label: 'Identification', maxItems: 15, count: 5, pointsEach: 1, enabled: false },
    { id: 'es', label: 'Essay / Reflective Question', maxItems: 5, count: 1, pointsEach: 5, enabled: false },
  ]);

  const updateCategory = (id: string, field: keyof CategoryConfig, value: any) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== id) return cat;
        if (field === 'count') {
          const clamped = Math.max(1, Math.min(cat.maxItems, Number(value) || 1));
          return { ...cat, count: clamped };
        }
        return { ...cat, [field]: value };
      })
    );
  };

  const activeCategories = categories.filter((c) => c.enabled);
  const totalItems = activeCategories.reduce((sum, c) => sum + c.count, 0);
  const totalPoints = activeCategories.reduce((sum, c) => sum + c.count * c.pointsEach, 0);

  const handleGenerateAndSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: title || `${topic} AI Assessment`,
      type: 'Quiz',
      program,
      startDate,
      startTime,
      endDate,
      endTime,
      totalItems,
      totalPoints,
      aiConfig: { topic, difficulty, categories: activeCategories },
    });
  };

  return (
    <form onSubmit={handleGenerateAndSave} className="space-y-6">
      <div className="rounded-2xl border border-purple-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={18} className="text-purple-600" /> AI Assessment Generator
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure your topic, schedule, and item limits per category.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-500">Total Configured</div>
            <div className="text-sm font-bold text-purple-700">
              {totalItems} Items • {totalPoints} Pts
            </div>
          </div>
        </div>

        {/* Title, Class Level, Difficulty */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Assessment Title</label>
            <input
              type="text"
              required
              placeholder="e.g., ALS Digital Literacy Quiz"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Class Program</label>
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
            >
              <option value="Elementary">Elementary</option>
              <option value="Junior High School">Junior High School</option>
              <option value="Basic Literacy Program">Basic Literacy Program</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Cognitive Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
            >
              <option value="Easy">Easy (Recall & Basic Comprehension)</option>
              <option value="Moderate">Moderate (Application & Analysis)</option>
              <option value="Challenging">Challenging (Synthesis & Evaluation)</option>
            </select>
          </div>
        </div>

        {/* Topic / Lesson Material */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Lesson Topic / Competency Reference
          </label>
          <textarea
            rows={3}
            required
            placeholder="Paste your lesson competencies, module text, or topic summary here..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full rounded-xl border border-slate-200 p-3.5 text-sm"
          />
        </div>

        {/* Separated Date & Time */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2 border-t border-slate-100">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
              <Calendar size={13} className="text-purple-600" /> Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
              <Clock size={13} className="text-purple-600" /> Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
              <Calendar size={13} className="text-rose-600" /> End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
              <Clock size={13} className="text-rose-600" /> End Time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Category Options with Maximum Item Limits */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Question Categories & Max Limits
            </label>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <AlertCircle size={12} /> Max limits prevent AI token cutoff
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`flex items-center justify-between rounded-xl border p-3.5 transition-all ${
                  cat.enabled ? 'border-purple-600 bg-purple-50/30' : 'border-slate-200 bg-slate-50/50 opacity-70'
                }`}
              >
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cat.enabled}
                    onChange={(e) => updateCategory(cat.id, 'enabled', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-purple-600"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">{cat.label}</div>
                    <div className="text-[11px] text-slate-500">Max allowed: {cat.maxItems} items</div>
                  </div>
                </label>

                {cat.enabled && (
                  <div className="flex items-center gap-2">
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500">Items (Max {cat.maxItems})</span>
                      <input
                        type="number"
                        min={1}
                        max={cat.maxItems}
                        value={cat.count}
                        onChange={(e) => updateCategory(cat.id, 'count', e.target.value)}
                        className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500">Pts Each</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={cat.pointsEach}
                        onChange={(e) => updateCategory(cat.id, 'pointsEach', Number(e.target.value) || 1)}
                        className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700"
          >
            <Sparkles size={14} /> Generate & Save as Pending
          </button>
        </div>
      </div>
    </form>
  );
}