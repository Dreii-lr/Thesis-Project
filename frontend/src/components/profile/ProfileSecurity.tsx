'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import type { DemoRole } from '@/src/lib/auth-api';
import { changeOwnPassword, PASSWORD_CHANGE_ENABLED, PROFILE_ROLES, validatePasswordChange, type AccountProfile } from '@/src/lib/profile-api';
import { ManagedNote, ProfileFields, ProfileMessage, profileInputClass, profilePrimaryClass } from './ProfileShared';

export default function ProfileSecurity({ profile, role, onDirty, onPending, onComplete }: { profile: AccountProfile; role: DemoRole; onDirty: () => void; onPending: (pending: boolean) => void; onComplete: () => void }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function change(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const current = String(data.get('current_password') || '');
    const next = String(data.get('new_password') || '');
    const confirm = String(data.get('confirm_password') || '');
    const issue = validatePasswordChange(current, next, confirm);
    if (issue) { setError(issue); return; }
    lock.current = true; setBusy(true); setError(''); onPending(true);
    try {
      await changeOwnPassword(profile.user_id, role, current, next, confirm);
      form.reset();
      onComplete();
      // The existing endpoint clears authentication cookies after a successful request.
      window.location.replace('/login');
    } catch (err) { setError(err instanceof Error ? err.message : 'Your password could not be updated. Please try again.'); }
    finally { lock.current = false; setBusy(false); onPending(false); }
  }
  return <div className="space-y-6"><ProfileFields fields={[[profile.email ? 'Account email' : 'Sign-in ID', profile.email || profile.account_id], ['Account role', PROFILE_ROLES[role]], ['Account ID', profile.account_id], ['Account status', profile.status]]} /><ManagedNote>Account identifiers and access settings are managed separately from your personal information.</ManagedNote><div className="border-t border-slate-100 pt-6"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-blue-600" /><h3 className="text-sm font-semibold text-slate-800">Change password</h3></div><p className="mt-2 text-xs leading-6 text-slate-500">Choose a password with at least 6 characters. You will need to sign in again after a successful change.</p>{!PASSWORD_CHANGE_ENABLED && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">Password changes are temporarily unavailable. Please contact your administrator for account assistance.</div>}<form onSubmit={change} onChange={onDirty} className="mt-5 space-y-4">{error && <ProfileMessage error>{error}</ProfileMessage>}<fieldset disabled={!PASSWORD_CHANGE_ENABLED || busy} className="space-y-4">{[{ name: 'current_password', label: 'Current password', autoComplete: 'current-password' }, { name: 'new_password', label: 'New password', autoComplete: 'new-password' }, { name: 'confirm_password', label: 'Confirm new password', autoComplete: 'new-password' }].map(field => <label key={field.name} className="block text-xs font-semibold text-slate-600">{field.label}<input name={field.name} type={show ? 'text' : 'password'} required minLength={field.name === 'current_password' ? 1 : 6} autoComplete={field.autoComplete} className={profileInputClass} /></label>)}<button type="button" onClick={() => setShow(value => !value)} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 disabled:opacity-50">{show ? <EyeOff size={15} /> : <Eye size={15} />}{show ? 'Hide passwords' : 'Show passwords'}</button></fieldset><div className="flex justify-end border-t border-slate-100 pt-4"><button type="submit" disabled={!PASSWORD_CHANGE_ENABLED || busy} className={profilePrimaryClass}>{busy ? <Loader2 size={15} className="animate-spin" /> : <LockKeyhole size={15} />}{busy ? 'Updating password…' : 'Update password'}</button></div></form></div><Link href={`/${role}/dashboard`} className="text-xs font-semibold text-blue-600">Return to dashboard</Link></div>;
}
