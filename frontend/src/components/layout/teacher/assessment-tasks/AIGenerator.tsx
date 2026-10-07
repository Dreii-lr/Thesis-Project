'use client';

import React, { useState } from 'react';
import { Sparkles, Calendar, Clock, AlertCircle } from 'lucide-react';
import {
  AssessmentPayload,
  TargetCategory,
  CategoryDataPayload,
  QuestionPayload,
} from '@/src/data/mockAssessment';

interface AIGeneratorProps {
  onSave: (task: AssessmentPayload) => void;
}

interface CategoryConfig {
  id: string;
  type: string;
  label: string;
  maxItems: number;
  count: number;
  pointsEach: number;
  enabled: boolean;
}

const PROGRAM_TO_CATEGORY: Record<
  'Elementary' | 'Junior High School' | 'Basic Literacy Program',
  TargetCategory
> = {
  Elementary: 'elementary',
  'Junior High School': 'junior',
  'Basic Literacy Program': 'basic_literacy',
};

export default function AIGenerator({ onSave }: AIGeneratorProps) {
  const [title, setTitle] = useState('');
  const [subjectCode, setSubjectCode] = useState('ALS-LS6-DIGITAL');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Moderate' | 'Challenging'>('Moderate');
  const [program, setProgram] = useState<
    'Elementary' | 'Junior High School' | 'Basic Literacy Program'
  >('Junior High School');

  const [startDate, setStartDate] = useState('2026-10-10');
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState('2026-10-10');
  const [endTime, setEndTime] = useState('10:00');

  const [categories, setCategories] = useState<CategoryConfig[]>([
    {
      id: 'mc',
      type: 'Multiple Choice',
      label: 'Multiple Choice (A, B, C, D)',
      maxItems: 30,
      count: 10,
      pointsEach: 1,
      enabled: true,
    },
    {
      id: 'tf',
      type: 'True or False',
      label: 'True or False',
      maxItems: 15,
      count: 5,
      pointsEach: 1,
      enabled: false,
    },
    {
      id: 'mt',
      type: 'Matching Type',
      label: 'Matching Type (Column A & B)',
      maxItems: 15,
      count: 5,
      pointsEach: 2,
      enabled: true,
    },
    {
      id: 'id',
      type: 'Identification',
      label: 'Identification',
      maxItems: 15,
      count: 5,
      pointsEach: 1,
      enabled: false,
    },
    {
      id: 'es',
      type: 'Essay',
      label: 'Essay / Reflective Question',
      maxItems: 5,
      count: 1,
      pointsEach: 5,
      enabled: false,
    },
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

  const buildGeneratedCategories = (): CategoryDataPayload[] => {
    const snippet = topic.trim().slice(0, 50) || 'the lesson topic';

    return activeCategories.map((cat, idx) => {
      const questions: QuestionPayload[] = Array.from({ length: cat.count }, (_, qIdx) => {
        const qNum = qIdx + 1;
        if (cat.type === 'Multiple Choice') {
          return {
            id: `q_ai_${cat.id}_${Date.now()}_${qNum}`,
            text: `[${difficulty}] Question #${qNum} regarding ${snippet}?`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correct_answer: 'A',
            premise: '',
            match: '',
          };
        }
        if (cat.type === 'True or False') {
          return {
            id: `q_ai_${cat.id}_${Date.now()}_${qNum}`,
            text: `[${difficulty}] Statement #${qNum} based on ${snippet} is accurate.`,
            options: ['True', 'False'],
            correct_answer: 'True',
            premise: '',
            match: '',
          };
        }
        if (cat.type === 'Matching Type') {
          return {
            id: `q_ai_${cat.id}_${Date.now()}_${qNum}`,
            text: '',
            options: [],
            correct_answer: '',
            premise: `Concept #${qNum} (${snippet})`,
            match: `Definition / Match #${qNum}`,
          };
        }
        return {
          id: `q_ai_${cat.id}_${Date.now()}_${qNum}`,
          text: `[${difficulty}] ${cat.type} prompt #${qNum} about ${snippet}:`,
          options: [],
          correct_answer: 'Sample Answer',
          premise: '',
          match: '',
        };
      });

      return {
        category_id: `cat_${cat.id}_${idx + 1}`,
        type: cat.type,
        pool_size: cat.count,
        required_count: cat.count,
        points_per_item: cat.pointsEach,
        is_expanded: true,
        distractors: cat.type === 'Matching Type' ? ['Distractor A', 'Distractor B'] : [],
        questions,
      };
    });
  };

  const handleGenerateAndSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeCategories.length === 0) return;

    const startIso = new Date(`${startDate}T${startTime}:00`).toISOString();
    const endIso = new Date(`${endDate}T${endTime}:00`).toISOString();

    const formattedStart = new Date(`${startDate}T${startTime}:00`).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    const formattedEnd = new Date(`${endDate}T${endTime}:00`).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const newTask: AssessmentPayload = {
      id: `assess_${Date.now()}`,
      title: title.trim() || `${topic.slice(0, 25)} AI Assessment`,
      description: `AI-Generated (${difficulty}) assessment covering: ${topic}`,
      subject_code: subjectCode,
      target_category: PROGRAM_TO_CATEGORY[program],
      assessment_type: 'QUIZ',
      status: 'SCHEDULED',
      start_date: startIso,
      end_date: endIso,
      grace_period_minutes: 15,
      duration_minutes: 60,
      max_score: totalPoints,
      is_ai_generated: true,
      categories_data: buildGeneratedCategories(),
      materials: [],
      subject: subjectCode,
      type: 'Quiz',
      deadline: `${formattedStart} to\n${formattedEnd}`,
      submissions: 0,
      assign_type: 'all',
      assigned_student_ids: [],
    };

    onSave(newTask);
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

        {/* Title, Subject Code, Class Level, Difficulty */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Subject Code</label>
            <input
              type="text"
              required
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Cognitive Difficulty
            </label>
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
                  cat.enabled
                    ? 'border-purple-600 bg-purple-50/30'
                    : 'border-slate-200 bg-slate-50/50 opacity-70'
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
                    <div className="text-[11px] text-slate-500">
                      Max allowed: {cat.maxItems} items
                    </div>
                  </div>
                </label>

                {cat.enabled && (
                  <div className="flex items-center gap-2">
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500">
                        Items (Max {cat.maxItems})
                      </span>
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
                      <span className="block text-[10px] font-semibold text-slate-500">
                        Pts Each
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={cat.pointsEach}
                        onChange={(e) =>
                          updateCategory(cat.id, 'pointsEach', Number(e.target.value) || 1)
                        }
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
            disabled={activeCategories.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
          >
            <Sparkles size={14} /> Generate & Save as Pending
          </button>
        </div>
      </div>
    </form>
  );
}