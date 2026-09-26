'use client';

import { useState } from 'react';
import { Search, CalendarDays, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Student } from '@/src/data/mockStudents';

export default function AttendanceTab({ student }: { student: Student }) {
  const attendanceRecords = student.attendance || [];
  const [filter, setFilter] = useState<'All' | 'Present' | 'Absent' | 'Excused'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate Statistics
  const totalDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter(r => r.status === 'Present').length;
  const absentDays = attendanceRecords.filter(r => r.status === 'Absent').length;
  const excusedDays = attendanceRecords.filter(r => r.status === 'Excused').length;
  
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  // Filter Logic
  const filteredRecords = attendanceRecords.filter(record => {
    const matchStatus = filter === 'All' || record.status === filter;
    const matchSearch = record.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        record.date.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (attendanceRecords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white border border-gray-200 rounded-xl">
        <CalendarDays size={40} className="mb-3 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">No attendance records found for this learner.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Attendance Rate</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-black text-blue-600 leading-none">{attendanceRate}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${attendanceRate}%` }} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Present</p>
          <span className="text-2xl font-black text-emerald-600 leading-none">{presentDays}</span>
          <p className="text-xs text-gray-500 mt-1 font-medium">Days attended</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Absent</p>
          <span className="text-2xl font-black text-red-600 leading-none">{absentDays}</span>
          <p className="text-xs text-gray-500 mt-1 font-medium">Missed sessions</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Excused</p>
          <span className="text-2xl font-black text-amber-600 leading-none">{excusedDays}</span>
          <p className="text-xs text-gray-500 mt-1 font-medium">Valid reasons</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {(['All', 'Present', 'Absent', 'Excused'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filter === f 
                  ? 'bg-gray-800 text-white shadow-sm' 
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search date or subject..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* List of Records */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_minmax(150px,250px)] gap-4 p-3 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider pl-3">Session Details</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider w-24 text-center">Status</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Remarks</div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredRecords.length > 0 ? (
            filteredRecords.map(record => {
              const isPresent = record.status === 'Present';
              const isAbsent = record.status === 'Absent';
              
              const badgeClass = isPresent ? 'bg-[#dcfce7] text-[#047857]' 
                               : isAbsent ? 'bg-red-100 text-red-700' 
                               : 'bg-amber-100 text-amber-700';
              
              const BadgeIcon = isPresent ? CheckCircle2 : (isAbsent ? XCircle : Clock);

              return (
                <div key={record.id} className="grid grid-cols-[1fr_auto_minmax(150px,250px)] gap-4 p-4 items-center hover:bg-gray-50/50 transition-colors">
                  <div className="pl-3">
                    <h4 className="text-[14px] font-bold text-gray-900">{record.date}</h4>
                    <p className="text-[12px] font-medium text-gray-500 mt-0.5">{record.subject}</p>
                  </div>
                  
                  <div className="w-24 flex justify-center">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${badgeClass}`}>
                      <BadgeIcon size={12} className={isPresent ? "text-[#047857]" : ""} /> 
                      {record.status}
                    </span>
                  </div>

                  <div>
                    {record.remarks ? (
                      <p className="text-[12px] text-gray-600 italic">"{record.remarks}"</p>
                    ) : (
                      <span className="text-[12px] text-gray-400">-</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-sm text-gray-500">
              No records match your filters.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}