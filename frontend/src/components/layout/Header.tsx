'use client';

import { useSidebar } from '@/src/context/SidebarContext';
import { usePathname } from 'next/navigation';
import { PanelLeft, Bell, Search, Home, ChevronRight } from 'lucide-react';
import ProfileDropdown from '@/src/components/layout/ProfileDropDown';
import Link from 'next/link';

export default function Header() {
  const { toggleSidebar } = useSidebar();
  const pathname = usePathname();

  // 1. Split the pathname into segments and remove empty strings
  const pathSegments = pathname?.split('/').filter(Boolean) || [];

  // 2. Filter out the base role (e.g., 'teacher' or 'admin') so it doesn't show in the breadcrumbs
  const breadcrumbSegments = pathSegments.filter(
    (segment) => segment !== 'teacher' && segment !== 'admin'
  );

  // Helper function to format slugs into readable titles (e.g., "create-account" -> "Create Account")
  const formatSegment = (segment: string) => {
    return segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10 w-full shrink-0">
      
      {/* Left Section: Toggle & Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="text-gray-500 hover:text-gray-900 transition-colors"
          aria-label="Toggle Sidebar"
        >
          <PanelLeft size={20} strokeWidth={1.5} />
        </button>
        
        {/* Vertical Divider */}
        <div className="h-5 w-px bg-gray-300" /> 
        
        {/* Dynamic Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          
          {/* Home Icon Link (Defaults to Dashboard) */}
          <Link 
            href="/teacher/dashboard" 
            className="hover:text-[#2563eb] transition-colors flex items-center"
            title="Dashboard"
          >
            <Home size={16} strokeWidth={1.5} />
          </Link>

          {/* Map through the remaining URL segments */}
          {breadcrumbSegments.map((segment, index) => {
            // Reconstruct the real URL path up to this current segment so the link works correctly
            const segmentIndex = pathSegments.indexOf(segment);
            const href = '/' + pathSegments.slice(0, segmentIndex + 1).join('/');
            
            // Check if this is the final segment (the page we are currently looking at)
            const isLast = index === breadcrumbSegments.length - 1;

            return (
              <div key={segment} className="flex items-center gap-2">
                <ChevronRight size={16} strokeWidth={1.5} className="text-gray-400" />
                
                {isLast ? (
                  // Current Page (Not a link, bold text)
                  <span className="font-semibold text-gray-900">
                    {formatSegment(segment)}
                  </span>
                ) : (
                  // Parent Page (Clickable link)
                  <Link 
                    href={href} 
                    className="hover:text-[#2563eb] transition-colors"
                  >
                    {formatSegment(segment)}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Section: Search, Notifications & Profile */}
      <div className="flex items-center gap-6">
        
        {/* Search Bar */}
        <div className="hidden md:flex items-center bg-gray-50 border border-gray-200 rounded-full px-4 py-2 w-64 lg:w-80 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input 
            type="text" 
            placeholder="Search anything" 
            className="bg-transparent border-none outline-none text-[13px] text-gray-700 ml-3 w-full placeholder:text-gray-400"
          />
        </div>

        {/* Notifications */}
        <button className="relative text-gray-500 hover:text-gray-800 transition-colors">
          <Bell size={20} strokeWidth={1.5} />
          <span className="absolute top-0 right-0 block h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* Dropdown component */}
        <ProfileDropdown />
      </div>
      
    </header>
  );
}