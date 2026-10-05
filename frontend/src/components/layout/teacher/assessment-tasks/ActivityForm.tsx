'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  Calendar,
  Clock,
  Award,
  CheckCircle2,
  FileText,
  X,
  Save,
} from 'lucide-react';
import {
  AssessmentPayload,
  TargetCategory,
  MaterialPayload,
} from '@/src/data/mockAssessment';

export default function ActivityForm({
  initialData,
  onSave,
  onCancel,
}: {
  initialData?: AssessmentPayload | null;
  onSave: (task: AssessmentPayload) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [subjectCode, setSubjectCode] = useState('ALS-LS1-COMM');
  const [targetCategory, setTargetCategory] = useState<TargetCategory>('junior_high_school');
  const [description, setDescription] = useState('');

  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [maxScore, setMaxScore] = useState<number>(100);

  const [minDate, setMinDate] = useState('');
  const [minTime, setMinTime] = useState('');

  const [existingMaterials, setExistingMaterials] = useState<MaterialPayload[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const now = new Date();
    const localYear = now.getFullYear();
    const localMonth = String(now.getMonth() + 1).padStart(2, '0');
    const localDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${localYear}-${localMonth}-${localDay}`;

    const localHours = String(now.getHours()).padStart(2, '0');
    const localMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${localHours}:${localMinutes}`;

    setMinDate(todayStr);
    setMinTime(currentTimeStr);

    if (initialData) {
      setTitle(initialData.title || '');
      setSubjectCode(initialData.subject_code || 'ALS-LS1-COMM');
      setTargetCategory(initialData.target_category || 'junior_high_school');
      setDescription(initialData.description || '');
      setMaxScore(initialData.max_score || 100);
      setExistingMaterials(initialData.materials || []);

      if (initialData.end_date) {
        const d = new Date(initialData.end_date);
        if (!isNaN(d.getTime())) {
          setDeadlineDate(
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
              d.getDate()
            ).padStart(2, '0')}`
          );
          setDeadlineTime(
            `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          );
        }
      } else {
        setDeadlineDate(todayStr);
      }
    } else {
      setDeadlineDate(todayStr);
    }
  }, [initialData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveNewFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingMaterial = (index: number) => {
    setExistingMaterials((prev) => prev.filter((_, i) => i !== index));
  };

  const buildAndSave = (saveStatus: 'DRAFT' | 'PENDING') => {
    if (saveStatus === 'PENDING') {
      if (!title.trim()) return alert('Please enter an activity title.');
      if (!deadlineDate || !deadlineTime) {
        return alert('Please set both the Deadline Date and Deadline Time.');
      }

      const selectedDeadline = new Date(`${deadlineDate}T${deadlineTime}`);
      const now = new Date();
      if (!initialData && selectedDeadline < now) {
        return alert('The deadline cannot be set in the past. Please choose a future time.');
      }
    }

    const safeDeadlineDate = deadlineDate || minDate || new Date().toISOString().slice(0, 10);
    const selectedDeadline = new Date(`${safeDeadlineDate}T${deadlineTime || '23:59'}`);

    const newMaterialsPayload: MaterialPayload[] = files.map((file) => ({
      file_name: file.name,
      file_url: URL.createObjectURL(file),
      file_type: file.type || 'application/octet-stream',
      file_size_bytes: file.size,
    }));

    const combinedMaterials = [...existingMaterials, ...newMaterialsPayload];

    const formattedDeadline = `${selectedDeadline.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}\n${selectedDeadline.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })}`;

    const finalStatus =
      initialData?.status === 'PUBLISHED' && saveStatus === 'PENDING'
        ? 'PUBLISHED'
        : saveStatus;

    const payload: AssessmentPayload = {
      id: initialData?.id || `assess_${Date.now()}`,
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
      materials: combinedMaterials,
      subject: subjectCode,
      type: 'Activity',
      deadline: formattedDeadline,
      submissions: initialData?.submissions || 0,
      assign_type: initialData?.assign_type,
      assigned_student_ids: initialData?.assigned_student_ids,
    };

    onSave(payload);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    buildAndSave('PENDING');
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
              Set up the activity title, class program, instructions, and submission deadline.
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
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value as TargetCategory)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none cursor-pointer"
            >
              <option value="elementary">Elementary</option>
              <option value="junior_high_school">Junior High School</option>
              <option value="basic_literacy_program">Basic Literacy Program</option>
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
                onChange={(e) => setMaxScore(Math.max(1, Number(e.target.value) || 1))}
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
          <h3 className="text-base font-bold text-slate-900">Reference Materials</h3>
          <p className="text-xs text-slate-500">
            Attach worksheets, rubrics, or reading materials for your students (optional).
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 bg-slate-50/70 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-500 hover:bg-blue-50/40 transition-all cursor-pointer group"
        >
          <UploadCloud
            size={32}
            className="text-slate-400 mb-2.5 group-hover:text-blue-600 transition-colors"
          />
          <p className="text-xs font-bold text-slate-700 group-hover:text-blue-700">
            Click to upload reference files
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            PDF, DOCX, PPTX, or Images up to 10MB
          </p>
        </div>

        {(existingMaterials.length > 0 || files.length > 0) && (
          <div className="space-y-2 pt-2">
            {existingMaterials.map((mat, idx) => (
              <div
                key={`existing-${idx}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <FileText size={15} className="text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-800 truncate">{mat.file_name}</span>
                  <span className="text-slate-400 shrink-0">
                    ({(mat.file_size_bytes / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveExistingMaterial(idx)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                  title="Remove file"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            {files.map((file, idx) => (
              <div
                key={`new-${idx}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <FileText size={15} className="text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-800 truncate">{file.name}</span>
                  <span className="text-slate-400 shrink-0">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveNewFile(idx)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                  title="Remove file"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
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
          <CheckCircle2 size={15} /> {initialData ? 'Update Activity' : 'Save Activity'}
        </button>
      </div>
    </form>
  );
}