'use client';

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Calendar,
  Clock,
  Timer,
  CheckCircle2,
  ListTodo,
  CheckSquare,
  ListChecks,
  Save,
} from 'lucide-react';
import {
  AssessmentPayload,
  TargetCategory,
  CategoryDataPayload,
} from '@/src/lib/assessments-api';

interface AssessmentFormProps {
  type: 'Quiz' | 'Exam';
  initialData?: AssessmentPayload | null;
  onSave: (task: AssessmentPayload) => void;
  onCancel: () => void;
}

type CategoryType = 'Multiple Choice' | 'True or False' | 'Matching Type';

const CHOICE_LETTERS = ['A', 'B', 'C', 'D'] as const;
const ALL_CATEGORIES: CategoryType[] = ['Multiple Choice', 'True or False', 'Matching Type'];

export default function AssessmentForm({
  type,
  initialData,
  onSave,
  onCancel,
}: AssessmentFormProps) {
  const [today] = useState(() => new Date());
  const datePart = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const timePart = (value: Date) => `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  const minDate = datePart(today);
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [subjectCode, setSubjectCode] = useState(initialData?.subject_code ?? 'ALS-LS6-DIGITAL');
  const [targetCategory, setTargetCategory] = useState<TargetCategory | null>(initialData ? initialData.target_category : 'SECONDARY');

  const [startDate, setStartDate] = useState(initialData?.start_date ? datePart(new Date(initialData.start_date)) : minDate);
  const [startTime, setStartTime] = useState(initialData?.start_date ? timePart(new Date(initialData.start_date)) : '08:00');
  const [endDate, setEndDate] = useState(initialData?.end_date ? datePart(new Date(initialData.end_date)) : minDate);
  const [endTime, setEndTime] = useState(initialData?.end_date ? timePart(new Date(initialData.end_date)) : '10:00');
  const [duration, setDuration] = useState<number | ''>(initialData?.duration_minutes ?? '');
  const [gracePeriod, setGracePeriod] = useState<number>(initialData?.grace_period_minutes ?? 5);

  const mc = initialData?.categories_data.find(category => category.type === 'Multiple Choice');
  const tf = initialData?.categories_data.find(category => ['True/False', 'True or False'].includes(category.type));
  const mt = initialData?.categories_data.find(category => category.type === 'Matching Type');
  const [activeCategories, setActiveCategories] = useState<CategoryType[]>(initialData?.categories_data.length ? initialData.categories_data.map(category => (category.type === 'True/False' ? 'True or False' : category.type) as CategoryType) : ['Multiple Choice']);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [mcItems, setMcItems] = useState(mc?.questions.map(q => ({ id: q.id, question: q.text ?? '', choices: { A: q.options?.[0] ?? '', B: q.options?.[1] ?? '', C: q.options?.[2] ?? '', D: q.options?.[3] ?? '' }, correctAnswer: (['A', 'B', 'C', 'D'].includes(q.correct_answer) ? q.correct_answer : 'A') as 'A' | 'B' | 'C' | 'D' })) ?? [
    {
      id: 'q_mc_1',
      question: '',
      choices: { A: '', B: '', C: '', D: '' },
      correctAnswer: 'A' as 'A' | 'B' | 'C' | 'D',
    },
  ]);
  const [mcRequiredDelivery, setMcRequiredDelivery] = useState<number>(mc?.required_count ?? 1);
  const [mcPointsEach, setMcPointsEach] = useState<number>(mc?.points_per_item ?? 1);

  const [tfItems, setTfItems] = useState(tf?.questions.map(q => ({ id: q.id, statement: q.text ?? '', correctAnswer: (q.correct_answer === 'False' ? 'False' : 'True') as 'True' | 'False' })) ?? [
    {
      id: 'q_tf_1',
      statement: '',
      correctAnswer: 'True' as 'True' | 'False',
    },
  ]);
  const [tfRequiredDelivery, setTfRequiredDelivery] = useState<number>(tf?.required_count ?? 1);
  const [tfPointsEach, setTfPointsEach] = useState<number>(tf?.points_per_item ?? 1);

  const [matchingPairs, setMatchingPairs] = useState(mt?.questions.map(q => ({ id: q.id, premise: q.premise ?? '', match: q.match ?? '' })) ?? [
    { id: 'q_mt_1', premise: '', match: '' },
    { id: 'q_mt_2', premise: '', match: '' },
    { id: 'q_mt_3', premise: '', match: '' },
  ]);
  const [matchingRequiredDelivery, setMatchingRequiredDelivery] = useState<number>(mt?.required_count ?? 3);
  const [matchingPointsEach, setMatchingPointsEach] = useState<number>(mt?.points_per_item ?? 2);
  const [distractors, setDistractors] = useState<string[]>(mt?.distractors ?? []);
  const [newDistractor, setNewDistractor] = useState('');



  const remainingCategories = ALL_CATEGORIES.filter((cat) => !activeCategories.includes(cat));

  const handleAddCategory = (category: CategoryType) => {
    if (!activeCategories.includes(category)) {
      setActiveCategories((prev) => [...prev, category]);
    }
    setShowCategoryPicker(false);
  };

  const handleRemoveCategory = (category: CategoryType) => {
    if (activeCategories.length <= 1) {
      alert('You must keep at least one question category.');
      return;
    }
    setActiveCategories((prev) => prev.filter((cat) => cat !== category));
  };

  const handleAddMcItem = () => {
    setMcItems((prev) => {
      const updated = [
        ...prev,
        {
          id: `q_mc_${Date.now()}`,
          question: '',
          choices: { A: '', B: '', C: '', D: '' },
          correctAnswer: 'A' as const,
        },
      ];
      setMcRequiredDelivery(updated.length);
      return updated;
    });
  };

  const handleRemoveMcItem = (id: string) => {
    if (mcItems.length <= 1) return;
    setMcItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      setMcRequiredDelivery((req) => Math.min(req, updated.length));
      return updated;
    });
  };

  const handleAddTfItem = () => {
    setTfItems((prev) => {
      const updated = [
        ...prev,
        {
          id: `q_tf_${Date.now()}`,
          statement: '',
          correctAnswer: 'True' as const,
        },
      ];
      setTfRequiredDelivery(updated.length);
      return updated;
    });
  };

  const handleRemoveTfItem = (id: string) => {
    if (tfItems.length <= 1) return;
    setTfItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      setTfRequiredDelivery((req) => Math.min(req, updated.length));
      return updated;
    });
  };

  const handleAddMatchingPair = () => {
    setMatchingPairs((prev) => {
      const updated = [...prev, { id: `q_mt_${Date.now()}`, premise: '', match: '' }];
      setMatchingRequiredDelivery(updated.length);
      return updated;
    });
  };

  const handleRemoveMatchingPair = (id: string) => {
    if (matchingPairs.length <= 1) return;
    setMatchingPairs((prev) => {
      const updated = prev.filter((pair) => pair.id !== id);
      setMatchingRequiredDelivery((req) => Math.min(req, updated.length));
      return updated;
    });
  };

  const handleAddDistractor = () => {
    if (!newDistractor.trim()) return;
    setDistractors((prev) => [...prev, newDistractor.trim()]);
    setNewDistractor('');
  };

  const handleRemoveDistractor = (idx: number) => {
    setDistractors((prev) => prev.filter((_, i) => i !== idx));
  };

  const matchingCategoryTotal = matchingRequiredDelivery * matchingPointsEach;

  const buildAndSave = (saveStatus: 'DRAFT' | 'SCHEDULED') => {
    if (saveStatus === 'SCHEDULED') {
      if (!title.trim()) return alert(`Please enter a ${type.toLowerCase()} title.`);
      if (!startDate || !startTime || !endDate || !endTime) {
        return alert('Please set the Start Date, Start Time, End Date, and End Time.');
      }
    }

    const safeStartDate = startDate || minDate || new Date().toISOString().slice(0, 10);
    const safeEndDate = endDate || safeStartDate;
    const startIso = new Date(`${safeStartDate}T${startTime || '08:00'}`).toISOString();
    const endIso = new Date(`${safeEndDate}T${endTime || '10:00'}`).toISOString();

    if (new Date(endIso) <= new Date(startIso)) return alert('End time must be after start time.');

    if (duration !== '' && (!Number.isInteger(duration) || duration < 1)) return alert('Duration must be a positive number of minutes.');

    const categoriesData: CategoryDataPayload[] = [];

    if (activeCategories.includes('Multiple Choice')) {
      categoriesData.push({
        category_id: mc?.category_id ?? 'cat_mc_1',
        type: 'Multiple Choice',
        pool_size: mcItems.length,
        required_count: mcRequiredDelivery,
        points_per_item: mcPointsEach,
        is_expanded: true,
        distractors: [],
        questions: mcItems.map((item) => ({
          id: String(item.id),
          text: item.question,
          options: [item.choices.A, item.choices.B, item.choices.C, item.choices.D],
          correct_answer: item.correctAnswer,
          premise: '',
          match: '',
        })),
      });
    }

    if (activeCategories.includes('True or False')) {
      categoriesData.push({
        category_id: tf?.category_id ?? 'cat_tf_1',
        type: 'True/False',
        pool_size: tfItems.length,
        required_count: tfRequiredDelivery,
        points_per_item: tfPointsEach,
        is_expanded: true,
        distractors: [],
        questions: tfItems.map((item) => ({
          id: String(item.id),
          text: item.statement,
          options: ['True', 'False'],
          correct_answer: item.correctAnswer,
          premise: '',
          match: '',
        })),
      });
    }

    if (activeCategories.includes('Matching Type')) {
      categoriesData.push({
        category_id: mt?.category_id ?? 'cat_mt_1',
        type: 'Matching Type',
        pool_size: matchingPairs.length,
        required_count: matchingRequiredDelivery,
        points_per_item: matchingPointsEach,
        is_expanded: true,
        distractors: distractors,
        questions: matchingPairs.map((pair) => ({
          id: String(pair.id),
          text: '',
          options: [],
          correct_answer: '',
          premise: pair.premise,
          match: pair.match,
        })),
      });
    }

    for (const category of categoriesData) {
      if (!Number.isInteger(category.required_count) || category.required_count < 1 || category.required_count > category.questions.length || !Number.isFinite(category.points_per_item) || category.points_per_item < 0) return alert('Check the number of questions and points for each category.');
      if (saveStatus !== 'DRAFT' && category.questions.some(q => category.type === 'Matching Type' ? !q.premise.trim() || !q.match.trim() : !q.text.trim() || (category.type === 'Multiple Choice' && q.options.some(option => !option.trim())))) return alert('Complete all questions and answers before publishing.');
    }
    const totalMaxScore = categoriesData.reduce(
      (sum, c) => sum + c.required_count * c.points_per_item,
      0
    );

    const finalStatus = saveStatus === 'DRAFT' ? 'DRAFT' : initialData?.status === 'COMPLETED' || new Date(endIso) <= new Date() ? 'COMPLETED' : new Date(startIso) > new Date() ? 'SCHEDULED' : 'ACTIVE';

    const payload: AssessmentPayload = {

      title: title.trim() || `Untitled ${type} (Draft)`,
      description: description.trim(),
      subject_code: subjectCode,
      target_category: targetCategory,
      assessment_type: type.toUpperCase() as 'QUIZ' | 'EXAM',
      status: finalStatus,
      start_date: startIso,
      end_date: endIso,
      grace_period_minutes: gracePeriod,
      duration_minutes: duration === '' ? null : duration,
      max_score: totalMaxScore,
      is_ai_generated: initialData?.is_ai_generated || false,
      categories_data: categoriesData,
      materials: initialData?.materials || [],

    };

    onSave(payload);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    buildAndSave('SCHEDULED');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {initialData ? `Edit ${type}` : `${type} Configuration`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Set up the title, class program, start/end schedule, and grace period.
            </p>
          </div>
          {initialData && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Editing Mode ({initialData.status})
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {type} Title
            </label>
            <input
              type="text"
              required
              placeholder={`Enter ${type.toLowerCase()} title...`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Subject Code
            </label>
            <select
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="ALS-LS1-COMM">ALS-LS1-COMM (Communication Skills)</option>
              <option value="ALS-LS2-SCI">ALS-LS2-SCI (Scientific & Critical Thinking)</option>
              <option value="ALS-LS3-MATH">ALS-LS3-MATH (Mathematical & Problem Solving)</option>
              <option value="ALS-LS6-DIGITAL">ALS-LS6-DIGITAL (Digital Citizenship)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Class Category
            </label>
            <select
              value={targetCategory ?? ""}
              onChange={(e) => setTargetCategory((e.target.value || null) as TargetCategory | null)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="">All Programs</option>
              <option value="ELEMENTARY">Elementary</option>
              <option value="SECONDARY">Junior High School</option>
              <option value="BLP">Basic Literacy Program</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Instructions / Description
          </label>
          <textarea
            rows={2}
            placeholder="Write general instructions for the students..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 pt-3 border-t border-slate-100">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Calendar size={13} className="text-blue-600" /> Start Date
            </label>
            <input
              type="date"
              required
              min={initialData ? undefined : minDate}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Clock size={13} className="text-blue-600" /> Start Time
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Calendar size={13} className="text-rose-600" /> End Date
            </label>
            <input
              type="date"
              required
              min={startDate || minDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Clock size={13} className="text-rose-600" /> End Time
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Time Limit (minutes, optional)</label>
            <input type="number" min={1} value={duration} onChange={event => setDuration(event.target.value === '' ? '' : Number(event.target.value))} placeholder="No time limit" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Timer size={13} className="text-amber-600" /> Grace Period (To Start)
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                min={0}
                max={180}
                value={gracePeriod}
                onChange={(e) => setGracePeriod(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-xl border border-slate-200 bg-white pl-3 pr-14 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              <span className="absolute right-3 text-xs font-medium text-slate-400">
                mins
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DYNAMIC QUESTION CATEGORIES */}
      {activeCategories.map((category) => {
        if (category === 'Multiple Choice') {
          return (
            <div
              key="Multiple Choice"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Multiple Choice</h3>
                  <p className="text-xs text-slate-500">
                    Click letter A, B, C, or D to set the correct answer.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddMcItem}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <Plus size={14} /> Add Question
                  </button>
                  {activeCategories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory('Multiple Choice')}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Remove Multiple Choice Category"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                <div className="rounded-xl bg-[#e3f5ec] px-4 py-3">
                  <div className="text-xs font-medium text-slate-800">Items Authored</div>
                  <div className="mt-0.5 text-lg font-bold text-slate-950">{mcItems.length}</div>
                </div>

                <div className="rounded-xl bg-[#e3f5ec] px-4 py-3">
                  <div className="text-xs font-medium text-slate-800">Required Delivery</div>
                  <input
                    type="number"
                    min={1}
                    max={mcItems.length}
                    value={mcRequiredDelivery}
                    onChange={(e) =>
                      setMcRequiredDelivery(
                        Math.min(mcItems.length, Math.max(1, Number(e.target.value) || 1))
                      )
                    }
                    className="mt-0.5 w-full bg-transparent text-lg font-bold text-slate-950 focus:outline-none"
                  />
                </div>

                <div className="rounded-xl bg-[#e3f5ec] px-4 py-3">
                  <div className="text-xs font-medium text-slate-800">Points Each</div>
                  <input
                    type="number"
                    min={1}
                    value={mcPointsEach}
                    onChange={(e) => setMcPointsEach(Math.max(1, Number(e.target.value) || 1))}
                    className="mt-0.5 w-full bg-transparent text-lg font-bold text-slate-950 focus:outline-none"
                  />
                </div>

                <div className="rounded-xl bg-[#e3f5ec] px-4 py-3">
                  <div className="text-xs font-medium text-slate-800">Category Total</div>
                  <div className="mt-0.5 text-lg font-bold text-slate-950">
                    {mcRequiredDelivery * mcPointsEach} pts.
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {mcItems.map((item, idx) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-block rounded-full bg-slate-800 px-3 py-0.5 text-xs font-semibold text-white">
                        Question {idx + 1}
                      </span>
                      {mcItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMcItem(item.id)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Enter question text..."
                      value={item.question}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMcItems((prev) =>
                          prev.map((q, i) => (i === idx ? { ...q, question: val } : q))
                        );
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    />

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {CHOICE_LETTERS.map((letter) => {
                        const isCorrect = item.correctAnswer === letter;
                        return (
                          <div
                            key={letter}
                            className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-all ${
                              isCorrect
                                ? 'border-emerald-600 bg-emerald-50/30'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setMcItems((prev) =>
                                  prev.map((q, i) =>
                                    i === idx ? { ...q, correctAnswer: letter } : q
                                  )
                                )
                              }
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold transition-all ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {letter}
                            </button>
                            <input
                              type="text"
                              placeholder={`Option ${letter}`}
                              value={item.choices[letter]}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMcItems((prev) =>
                                  prev.map((q, i) =>
                                    i === idx
                                      ? { ...q, choices: { ...q.choices, [letter]: val } }
                                      : q
                                  )
                                );
                              }}
                              className="w-full bg-transparent text-sm text-slate-900 focus:outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (category === 'True or False') {
          return (
            <div
              key="True or False"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">True or False</h3>
                  <p className="text-xs text-slate-500">
                    Enter a statement and select whether the correct answer is True or False.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddTfItem}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <Plus size={14} /> Add Question
                  </button>
                  {activeCategories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory('True or False')}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Remove True or False Category"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                <div className="rounded-xl bg-[#e3f5ec] px-4 py-3">
                  <div className="text-xs font-medium text-slate-800">Items Authored</div>
                  <div className="mt-0.5 text-lg font-bold text-slate-950">{tfItems.length}</div>
                </div>

                <div className="rounded-xl bg-[#e3f5ec] px-4 py-3">
                  <div className="text-xs font-medium text-slate-800">Required Delivery</div>
                  <input
                    type="number"
                    min={1}
                    max={tfItems.length}
                    value={tfRequiredDelivery}
                    onChange={(e) =>
                      setTfRequiredDelivery(
                        Math.min(tfItems.length, Math.max(1, Number(e.target.value) || 1))
                      )
                    }
                    className="mt-0.5 w-full bg-transparent text-lg font-bold text-slate-950 focus:outline-none"
                  />
                </div>

                <div className="rounded-xl bg-[#e3f5ec] px-4 py-3">
                  <div className="text-xs font-medium text-slate-800">Points Each</div>
                  <input
                    type="number"
                    min={1}
                    value={tfPointsEach}
                    onChange={(e) => setTfPointsEach(Math.max(1, Number(e.target.value) || 1))}
                    className="mt-0.5 w-full bg-transparent text-lg font-bold text-slate-950 focus:outline-none"
                  />
                </div>

                <div className="rounded-xl bg-[#e3f5ec] px-4 py-3">
                  <div className="text-xs font-medium text-slate-800">Category Total</div>
                  <div className="mt-0.5 text-lg font-bold text-slate-950">
                    {tfRequiredDelivery * tfPointsEach} pts.
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {tfItems.map((item, idx) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-block rounded-full bg-slate-800 px-3 py-0.5 text-xs font-semibold text-white">
                        Question {idx + 1}
                      </span>
                      {tfItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTfItem(item.id)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Enter True or False statement..."
                      value={item.statement}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTfItems((prev) =>
                          prev.map((q, i) => (i === idx ? { ...q, statement: val } : q))
                        );
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    />

                    <div className="grid grid-cols-2 gap-2.5 sm:max-w-xs">
                      {(['True', 'False'] as const).map((option) => {
                        const isCorrect = item.correctAnswer === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setTfItems((prev) =>
                                prev.map((q, i) =>
                                  i === idx ? { ...q, correctAnswer: option } : q
                                )
                              )
                            }
                            className={`flex items-center justify-center rounded-lg border px-4 py-2 text-xs font-bold transition-all ${
                              isCorrect
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (category === 'Matching Type') {
          return (
            <div
              key="Matching Type"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-950">Matching Type</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddMatchingPair}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Plus size={14} /> Add Pair
                  </button>
                  {activeCategories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory('Matching Type')}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Remove Matching Type Category"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                <div className="rounded-xl bg-[#e3f5ec] px-4 py-3">
                  <div className="text-xs font-medium text-slate-800">Items Authored</div>
                  <div className="mt-0.5 text-lg font-bold text-slate-950">
                    {matchingPairs.length}
                  </div>
                </div>

                <div className="rounded-xl bg-[#e3f5ec] px-4 py-3">
                  <div className="text-xs font-medium text-slate-800">Required Delivery</div>
                  <input
                    type="number"
                    min={1}
                    max={matchingPairs.length}
                    value={matchingRequiredDelivery}
                    onChange={(e) =>
                      setMatchingRequiredDelivery(
                        Math.min(matchingPairs.length, Math.max(1, Number(e.target.value) || 1))
                      )
                    }
                    className="mt-0.5 w-full bg-transparent text-lg font-bold text-slate-950 focus:outline-none"
                  />
                </div>

                <div className="rounded-xl bg-[#e3f5ec] px-4 py-3">
                  <div className="text-xs font-medium text-slate-800">Points Each</div>
                  <input
                    type="number"
                    min={1}
                    value={matchingPointsEach}
                    onChange={(e) =>
                      setMatchingPointsEach(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="mt-0.5 w-full bg-transparent text-lg font-bold text-slate-950 focus:outline-none"
                  />
                </div>

                <div className="rounded-xl bg-[#e3f5ec] px-4 py-3">
                  <div className="text-xs font-medium text-slate-800">Category Total</div>
                  <div className="mt-0.5 text-lg font-bold text-slate-950">
                    {matchingCategoryTotal} pts.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <div>
                    <span className="inline-block rounded-full bg-[#2b3440] px-3 py-1 text-xs font-semibold text-white">
                      Item 1
                    </span>
                    <div className="mt-2 text-xs font-medium text-slate-800">
                      Premises (Column A)
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {matchingPairs.map((pair, idx) => (
                      <input
                        key={pair.id}
                        type="text"
                        placeholder={`Premise ${idx + 1}`}
                        value={pair.premise}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMatchingPairs((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, premise: val } : p))
                          );
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <div>
                    <span className="inline-block rounded-full bg-[#2b3440] px-3 py-1 text-xs font-semibold text-white">
                      Item 2
                    </span>
                    <div className="mt-2 text-xs font-medium text-slate-800">
                      Matche (Column B)
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {matchingPairs.map((pair, idx) => (
                      <div key={pair.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Match ${idx + 1}`}
                          value={pair.match}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMatchingPairs((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, match: val } : p))
                            );
                          }}
                          className="w-full rounded-lg border-[1.5px] border-[#2e8555] px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none"
                        />
                        {matchingPairs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMatchingPair(pair.id)}
                            className="text-slate-400 hover:text-rose-600 shrink-0"
                            title="Remove pair"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#f5d996] overflow-hidden">
                <div className="bg-[#fdedc9] px-4 py-3 text-xs font-bold text-slate-950">
                  Extra Distractors / Decoy Options (Column B Word Bank)
                </div>
                <div className="bg-white p-4 space-y-3.5">
                  {distractors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {distractors.map((distractor, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-2 rounded-full bg-[#fae2ad] px-3.5 py-1.5 text-xs font-medium text-slate-950"
                        >
                          {distractor}
                          <button
                            type="button"
                            onClick={() => handleRemoveDistractor(idx)}
                            className="text-slate-800 hover:text-black font-bold leading-none"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      placeholder="Add Distractor"
                      value={newDistractor}
                      onChange={(e) => setNewDistractor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDistractor();
                        }
                      }}
                      className="flex-1 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddDistractor}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-900 hover:bg-slate-50"
                    >
                      + Add Distractor
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return null;
      })}

      {/* Add Question Category Selector */}
      {remainingCategories.length > 0 && (
        <div className="relative">
          {showCategoryPicker ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2">
                Select Question Category to Add
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {remainingCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleAddCategory(cat)}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs font-semibold text-slate-800 hover:border-blue-500 hover:bg-blue-50/50 hover:text-blue-700 transition-all"
                  >
                    {cat === 'Multiple Choice' && <ListTodo size={16} className="text-blue-600" />}
                    {cat === 'True or False' && <CheckSquare size={16} className="text-blue-600" />}
                    {cat === 'Matching Type' && <ListChecks size={16} className="text-blue-600" />}
                    {cat}
                  </button>
                ))}
              </div>
              <div className="pt-1 text-right">
                <button
                  type="button"
                  onClick={() => setShowCategoryPicker(false)}
                  className="px-3 py-1 text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCategoryPicker(true)}
              className="w-full rounded-2xl border-2 border-dashed border-slate-200 bg-white py-4 text-xs font-bold text-slate-600 hover:border-blue-400 hover:bg-blue-50/30 hover:text-blue-600 flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={16} /> Add Question Category
            </button>
          )}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => buildAndSave('DRAFT')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50"
        >
          <Save size={15} /> Save as Draft
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <CheckCircle2 size={15} /> {initialData ? `Update ${type}` : `Save ${type}`}
        </button>
      </div>
    </form>
  );
}