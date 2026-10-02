'use client';

import React, { useState } from 'react';
import { X, Users, CheckCircle2 } from 'lucide-react';
import { mockStudents } from '@/src/data/mockAssessment';

interface AssignStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  taskTitle: string;
}

export default function AssignStudentsModal({ isOpen, onClose, onConfirm, taskTitle }: AssignStudentsModalProps) {
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set(mockStudents.map(s => s.id)));

  if (!isOpen) return null;

  const toggleStudent = (id: string) => {
    const newSet = new Set(selectedStudents);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedStudents(newSet);
  };

  const toggleAll = () => {
    if (selectedStudents.size === mockStudents.length) setSelectedStudents(new Set());
    else setSelectedStudents(new Set(mockStudents.map(s => s.id)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
              <Users size={18} className="text-blue-600" /> Assign to Students
            </h2>
            <p className="text-[12px] text-slate-500 mt-0.5 truncate max-w-[300px]">Posting: {taskTitle}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <span className="text-[13px] font-semibold text-slate-700">{selectedStudents.size} Selected</span>
          <button onClick={toggleAll} className="text-[12px] font-bold text-blue-600 hover:text-blue-800">
            {selectedStudents.size === mockStudents.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="overflow-y-auto p-2 flex-1 bg-slate-50/30">
          <div className="space-y-1">
            {mockStudents.map((student) => (
              <label key={student.id} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${selectedStudents.has(student.id) ? 'bg-blue-50/50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${selectedStudents.has(student.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                    {selectedStudents.has(student.id) && <CheckCircle2 size={14} />}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">{student.name}</p>
                    <p className="text-[11px] text-slate-500">{student.lrn}</p>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{student.section}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-white border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={selectedStudents.size === 0} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all shadow-sm shadow-blue-600/15">
            Confirm & Post Task
          </button>
        </div>
      </div>
    </div>
  );
}