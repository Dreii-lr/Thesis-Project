'use client';

import React, { useState, useEffect } from 'react';
import {
  mockStudents,
  TargetCategory,
  CATEGORY_LABELS,
} from '@/src/data/mockAssessment';
import { X, Users, UserCheck, CheckSquare, Square } from 'lucide-react';

export interface AssignStudentsModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  onConfirm: (config?: any) => void;
  taskTitle?: string;
  initialCategory?: TargetCategory;
}

export default function AssignStudentsModal({
  isOpen,
  open,
  onClose,
  onConfirm,
  taskTitle = '',
  initialCategory = 'junior_high_school',
}: AssignStudentsModalProps) {
  const [targetCategory, setTargetCategory] = useState<TargetCategory>(initialCategory);
  const [assignType, setAssignType] = useState<'all' | 'specific'>('all');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  useEffect(() => {
    if (initialCategory) setTargetCategory(initialCategory);
  }, [initialCategory]);

  const visible = isOpen ?? open ?? false;
  if (!visible) return null;

  const classStudents = mockStudents.filter((s) => s.target_category === targetCategory);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePublish = () => {
    if (assignType === 'specific' && selectedStudents.length === 0) {
      alert('Please select at least one student for manual assignment.');
      return;
    }
    onConfirm({
      target_category: targetCategory,
      assign_type: assignType,
      assigned_student_ids:
        assignType === 'all' ? classStudents.map((s) => s.id) : selectedStudents,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Publish & Assign Assessment</h3>
            <p className="text-xs text-slate-500 mt-0.5">{taskTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              1. Select Class Program
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                ['elementary', 'junior_high_school', 'basic_literacy_program'] as TargetCategory[]
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setTargetCategory(cat);
                    setSelectedStudents([]);
                  }}
                  className={`rounded-xl border p-2.5 text-left text-xs font-semibold transition-all ${
                    targetCategory === cat
                      ? 'border-blue-600 bg-blue-50/70 text-blue-700 ring-1 ring-blue-600'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              2. Recipient Option
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAssignType('all')}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                  assignType === 'all'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Users size={16} />
                <div className="text-left">
                  <div>All Students</div>
                  <div className="text-[10px] font-normal text-slate-500">
                    Entire {CATEGORY_LABELS[targetCategory]}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAssignType('specific')}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                  assignType === 'specific'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <UserCheck size={16} />
                <div className="text-left">
                  <div>Manual Selection</div>
                  <div className="text-[10px] font-normal text-slate-500">
                    Specific students only
                  </div>
                </div>
              </button>
            </div>
          </div>

          {assignType === 'specific' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Select Students ({CATEGORY_LABELS[targetCategory]})</span>
                <span className="text-blue-600">{selectedStudents.length} selected</span>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1.5">
                {classStudents.map((student) => {
                  const checked = selectedStudents.includes(student.id);
                  return (
                    <div
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                        checked
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{student.name}</span>
                      {checked ? <CheckSquare size={15} /> : <Square size={15} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePublish}
            className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Confirm & Publish Now
          </button>
        </div>
      </div>
    </div>
  );
}