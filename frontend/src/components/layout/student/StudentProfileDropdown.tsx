'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { clearDemoSession, getDemoSession } from '@/src/components/auth/DemoAuthGuard';

const PROFILE_PHOTO_KEY = 'als-student-profile-photo';
const PROFILE_PHOTO_EVENT = 'als-student-profile-photo-updated';

function subscribeProfile(callback: () => void) {
  window.addEventListener(PROFILE_PHOTO_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(PROFILE_PHOTO_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function readProfilePhoto() {
  try { return localStorage.getItem(PROFILE_PHOTO_KEY); } catch { return null; }
}

function readIdentity() {
  return getDemoSession()?.identity || 'ALS Learner';
}

export default function StudentProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const identity = useSyncExternalStore(subscribeProfile, readIdentity, () => 'ALS Learner');
  const profilePhoto = useSyncExternalStore(subscribeProfile, readProfilePhoto, () => null);
  const router = useRouter();
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

  const initials = identity
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AL';

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setSignOutError('');
    try {
      await clearDemoSession();
      setIsOpen(false);
      router.replace('/login');
      router.refresh();
    } catch {
      setSignOutError('Unable to sign out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const openProfile = () => {
    setIsOpen(false);
    router.push('/student/profile');
  };

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {signOutError && <p role="alert" className="text-sm text-red-600">{signOutError}</p>}
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
            disabled={isSigningOut}
          >
            <LogOut size={16} className="text-slate-400" />
            {isSigningOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      )}
    </div>
  );
}
