'use client';

import React, { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { Task } from '@/src/data/mockAssessment';

export default function ActivityForm({ onSave, onCancel }: { onSave: (task: Task) => void, onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('CS201 - Data Structures');
  const [date, setDate] = useState('');

  const handlePublish = () => {
    if (!title) return alert("Please enter an activity title.");
    
    onSave({
      id: Math.random().toString(36).substr(2, 9),
      title: title,
      subject: subject,
      type: 'Activity',
      deadline: date ? `${date}\n11:59 PM` : 'No Deadline',
      submissions: 0,
      status: 'Active'
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Left Column */}
      <div className="flex-1 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <h2 className="text-[15px] font-semibold text-slate-900 mb-6">Activity Details</h2>
        <div className="space-y-5">
          <div>
            <label className="block text-[12px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Activity Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Final Project Proposal" 
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" 
            />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Subject</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
              <option>CS201 - Data Structures</option>
              <option>DB101 - Databases</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Instructions</label>
            <textarea rows={4} placeholder="Describe the task..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 resize-none"></textarea>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Reference Materials</label>
            <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer group">
              <UploadCloud size={32} className="text-slate-400 mb-3 group-hover:text-blue-500 transition-colors" />
              <p className="text-[13px] font-bold text-slate-700">Click to upload files</p>
              <p className="text-xs text-slate-500 mt-1">PDF, DOCX up to 10MB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="w-full lg:w-80 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] h-fit">
        <h2 className="text-[15px] font-semibold text-slate-900 mb-6">Settings</h2>
        <div className="space-y-5">
          <div>
            <label className="block text-[12px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Deadline Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Max Score</label>
            <input type="number" defaultValue="100" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </div>
          <button onClick={handlePublish} className="w-full inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-blue-700 mt-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
            Publish Activity
          </button>
          <button onClick={onCancel} className="w-full inline-flex h-10 items-center justify-center rounded-xl bg-slate-100 px-4 text-[13px] font-semibold text-slate-700 transition-all hover:bg-slate-200">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}