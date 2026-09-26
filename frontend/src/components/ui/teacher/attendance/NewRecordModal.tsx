'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface NewRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRecording: (date: string, level: string, subject: string) => void;
}

export default function NewRecordModal({ isOpen, onClose, onStartRecording }: NewRecordModalProps) {
  const [date, setDate] = useState('2026-09-24');
  const [level, setLevel] = useState('Junior High School');
  const [subject, setSubject] = useState('LS1: Communication Skills');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
        
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-base font-bold text-gray-900">New Attendance Record</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#4f46e5] focus:border-[#4f46e5]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Class Level</label>
            <select 
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#4f46e5] focus:border-[#4f46e5]"
            >
              <option value="Junior High School">Junior High School</option>
              <option value="Elementary">Elementary</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Subject Strand</label>
            <select 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#4f46e5] focus:border-[#4f46e5]"
            >
              <option value="LS1: Communication Skills">LS1: Communication Skills</option>
              <option value="LS2: Scientific Literacy">LS2: Scientific Literacy</option>
              <option value="LS3: Mathematical & Problem Solving">LS3: Mathematical & Problem Solving</option>
            </select>
          </div>

          <button 
            onClick={() => onStartRecording(date, level, subject)}
            className="w-full mt-2 py-3 bg-[#4f46e5] hover:bg-indigo-700 text-white rounded-md text-sm font-semibold transition-all shadow-sm"
          >
            Start Recording
          </button>
        </div>
      </div>
    </div>
  );
}