'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { ArrowLeft, ScanLine, Wand2, CheckCircle2 } from 'lucide-react';
import { useStudents } from '@/src/context/StudentContext';
import { Student } from '@/src/data/mockStudents';

export default function AddStudentPage() {
  const router = useRouter();
  const { students, addStudent } = useStudents();
  const formRef = useRef<HTMLFormElement>(null);

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

  const handleAutoFill = () => {
    if (!formRef.current) return;
    const form = formRef.current;
    
    (form.elements.namedItem('firstName') as HTMLInputElement).value = 'Andres';
    (form.elements.namedItem('middleName') as HTMLInputElement).value = 'C';
    (form.elements.namedItem('lastName') as HTMLInputElement).value = 'Bonifacio';
    (form.elements.namedItem('gender') as HTMLSelectElement).value = 'Male';
    (form.elements.namedItem('birthDate') as HTMLInputElement).value = '2005-11-30';
    (form.elements.namedItem('lrn') as HTMLInputElement).value = '109876543214';
    (form.elements.namedItem('street') as HTMLInputElement).value = '99 Kalayaan Ave';
    (form.elements.namedItem('city') as HTMLInputElement).value = 'Manila';
    (form.elements.namedItem('phone') as HTMLInputElement).value = '09199998888';
    (form.elements.namedItem('email') as HTMLInputElement).value = 'andres.b@example.com';
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const birthDate = formData.get('birthDate') as string;

    const newStudent: Omit<Student, 'id'> = {
      level: 'Junior High School', 
      firstName,
      middleName: formData.get('middleName') as string,
      lastName,
      suffix: formData.get('suffix') as string,
      gender: formData.get('gender') as string,
      birthDate,
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

    const generatedId = `ALS-${String(students.length + 1).padStart(4, '0')}`;
    const generatedPassword = birthDate.replace(/-/g, '');

    addStudent(newStudent);
    
    setModalData({
      isOpen: true,
      name: `${firstName} ${lastName}`,
      id: generatedId,
      password: generatedPassword,
    });
  };

  const closeModalAndRedirect = () => {
    setModalData({ ...modalData, isOpen: false });
    router.push('/teacher/create-account');
  };

  // Shared input classes for easy reading
  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors";

  return (
    <div className="w-full h-full flex flex-col p-6 lg:p-8 relative">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Register New Student</h1>
          <p className="text-gray-500 text-sm">Enter the personal, contact, and family details of the new learner.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={handleAutoFill}
            className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors shadow-sm shrink-0"
          >
            <Wand2 size={16} /> Auto Fill (Demo)
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors shadow-sm shrink-0">
            <ScanLine size={16} /> Scan Document
          </button>
          <Link href="/teacher/create-account" className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm shrink-0">
            <ArrowLeft size={16} /> Back to List
          </Link>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 lg:p-8 animate-in slide-in-from-right-4 duration-300 min-w-0">
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-10">
          
          {/* Personal Details */}
          <section>
            <h2 className="text-[13px] font-bold text-gray-700 uppercase tracking-wider mb-5">Personal Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">First Name <span className="text-red-500">*</span></label><input name="firstName" required type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Middle Name</label><input name="middleName" type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Last Name <span className="text-red-500">*</span></label><input name="lastName" required type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Suffix</label><input name="suffix" type="text" placeholder="e.g., Jr., III" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Gender</label>
                <select name="gender" className={inputClass}>
                  <option value=""></option><option value="Male">Male</option><option value="Female">Female</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Birth Date <span className="text-red-500">*</span></label><input name="birthDate" required type="date" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5 lg:col-span-2"><label className="text-sm text-gray-600 font-medium">Nationality</label><input name="nationality" type="text" defaultValue="Filipino" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Civil Status</label><input name="civilStatus" type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Religion</label><input name="religion" type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Place of Birth</label><input name="placeOfBirth" type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Learner Ref No. (LRN) <span className="text-red-500">*</span></label><input name="lrn" required type="text" className={inputClass} /></div>
            </div>
          </section>

          {/* Contact Details */}
          <section>
            <h2 className="text-[13px] font-bold text-gray-700 uppercase tracking-wider mb-5">Contact Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Street/Building Number</label><input name="street" type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Barangay</label><input name="barangay" type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">City/Municipality</label><input name="city" type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Province</label><input name="province" type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5 lg:col-span-2"><label className="text-sm text-gray-600 font-medium">Contact Number</label><input name="phone" type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5 lg:col-span-2"><label className="text-sm text-gray-600 font-medium">Email</label><input name="email" type="email" className={inputClass} /></div>
            </div>
          </section>

          {/* Family */}
          <section>
            <h2 className="text-[13px] font-bold text-gray-700 uppercase tracking-wider mb-5">Family</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Mother Name</label><input name="motherName" type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Father Name</label><input name="fatherName" type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Guardian Name</label><input name="guardianName" type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Guardian Relation</label><input name="guardianRelation" type="text" className={inputClass} /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm text-gray-600 font-medium">Contact Number</label><input name="guardianPhone" type="text" className={inputClass} /></div>
            </div>
          </section>

          <div className="flex justify-end pt-6 border-t border-gray-100">
            <button type="submit" className="px-6 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
              Submit Registration
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
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
            <p className="text-gray-500 text-sm mb-6 px-4 leading-relaxed">
              The learner has been successfully enrolled into the system.
            </p>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-left mb-8 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Student Name</p>
                <p className="text-sm font-medium text-gray-900">{modalData.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Student ID (Username)</p>
                <p className="text-lg font-bold text-blue-600">{modalData.id}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Default Password</p>
                <p className="text-sm font-medium text-gray-900">{modalData.password}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Format: YYYYMMDD (Based on Birthdate)</p>
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