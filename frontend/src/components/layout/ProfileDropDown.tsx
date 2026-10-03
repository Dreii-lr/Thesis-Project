'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, Loader2, LogOut, Settings, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  clearDemoSession,
} from '@/src/components/auth/DemoAuthGuard';
import { getCurrentUser, normalizeUserRole } from '@/src/lib/auth-api';

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [displayName, setDisplayName] = useState('Loading...');
  const [roleLabel, setRoleLabel] = useState<'Student' | 'Teacher'>('Teacher');

  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Display the account returned by the authenticated API.
  useEffect(() => {
    let active = true;

    async function loadUserProfile() {
      const user = await getCurrentUser();
      if (!active || !user) return;

      const fullName =
        user.full_name ||
        [user.first_name, user.last_name].filter(Boolean).join(' ').trim() ||
        user.email ||
        String(user.user_id);

      const resolvedRole = normalizeUserRole(user);
      if (!resolvedRole) return;

      setDisplayName(fullName);
      setRoleLabel(resolvedRole === 'student' ? 'Student' : 'Teacher');
    }

    loadUserProfile();

    return () => {
      active = false;
    };
  }, []);

  // 2. Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3. Await backend cookie clearing before redirecting to /login
  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setSignOutError('');

    try {
      await clearDemoSession(); // Calls POST /api/v1/auth/logout & clears localStorage
      setIsOpen(false);
      router.replace('/login');
      router.refresh(); // Clears Next.js client router cache
    } catch {
      setSignOutError('Unable to sign out. Please check your connection and try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {signOutError && <p role="alert" className="text-sm text-red-600">{signOutError}</p>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-slate-50 focus:outline-none"
        aria-expanded={isOpen}
        aria-label="Open profile menu"
      >
        <Image
          src={`https://i.pravatar.cc/150?u=${encodeURIComponent(displayName)}`}
          alt={displayName}
          width={36}
          height={36}
          className="h-9 w-9 rounded-xl border border-slate-200 object-cover shadow-sm"
        />

        <div className="hidden min-w-0 text-left md:block">
          <p className="max-w-28 truncate text-[13px] font-semibold leading-4 text-slate-800">
            {displayName}
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
            {roleLabel}
          </p>
        </div>

        <ChevronDown
          size={14}
          className={`hidden text-slate-400 transition-transform md:block ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
          <div className="border-b border-slate-100 px-3 py-2.5 md:hidden">
            <p className="truncate text-[13px] font-semibold text-slate-800">
              {displayName}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">{roleLabel}</p>
          </div>

          <Link
            href="/admin/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            onClick={() => setIsOpen(false)}
          >
            <User size={16} className="text-slate-400" />
            View Profile
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            onClick={() => setIsOpen(false)}
          >
            <Settings size={16} className="text-slate-400" />
            System Settings
          </Link>
          <div className="my-1 h-px bg-slate-100" />
          <button
            type="button"
            disabled={isSigningOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
            onClick={handleSignOut}
          >
            {isSigningOut ? (
              <Loader2 size={16} className="animate-spin text-red-500" />
            ) : (
              <LogOut size={16} className="text-slate-400" />
            )}
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </button>
        </div>
      )}
    </div>
  );
}
