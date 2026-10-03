'use client';

import Link from 'next/link';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { useStudents } from '@/src/context/StudentContext';
import { notFound } from 'next/navigation';
import { Student } from '@/src/data/mockStudents';

export default function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { students, updateStudent } = useStudents();
  
  const student = students.find(s => s.id === resolvedParams.id);

  if (!student) {
    return notFound();
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const updatedData: Partial<Student> = {
      firstName: formData.get('firstName') as string,
      middleName: formData.get('middleName') as string,
      lastName: formData.get('lastName') as string,
      suffix: formData.get('suffix') as string,
      gender: formData.get('gender') as string,
      birthDate: formData.get('birthDate') as string,
      nationality: formData.get('nationality') as string,
      civilStatus: formData.get('civilStatus') as string,
      religion: formData.get('religion') as string,
      placeOfBirth: formData.get('placeOfBirth') as string,
      lrn: formData.get('lrn') as string,
      street: formData.get('street') as string,
      barangay: formData.get('barangay') as string,
      city: formData.get('city') as string,
      province: formData.get('province') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      motherName: formData.get('motherName') as string,
      fatherName: formData.get('fatherName') as string,
      guardianName: formData.get('guardianName') as string,
      guardianRelation: formData.get('guardianRelation') as string,
      guardianPhone: formData.get('guardianPhone') as string,
    };

    updateStudent(student.id, updatedData);
    router.push('/teacher/create-account');
  };

  // Shared input classes to ensure text is visible and styling is consistent
  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors";

  return (
    <div className="w-full h-full flex flex-col p-6 lg:p-8 relative">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Update Student Information</h1>
          <p className="text-gray-500 text-sm">Editing details for {student.firstName} {student.lastName} ({student.id})</p>
        </div>
        <Link href="/teacher/create-account" className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm w-fit shrink-0">
          <ArrowLeft size={16} /> Back to List
        </Link>
      </div>

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 lg:p-8 animate-in slide-in-from-right-4 duration-300 min-w-0">
        <form onSubmit={handleSubmit} className="space-y-10">
          
          {/* Personal Details */}
          <section>
            <h2 className="text-[13px] font-bold text-gray-700 uppercase tracking-wider mb-5">Personal Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">First Name <span className="text-red-500">*</span></label><input name="firstName" defaultValue={student.firstName} required type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Middle Name</label><input name="middleName" defaultValue={student.middleName} type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Last Name <span className="text-red-500">*</span></label><input name="lastName" defaultValue={student.lastName} required type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Suffix</label><input name="suffix" defaultValue={student.suffix} type="text" placeholder="e.g., Jr., III" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Gender</label>
                <select name="gender" defaultValue={student.gender} className={inputClass}>
                  <option value=""></option><option value="Male">Male</option><option value="Female">Female</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Birth Date <span className="text-red-500">*</span></label><input name="birthDate" defaultValue={student.birthDate} required type="date" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5 lg:col-span-2"><label className="text-sm text-gray-600 font-medium">Nationality</label><input name="nationality" defaultValue={student.nationality} type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Civil Status</label><input name="civilStatus" defaultValue={student.civilStatus} type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Religion</label><input name="religion" defaultValue={student.religion} type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Place of Birth</label><input name="placeOfBirth" defaultValue={student.placeOfBirth} type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Learner Ref No. (LRN) <span className="text-red-500">*</span></label><input name="lrn" defaultValue={student.lrn} required type="text" className={inputClass} /></div>
            </div>
          </section>

          {/* Contact Details */}
          <section>
            <h2 className="text-[13px] font-bold text-gray-700 uppercase tracking-wider mb-5">Contact Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Street/Building Number</label><input name="street" defaultValue={student.street} type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Barangay</label><input name="barangay" defaultValue={student.barangay} type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">City/Municipality</label><input name="city" defaultValue={student.city} type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Province</label><input name="province" defaultValue={student.province} type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5 lg:col-span-2"><label className="text-sm text-gray-600 font-medium">Contact Number</label><input name="phone" defaultValue={student.phone} type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5 lg:col-span-2"><label className="text-sm text-gray-600 font-medium">Email</label><input name="email" defaultValue={student.email} type="email" className={inputClass} /></div>
            </div>
          </section>

          {/* Family */}
          <section>
            <h2 className="text-[13px] font-bold text-gray-700 uppercase tracking-wider mb-5">Family</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Mother Name</label><input name="motherName" defaultValue={student.motherName} type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Father Name</label><input name="fatherName" defaultValue={student.fatherName} type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Guardian Name</label><input name="guardianName" defaultValue={student.guardianName} type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Guardian Relation</label><input name="guardianRelation" defaultValue={student.guardianRelation} type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Contact Number</label><input name="guardianPhone" defaultValue={student.guardianPhone} type="text" className={inputClass} /></div>
            </div>
          </section>

          <div className="flex justify-end pt-6 border-t border-gray-100">
            <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
              <Save size={16} /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}