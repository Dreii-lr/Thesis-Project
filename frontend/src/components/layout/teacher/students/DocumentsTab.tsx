'use client';

import { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2, Clock, AlertTriangle, Eye, Download, Trash2 } from 'lucide-react';
import { Student, EnrollmentDocument } from '@/src/data/mockStudents';
import DocPreviewModal from '@/src/components/ui/teacher/DocPreviewModal';
import DocUploadModal from '@/src/components/ui/teacher/DocUploadModal';

export default function DocumentsTab({ student }: { student: Student }) {
  const [docs, setDocs] = useState<EnrollmentDocument[]>(student.documents || []);
  const [filter, setFilter] = useState<'All' | 'Verified' | 'Pending' | 'Missing'>('All');

  const [previewDoc, setPreviewDoc] = useState<EnrollmentDocument | null>(null);
  const [uploadType, setUploadType] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => {
    setDocs(student.documents || []);
  }, [student]);

  const completedCount = docs.filter(d => d.status === 'Verified').length;
  const totalCount = docs.length || 4;
  const progressPercent = (completedCount / totalCount) * 100;
  
  const filteredDocs = filter === 'All' ? docs : docs.filter(d => d.status === filter);

  const openPreview = (doc: EnrollmentDocument) => {
    setPreviewDoc(doc);
    setIsPreviewOpen(true);
  };

  const openUpload = (type: string = '') => {
    setUploadType(type);
    setIsUploadOpen(true);
  };

  const handleVerify = (id: string) => {
    setDocs(prevDocs => prevDocs.map(d => 
      d.id === id ? { ...d, status: 'Verified' } : d
    ));
  };

  const handleUploadSuccess = (type: string) => {
    setDocs(prevDocs => prevDocs.map(d => 
      d.type === type ? { 
        ...d, 
        status: 'Verified', 
        uploadDate: 'Sept 24, 2026', 
        size: '1.2 MB', 
        format: 'PDF' 
      } : d
    ));
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Header & Progress */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-6">
          <div className="flex-1 w-full">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Required Enrollment Documents</h3>
                <p className="text-sm text-gray-500 mt-0.5">Track, upload, and verify ALS requirements for this learner.</p>
              </div>
              <span className="text-sm font-semibold text-blue-700">{completedCount} / {totalCount} Verified</span>
            </div>
            <div className="w-full bg-gray-100 border border-gray-200 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
          <button 
            onClick={() => openUpload()} 
            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors flex items-center gap-2"
          >
            <UploadCloud size={16} /> Upload Document
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap gap-2">
          {(['All', 'Verified', 'Pending', 'Missing'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f} {f !== 'All' && `(${docs.filter(d => d.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Document List */}
        <div className="space-y-3">
          {filteredDocs.map(doc => {
            const isMissing = doc.status === 'Missing';
            const isPending = doc.status === 'Pending';
            const isVerified = doc.status === 'Verified';

            const badgeClass = isVerified ? 'bg-[#dcfce7] text-[#047857]' 
                             : isMissing ? 'bg-red-100 text-red-700' 
                             : 'bg-amber-100 text-amber-700';
            
            const BadgeIcon = isVerified ? CheckCircle2 : (isMissing ? AlertTriangle : Clock);

            return (
              <div key={doc.id} className={`bg-white border rounded-lg p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 transition-all hover:shadow-sm ${isMissing ? 'border-dashed border-gray-300 bg-gray-50/50' : 'border-gray-200'}`}>
                
                {/* Left Side: Details Only (Icon removed) */}
                <div className="w-full lg:w-2/3">
                  <h4 className={`text-[15px] font-bold mb-1.5 ${isMissing ? 'text-gray-500' : 'text-gray-900'}`}>{doc.title}</h4>
                  <p className="text-[13px] text-gray-500 leading-tight mb-2">{doc.description}</p>
                  
                  {!isMissing && (
                    <p className="text-[11px] text-gray-400 font-medium">
                       Uploaded: {doc.uploadDate} <span className="mx-1">•</span> {doc.size} <span className="mx-1">•</span> {doc.format}
                    </p>
                  )}
                </div>
                
                {/* Right Side: Badge + Actions */}
                <div className="flex items-center gap-4 w-full lg:w-auto border-t lg:border-t-0 border-gray-100 pt-3 lg:pt-0 mt-1 lg:mt-0 justify-between lg:justify-end">
                  
                  {/* Status Badge */}
                  <span className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${badgeClass}`}>
                    <BadgeIcon size={14} className={isVerified ? "fill-[#047857] text-white" : ""} /> {doc.status}
                  </span>
                  
                  {/* Action Buttons */}
                  {isMissing ? (
                    <button onClick={() => openUpload(doc.type)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors ml-2">
                      Upload Now
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 ml-2">
                      <button onClick={() => openPreview(doc)} className="w-9 h-9 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors" title="Preview">
                        <Eye size={18} />
                      </button>
                      
                      <button className="w-9 h-9 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors" title="Download">
                        <Download size={18} />
                      </button>

                      {isPending && (
                        <button onClick={() => handleVerify(doc.id)} className="w-9 h-9 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-colors" title="Verify Document">
                          <CheckCircle2 size={18} />
                        </button>
                      )}

                      {isVerified && (
                        <button className="w-9 h-9 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors" title="Remove Document">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DocPreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} document={previewDoc} />
      <DocUploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} presetType={uploadType} onUploadSuccess={handleUploadSuccess} />
    </>
  );
}