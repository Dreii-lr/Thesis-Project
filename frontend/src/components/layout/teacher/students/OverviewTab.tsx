'use client';

import type { Student } from '@/src/lib/students-api';
import { formatCategoryLevel } from '@/src/lib/students-api';
import type { TeacherSubmission } from '@/src/lib/assessments-api';
import { formatTime } from '@/src/lib/teacher-calendar';

export default function OverviewTab({ student, records }: { student: Student; records: TeacherSubmission[] | null }) {
  const recent = (records || []).filter(record => record.submission.submitted_at)
    .sort((a, b) => Date.parse(b.submission.submitted_at || '') - Date.parse(a.submission.submitted_at || '')).slice(0, 3);
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Overall Readiness', value: 'Unavailable' },
          { label: 'Learning program', value: formatCategoryLevel(student.user_category) },
          { label: 'Account status', value: student.status || 'Unavailable' },
        ].map(item => (
          <div key={item.label} className="border border-gray-200 rounded-lg p-5 bg-white">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">{item.label}</p>
            <p className="text-base font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>
      <div>
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Recent Records</h3>
        <p className="mb-4 text-xs text-gray-500">Assessment records from your teaching workspace.</p>
        <div className="space-y-3">
          {recent.map(({ task, submission }) => (
            <div key={submission.submission_id} className="flex gap-4 p-4 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{task.assessment_type}: {task.title}</p>
                <p className="text-xs text-gray-500 mt-1">{formatTime(submission.submitted_at)}</p>
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded h-fit bg-blue-50 text-blue-700">{submission.status === 'GRADED' ? 'Graded' : 'Needs review'}</span>
            </div>
          ))}
          {records && !recent.length && <p className="text-sm text-gray-500 text-center py-4">No recent activity recorded.</p>}
        </div>
      </div>
    </div>
  );
}
