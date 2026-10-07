'use client';

import { useState } from 'react';
import { ArrowLeft, Check, Pencil } from 'lucide-react';
import { CATEGORY_LABELS } from '@/src/data/mockAssessment';
import { subjectName, type WorkspaceAttendance } from '@/src/data/mockTeacher';
import { useTeacher } from '@/src/context/TeacherContext';
import AttendanceTable from './AttendanceTable';
import AttendanceFooter from './AttendanceFooter';

interface TakeAttendanceViewProps {
  session: WorkspaceAttendance;
  onSave: (session: WorkspaceAttendance) => boolean;
  onBack: () => void;
}

export default function TakeAttendanceView({
  session,
  onSave,
  onBack,
}: TakeAttendanceViewProps) {
  const { students } = useTeacher();
  const [savedSession, setSavedSession] = useState(session);
  const [records, setRecords] = useState(() =>
    structuredClone(session.records),
  );
  const [isEditing, setIsEditing] = useState(session.status === 'DRAFT');
  const [error, setError] = useState('');
  const hasChanges =
    JSON.stringify(records) !== JSON.stringify(savedSession.records);

  const handleChange = (
    studentId: string,
    changes: Partial<WorkspaceAttendance['records'][number]>,
  ) => {
    setRecords((previous) =>
      previous.map((record) =>
        record.student_id === studentId
          ? {
              ...record,
              ...changes,
              reason_of_absence:
                changes.status === 'Present'
                  ? ''
                  : (changes.reason_of_absence ?? record.reason_of_absence),
            }
          : record,
      ),
    );
    setError('');
  };

  const handleSave = () => {
    if (!records.length || records.some((record) => !record.status)) {
      setError(
        'Please mark Present, Absent, or Excused for every learner before saving.',
      );
      return;
    }
    const updated: WorkspaceAttendance = {
      ...savedSession,
      status: 'COMPLETED',
      records,
    };
    if (!onSave(updated)) {
      setError(
        'Attendance was not saved. Your changes are still here; please try again.',
      );
      return;
    }
    setSavedSession(structuredClone(updated));
    setIsEditing(false);
    setError('');
  };

  const handleBack = () => {
    if (hasChanges && !window.confirm('Discard unsaved attendance changes?'))
      return;
    onBack();
  };

  const cancelChanges = () => {
    if (hasChanges && !window.confirm('Discard unsaved attendance changes?'))
      return;
    if (savedSession.status === 'DRAFT') {
      onBack();
      return;
    }
    setRecords(structuredClone(savedSession.records));
    setIsEditing(false);
    setError('');
  };

  return (
    <>
      <button
        onClick={handleBack}
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
      >
        <ArrowLeft size={16} /> Back to attendance history
      </button>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">
            {CATEGORY_LABELS[session.level_code]}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {isEditing ? 'Update attendance' : 'Review attendance'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {session.display_date} · {subjectName(session.strand_code)}
          </p>
        </div>
        <span
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${savedSession.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
        >
          {savedSession.status}
        </span>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Learners', count: records.length, color: 'text-slate-900' },
          {
            label: 'Present',
            count: records.filter((record) => record.status === 'Present')
              .length,
            color: 'text-emerald-600',
          },
          {
            label: 'Absent',
            count: records.filter((record) => record.status === 'Absent')
              .length,
            color: 'text-red-600',
          },
          {
            label: 'Excused',
            count: records.filter((record) => record.status === 'Excused')
              .length,
            color: 'text-amber-600',
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold text-slate-500">{item.label}</p>
            <p className={`mt-2 text-2xl font-extrabold ${item.color}`}>
              {item.count}
            </p>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Learner records
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {isEditing
                ? 'Review each status and add absence reasons or remarks.'
                : 'Saved attendance for this session. Select Edit attendance to make a correction.'}
            </p>
          </div>
          {isEditing ? (
            <button
              onClick={() => {
                setRecords((previous) =>
                  previous.map((record) => ({
                    ...record,
                    status: record.status ?? 'Present',
                  })),
                );
                setError('');
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
            >
              <Check size={16} /> Mark unmarked present
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Pencil size={15} /> Edit attendance
            </button>
          )}
        </div>
        {error && (
          <p
            role="alert"
            className="m-5 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <AttendanceTable
          students={students}
          records={records}
          isEditing={isEditing}
          onChange={handleChange}
        />
        {isEditing && (
          <AttendanceFooter
            onSave={handleSave}
            onCancel={cancelChanges}
            isDataEmpty={!records.length}
            isUpdate={savedSession.status === 'COMPLETED'}
          />
        )}
      </div>
    </>
  );
}
