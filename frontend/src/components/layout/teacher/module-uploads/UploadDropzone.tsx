'use client';

import { useRef } from 'react';
import { UploadCloud } from 'lucide-react';

interface UploadDropzoneProps {
  onFileSelect: (filename: string) => void;
}

export default function UploadDropzone({ onFileSelect }: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0].name);
      if (fileInputRef.current) fileInputRef.current.value = ''; // reset
    }
  };

  return (
    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-center min-h-[250px]">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".pdf,.doc,.docx,.ppt,.pptx" 
        onChange={handleFileChange} 
      />
      <div 
        onClick={() => fileInputRef.current?.click()} 
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 sm:p-10 text-center bg-gray-50 hover:bg-blue-50/50 hover:border-blue-400 transition-all cursor-pointer group h-full flex flex-col items-center justify-center"
      >
        <div className="w-14 h-14 bg-white rounded-full shadow-sm border border-gray-200 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:text-blue-600 group-hover:border-blue-200 transition-all duration-300">
          <UploadCloud className="text-gray-400 group-hover:text-blue-500 transition-colors w-6 h-6" />
        </div>
        <h3 className="text-sm sm:text-[15px] font-bold text-gray-800 mb-1">Click to upload learning module</h3>
        <p className="text-[11px] sm:text-[12px] text-gray-500">PDF, DOCX, or PPTX (Max 25MB)</p>
      </div>
    </div>
  );
}