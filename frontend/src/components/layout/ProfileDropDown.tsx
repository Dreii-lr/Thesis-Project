'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, Loader2, LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  clearDemoSession,
} from '@/src/components/auth/DemoAuthGuard';
import { getCurrentUser, normalizeUserRole } from '@/src/lib/auth-api';
import { useOptionalAuth } from '@/src/context/AuthContext';

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [fallbackUser, setFallbackUser] = useState<unknown | null>(null);

  const auth = useOptionalAuth();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // If outside AuthContext, fallback to getCurrentUser with in-memory caching
  useEffect(() => {
    if (auth?.user) return;
    let active = true;

    async function loadUserProfile() {
      const u = await getCurrentUser();
      if (!active || !u) return;
      setFallbackUser(u);
    }

    loadUserProfile();
    return () => {
      active = false;
    };
  }, [auth?.user]);

  const activeUser = auth?.user || (fallbackUser as import('@/src/lib/auth-api').UserRead | null);

  const displayName = activeUser
    ? activeUser.full_name ||
      [activeUser.first_name, activeUser.last_name].filter(Boolean).join(' ').trim() ||
      activeUser.email ||
      String(activeUser.user_id)
    : 'Loading...';

  const resolvedRole = activeUser ? normalizeUserRole(activeUser) : auth?.role;
  const roleLabel: 'Student' | 'Teacher' | 'Admin' | null = resolvedRole
    ? resolvedRole === 'student'
      ? 'Student'
      : resolvedRole === 'admin'
      ? 'Admin'
      : 'Teacher'
    : null;

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
      if (auth?.logout) {
        await auth.logout();
      } else {
        await clearDemoSession(); // Calls POST /api/v1/auth/logout & clears localStorage
        router.replace('/login');
        router.refresh(); // Clears Next.js client router cache
      }
      setIsOpen(false);
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
        {activeUser?.profile_url?.public_url ? (
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-blue-100 bg-blue-50 shadow-sm">
            <Image
              src={activeUser.profile_url.public_url}
              alt={displayName}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        ) : (
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-xs font-bold text-blue-700">
            {displayName.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}
          </span>
        )}

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

          {(roleLabel === 'Admin' || roleLabel === 'Student') && <Link
            href={roleLabel === 'Admin' ? '/admin/profile' : '/student/profile'}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            onClick={() => setIsOpen(false)}
          >
            <User size={16} className="text-slate-400" />
            View Profile
          </Link>}
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
