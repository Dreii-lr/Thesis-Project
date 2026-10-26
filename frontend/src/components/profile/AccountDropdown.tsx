'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, ChevronRight, Loader2, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useOptionalAuth } from '@/src/context/AuthContext';
import { PROFILE_ROLES, profileName } from '@/src/lib/profile-api';
import ProfileAvatar from './ProfileAvatar';

export default function AccountDropdown() {
  const auth = useOptionalAuth();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const focusLast = useRef(false);
  const lock = useRef(false);
  const menuId = useId();
  const user = auth?.user || null;
  const role = auth?.role;
  const roleLabel = role ? PROFILE_ROLES[role] : 'Account';
  const name = profileName(user);

  useEffect(() => {
    if (!open) return;
    const items = rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    (focusLast.current ? items?.[items.length - 1] : items?.[0])?.focus();
    const dismiss = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); buttonRef.current?.focus(); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') || []);
    const index = items.findIndex(item => item === document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }

  async function signOut() {
    if (!auth || lock.current) return;
    lock.current = true; setPending(true); setError('');
    try { await auth.logout(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign out. Please try again.'); }
    finally { lock.current = false; setPending(false); }
  }

  return <div ref={rootRef} className="relative shrink-0" onBlur={event => { if (!lock.current && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <button ref={buttonRef} type="button" aria-label={`Open ${roleLabel.toLowerCase()} profile menu`} aria-haspopup="menu" aria-controls={menuId} aria-expanded={open} disabled={!user || !role} onClick={() => { focusLast.current = false; setOpen(value => !value); }} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); focusLast.current = event.key === 'ArrowUp'; setOpen(true); }
    }} className="flex max-w-56 items-center gap-2.5 rounded-xl px-1.5 py-1 text-left transition hover:bg-blue-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50">
      <ProfileAvatar user={user} /><span className="hidden min-w-0 xl:block"><span className="block max-w-32 truncate text-[13px] font-semibold leading-5 text-slate-800">{name}</span><span className="block text-[11px] leading-4 text-slate-400">{roleLabel}</span></span><ChevronDown size={14} className={`hidden shrink-0 text-slate-400 transition-transform sm:block ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && role && <div id={menuId} role="menu" aria-label={`${roleLabel} account`} onKeyDown={keyboard} className="absolute right-0 top-[calc(100%+12px)] z-[80] w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.12)]">
      <div className="border-b border-slate-100 bg-gradient-to-br from-blue-50/80 to-white p-4"><div className="flex items-center gap-3"><ProfileAvatar user={user} /><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold text-slate-900">{name}</p><span className="mt-1 inline-flex rounded-md border border-blue-100 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700">{roleLabel}</span></div></div><p className="mt-3 break-all text-[11px] text-slate-500">{user?.account_id ? `Account ID · ${user.account_id}` : user?.email || 'Signed-in account'}</p></div>
      <div className="space-y-1 p-2"><Link role="menuitem" href={`/${role}/profile`} onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:bg-blue-50 focus-visible:outline-none"><UserRound size={17} className="text-blue-600" /><span className="flex-1"><span className="block text-xs font-semibold">My Profile</span><span className="mt-0.5 block text-[11px] text-slate-400">Personal information and contact details</span></span><ChevronRight size={14} className="text-slate-300" /></Link>
        <Link role="menuitem" href={`/${role}/profile?section=security`} onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:bg-blue-50 focus-visible:outline-none"><ShieldCheck size={17} className="text-blue-600" /><span className="flex-1"><span className="block text-xs font-semibold">Account & Security</span><span className="mt-0.5 block text-[11px] text-slate-400">Sign-in information and password</span></span><ChevronRight size={14} className="text-slate-300" /></Link></div>
      <div className="border-t border-slate-100 p-2">{error && <p role="alert" className="mb-2 rounded-lg bg-rose-50 p-3 text-xs leading-5 text-rose-700">{error}</p>}<button type="button" role="menuitem" disabled={pending} onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-700 focus-visible:bg-rose-50 focus-visible:outline-none disabled:opacity-50">{pending ? <Loader2 size={17} className="animate-spin" /> : <LogOut size={17} />} {pending ? 'Signing out…' : 'Sign Out'}</button></div>
    </div>}
  </div>;
}
