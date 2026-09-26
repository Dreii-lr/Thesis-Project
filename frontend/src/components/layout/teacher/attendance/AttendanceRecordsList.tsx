'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, Edit, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { AttendanceSession, mockSessions } from '@/src/data/mockTeacher'; // Adjust import based on where you placed the mock data

interface AttendanceRecordsListProps {
  onNewRecord: () => void;
  onViewRecord: (date: string, level: string, subject: string) => void;
}

export default function AttendanceRecordsList({ onNewRecord, onViewRecord }: AttendanceRecordsListProps) {
  const [selectedLevel, setSelectedLevel] = useState('All Levels');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [searchDate, setSearchDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredSessions = useMemo(() => {
    return mockSessions.filter(session => {
      const matchLevel = selectedLevel === 'All Levels' || session.level === selectedLevel;
      const matchSubject = selectedSubject === 'All Subjects' || session.subject === selectedSubject;
      const matchDate = searchDate === '' || session.displayDate.toLowerCase().includes(searchDate.toLowerCase());
      return matchLevel && matchSubject && matchDate;
    });
  }, [selectedLevel, selectedSubject, searchDate]);

  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSessions = filteredSessions.slice(startIndex, startIndex + itemsPerPage);

  const handleFilterChange = (setter: any, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  return (
    <div className="w-full h-full flex flex-col p-6 lg:p-8 bg-gray-50/30 animate-in fade-in duration-300">
      
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Attendance Records</h1>
          <p className="text-sm text-gray-500">Manage and track daily class attendance history.</p>
        </div>
        <button 
          onClick={onNewRecord}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#4f46e5] hover:bg-indigo-700 text-white rounded-md text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={18} /> New Record
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-t-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex gap-3 w-full sm:w-auto">
          <select 
            value={selectedLevel}
            onChange={(e) => handleFilterChange(setSelectedLevel, e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
          >
            <option value="All Levels">All Levels</option>
            <option value="Elementary">Elementary</option>
            <option value="Junior High School">Junior High School</option>
          </select>
          <select 
            value={selectedSubject}
            onChange={(e) => handleFilterChange(setSelectedSubject, e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
          >
            <option value="All Subjects">All Subjects</option>
            <option value="LS1: Communication Skills">LS1: Communication Skills</option>
            <option value="LS2: Scientific Literacy">LS2: Scientific Literacy</option>
            <option value="LS3: Mathematical & Problem Solving">LS3: Mathematical & Problem Solving</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search date..." 
            value={searchDate}
            onChange={(e) => handleFilterChange(setSearchDate, e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
          />
        </div>
      </div>

      <div className="bg-white border-x border-b border-gray-200 rounded-b-xl shadow-sm flex flex-col flex-1 min-w-0 overflow-hidden">
        
        <div className="grid grid-cols-5 gap-4 p-4 border-b border-gray-200 bg-white shrink-0 items-center">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider pl-2">Date & Time</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Class Session</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Attendance Rate</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Status</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Action</div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {currentSessions.length > 0 ? (
            currentSessions.map((session) => {
              const ratePercent = session.totalCount > 0 ? (session.presentCount / session.totalCount) * 100 : 0;
              const isDraft = session.status === 'DRAFT';

              return (
                <div key={session.id} className="grid grid-cols-5 gap-4 p-4 items-center hover:bg-gray-50 transition-colors">
                  <div><span className="text-[13px] font-bold text-gray-900 pl-2">{session.displayDate}</span></div>
                  <div>
                    <h4 className="text-[13px] text-gray-900">{session.level}</h4>
                    <p className="text-[12px] text-gray-500 mt-0.5">{session.subject}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${isDraft ? 'bg-gray-300' : 'bg-[#10b981]'}`} style={{ width: `${ratePercent}%` }}></div>
                    </div>
                    <span className="text-[12px] text-gray-600 font-medium">{session.presentCount}/{session.totalCount} Present</span>
                  </div>
                  <div className="flex justify-center">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isDraft ? 'bg-amber-100/80 text-amber-700' : 'bg-emerald-100/80 text-emerald-700'}`}>
                      {session.status}
                    </span>
                  </div>
                  <div className="flex justify-center">
                    <button 
                      onClick={() => onViewRecord(session.rawDate, session.level, session.subject)}
                      className="text-gray-400 hover:text-[#4f46e5] p-2 rounded-md hover:bg-indigo-50 transition-colors"
                    >
                      {isDraft ? <ArrowRight size={18} /> : <Edit size={16} />}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-sm text-gray-500">No attendance records found.</div>
          )}
        </div>

        {filteredSessions.length > 0 && (
          <div className="border-t border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
            <p className="text-xs text-gray-500">
              Showing <span className="font-bold text-gray-900">{startIndex + 1}</span> to <span className="font-bold text-gray-900">{Math.min(startIndex + itemsPerPage, filteredSessions.length)}</span> of <span className="font-bold text-gray-900">{filteredSessions.length}</span> results
            </p>
            <div className="flex items-center -space-x-px">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex justify-center items-center text-gray-500 border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50"><ChevronLeft size={16} /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 text-sm font-medium border ${currentPage === page ? 'bg-indigo-50 border-[#4f46e5] text-[#4f46e5] z-10' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{page}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex justify-center items-center text-gray-500 border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}