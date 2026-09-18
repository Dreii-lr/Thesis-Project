'use client';

import { CloudUpload, FileText, Trash2 } from 'lucide-react';

interface UploadModalProps {
  onClose: () => void;
}

export default function UploadModal({ onClose }: UploadModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Upload File</h2>
          <p className="text-sm text-gray-500 mb-6">Drag and drop files to generate the Curriculum/Module.</p>

          {/* Drag & Drop Zone */}
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer mb-6">
            <CloudUpload className="text-blue-500 mb-3" size={32} strokeWidth={1.5} />
            <p className="text-sm font-medium text-gray-900 mb-1">Upload an curriculum file(s)</p>
            <p className="text-xs text-gray-500">or, click to browse (50 MB max)</p>
          </div>

          {/* Uploaded Files List */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="text-gray-400 shrink-0" size={16} />
                <span className="text-sm text-gray-700 truncate">title_curriculum_file.pdf</span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-xs text-gray-500">20.4KB</span>
                <button className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="text-gray-400 shrink-0" size={16} />
                <span className="text-sm text-gray-700 truncate">syllabus_outline.docx</span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-xs text-gray-500">15.1KB</span>
                <button className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 border border-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#2563eb] hover:bg-blue-700 transition-colors">
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}