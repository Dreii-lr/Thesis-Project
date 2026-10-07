'use client';

import { useState } from 'react';
import { Plus, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  CATEGORY_LABELS,
  type TargetCategory,
} from '@/src/data/mockAssessment';
import {
  subjects,
  subjectName,
  type WorkspaceAttendance,
} from '@/src/data/mockTeacher';

interface AttendanceRecordsListProps {
  program: TargetCategory;
  sessions: WorkspaceAttendance[];
  onNewRecord: () => void;
  onViewRecord: (session: WorkspaceAttendance) => void;
}

export default function AttendanceRecordsList({
  program,
  sessions,
  onNewRecord,
  onViewRecord,
}: AttendanceRecordsListProps) {
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [searchDate, setSearchDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const filteredSessions = sessions
    .filter(
      (session) =>
        (selectedSubject === 'all' ||
          session.strand_code === selectedSubject) &&
        `${session.session_date} ${session.display_date}`
          .toLowerCase()
          .includes(searchDate.toLowerCase().trim()),
    )
    .sort(
      (a, b) =>
        b.session_date.localeCompare(a.session_date) ||
        a.strand_code.localeCompare(b.strand_code),
    );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSessions.length / itemsPerPage),
  );
  const page = Math.min(currentPage, totalPages);
  const currentSessions = filteredSessions.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">
            {CATEGORY_LABELS[program]}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Attendance history
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Review a session to see each learner’s attendance and make
            corrections.
          </p>
        </div>
        <button
          onClick={onNewRecord}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={17} /> New record
        </button>
      </div>
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <label className="w-full sm:w-auto">
            <span className="sr-only">Filter by subject</span>
            <select
              value={selectedSubject}
              onChange={(event) => {
                setSelectedSubject(event.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All subjects</option>
              {subjects.map((subject) => (
                <option key={subject.code} value={subject.code}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Search attendance dates</span>
            <Search
              size={16}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              value={searchDate}
              onChange={(event) => {
                setSearchDate(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search date, e.g. Oct 6 or 2026-10-06"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Subject</th>
                <th className="px-5 py-4">Attendance</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentSessions.map((session) => (
                <tr key={session.session_id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-5 font-semibold text-slate-900">
                    <time dateTime={session.session_date}>
                      {session.display_date}
                    </time>
                  </td>
                  <td className="px-5 py-5 text-slate-600">
                    {subjectName(session.strand_code)}
                  </td>
                  <td className="px-5 py-5 text-slate-600">
                    {
                      session.records.filter(
                        (record) => record.status === 'Present',
                      ).length
                    }
                    /{session.records.length} present
                  </td>
                  <td className="px-5 py-5">
                    <span
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${session.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                    >
                      {session.status}
                    </span>
                  </td>
                  <td className="px-5 py-5 text-right">
                    <button
                      aria-label={`Review attendance for ${session.display_date}, ${subjectName(session.strand_code)}`}
                      onClick={() => onViewRecord(session)}
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-100 px-3 py-2 font-semibold text-blue-600 hover:bg-blue-50"
                    >
                      <Eye size={15} /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!currentSessions.length && (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            No attendance records match. Try another date or subject, or create
            a new record.
          </p>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
          <span>
            {filteredSessions.length} records · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => setCurrentPage(page - 1)}
              className="rounded-lg border p-2 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              aria-label="Next page"
              disabled={page === totalPages}
              onClick={() => setCurrentPage(page + 1)}
              className="rounded-lg border p-2 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
