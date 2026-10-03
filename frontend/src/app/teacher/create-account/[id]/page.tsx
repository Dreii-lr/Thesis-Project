// frontend/src/app/teacher/create-account/[id]/page.tsx
'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useStudents } from '@/src/context/StudentContext';
import {
  fetchStudentByIdFromApi,
  type Student,
  type StudentCreatePayload,
} from '@/src/lib/students-api';

export default function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const decodedId = decodeURIComponent(resolvedParams.id);
  const router = useRouter();
  const { students, updateStudent } = useStudents();

  const existingInContext = students.find(
    (s) => s.id === decodedId || s.student_id === decodedId
  );

  const [student, setStudent] = useState<Student | null>(
    existingInContext || null
  );
  const [isLoadingStudent, setIsLoadingStudent] = useState(!existingInContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingInContext) {
      setStudent(existingInContext);
      setIsLoadingStudent(false);
      return;
    }

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
  }, [decodedId, existingInContext]);

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
        <p className="text-sm text-red-600 font-medium">
          {error || 'Student not found.'}
        </p>
        <Link
          href="/teacher/create-account"
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Student List
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const updatedPayload: StudentCreatePayload = {
      email: ((formData.get('email') as string) || student.email).trim(),
      first_name: ((formData.get('first_name') as string) || '').trim(),
      last_name: ((formData.get('last_name') as string) || '').trim(),
      middle_name: ((formData.get('middle_name') as string) || '').trim(),
      suffix: ((formData.get('suffix') as string) || '').trim(),
      user_category:
        (formData.get('user_category') as string) || student.user_category,
      personal_details: {
        user_id: student.id,
        gender: (formData.get('gender') as string) || '',
        birth_date: (formData.get('birth_date') as string) || '',
        nationality: (
          (formData.get('nationality') as string) || 'Filipino'
        ).trim(),
        civil_status: ((formData.get('civil_status') as string) || '').trim(),
        religion: ((formData.get('religion') as string) || '').trim(),
        place_of_birth: (
          (formData.get('place_of_birth') as string) || ''
        ).trim(),
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
        mother_name: ((formData.get('mother_name') as string) || '').trim(),
        father_name: ((formData.get('father_name') as string) || '').trim(),
        guardian_name: ((formData.get('guardian_name') as string) || '').trim(),
        guardian_relation: (
          (formData.get('guardian_relation') as string) || ''
        ).trim(),
        contact_no: (
          (formData.get('family_contact_no') as string) || ''
        ).trim(),
      },
    };

    try {
      // Always pass the UUID (student.id) to PATCH /users/{user_id}
      await updateStudent(student.id || decodedId, updatedPayload);
      router.push('/teacher/create-account');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update student information.'
      );
    } finally {
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
            Update Student Information
          </h1>
          <p className="text-gray-500 text-sm">
            Editing details for {student.first_name} {student.last_name} (
            {student.student_id || student.id})
          </p>
        </div>
        <Link
          href="/teacher/create-account"
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm w-fit shrink-0"
        >
          <ArrowLeft size={16} /> Back to List
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 lg:p-8 animate-in slide-in-from-right-4 duration-300 min-w-0">
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Personal Details */}
          <section>
            <h2 className="text-[13px] font-bold text-gray-700 uppercase tracking-wider mb-5">
              Personal Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="first_name"
                  defaultValue={student.first_name}
                  required
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Middle Name
                </label>
                <input
                  name="middle_name"
                  defaultValue={student.middle_name}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="last_name"
                  defaultValue={student.last_name}
                  required
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Suffix
                </label>
                <input
                  name="suffix"
                  defaultValue={student.suffix}
                  type="text"
                  placeholder="e.g., Jr., III"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Level <span className="text-red-500">*</span>
                </label>
                <select
                  name="user_category"
                  defaultValue={student.user_category}
                  className={inputClass}
                >
                  <option value="elementary">Elementary</option>
                  <option value="secondary">Secondary (High School)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Gender
                </label>
                <select
                  name="gender"
                  defaultValue={student.personal_details.gender}
                  className={inputClass}
                >
                  <option value=""></option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Birth Date <span className="text-red-500">*</span>
                </label>
                <input
                  name="birth_date"
                  defaultValue={student.personal_details.birth_date}
                  required
                  type="date"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Nationality
                </label>
                <input
                  name="nationality"
                  defaultValue={student.personal_details.nationality}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Civil Status
                </label>
                <input
                  name="civil_status"
                  defaultValue={student.personal_details.civil_status}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Religion
                </label>
                <input
                  name="religion"
                  defaultValue={student.personal_details.religion}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Place of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  name="place_of_birth"
                  defaultValue={student.personal_details.place_of_birth}
                  required
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Learner Ref No. (LRN)
                </label>
                <input
                  name="lrn_number"
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
                <label className="text-sm text-gray-600 font-medium">
                  Street/Building Number
                </label>
                <input
                  name="street_building_no"
                  defaultValue={student.contact_details.street_building_no}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  City/Municipality
                </label>
                <input
                  name="municipality"
                  defaultValue={student.contact_details.municipality}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Province
                </label>
                <input
                  name="province"
                  defaultValue={student.contact_details.province}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Contact Number
                </label>
                <input
                  name="contact_no"
                  defaultValue={student.contact_details.contact_no}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5 lg:col-span-2">
                <label className="text-sm text-gray-600 font-medium">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  name="email"
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
                <label className="text-sm text-gray-600 font-medium">
                  Mother Name
                </label>
                <input
                  name="mother_name"
                  defaultValue={student.family_details.mother_name}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Father Name
                </label>
                <input
                  name="father_name"
                  defaultValue={student.family_details.father_name}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Guardian Name
                </label>
                <input
                  name="guardian_name"
                  defaultValue={student.family_details.guardian_name}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Guardian Relation
                </label>
                <input
                  name="guardian_relation"
                  defaultValue={student.family_details.guardian_relation}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Contact Number
                </label>
                <input
                  name="family_contact_no"
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
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#2563eb] hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}