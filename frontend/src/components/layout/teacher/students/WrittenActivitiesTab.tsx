'use client';

import { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import type { TeacherSubmission } from '@/src/lib/assessments-api';
import { formatTime } from '@/src/lib/teacher-calendar';

export default function WrittenActivitiesTab({ records }: { records: TeacherSubmission[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const activities = records.filter(({ task, submission }) => task.title.toLowerCase().includes(query.trim().toLowerCase()) && (status === 'all' || submission.status === status));
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <select aria-label="Activity status" value={status} onChange={event => setStatus(event.target.value)} className="border-b border-gray-300 text-gray-700 text-sm py-2 bg-white">
          <option value="all">Any Status</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="SUBMITTED">Needs review</option>
          <option value="GRADED">Graded</option>
        </select>
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input aria-label="Search activities" placeholder="Search by title..." value={query} onChange={event => setQuery(event.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-md text-sm text-gray-900" />
        </div>
      </div>
      {activities.map(({ task, submission }) => (
        <div key={submission.submission_id} className="p-5 bg-white border border-gray-200 rounded-xl">
          <button onClick={() => setSelected(value => value === submission.submission_id ? null : submission.submission_id)}
            aria-expanded={selected === submission.submission_id}
            className="flex items-center justify-between w-full text-left gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500">{task.subject_code}</p>
              <h4 className="mt-2 text-base font-semibold text-gray-900">{task.title}</h4>
              <p className="mt-2 text-sm text-gray-500">{submission.submitted_at ? `Submitted ${formatTime(submission.submitted_at)}` : 'Attempt in progress'}</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${submission.status === 'GRADED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{submission.status.replace('_', ' ')}</span>
            <ChevronDown size={18} className="shrink-0 text-gray-400" />
          </button>
          {selected === submission.submission_id && (
            <div className="mt-5 pt-5 border-t border-gray-100 text-sm text-gray-600 space-y-2">
              <p>Score: {submission.status === 'GRADED' ? `${submission.final_score} / ${task.max_score}` : 'Awaiting review'}</p>
              <p>Feedback: {submission.feedback || 'No feedback yet.'}</p>
              <p>Attachments submitted: {submission.attachments_payload?.length || 0}</p>
            </div>
          )}
        </div>
      ))}
      {!activities.length && (
        <div className="text-center py-16 border border-gray-200 border-dashed rounded-xl bg-gray-50/50">
          <p className="text-sm font-medium text-gray-900">No written activities</p>
          <p className="text-sm text-gray-500 mt-1">There are currently no activities matching your criteria.</p>
        </div>
      )}
      {!!activities.length && <p className="text-sm text-gray-500">Showing {activities.length} of {records.length} activities</p>}
    </div>
  );
}
