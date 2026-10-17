'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { getAttendanceSession, listAttendanceSessions } from '@/src/lib/attendance-api';
import { formatCategoryLevel, type Student } from '@/src/lib/students-api';
import { useApiData } from '@/src/lib/use-api-data';
import { useStudents } from '@/src/context/StudentContext';
import ApiState from '@/src/components/ui/ApiState';
import Modal from '@/src/components/ui/Modal';
import LearnerAttendance from '@/src/components/learners/LearnerAttendance';

const inputClass = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100';

export default function AttendancePage() {
  const sessions = useApiData(listAttendanceSessions);
  const { students, isLoading, error, refreshStudents } = useStudents();
  const [level, setLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [learner, setLearner] = useState('');
  const filtered = (sessions.data || []).filter(session => (!level || session.level === level) &&
    (!subject || session.subject === subject) && (!date || session.rawDate === date) && (!status || session.status === status));

  return <div className="p-4 sm:p-6 lg:p-8">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">Attendance</h1><p className="mt-1 text-sm text-slate-500">Review recorded sessions and learner attendance history.</p></div><button type="button" onClick={sessions.reload} disabled={sessions.loading} className={`${inputClass} inline-flex items-center gap-2 disabled:opacity-50`}><RefreshCw size={16} /> Refresh sessions</button></div>
    <ApiState loading={sessions.loading} error={sessions.error} onRetry={sessions.reload} />
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
        <select aria-label="Filter attendance by program" value={level} onChange={event => setLevel(event.target.value)} className={inputClass}><option value="">All programs</option>{Array.from(new Set(sessions.data?.map(session => session.level))).sort().map(value => <option key={value} value={value}>{value}</option>)}</select>
        <select aria-label="Filter attendance by subject" value={subject} onChange={event => setSubject(event.target.value)} className={inputClass}><option value="">All subjects</option>{Array.from(new Set(sessions.data?.map(session => session.subject))).sort().map(value => <option key={value} value={value}>{value}</option>)}</select>
        <label className="text-xs font-semibold text-slate-500">Session date<input type="date" value={date} onChange={event => setDate(event.target.value)} className={`${inputClass} ml-2`} /></label>
        <select aria-label="Filter attendance by status" value={status} onChange={event => setStatus(event.target.value)} className={inputClass}><option value="">All statuses</option><option value="COMPLETED">COMPLETED</option><option value="DRAFT">DRAFT</option></select>
        <button type="button" onClick={() => { setLevel(''); setSubject(''); setDate(''); setStatus(''); }} className="px-3 py-2 text-sm font-semibold text-blue-600">Clear filters</button>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Date', 'Program', 'Subject', 'Present / total', 'Status', 'Details'].map(label => <th key={label} scope="col" className="px-5 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!sessions.loading && !sessions.error && filtered.map(session => <tr key={session.id} className="hover:bg-blue-50/40"><td className="px-5 py-4 font-medium">{session.displayDate || session.rawDate}</td><td className="px-5 py-4">{session.level}</td><td className="px-5 py-4">{session.subject}</td><td className="px-5 py-4">{session.presentCount} / {session.totalCount}</td><td className="px-5 py-4"><span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{session.status}</span></td><td className="px-5 py-4"><button type="button" aria-label={`View ${session.subject} session on ${session.rawDate}`} onClick={() => setSelected(session.id)} className="inline-flex items-center gap-2 rounded-lg p-2 font-medium text-blue-600 hover:bg-blue-50">View <ArrowRight size={14} /></button></td></tr>)}
          {!sessions.loading && !sessions.error && !filtered.length && <tr><td colSpan={6} className="p-10 text-center text-slate-500">No sessions match your filters.</td></tr>}
        </tbody>
      </table></div>
    </section>
    <section className="mt-8">
      <h2 className="mb-2 text-xl font-bold">Learner attendance history</h2>
      <ApiState loading={isLoading} error={error} onRetry={() => void refreshStudents()} />
      {!isLoading && !error && <>
        <label htmlFor="attendance-learner" className="mb-2 block text-sm text-slate-500">Choose a learner</label>
        <select id="attendance-learner" value={learner} onChange={event => setLearner(event.target.value)} className={`${inputClass} mb-5 w-full max-w-md`}><option value="">Select learner...</option>{students.map(student => <option key={student.id} value={student.id}>{student.first_name} {student.last_name} · {student.account_id || student.id}</option>)}</select>
        {!students.length && <p className="text-sm text-slate-500">No learner records are available.</p>}
        {learner && <LearnerAttendance key={learner} id={learner} />}
      </>}
    </section>
    {selected && <SessionDetails key={selected} id={selected} students={students} onClose={() => setSelected(null)} />}
  </div>;
}

function SessionDetails({ id, students, onClose }: { id: string; students: Student[]; onClose: () => void }) {
  const load = useCallback(() => getAttendanceSession(id), [id]);
  const session = useApiData(load);
  const data = session.data;
  return <Modal title="Attendance Session Details" onClose={onClose}>
    <ApiState loading={session.loading} error={session.error} onRetry={session.reload} />
    {!session.loading && !session.error && data && <>
      <p className="font-semibold">{data.display_date || data.session_date}</p><p className="mt-1 text-sm text-slate-500">{formatCategoryLevel(data.level_code)} · {data.strand_code} · {data.status}</p>
      <dl className="my-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
        {[['Present', data.present_count], ['Absent', data.absent_count], ['Excused', data.excused_count], ['Total', data.total_count], ['Attendance rate', `${data.attendance_rate}%`]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}
      </dl>
      <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr>{['Learner', 'Status', 'Note / absence reason'].map(label => <th key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{data.records.map(record => {
          const student = students.find(learner => learner.id === record.account_id || learner.account_id === record.account_id);
          return <tr key={record.record_id}><td className="px-3 py-3">{student ? <Link href={`/admin/students/${encodeURIComponent(student.id)}`} onClick={onClose} className="font-medium text-blue-600">{student.first_name} {student.last_name}<span className="mt-1 block text-xs text-slate-500">{student.account_id}</span></Link> : record.account_id}</td><td className="px-3 py-3">{record.status}</td><td className="whitespace-pre-wrap px-3 py-3">{record.remarks || record.reason_of_absence || '—'}</td></tr>;
        })}</tbody>
      </table></div>
      {!data.records.length && <p className="py-6 text-center text-sm text-slate-500">No learner marks were saved for this session.</p>}
    </>}
  </Modal>;
}
