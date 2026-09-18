'use client';

import Image from 'next/image';
import { useSidebar } from '@/src/context/SidebarContext';
import { 
  LayoutDashboard, 
  GraduationCap, 
  UserPlus, 
  ClipboardCheck, 
  CloudUpload,
  SquareText,
  FileCheck,
  Library,
  FilePlus,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TeacherSidebar() {
  const { isExpanded } = useSidebar();
  const pathname = usePathname();

  const navSections = [
    {
      title: 'LEARNER MANAGEMENT',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, href: '/teacher/dashboard' },
        { name: 'Students', icon: GraduationCap, href: '/teacher/students' },
        { name: 'Create Account', icon: UserPlus, href: '/teacher/create-account' },
        { name: 'Attendance', icon: ClipboardCheck, href: '/teacher/attendance' },
      ]
    },
    {
      title: 'MODULE & AI PROCESSING',
      items: [
        { name: 'Module Uploads', icon: CloudUpload, href: '/teacher/module-uploads' },
        { name: 'Generate Content', icon: SquareText, href: '/teacher/generate-content' },
        { name: 'Review & Approvals', icon: FileCheck, href: '/teacher/review-approvals' },
      ]
    },
    {
      title: 'ACADEMICS & ASSESSMENTS',
      items: [
        { name: 'Organize Lessons', icon: Library, href: '/teacher/organize-lessons' },
        { name: 'Exams Setups', icon: FilePlus, href: '/teacher/exams-setups' },
        { name: 'Results & Marks', icon: FileText, href: '/teacher/results-marks' },
      ]
    }
  ];

  return (
    <aside
      className={`${
        isExpanded ? 'w-[260px]' : 'w-20'
      } transition-all duration-300 ease-in-out hidden md:flex flex-col bg-white border-r border-gray-200 h-screen sticky top-0 shrink-0 z-20`}
    >
      {/* Header / Logo */}
      <div className={`h-16 flex items-center border-b border-gray-200 ${isExpanded ? 'px-6 justify-start' : 'justify-center'}`}>
        <Image 
          src="/logo.png" 
          alt="AIS Logo" 
          width={60} 
          height={60} 
          className="rounded-sm object-cover shrink-0"
        />
        {isExpanded && (
          <span className="ml-3 font-bold text-lg text-[#3b27df] truncate tracking-tight">
            LMS Assistant
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        {navSections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="space-y-2">
            {/* Section Title */}
            {isExpanded ? (
              <h3 className="px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {section.title}
              </h3>
            ) : (
              <div className="h-px bg-gray-200 my-4 mx-2" />
            )}
            
            {/* Items */}
            <div className="space-y-1">
              {section.items.map((item) => {  
                const isActive = pathname?.includes(item.href.split('/').pop() || '') || (pathname === '/' && item.name === 'Dashboard');
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center ${
                      isExpanded ? 'justify-start px-3' : 'justify-center px-0'
                    } py-2.5 rounded-lg transition-colors group ${
                      isActive
                        ? 'bg-[#e0e7ff] text-[#3730a3] font-medium' // Light indigo background matching the image
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    title={!isExpanded ? item.name : undefined}
                  >
                    <item.icon size={20} className="shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                    {isExpanded && (
                      <span className="ml-3 text-[14px]">
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}