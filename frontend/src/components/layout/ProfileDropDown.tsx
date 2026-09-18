'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, Settings, LogOut } from 'lucide-react';

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 focus:outline-none"
      >
        <div className="hidden md:block text-right">
          <p className="text-[14px] font-medium text-gray-900 leading-none mb-1">Mia Hale</p>
          <p className="text-[12px] text-gray-500 leading-none">Teacher</p>
        </div>
        <Image 
          src="https://i.pravatar.cc/150?u=mia"
          alt="Mia Hale" 
          width={36} 
          height={36} 
          className="rounded-full object-cover border border-gray-200"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-12 right-0 mt-2 w-56 bg-white rounded-lg shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 py-2 z-50">
          <div className="flex flex-col">
            <Link 
              href="/admin/profile" 
              className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <User size={18} className="text-gray-500" />
              View Profile
            </Link>
            <Link 
              href="/admin/settings" 
              className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Settings size={18} className="text-gray-500" />
              System Settings
            </Link>
            <button 
              className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
              onClick={() => setIsOpen(false)}
            >
              <LogOut size={18} className="text-gray-500" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}