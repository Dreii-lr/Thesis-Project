'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Layers } from 'lucide-react';
import { useStudents } from '@/src/context/StudentContext';
import OverviewTab from './OverviewTab';
import QuizzesTab from './QuizzesTab';
import WrittenActivitiesTab from './WrittenActivitiesTab';
import AttendanceTab from './AttendanceTab';
import DocumentsTab from './DocumentsTab';

type TabId = 'overview' | 'quizzes' | 'written' | 'modules' | 'attendance' | 'documents';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'quizzes', label: 'Quizzes' },
  { id: 'written', label: 'Written Activities' },
  { id: 'modules', label: 'Modules Completed' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'documents', label: 'Documents' },
];

export default function RightContentArea() {
  const params = useParams();
  const { students } = useStudents();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const student = students.find((s) => s.id === params?.id);

  if (!student) return null;

  return (
    <div className="flex-1 bg-white border border-gray-200 rounded-xl min-w-0 flex flex-col h-full overflow-hidden shadow-sm">
      
      {/* Tab Navigation - Compact Segmented Control */}
      <div className="px-6 pt-5 pb-3 border-b border-gray-100 shrink-0">
        <div className="bg-slate-100/80 p-1 rounded-lg inline-flex overflow-x-auto max-w-full scrollbar-hide border border-slate-200/60">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-1.5 text-[13px] rounded-md transition-all duration-200 whitespace-nowrap outline-none ${
                  isActive 
                    ? 'bg-white text-blue-600 font-bold shadow-sm ring-1 ring-black/5' 
                    : 'text-slate-500 font-medium hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white">
        {activeTab === 'overview' && <OverviewTab student={student} />}
        {activeTab === 'quizzes' && <QuizzesTab student={student} />}
        {activeTab === 'written' && <WrittenActivitiesTab student={student} />}
        {activeTab === 'attendance' && <AttendanceTab student={student} />}
        {activeTab === 'documents' && <DocumentsTab student={student} />}

        {/* Empty States for Unbuilt Tabs */}
        {['modules', 'attendance'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-14 h-14 bg-slate-50 flex items-center justify-center rounded-xl mb-4 border border-slate-200 shadow-sm">
              <Layers size={20} className="text-blue-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              Module in Development
            </h3>
            <p className="text-[13px] text-gray-500 max-w-xs leading-relaxed">
              Data and tracking for {TABS.find(t => t.id === activeTab)?.label.toLowerCase()} will be available in this section soon.
            </p>
          </div>
        )}
      </div>
      
    </div>
  );
}