'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, UserRound } from 'lucide-react';
import { clearDemoSession } from '@/src/components/auth/DemoAuthGuard';
import { getCurrentUser } from '@/src/lib/auth-api';
import { useApiData } from '@/src/lib/use-api-data';
import ApiState from '@/src/components/ui/ApiState';

const loadProfile = () => getCurrentUser(true);

export default function AdminProfilePage() {
  const profile = useApiData(loadProfile);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const user = profile.data;
  const logout = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await clearDemoSession();
      router.replace('/login');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign out. Please try again.');
    } finally {
      setPending(false);
    }
  };
  const fields = user ? [['Role', 'Admin'], ['User ID', user.user_id], ['Account ID', user.account_id], ['Email', user.email], ['Status', user.status]] : [];

  return <div className="mx-auto w-full max-w-[1000px] p-4 sm:p-6 lg:p-8">
    <h1 className="text-2xl font-bold">My Profile</h1><p className="mt-2 text-sm text-slate-500">Your authenticated account information.</p>
    <ApiState loading={profile.loading} error={profile.error} onRetry={profile.reload} />
    {!profile.loading && !profile.error && user && <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-4"><span className="rounded-2xl bg-blue-50 p-4 text-blue-600"><UserRound size={28} /></span><div><h2 className="text-xl font-bold">{user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Admin'}</h2><p className="mt-1 text-sm text-slate-500">Admin</p></div></div>
      <dl className="grid gap-5 sm:grid-cols-2">{fields.filter(([, value]) => typeof value === 'string' && !!value).map(([label, value]) => <div key={String(label)}><dt className="text-xs font-semibold text-slate-500">{String(label)}</dt><dd className="mt-2 break-all text-sm font-medium">{String(value)}</dd></div>)}</dl>
      {error && <p role="alert" className="mt-6 text-sm text-red-600">{error}</p>}
      <button type="button" onClick={() => void logout()} disabled={pending} className="mt-8 inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">{pending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}{pending ? 'Signing out...' : 'Sign Out'}</button>
    </section>}
  </div>;
}
