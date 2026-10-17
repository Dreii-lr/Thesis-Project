'use client';

import { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import type { Student } from '@/src/lib/students-api';
import { getStudentAttendance, type StudentAttendanceHistory } from '@/src/lib/attendance-api';
import { listAssessmentRecords, listTeacherSubmissions, type TeacherSubmission } from '@/src/lib/assessments-api';
import ApiState from '@/src/components/ui/ApiState';
import OverviewTab from './OverviewTab';
import QuizzesTab from './QuizzesTab';
import WrittenActivitiesTab from './WrittenActivitiesTab';
import AttendanceTab from './AttendanceTab';

type TabId = 'overview' | 'quizzes' | 'written' | 'modules' | 'attendance' | 'documents';
const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'quizzes', label: 'Quizzes' },
  { id: 'written', label: 'Written Activities' },
  { id: 'modules', label: 'Modules Completed' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'documents', label: 'Documents' },
];

export default function RightContentArea({ student }: { student: Student }) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [records, setRecords] = useState<TeacherSubmission[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendanceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [attendanceRetry, setAttendanceRetry] = useState(0);

  useEffect(() => {
    let active = true;
    listAssessmentRecords().then(listTeacherSubmissions)
      .then(data => { if (active) setRecords(data.filter(record => !!student.account_id && record.submission.account_id === student.account_id)); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Unable to load assessment records.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [student.id, student.account_id, retry]);

  useEffect(() => {
    let active = true;
    getStudentAttendance(student.id)
      .then(data => { if (active) setAttendance(data); })
      .catch(err => { if (active) setAttendanceError(err instanceof Error ? err.message : 'Unable to load attendance.'); })
      .finally(() => { if (active) setAttendanceLoading(false); });
    return () => { active = false; };
  }, [student.id, attendanceRetry]);

  const retryRecords = () => { setLoading(true); setError(null); setRetry(value => value + 1); };
  const retryAttendance = () => { setAttendanceLoading(true); setAttendanceError(null); setAttendanceRetry(value => value + 1); };
  const assessmentTab = activeTab === 'overview' || activeTab === 'quizzes' || activeTab === 'written';

  return (
    <div className="flex-1 bg-white border border-gray-200 rounded-xl min-w-0 flex flex-col h-full overflow-hidden shadow-sm">
      <div className="px-6 pt-5 pb-3 border-b border-gray-100 shrink-0">
        <div className="bg-slate-100/80 p-1 rounded-lg inline-flex overflow-x-auto max-w-full scrollbar-hide border border-slate-200/60">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-1.5 text-[13px] rounded-md transition-all duration-200 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 font-bold shadow-sm ring-1 ring-black/5' : 'text-slate-500 font-medium hover:text-slate-800 hover:bg-slate-200/50'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white">
        {assessmentTab && <ApiState loading={loading} error={error} onRetry={retryRecords} />}
        {activeTab === 'overview' && <OverviewTab student={student} records={loading || error ? null : records} />}
        {activeTab === 'quizzes' && !loading && !error && <QuizzesTab records={records.filter(record => record.task.assessment_type !== 'ACTIVITY')} />}
        {activeTab === 'written' && !loading && !error && <WrittenActivitiesTab records={records.filter(record => record.task.assessment_type === 'ACTIVITY')} />}
        {activeTab === 'attendance' && (
          <>
            <ApiState loading={attendanceLoading} error={attendanceError} onRetry={retryAttendance} />
            {!attendanceLoading && !attendanceError && attendance && <AttendanceTab history={attendance} />}
          </>
        )}
        {(activeTab === 'modules' || activeTab === 'documents') && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Layers size={24} className="mb-4 text-blue-500" />
            <h3 className="text-sm font-bold text-gray-900">{TABS.find(tab => tab.id === activeTab)?.label} unavailable</h3>
            <p className="mt-2 text-sm text-gray-500">These records are not available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
