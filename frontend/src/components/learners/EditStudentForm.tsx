'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import ApiState from '@/src/components/ui/ApiState';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useStudents } from '@/src/context/StudentContext';
import {
  fetchStudentByIdFromApi,
  type Student,
  type StudentUpdatePayload,
} from '@/src/lib/students-api';

export interface StudentFormActionProps {
  student: Student;
  dirty: boolean;
  isSaving: boolean;
  onPendingChange: (pending: boolean) => void;
  onStudentChange: (student: Student) => void;
}

export default function EditStudentForm({ id: decodedId, basePath, heading = 'Update Student Information', actions: Actions }: {
  id: string;
  basePath: string;
  heading?: string;
  actions?: ComponentType<StudentFormActionProps>;
}) {
  const { updateStudent, refreshStudents } = useStudents();

  const [student, setStudent] = useState<Student | null>(null);
  const [isLoadingStudent, setIsLoadingStudent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);
  const pending = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadFromApi() {
      try {
        const fetched = await fetchStudentByIdFromApi(decodedId);
        if (active) setStudent(fetched);
      } catch (err: unknown) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Student record not found in backend.'
          );
        }
      } finally {
        if (active) setIsLoadingStudent(false);
      }
    }

    loadFromApi();
    return () => {
      active = false;
    };
  }, [decodedId, retry]);

  if (isLoadingStudent) {
    return (
      <div className="w-full h-full flex items-center justify-center p-12 text-sm text-gray-500 gap-2">
        <Loader2 size={18} className="animate-spin text-blue-600" />
        Loading student record from backend...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-12 gap-4">
        <ApiState loading={false} error={error || 'Student not found.'} onRetry={() => { setError(null); setIsLoadingStudent(true); setRetry(value => value + 1); }} />
        <Link
          href={basePath}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Student List
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending.current || isActionPending) return;
    pending.current = true;
    setIsSubmitting(true);
    setSaved(false);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const updatedPayload: StudentUpdatePayload = {
      first_name: ((formData.get('first_name') as string) || '').trim(),
      last_name: ((formData.get('last_name') as string) || '').trim(),
      middle_name: ((formData.get('middle_name') as string) || '').trim(),
      suffix: ((formData.get('suffix') as string) || '').trim(),
      user_category:
        (formData.get('user_category') as StudentUpdatePayload['user_category']) || undefined,
      personal_details: {
        is_interested: student.personal_details.is_interested,
        learning_modalities: student.personal_details.learning_modalities,
        gender: (formData.get('gender') as string) || '',
        birth_date: (formData.get('birth_date') as string) || '',
        nationality: (
          (formData.get('nationality') as string) || 'Filipino'
        ).trim(),
        civil_status: ((formData.get('civil_status') as string) || '').trim(),
        religion: ((formData.get('religion') as string) || '').trim(),
        lrn_number: ((formData.get('lrn_number') as string) || '').trim(),
      },
      contact_details: {
        street_building_no: (
          (formData.get('street_building_no') as string) || ''
        ).trim(),
        municipality: ((formData.get('municipality') as string) || '').trim(),
        province: ((formData.get('province') as string) || '').trim(),
        contact_no: ((formData.get('contact_no') as string) || '').trim(),
      },
      family_details: {
        mother: {
          ...student.family_details.mother,
          name: ((formData.get('mother_name') as string) || '').trim(),
        },
        father: {
          ...student.family_details.father,
          name: ((formData.get('father_name') as string) || '').trim(),
        },
        guardian: {
          name: ((formData.get('guardian_name') as string) || '').trim(),
          contact_no: ((formData.get('family_contact_no') as string) || '').trim(),
        },
        siblings: student.family_details.siblings,
      },
    };

    try {
      if (!updatedPayload.first_name || !updatedPayload.last_name) throw new Error('Enter a first name and last name.');
      // Always pass the UUID (student.id) to PATCH /users/{user_id}
      const updated = await updateStudent(student.id || decodedId, updatedPayload);
      setStudent(updated);
      setDirty(false);
      setFormVersion(value => value + 1);
      setSaved(true);
      await refreshStudents();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update student information.'
      );
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors';

  return (
    <div className="w-full h-full flex flex-col p-6 lg:p-8 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {heading}
          </h1>
          <p className="text-gray-500 text-sm">
            Editing details for {student.first_name} {student.last_name} (
            {student.student_id || student.id})
          </p>
        </div>
        <Link
          href={basePath}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm w-fit shrink-0"
        >
          <ArrowLeft size={16} /> Back to List
        </Link>
      </div>

      {Actions && <Actions student={student} dirty={dirty} isSaving={isSubmitting}
        onPendingChange={setIsActionPending} onStudentChange={updated => { setStudent(updated); setFormVersion(value => value + 1); }} />}
      {saved && <p role="status" className="mb-6 rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">Learner details saved successfully.</p>}
      {error && (
        <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 lg:p-8 animate-in slide-in-from-right-4 duration-300 min-w-0">
        <form key={`${student.id}-${formVersion}`} onSubmit={handleSubmit} onChange={() => { setDirty(true); setSaved(false); }}>
          <fieldset disabled={isSubmitting || isActionPending} className="space-y-10">
          {/* Personal Details */}
          <section>
            <h2 className="text-[13px] font-bold text-gray-700 uppercase tracking-wider mb-5">
              Personal Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="first_name" className="text-sm text-gray-600 font-medium">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="first_name" name="first_name"
                  defaultValue={student.first_name}
                  required
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="middle_name" className="text-sm text-gray-600 font-medium">
                  Middle Name
                </label>
                <input
                  id="middle_name" name="middle_name"
                  defaultValue={student.middle_name}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="last_name" className="text-sm text-gray-600 font-medium">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="last_name" name="last_name"
                  defaultValue={student.last_name}
                  required
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="suffix" className="text-sm text-gray-600 font-medium">
                  Suffix
                </label>
                <input
                  id="suffix" name="suffix"
                  defaultValue={student.suffix}
                  type="text"
                  placeholder="e.g., Jr., III"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="user_category" className="text-sm text-gray-600 font-medium">
                  Level <span className="text-red-500">*</span>
                </label>
                <select
                  id="user_category" name="user_category"
                  defaultValue={student.user_category}
                  className={inputClass}
                >
                  <option value="ELEMENTARY">Elementary</option>
                  <option value="SECONDARY">Secondary (High School)</option>
                  <option value="BLP">Basic Literacy Program</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="gender" className="text-sm text-gray-600 font-medium">
                  Gender
                </label>
                <select
                  id="gender" name="gender"
                  defaultValue={student.personal_details.gender}
                  className={inputClass}
                >
                  <option value=""></option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="birth_date" className="text-sm text-gray-600 font-medium">
                  Birth Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="birth_date" name="birth_date"
                  defaultValue={student.personal_details.birth_date}
                  required
                  type="date"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="nationality" className="text-sm text-gray-600 font-medium">
                  Nationality
                </label>
                <input
                  id="nationality" name="nationality"
                  defaultValue={student.personal_details.nationality}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="civil_status" className="text-sm text-gray-600 font-medium">
                  Civil Status
                </label>
                <input
                  id="civil_status" name="civil_status"
                  defaultValue={student.personal_details.civil_status}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="religion" className="text-sm text-gray-600 font-medium">
                  Religion
                </label>
                <input
                  id="religion" name="religion"
                  defaultValue={student.personal_details.religion}
                  type="text"
                  className={inputClass}
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label htmlFor="lrn_number" className="text-sm text-gray-600 font-medium">
                  Learner Ref No. (LRN)
                </label>
                <input
                  id="lrn_number" name="lrn_number"
                  defaultValue={student.personal_details.lrn_number}
                  type="text"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Contact Details */}
          <section>
            <h2 className="text-[13px] font-bold text-gray-700 uppercase tracking-wider mb-5">
              Contact Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="street_building_no" className="text-sm text-gray-600 font-medium">
                  Street/Building Number
                </label>
                <input
                  id="street_building_no" name="street_building_no"
                  defaultValue={student.contact_details.street_building_no}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="municipality" className="text-sm text-gray-600 font-medium">
                  City/Municipality
                </label>
                <input
                  id="municipality" name="municipality"
                  defaultValue={student.contact_details.municipality}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="province" className="text-sm text-gray-600 font-medium">
                  Province
                </label>
                <input
                  id="province" name="province"
                  defaultValue={student.contact_details.province}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact_no" className="text-sm text-gray-600 font-medium">
                  Contact Number
                </label>
                <input
                  id="contact_no" name="contact_no"
                  defaultValue={student.contact_details.contact_no}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5 lg:col-span-2">
                <label htmlFor="email" className="text-sm text-gray-600 font-medium">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email" name="email"
                  defaultValue={student.email}
                  readOnly
                  type="email"
                  className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`}
                />
              </div>
            </div>
          </section>

          {/* Family Details */}
          <section>
            <h2 className="text-[13px] font-bold text-gray-700 uppercase tracking-wider mb-5">
              Family Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="mother_name" className="text-sm text-gray-600 font-medium">
                  Mother Name
                </label>
                <input
                  id="mother_name" name="mother_name"
                  defaultValue={student.family_details.mother_name}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="father_name" className="text-sm text-gray-600 font-medium">
                  Father Name
                </label>
                <input
                  id="father_name" name="father_name"
                  defaultValue={student.family_details.father_name}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="guardian_name" className="text-sm text-gray-600 font-medium">
                  Guardian Name
                </label>
                <input
                  id="guardian_name" name="guardian_name"
                  defaultValue={student.family_details.guardian_name}
                  type="text"
                  className={inputClass}
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label htmlFor="family_contact_no" className="text-sm text-gray-600 font-medium">
                  Contact Number
                </label>
                <input
                  id="family_contact_no" name="family_contact_no"
                  defaultValue={student.family_details.contact_no}
                  type="text"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end pt-6 border-t border-gray-100">
            <button
              type="submit"
              disabled={isSubmitting || isActionPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
