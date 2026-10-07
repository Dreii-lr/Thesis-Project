'use client';
import { formatCategoryLevel } from '@/src/data/mockStudents';


import Link from 'next/link';
import { use } from 'react';
import { ChevronLeft, Edit } from 'lucide-react';
import { useTeacher } from '@/src/context/TeacherContext';
import { notFound } from 'next/navigation';
import RightContentArea from '@/src/components/layout/teacher/students/RightContentArea';

export default function StudentProfileView({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { students } = useTeacher();
  
  const student = students.find(s => s.id === resolvedParams.id);
  if (!student) return notFound();

  // Calculate accurate age from birthDate
  const calculateAge = (birthDateString: string) => {
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formattedDate = new Date(student.personal_details.birth_date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  
  const initials = `${student.first_name.charAt(0)}${student.last_name.charAt(0)}`.toUpperCase();

  return (
    <div className="w-full h-full flex flex-col p-6 lg:p-8">
      
      {/* Top Breadcrumb Navigation */}
      <div className="mb-6">
        <Link href="/teacher/students" className="inline-flex items-center text-sm text-gray-500 hover:text-[#4f46e5] transition-colors font-medium">
          <ChevronLeft size={16} className="mr-1" />
          Back to Directory
          <span className="mx-2 text-gray-300">/</span>
          <span className="font-bold text-gray-900">{student.first_name} {student.last_name}</span>
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start h-full pb-10">
        
        {/* LEFT SIDEBAR: Student Demographics */}
        <aside className="w-full lg:w-[320px] shrink-0 bg-white border border-gray-200 rounded-xl p-6 shadow-sm overflow-hidden">
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-full bg-[#4f46e5] text-white flex items-center justify-center text-xl font-bold shadow-sm">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">{student.first_name} {student.last_name}</h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">LRN: {student.personal_details.lrn_number}</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Personal Info Section */}
            <section>
              <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-3">Personal Information</h3>
              <div className="space-y-2.5 text-sm">
                <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">First Name</span><span className="font-medium text-gray-900">: {student.first_name}</span></div>
                <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Middle Name</span><span className="font-medium text-gray-900">: {student.middle_name || '-'}</span></div>
                <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Last Name</span><span className="font-medium text-gray-900">: {student.last_name}</span></div>
                <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Gender</span><span className="font-medium text-gray-900">: {student.personal_details.gender}</span></div>
                <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Birth Date</span><span className="font-medium text-gray-900">: {formattedDate} ({calculateAge(student.personal_details.birth_date)} yo)</span></div>
                <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Civil Status</span><span className="font-medium text-gray-900">: {student.personal_details.civil_status}</span></div>
                <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Religion</span><span className="font-medium text-gray-900">: {student.personal_details.religion}</span></div>
                <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Place of Birth</span><span className="font-medium text-gray-900">: {student.personal_details.place_of_birth}</span></div>
              </div>
            </section>

            {/* Contact Info Section */}
            <section>
              <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-3">Contact Information</h3>
              <div className="space-y-2.5 text-sm">
                <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Street/Bldg No.</span><span className="font-medium text-gray-900">: {student.contact_details.street_building_no || '-'}</span></div>
                <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Barangay</span><span className="font-medium text-gray-900">: {student.contact_details.municipality || '-'}</span></div>
                <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">City</span><span className="font-medium text-gray-900">: {student.contact_details.municipality || '-'}</span></div>
                <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Province</span><span className="font-medium text-gray-900">: {student.contact_details.province || '-'}</span></div>
                <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Contact No.</span><span className="font-medium text-gray-900">: {student.contact_details.contact_no || '-'}</span></div>
                <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Email</span><span className="font-medium text-[#4f46e5] truncate">: {student.email || '-'}</span></div>
              </div>
            </section>

            {/* Academic Section */}
            <section>
              <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-3">Academic Profile</h3>
              <div className="space-y-2.5 text-sm">
                <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Level</span><span className="font-medium text-gray-900">: {formatCategoryLevel(student.user_category)}</span></div>
                <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Current Focus</span><span className="font-medium text-gray-900">: LS2 (Scientific Literacy)</span></div>
              </div>
            </section>
            
            {/* Direct link to edit this specific student */}
            <Link 
              href={`/teacher/create-account/${student.id}`} 
              className="w-full flex items-center justify-center gap-2 py-2.5 mt-4 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-100 hover:text-gray-900 transition-colors shadow-sm"
            >
              <Edit size={14} /> Update Profile
            </Link>
          </div>
        </aside>

        {/* RIGHT AREA: Tabs and Content */}
        <RightContentArea />

      </div>
    </div>
  );
}