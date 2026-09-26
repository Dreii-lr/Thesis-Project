'use client';

import { useState } from 'react';
import { FileText, Globe, Edit2, Trash2 } from 'lucide-react';
import { LibraryModule } from '@/src/data/mockTeacher';

interface DigitizedLibraryProps {
  modules?: LibraryModule[];
}

export default function DigitizedLibrary({ modules = [] }: DigitizedLibraryProps) {
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');

  // Safely filter over the guaranteed array
  const filteredModules = selectedSubject === 'All Subjects' 
    ? modules 
    : modules.filter(m => m.subject === selectedSubject);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      
      {/* Header & Filter */}
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
        <h3 className="text-[15px] font-bold text-gray-900">Digitized Library</h3>
        <select 
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="text-[12px] border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="All Subjects">All Subjects</option>
          <option value="LS1: Communication Skills">LS1: Communication Skills</option>
          <option value="LS2: Scientific Literacy">LS2: Scientific Literacy</option>
          <option value="LS3: Mathematical & Problem Solving">LS3: Mathematical & Problem Solving</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Module Title</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Assigned To</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Date Uploaded</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Student Visibility</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredModules.length > 0 ? (
              filteredModules.map((mod) => (
                <tr key={mod.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-red-50 text-red-500 flex items-center justify-center border border-red-100">
                        <FileText size={16} />
                      </div>
                      <p className="text-[13px] font-bold text-gray-800">{mod.filename}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[12px] font-semibold text-gray-700">{mod.subject}</p>
                    <p className="text-[11px] text-gray-500">{mod.level}</p>
                  </td>
                  <td className="px-6 py-4 text-[12px] text-gray-600">{mod.uploadDate}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-md bg-[#dcfce7] text-[#047857] text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                      <Globe size={12} /> {mod.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 group-hover:text-indigo-600">
                    <button className="hover:bg-indigo-50 p-1.5 rounded transition-colors mr-1">
                      <Edit2 size={14} />
                    </button>
                    <button className="hover:bg-indigo-50 p-1.5 rounded transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-gray-500">
                  No modules found in the library.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}