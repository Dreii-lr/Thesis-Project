'use client';

import { useState, useEffect } from 'react';

interface DocUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetType?: string;
  onUploadSuccess: (type: string) => void;
}

export default function DocUploadModal({ isOpen, onClose, presetType, onUploadSuccess }: DocUploadModalProps) {
  const [docType, setDocType] = useState(presetType || '');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success'>('idle');

  useEffect(() => {
    if (isOpen) {
      setDocType(presetType || '');
      setStatus('idle');
    }
  }, [isOpen, presetType]);

  const handleUpload = () => {
    if (!docType) return; 
    
    setStatus('uploading');
    
    // Simulate server upload
    setTimeout(() => {
      setStatus('success');
      onUploadSuccess(docType); // Trigger state update in parent
      
      setTimeout(() => {
        onClose();
      }, 700);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
        
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Upload Enrollment Document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 text-xl leading-none">&times;</button>
        </div>

        <div className="p-6 bg-white">
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Document Type</label>
            <select 
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select requirement...</option>
              <option value="af2">ALS Learner Registration Form (AF2)</option>
              <option value="identity">Proof of identity (PSA, ID, etc.)</option>
              <option value="id_photos">2x2 ID photos</option>
              <option value="form137">Form 137 / 138</option>
            </select>
          </div>

          <div className="border border-dashed border-gray-300 rounded-md p-10 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Click to select file</h3>
            <p className="text-xs text-gray-500">PDF, JPG, or PNG (MAX. 10MB)</p>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleUpload}
              disabled={!docType || status !== 'idle'}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-all min-w-[120px] ${
                status === 'success' ? 'bg-emerald-600' :
                status === 'uploading' ? 'bg-blue-400' :
                !docType ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {status === 'idle' ? 'Upload & Verify' : status === 'uploading' ? 'Uploading...' : 'Verified'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}