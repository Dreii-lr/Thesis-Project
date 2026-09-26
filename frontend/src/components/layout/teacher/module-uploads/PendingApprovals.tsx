'use client';

import { FileText, Check, X, FileWarning } from 'lucide-react';
import { LibraryModule } from '@/src/data/mockTeacher';

interface PendingApprovalsProps {
  pendingItems: LibraryModule[];
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
}

export default function PendingApprovals({ pendingItems, onApprove, onCancel }: PendingApprovalsProps) {
  const hasPending = pendingItems.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-[250px] lg:max-h-[350px]">
      
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
        <h3 className="text-[13px] font-bold text-gray-800">Pending Approvals</h3>
        {hasPending && (
          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {pendingItems.length}
          </span>
        )}
      </div>
      
      {/* Pending List Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
        {!hasPending ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60 py-8">
            <FileWarning size={32} className="text-gray-300 mb-3" />
            <p className="text-[12px] font-medium text-gray-500">No modules pending approval.<br/>Upload a document to get started.</p>
          </div>
        ) : (
          pendingItems.map(item => {
            const isUploading = item.status === 'Uploading';
            
            return (
              <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm relative overflow-hidden transition-all animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-col gap-3">
                  
                  {/* File Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0">
                       <FileText size={14} className={isUploading ? "text-blue-500" : "text-gray-500"} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-gray-900 truncate" title={item.filename}>{item.filename}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{item.subject}</p>
                    </div>
                  </div>

                  {/* Progress Bar OR Action Buttons */}
                  {isUploading ? (
                    <div className="w-full pt-1">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider animate-pulse">Uploading file...</span>
                        <span className="text-[10px] font-bold text-blue-600">{item.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out" 
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 w-full pt-1 border-t border-gray-50 animate-in fade-in duration-300">
                      <button 
                        onClick={() => onCancel(item.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-600 rounded text-xs font-semibold transition-colors"
                      >
                        <X size={14} /> Cancel
                      </button>
                      <button 
                        onClick={() => onApprove(item.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                      >
                        <Check size={14} /> Approve
                      </button>
                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}