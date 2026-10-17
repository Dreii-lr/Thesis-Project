'use client';

import { use, useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit, Loader2, UserMinus } from 'lucide-react';
import { useStudents } from '@/src/context/StudentContext';
import { deactivateStudentInApi, fetchStudentByIdFromApi, formatCategoryLevel } from '@/src/lib/students-api';
import { useApiData } from '@/src/lib/use-api-data';
import ApiState from '@/src/components/ui/ApiState';
import Modal from '@/src/components/ui/Modal';
import LearnerAttendance from '@/src/components/learners/LearnerAttendance';

export default function StudentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StudentDetails key={id} id={id} />;
}

function DetailSection({ title, fields }: { title: string; fields: [string, string][] }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-slate-700">{title}</h2>
    <dl className="grid gap-4 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value || '—'}</dd></div>)}</dl>
  </section>;
}

function StudentDetails({ id }: { id: string }) {
  const load = useCallback(() => fetchStudentByIdFromApi(id), [id]);
  const profile = useApiData(load);
  const { refreshStudents } = useStudents();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const mutation = useRef(false);
  const student = profile.data;

  const deactivateStudent = async () => {
    if (mutation.current) return;
    mutation.current = true;
    setPending(true);
    setError(null);
    try {
      await deactivateStudentInApi(id);
      setConfirming(false);
      setSuccess('Learner marked inactive. Their records are preserved.');
      profile.reload();
      await refreshStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to mark the learner inactive.');
    } finally {
      mutation.current = false;
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <Link href="/admin/students" className="mb-5 inline-flex items-center gap-2 text-sm text-blue-600"><ArrowLeft size={16} /> Back to students</Link>
      <ApiState loading={profile.loading} error={profile.error} onRetry={profile.reload} />
      {success && <p role="status" className="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">{success}</p>}
      {!profile.loading && !profile.error && student && <>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div><h1 className="text-2xl font-bold">{student.first_name} {student.middle_name} {student.last_name} {student.suffix}</h1><p className="mt-2 text-sm text-slate-500">{student.account_id || 'No account ID'} · {formatCategoryLevel(student.user_category)} · {student.status || 'Status unavailable'}</p></div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/admin/mapping/${encodeURIComponent(id)}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"><Edit size={16} /> Update mapping</Link>
            {student.status !== 'INACTIVE' && <button type="button" onClick={() => { setError(null); setConfirming(true); }} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><UserMinus size={16} /> Mark inactive</button>}
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <DetailSection title="Personal information" fields={[
            ['First name', student.first_name], ['Middle name', student.middle_name], ['Last name', student.last_name], ['Suffix', student.suffix],
            ['LRN', student.personal_details.lrn_number], ['Birth date', student.personal_details.birth_date], ['Gender', student.personal_details.gender],
            ['Nationality', student.personal_details.nationality], ['Civil status', student.personal_details.civil_status], ['Religion', student.personal_details.religion],
            ['Learning modality', student.personal_details.learning_modalities || ''], ['Interested in ALS', student.personal_details.is_interested == null ? '' : student.personal_details.is_interested ? 'Yes' : 'No'],
          ]} />
          <DetailSection title="Contact information" fields={[
            ['Email', student.email], ['Contact number', student.contact_details.contact_no], ['Street / building', student.contact_details.street_building_no],
            ['Municipality', student.contact_details.municipality], ['Province', student.contact_details.province],
          ]} />
          <DetailSection title="Family information" fields={[
            ['Mother', student.family_details.mother_name], ['Mother contact', student.family_details.mother?.contact_no || ''],
            ['Father', student.family_details.father_name], ['Father contact', student.family_details.father?.contact_no || ''],
            ['Guardian', student.family_details.guardian_name], ['Guardian contact', student.family_details.guardian?.contact_no || ''],
            ...(student.family_details.siblings || []).map((sibling, index): [string, string] => [`Sibling ${index + 1}`, [sibling.name, sibling.last_grade_level_completed, sibling.occupation].filter(Boolean).join(' · ')]),
          ]} />
        </div>
        <h2 className="mb-4 mt-8 text-xl font-bold">Learner attendance history</h2>
        <LearnerAttendance key={id} id={id} />
      </>}
      {confirming && <Modal title="Mark learner inactive?" pending={pending} onClose={() => setConfirming(false)}>
        <p className="text-sm leading-6 text-slate-600">{student?.first_name} {student?.last_name} will be marked INACTIVE and will lose access to their learner account. Their profile and historical records will be preserved.</p>
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={pending} onClick={() => setConfirming(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancel</button><button type="button" disabled={pending} onClick={() => void deactivateStudent()} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending && <Loader2 size={15} className="animate-spin" />}{pending ? 'Saving...' : 'Mark inactive'}</button></div>
      </Modal>}
    </div>
  );
}
