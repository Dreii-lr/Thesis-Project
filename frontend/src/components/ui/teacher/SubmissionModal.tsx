'use client';

import { X } from 'lucide-react';
import { WrittenActivity } from '@/src/data/mockStudents';

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: WrittenActivity | null;
}

export default function SubmissionModal({ isOpen, onClose, activity }: SubmissionModalProps) {
  if (!isOpen || !activity) return null;

  // Clean up the title if it starts with "Essay: " etc.
  const cleanTitle = activity.title.includes(': ') 
    ? activity.title.split(': ')[1].replace(/"/g, '') // Removes quotes if present
    : activity.title;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-6 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 uppercase tracking-wide">
                {activity.subject}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                Submitted {activity.date}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{cleanTitle}</h2>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Area */}
        <div className="px-8 pb-8 overflow-y-auto">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
            Learner Submission
          </h3>
          
          <div className="w-full border border-gray-200 rounded-lg p-6 bg-white">
            <p className="text-gray-800 text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
              {activity.content || "No submission text provided for this activity."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
          <button 
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm bg-white"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}