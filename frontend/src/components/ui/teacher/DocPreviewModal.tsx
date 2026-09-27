'use client';

import { EnrollmentDocument } from '@/src/data/mockStudents';

interface DocPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: EnrollmentDocument | null;
}

export default function DocPreviewModal({ isOpen, onClose, document }: DocPreviewModalProps) {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{document.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Format: {document.format} | Uploaded: {document.uploadDate}</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
              Download File
            </button>
            <div className="w-px h-4 bg-gray-300"></div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-900 text-2xl leading-none">
              &times;
            </button>
          </div>
        </div>
        
        {/* Document Viewer Body */}
        <div className="flex-1 bg-gray-200 p-8 overflow-y-auto flex justify-center">
          <div className="bg-white w-full max-w-3xl shadow-sm border border-gray-300 min-h-[800px] p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-20 border-2 border-gray-200 rounded text-gray-300 flex items-center justify-center mb-4 text-xs font-bold uppercase">
              {document.format}
            </div>
            <p className="text-base font-medium text-gray-600">Document Preview Simulator</p>
            <p className="text-sm mt-1 text-gray-500">The actual enrollment document would be rendered here.</p>
          </div>
        </div>

      </div>
    </div>
  );
}