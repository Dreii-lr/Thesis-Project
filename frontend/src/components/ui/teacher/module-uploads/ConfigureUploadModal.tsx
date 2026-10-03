'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Upload } from 'lucide-react';

interface ConfigureUploadModalProps {
  isOpen: boolean;
  filename: string;
  onClose: () => void;
  onConfirm: (filename: string, level: string, subject: string) => void;
}

export default function ConfigureUploadModal({ isOpen, filename, onClose, onConfirm }: ConfigureUploadModalProps) {
  const [level, setLevel] = useState('Junior High School');
  const [subject, setSubject] = useState('LS1: Communication Skills');

  useEffect(() => {
    if (isOpen) {
      setLevel('Junior High School');
      setSubject('LS1: Communication Skills');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-0 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
        
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-[16px] font-bold text-gray-900">Configure Module</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 bg-white space-y-5">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-3">
            <FileText className="text-blue-500 w-6 h-6 ml-1 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">Selected File</p>
              <p className="text-[13px] font-semibold text-blue-900 truncate">{filename}</p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Target Level</label>
            <select 
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white shadow-sm"
            >
              <option value="Junior High School">Junior High School</option>
              <option value="Elementary">Elementary</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Subject / Learning Strand</label>
            <select 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white shadow-sm"
            >
              <option value="LS1: Communication Skills">LS1: Communication Skills</option>
              <option value="LS2: Scientific Literacy">LS2: Scientific Literacy</option>
              <option value="LS3: Mathematical & Problem Solving">LS3: Mathematical & Problem Solving</option>
              <option value="LS4: Life and Career Skills">LS4: Life and Career Skills</option>
              <option value="LS5: Understanding the Self and Society">LS5: Understanding the Self and Society</option>
              <option value="LS6: Digital Citizenship">LS6: Digital Citizenship</option>
            </select>
          </div>

          <div className="pt-4 border-t border-gray-100 mt-2 flex flex-col sm:flex-row justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-[13px] font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors w-full sm:w-auto">
              Cancel
            </button>
            <button 
              onClick={() => onConfirm(filename, level, subject)} 
              className="px-4 py-2 text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Upload size={16} /> Confirm Upload
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}