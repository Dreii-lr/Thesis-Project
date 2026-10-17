'use client';

import { Check, Clock3, X, UserRound } from 'lucide-react';
import type { Student } from '@/src/lib/students-api';
import type { WorkspaceAttendance } from '@/src/lib/attendance-api';

interface AttendanceTableProps {
  students: Student[];
  records: WorkspaceAttendance['records'];
  isEditing: boolean;
  onChange: (accountId: string, changes: Partial<WorkspaceAttendance['records'][number]>) => void;
}

const statusStyles = {
  Present: { selected: 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500', badge: 'bg-emerald-50 text-emerald-700', icon: Check },
  Absent: { selected: 'border-red-400 bg-red-50 text-red-700 ring-1 ring-red-400', badge: 'bg-red-50 text-red-700', icon: X },
  Excused: { selected: 'border-amber-400 bg-amber-50 text-amber-800 ring-1 ring-amber-400', badge: 'bg-amber-50 text-amber-700', icon: Clock3 },
};

export default function AttendanceTable({students, records, isEditing, onChange}: AttendanceTableProps) {
  return <div className="divide-y divide-slate-100">
    {records.map(record => {
      const student = students.find(student => student.account_id === record.account_id || student.id === record.account_id);
      const name = student ? `${student.last_name}, ${student.first_name}` : record.account_id;
      const style = record.status ? statusStyles[record.status] : null;
      const Icon = style?.icon || UserRound;
      return <div key={record.account_id} className="grid items-start gap-4 px-5 py-5 transition hover:bg-slate-50/40 lg:grid-cols-[minmax(0,1fr)_minmax(240px,1.1fr)_minmax(0,1.2fr)] lg:gap-6">
        <div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">{student ? `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}` : <UserRound size={17} />}</span><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-900">{name}</p><p className="mt-1 break-all text-xs text-slate-500">{student?.account_id || record.account_id}</p>{student?.personal_details?.lrn_number && <p className="mt-1 text-[11px] text-slate-400">LRN {student.personal_details.lrn_number}</p>}</div></div>
        <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Attendance</p>{isEditing ? <div role="group" aria-label={`Attendance for ${name}`} className="flex gap-2">{(['Present', 'Absent', 'Excused'] as const).map(status => {
          const StatusIcon = statusStyles[status].icon;
          return <button key={status} type="button" aria-pressed={record.status === status} onClick={() => onChange(record.account_id, {status})} className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${record.status === status ? statusStyles[status].selected : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}><StatusIcon size={13} />{status}</button>;
        })}</div> : <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${style?.badge || 'bg-slate-100 text-slate-500'}`}><Icon size={13} />{record.status || 'Not marked'}</span>}</div>
        <div>{isEditing ? <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Note / absence reason<textarea aria-label={`Note for ${name}`} rows={2} value={record.remarks} onChange={event => onChange(record.account_id, {remarks: event.target.value, reason_of_absence: event.target.value})} placeholder={record.status === 'Absent' || record.status === 'Excused' ? 'Add an absence reason (optional)' : 'Add a note (optional)'} className="mt-2 block w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label> : <><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Note / absence reason</p><p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{record.remarks || 'No note added'}</p></>}</div>
      </div>;
    })}
    {!records.length && <p className="p-12 text-center text-sm text-slate-500">No learners match this view.</p>}
  </div>;
}
