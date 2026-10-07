'use client';

import { type Student } from '@/src/data/mockStudents';
import { type WorkspaceAttendance } from '@/src/data/mockTeacher';

interface AttendanceTableProps {
  students: Student[];
  records: WorkspaceAttendance['records'];
  isEditing: boolean;
  onChange: (
    studentId: string,
    changes: Partial<WorkspaceAttendance['records'][number]>,
  ) => void;
}

export default function AttendanceTable({
  students,
  records,
  isEditing,
  onChange,
}: AttendanceTableProps) {
  return (
    <div className="divide-y divide-slate-100">
      {records.map((record) => {
        const student = students.find(
          (student) => student.id === record.student_id,
        );
        const name = student
          ? `${student.last_name}, ${student.first_name}`
          : record.student_id;
        return (
          <div
            key={record.student_id}
            className="grid items-start gap-4 p-5 lg:grid-cols-[1fr_1.1fr_1fr_1fr]"
          >
            <div>
              <p className="text-sm font-bold text-slate-900">{name}</p>
              <p className="mt-1 text-xs text-slate-500">{record.student_id}</p>
              {student && (
                <p className="mt-1 text-xs text-slate-400">
                  LRN: {student.personal_details.lrn_number}
                </p>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">
                Attendance status
              </p>
              {isEditing ? (
                <div
                  role="group"
                  aria-label={`Attendance for ${name}`}
                  className="flex gap-1"
                >
                  {(['Present', 'Absent', 'Excused'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={record.status === status}
                      onClick={() => onChange(record.student_id, { status })}
                      className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold ${record.status === status ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              ) : (
                <span
                  className={`inline-block rounded-lg px-3 py-1.5 text-xs font-bold ${record.status === 'Present' ? 'bg-emerald-50 text-emerald-700' : record.status === 'Absent' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}
                >
                  {record.status || 'Not marked'}
                </span>
              )}
            </div>
            <div>
              {isEditing ? (
                <label className="block text-xs font-semibold text-slate-500">
                  Reason of absence
                  <input
                    aria-label={`Reason of absence for ${name}`}
                    disabled={record.status === 'Present'}
                    value={record.reason_of_absence}
                    onChange={(event) =>
                      onChange(record.student_id, {
                        reason_of_absence: event.target.value,
                      })
                    }
                    placeholder={
                      record.status === 'Present'
                        ? 'Not applicable'
                        : 'Reason (optional)'
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </label>
              ) : (
                <>
                  <p className="mb-2 text-xs font-semibold text-slate-500">
                    Reason of absence
                  </p>
                  <p className="break-words text-sm text-slate-700">
                    {record.reason_of_absence || '—'}
                  </p>
                </>
              )}
            </div>
            <div>
              {isEditing ? (
                <label className="block text-xs font-semibold text-slate-500">
                  Remarks
                  <input
                    aria-label={`Remarks for ${name}`}
                    value={record.remarks}
                    onChange={(event) =>
                      onChange(record.student_id, {
                        remarks: event.target.value,
                      })
                    }
                    placeholder="Remarks (optional)"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              ) : (
                <>
                  <p className="mb-2 text-xs font-semibold text-slate-500">
                    Remarks
                  </p>
                  <p className="break-words text-sm text-slate-700">
                    {record.remarks || '—'}
                  </p>
                </>
              )}
            </div>
          </div>
        );
      })}
      {!records.length && (
        <p className="p-10 text-center text-sm text-slate-500">
          No learners are assigned to this session.
        </p>
      )}
    </div>
  );
}
