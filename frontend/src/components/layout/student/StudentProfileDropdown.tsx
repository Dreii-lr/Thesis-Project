'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { clearDemoSession, getDemoSession } from '@/src/components/auth/DemoAuthGuard';

const PROFILE_PHOTO_KEY = 'als-student-profile-photo';
const PROFILE_PHOTO_EVENT = 'als-student-profile-photo-updated';

export default function StudentProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [identity, setIdentity] = useState('ALS Learner');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = getDemoSession();
    if (session?.identity) setIdentity(session.identity);

    const loadPhoto = () => setProfilePhoto(localStorage.getItem(PROFILE_PHOTO_KEY));
    loadPhoto();
    window.addEventListener(PROFILE_PHOTO_EVENT, loadPhoto);
    window.addEventListener('storage', loadPhoto);

    return () => {
      window.removeEventListener(PROFILE_PHOTO_EVENT, loadPhoto);
      window.removeEventListener('storage', loadPhoto);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = identity
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AL';

  const handleSignOut = () => {
    clearDemoSession();
    setIsOpen(false);
    router.replace('/login');
  };

  const openProfile = () => {
    setIsOpen(false);
    router.push('/student/profile');
  };

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((current) => !current)}
        className="flex max-w-[190px] items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-slate-50"
        aria-expanded={isOpen}
        aria-label="Open student profile menu"
      >
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
          {profilePhoto ? (
            <Image
              src={profilePhoto}
              alt="Student profile"
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            initials
          )}
        </div>

        <div className="hidden min-w-0 text-left md:block">
          <p className="max-w-28 truncate text-[13px] font-semibold leading-4 text-slate-800 xl:max-w-32">
            {identity}
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-400">Student</p>
        </div>

        <ChevronDown
          size={14}
          className={`hidden shrink-0 text-slate-400 transition-transform md:block ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[80] w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_55px_rgba(15,23,42,0.18)]">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            onClick={openProfile}
          >
            <User size={16} className="text-slate-400" />
            My Profile
          </button>

          <div className="my-1 h-px bg-slate-100" />

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
            onClick={handleSignOut}
          >
            <LogOut size={16} className="text-slate-400" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
