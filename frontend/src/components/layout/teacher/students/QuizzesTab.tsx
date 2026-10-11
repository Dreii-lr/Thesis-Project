'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, FileQuestion } from 'lucide-react';
import type { TeacherSubmission } from '@/src/lib/assessments-api';
import { formatTime } from '@/src/lib/teacher-calendar';

export default function QuizzesTab({ records }: { records: TeacherSubmission[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!records.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white border border-gray-200 rounded-xl">
      <FileQuestion size={40} className="mb-3 text-gray-300" />
      <p className="text-sm font-medium text-gray-500">No assessments recorded yet.</p>
    </div>
  );
  return (
    <div className="space-y-4">
      {records.map(({ task, submission }) => (
        <div key={submission.submission_id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
          <button onClick={() => setExpanded(value => value === submission.submission_id ? null : submission.submission_id)}
            aria-expanded={expanded === submission.submission_id}
            className="flex flex-col md:flex-row md:items-center justify-between w-full text-left gap-4">
            <div className="flex items-center gap-5">
              <div className="w-[72px] h-[72px] rounded-xl flex flex-col items-center justify-center shrink-0 bg-blue-50 text-blue-700 border border-blue-100">
                <span className="text-2xl font-bold">{submission.status === 'GRADED' ? submission.final_score : '—'}</span>
                <span className="text-[10px] font-bold uppercase mt-1">of {task.max_score}</span>
              </div>
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">{task.assessment_type}</span>
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-50 text-blue-700">{submission.status.replace('_', ' ')}</span>
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">{task.subject_code}</span>
                </div>
                <h4 className="text-base font-bold text-gray-900">{task.title}</h4>
                <p className="text-sm text-gray-500 mt-1">{submission.submitted_at ? `Submitted ${formatTime(submission.submitted_at)}` : `Started ${formatTime(submission.started_at)}`}</p>
              </div>
            </div>
            {expanded === submission.submission_id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {expanded === submission.submission_id && (
            <div className="mt-5 pt-5 border-t border-gray-100 text-sm text-gray-600 space-y-2">
              <p>Feedback: {submission.feedback || 'No feedback yet.'}</p>
              <p>{submission.is_late ? 'Submitted late' : submission.submitted_at ? 'Submitted on time' : 'Attempt in progress'}</p>
              <p>Time spent: {submission.time_spent_seconds} seconds</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
