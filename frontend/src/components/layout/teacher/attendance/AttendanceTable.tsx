'use client';

import { Student } from '@/src/data/mockStudents';
import { AttendanceRecord, AttendanceStatus } from '@/src/data/mockTeacher';

interface AttendanceTableProps {
  students: Student[];
  records: Record<string, AttendanceRecord>;
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
  onRemarksChange: (studentId: string, remarks: string) => void;
}

export default function AttendanceTable({ students, records, onStatusChange, onRemarksChange }: AttendanceTableProps) {
  return (
    <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
      {students.length > 0 ? (
        students.map((student) => {
          const currentStatus = records[student.id]?.status || null;
          const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();
          const formattedName = `${student.lastName}, ${student.firstName} ${student.middleName ? student.middleName.charAt(0) + '.' : ''}`.trim();

          return (
            <div key={student.id} className="grid grid-cols-[minmax(250px,1fr)_auto_minmax(200px,300px)] gap-4 p-4 items-center hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center gap-4 pl-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-[#4f46e5] flex items-center justify-center font-bold text-sm shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 truncate">{formattedName}</h4>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">LRN: {student.lrn}</p>
                </div>
              </div>

              <div className="w-[300px] shrink-0 flex justify-center">
                <div className="flex w-full bg-gray-100/80 p-1 rounded-md border border-gray-200/60">
                  <button onClick={() => onStatusChange(student.id, 'Present')} className={`flex-1 text-xs font-bold py-2 rounded transition-all ${currentStatus === 'Present' ? 'bg-white text-emerald-700 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 border border-transparent'}`}>Present</button>
                  <button onClick={() => onStatusChange(student.id, 'Absent')} className={`flex-1 text-xs font-bold py-2 rounded transition-all ${currentStatus === 'Absent' ? 'bg-white text-red-700 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 border border-transparent'}`}>Absent</button>
                  <button onClick={() => onStatusChange(student.id, 'Excused')} className={`flex-1 text-xs font-bold py-2 rounded transition-all ${currentStatus === 'Excused' ? 'bg-white text-amber-700 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 border border-transparent'}`}>Excused</button>
                </div>
              </div>

              <div className="pr-4">
                <input type="text" placeholder="Add note..." value={records[student.id]?.remarks || ''} onChange={(e) => onRemarksChange(student.id, e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#4f46e5] focus:bg-white transition-all"/>
              </div>
            </div>
          );
        })
      ) : (
        <div className="py-16 text-center text-gray-500 text-sm">No learners found matching the selected criteria.</div>
      )}
    </div>
  );
}