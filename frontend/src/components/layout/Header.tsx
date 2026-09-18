'use client';

import { useSidebar } from '@/src/context/SidebarContext';
import { usePathname } from 'next/navigation';
import { PanelLeft, Bell } from 'lucide-react';
import ProfileDropdown from '@/src/components/layout/ProfileDropDown';

export default function Header() {
  const { toggleSidebar } = useSidebar();
  const pathname = usePathname();

  const pathSegment = pathname?.split('/').pop() || 'dashboard';
  const pageTitle = pathSegment.charAt(0).toUpperCase() + pathSegment.slice(1).replace(/-/g, ' ');

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      {/* Left Section*/}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Toggle Sidebar"
        >
          <PanelLeft size={18} strokeWidth={2} />
        </button>
        
        <div className="h-6 w-px bg-gray-300" />
        
        <h1 className="text-[15px] font-semibold text-gray-900">
          {pageTitle}
        </h1>
      </div>

      {/* Right Section*/}
      <div className="flex items-center gap-6">
        <button className="relative text-gray-500 hover:text-gray-700 transition-colors">
          <Bell size={20} />
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* Dropdown component*/}
        <ProfileDropdown />
      </div>
    </header>
  );
}