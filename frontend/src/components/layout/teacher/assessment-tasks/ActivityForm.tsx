'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Award,
  CheckCircle2,
  FileText,
  Save,
} from 'lucide-react';
import {
  AssessmentPayload,
  TargetCategory,
  MaterialPayload,
} from '@/src/lib/assessments-api';

export default function ActivityForm({
  initialData,
  onSave,
  onCancel,
}: {
  initialData?: AssessmentPayload | null;
  onSave: (task: AssessmentPayload) => void;
  onCancel: () => void;
}) {
  const [today] = useState(() => new Date());
  const datePart = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const timePart = (value: Date) => `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  const minDate = datePart(today);
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [subjectCode, setSubjectCode] = useState(initialData?.subject_code ?? 'ALS-LS1-COMM');
  const [targetCategory, setTargetCategory] =
    useState<TargetCategory | null>(initialData ? initialData.target_category : 'SECONDARY');
  const [description, setDescription] = useState(initialData?.description ?? '');

  const [deadlineDate, setDeadlineDate] = useState(initialData?.end_date ? datePart(new Date(initialData.end_date)) : minDate);
  const [deadlineTime, setDeadlineTime] = useState(initialData?.end_date ? timePart(new Date(initialData.end_date)) : '23:59');
  const [maxScore, setMaxScore] = useState<number>(initialData?.max_score ?? 100);

  const minTime = timePart(today);

  const existingMaterials: MaterialPayload[] = initialData?.materials ?? [];


  const buildAndSave = async (saveStatus: 'DRAFT' | 'SCHEDULED') => {
    if (saveStatus === 'SCHEDULED') {
      if (!title.trim()) return alert('Please enter an activity title.');
      if (!deadlineDate || !deadlineTime) {
        return alert('Please set both the Deadline Date and Deadline Time.');
      }

      const selectedDeadline = new Date(`${deadlineDate}T${deadlineTime}`);
      const now = new Date();
      if (!initialData && selectedDeadline < now) {
        return alert(
          'The deadline cannot be set in the past. Please choose a future time.',
        );
      }
    }

    const safeDeadlineDate =
      deadlineDate || minDate || new Date().toISOString().slice(0, 10);
    const selectedDeadline = new Date(
      `${safeDeadlineDate}T${deadlineTime || '23:59'}`,
    );

    if (!Number.isFinite(maxScore) || maxScore <= 0) return alert('Enter a positive maximum score.');
    const finalStatus = saveStatus === 'DRAFT' ? 'DRAFT' : initialData?.status === 'COMPLETED' || selectedDeadline <= new Date() ? 'COMPLETED' : new Date(initialData?.start_date || Date.now()) > new Date() ? 'SCHEDULED' : 'ACTIVE';

    const payload: AssessmentPayload = {

      title: title.trim() || 'Untitled Activity (Draft)',
      description: description.trim(),
      subject_code: subjectCode,
      target_category: targetCategory,
      assessment_type: 'ACTIVITY',
      status: finalStatus,
      start_date: initialData?.start_date || new Date().toISOString(),
      end_date: selectedDeadline.toISOString(),
      grace_period_minutes: 0,
      duration_minutes: 0,
      max_score: maxScore,
      is_ai_generated: false,
      categories_data: [],
      materials: existingMaterials,

    };

    onSave(payload);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    buildAndSave('SCHEDULED');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 font-sans">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {initialData ? 'Edit Activity' : 'Activity Configuration'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Set up the activity title, class program, instructions, and
              submission deadline.
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
              Activity Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Final Project Proposal"
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none cursor-pointer"
            >
              <option value="ALS-LS1-COMM">
                ALS-LS1-COMM (Communication Skills)
              </option>
              <option value="ALS-LS2-SCI">
                ALS-LS2-SCI (Scientific & Critical Thinking)
              </option>
              <option value="ALS-LS3-MATH">
                ALS-LS3-MATH (Mathematical & Problem Solving)
              </option>
              <option value="ALS-LS6-DIGITAL">
                ALS-LS6-DIGITAL (Digital Citizenship)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Class Category
            </label>
            <select
              value={targetCategory ?? ""}
              onChange={(e) =>
                setTargetCategory((e.target.value || null) as TargetCategory | null)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none cursor-pointer"
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
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the activity requirements and steps for the students..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-3 border-t border-slate-100">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Calendar size={13} className="text-rose-600" /> Deadline Date
            </label>
            <input
              type="date"
              required
              min={minDate}
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Clock size={13} className="text-rose-600" /> Deadline Time
            </label>
            <input
              type="time"
              required
              min={deadlineDate === minDate ? minTime : undefined}
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Award size={13} className="text-blue-600" /> Max Score
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                min={1}
                max={1000}
                required
                value={maxScore}
                onChange={(e) =>
                  setMaxScore(Math.max(1, Number(e.target.value) || 1))
                }
                className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-12 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              <span className="absolute right-3.5 text-xs font-medium text-slate-400">
                pts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reference Materials Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Reference Materials
          </h3>
          <p className="text-xs text-slate-500">
            Existing worksheets and reference materials appear here.
          </p>
        </div>

        <p className="text-xs text-slate-500">File uploads are not available yet. Include reference links in the instructions.</p>
        {existingMaterials.map((material, index) => <div key={index} className="flex items-center gap-2 text-sm text-slate-600"><FileText size={15} />{material.file_name}</div>)}
      </div>

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
          <CheckCircle2 size={15} />{' '}
          {initialData ? 'Update Activity' : 'Save Activity'}
        </button>
      </div>
    </form>
  );
}
