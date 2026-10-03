'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, GraduationCap, LogOut, UserRound } from 'lucide-react';
import { clearDemoSession } from '@/src/components/auth/DemoAuthGuard';
import { getCurrentUser } from '@/src/lib/auth-api';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState('Learner');
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getCurrentUser().then((user) => {
      if (active && user) setIdentity(user.first_name || user.email);
    });
    return () => { active = false; };
  }, []);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setError('');
    try {
      await clearDemoSession();
      router.replace('/login');
      router.refresh();
    } catch {
      setError('Unable to sign out. Please check your connection and try again.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f8fc] px-5 py-8 text-slate-900 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5">
              <Image src="/logo.png" alt="ALS Logo" width={42} height={42} className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">ALS LMS Assistant</p>
              <p className="text-xs font-medium text-slate-400">Student Portal</p>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-red-600"
          >
            <LogOut size={16} />
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </header>
        {error && <p role="alert" className="mt-4 text-red-600">{error}</p>}

        <section className="mt-8 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-indigo-700 p-7 text-white shadow-[0_24px_60px_rgba(37,99,235,0.20)] sm:p-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold ring-1 ring-white/20">
              <GraduationCap size={15} />
              STUDENT PORTAL
            </div>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">Student sign-in successful</h1>
            <p className="mt-3 text-sm leading-6 text-blue-100 sm:text-base">
              Welcome, <span className="font-bold text-white">{identity}</span>. You are signed in to your student account.
            </p>
          </div>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <BookOpen size={21} />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-slate-900">Your learning space</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Learning materials and activities will appear here as student features become available.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <UserRound size={21} />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-slate-900">Your school account</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your teacher manages your student account. Contact your teacher if you need help with your sign-in details.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
