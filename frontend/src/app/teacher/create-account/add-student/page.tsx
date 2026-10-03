// frontend/src/app/teacher/create-account/add-student/page.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { ArrowLeft, ScanLine, CheckCircle2, Loader2 } from 'lucide-react';
import { useStudents } from '@/src/context/StudentContext';
import type { StudentCreatePayload } from '@/src/lib/students-api';

export default function AddStudentPage() {
  const router = useRouter();
  const { addStudent } = useStudents();
  const formRef = useRef<HTMLFormElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalData, setModalData] = useState<{
    isOpen: boolean;
    name: string;
    id: string;
    password: string;
  }>({
    isOpen: false,
    name: '',
    id: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const firstName = ((formData.get('first_name') as string) || '').trim();
    const lastName = ((formData.get('last_name') as string) || '').trim();
    const birthDate = (formData.get('birth_date') as string) || '';
    const lrnNumber = ((formData.get('lrn_number') as string) || '').trim();
    const defaultPassword = birthDate.replace(/-/g, '');

    const payload: StudentCreatePayload = {
      email: ((formData.get('email') as string) || '').trim(),
      first_name: firstName,
      last_name: lastName,
      middle_name: ((formData.get('middle_name') as string) || '').trim(),
      suffix: ((formData.get('suffix') as string) || '').trim(),
      user_category: (formData.get('user_category') as string) || 'secondary',
      personal_details: {
        gender: (formData.get('gender') as string) || '',
        birth_date: birthDate,
        nationality: (
          (formData.get('nationality') as string) || 'Filipino'
        ).trim(),
        civil_status: ((formData.get('civil_status') as string) || '').trim(),
        religion: ((formData.get('religion') as string) || '').trim(),
        place_of_birth: (
          (formData.get('place_of_birth') as string) || ''
        ).trim(),
        lrn_number: lrnNumber,
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
      const createdStudent = await addStudent(payload);

      setModalData({
        isOpen: true,
        name: `${createdStudent.first_name} ${createdStudent.last_name}`.trim(),
        id:
          createdStudent.student_id ||
          createdStudent.id ||
          createdStudent.email,
        password: createdStudent.generated_password || defaultPassword,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while registering the student.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModalAndRedirect = () => {
    setModalData((prev) => ({ ...prev, isOpen: false }));
    router.push('/teacher/create-account');
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors';

  return (
    <div className="w-full h-full flex flex-col p-6 lg:p-8 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Register New Student
          </h1>
          <p className="text-gray-500 text-sm">
            Enter the personal, contact, and family details of the new learner.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors shadow-sm shrink-0"
          >
            <ScanLine size={16} /> Scan Document
          </button>
          <Link
            href="/teacher/create-account"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm shrink-0"
          >
            <ArrowLeft size={16} /> Back to List
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 lg:p-8 animate-in slide-in-from-right-4 duration-300 min-w-0">
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-10">
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
                  required
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Middle Name
                </label>
                <input name="middle_name" type="text" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="last_name"
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
                  defaultValue="secondary"
                  className={inputClass}
                >
                  <option value="elementary">Elementary</option>
                  <option value="junior">Junior High School</option>
                  <option value="basic_literacy">Basic Literacy</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Gender
                </label>
                <select name="gender" className={inputClass}>
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
                  type="text"
                  defaultValue="Filipino"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Civil Status
                </label>
                <input name="civil_status" type="text" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Religion
                </label>
                <input name="religion" type="text" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Place of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  name="place_of_birth"
                  required
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Learner Ref No. (LRN)
                </label>
                <input name="lrn_number" type="text" className={inputClass} />
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
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  City/Municipality
                </label>
                <input name="municipality" type="text" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Province
                </label>
                <input name="province" type="text" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Contact Number
                </label>
                <input name="contact_no" type="text" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5 lg:col-span-2">
                <label className="text-sm text-gray-600 font-medium">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  name="email"
                  required
                  type="email"
                  className={inputClass}
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
                <input name="mother_name" type="text" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Father Name
                </label>
                <input name="father_name" type="text" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-600 font-medium">
                  Guardian Name
                </label>
                <input
                  name="guardian_name"
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
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? 'Submitting...' : 'Submit Registration'}
            </button>
          </div>
        </form>
      </div>

      {/* SUCCESS MODAL */}
      {modalData.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Account Created!
            </h2>
            <p className="text-gray-500 text-sm mb-6 px-4 leading-relaxed">
              The learner has been successfully enrolled into the system.
            </p>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-left mb-8 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Student Name
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {modalData.name}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Student ID / Username
                </p>
                <p className="text-lg font-bold text-blue-600">
                  {modalData.id}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Default Password
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {modalData.password}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Format: YYYYMMDD (Based on Birthdate)
                </p>
              </div>
            </div>

            <button
              onClick={closeModalAndRedirect}
              className="w-full py-3 bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}