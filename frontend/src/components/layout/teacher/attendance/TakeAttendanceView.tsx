'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, Check } from 'lucide-react';
import { useStudents } from '@/src/context/StudentContext';
import { AttendanceRecord, AttendanceStatus } from '@/src/data/mockTeacher';
import AttendanceTable from './AttendanceTable';
import AttendanceFooter from './AttendanceFooter';

interface TakeAttendanceViewProps {
  date: string;
  level: string;
  subject: string;
  onBack: () => void;
}

export default function TakeAttendanceView({ date, level, subject, onBack }: TakeAttendanceViewProps) {
  const { students } = useStudents();
  
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Format date for header (e.g. "Sep 24, 2026")
  const displayDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const displayStudents = useMemo(() => {
    return students
      .filter(s => s.level === level)
      .sort((a, b) => {
        const nameA = `${a.lastName} ${a.firstName} ${a.middleName}`.toLowerCase();
        const nameB = `${b.lastName} ${b.firstName} ${b.middleName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [students, level]);

  const totalLearners = displayStudents.length;
  const presentCount = Object.values(records).filter(r => r.status === 'Present').length;
  const absentCount = Object.values(records).filter(r => r.status === 'Absent').length;

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], status, remarks: prev[studentId]?.remarks || '' } }));
    setSaveSuccess(false); 
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], status: prev[studentId]?.status || null, remarks } }));
  };

  const markAllPresent = () => {
    const newRecords: Record<string, AttendanceRecord> = { ...records };
    displayStudents.forEach(s => {
      if (newRecords[s.id]?.status !== 'Absent' && newRecords[s.id]?.status !== 'Excused') {
        newRecords[s.id] = { status: 'Present', remarks: newRecords[s.id]?.remarks || '' };
      }
    });
    setRecords(newRecords);
    setSaveSuccess(false);
  };

  const handleSave = () => {
    if (displayStudents.length === 0) return;
    const missingStudents = displayStudents.filter(s => !records[s.id]?.status);
    if (missingStudents.length > 0) {
      alert(`Please mark the attendance status for all learners. You have ${missingStudents.length} remaining.`);
      return;
    }
    setIsSaving(true);
    setSaveSuccess(false);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1200);
  };

  return (
    <div className="w-full h-full flex flex-col p-6 lg:p-8 bg-gray-50/30 animate-in fade-in duration-300">
      
      {/* Breadcrumb Header */}
      <div className="mb-6 flex items-center text-[13px]">
        <button onClick={onBack} className="text-gray-500 hover:text-[#4f46e5] font-medium flex items-center gap-1.5 transition-colors">
          <ChevronLeft size={14} /> Back to Records
        </button>
        <span className="text-gray-300 mx-2">/</span>
        <span className="font-bold text-gray-800">Take Attendance</span>
      </div>

      {/* Info Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
        <div>
          <div className="flex gap-2 mb-2">
            <span className="text-[10px] font-bold text-[#4f46e5] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded uppercase tracking-wider">{level}</span>
            <span className="text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded uppercase tracking-wider">{subject}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{displayDate}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-8 pr-6 border-r border-gray-200">
            <div className="text-center">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Total</p>
              <p className="text-2xl font-black text-gray-800 leading-none">{totalLearners}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Present</p>
              <p className="text-2xl font-black text-emerald-500 leading-none">{presentCount}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-0.5">Absent</p>
              <p className="text-2xl font-black text-red-500 leading-none">{absentCount}</p>
            </div>
          </div>
          <button onClick={markAllPresent} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-gray-700 rounded-md text-sm font-semibold transition-colors shadow-sm">
            <Check size={16} className="text-emerald-500" /> Mark All Present
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="grid grid-cols-[minmax(250px,1fr)_auto_minmax(200px,300px)] gap-4 p-4 border-b border-gray-200 bg-white shrink-0 items-center">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider pl-4">Learner Profile</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center w-[300px]">Attendance Status</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider pl-2">Remarks (Optional)</div>
        </div>

        <AttendanceTable students={displayStudents} records={records} onStatusChange={handleStatusChange} onRemarksChange={handleRemarksChange} />
        
        <AttendanceFooter onSave={handleSave} isSaving={isSaving} saveSuccess={saveSuccess} isDataEmpty={displayStudents.length === 0} />
      </div>
    </div>
  );
}