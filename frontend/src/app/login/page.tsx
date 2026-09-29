'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  Mail,
  UserRoundCheck,
  X,
} from 'lucide-react';

import {
  saveDemoSession,
  type DemoRole,
} from '@/src/components/auth/DemoAuthGuard';

type RecoveryState = 'idle' | 'success';

export default function LoginPage() {
  const router = useRouter();

  const [role, setRole] = useState<DemoRole>('student');
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryIdentity, setRecoveryIdentity] = useState('');
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('idle');

  useEffect(() => {
    const remembered = localStorage.getItem('als-lms-demo-remember');
    if (remembered) {
      setIdentity(remembered);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!identity.trim()) {
      setError('Please enter your email or ID.');
      return;
    }

    if (password.trim().length < 4) {
      setError('Please enter a valid password.');
      return;
    }

    saveDemoSession(role, identity.trim());

    if (rememberMe) {
      localStorage.setItem('als-lms-demo-remember', identity.trim());
    } else {
      localStorage.removeItem('als-lms-demo-remember');
    }

    router.push(role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
  };

  const openRecovery = () => {
    setRecoveryIdentity(identity);
    setRecoveryState('idle');
    setRecoveryOpen(true);
  };

  const submitRecovery = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recoveryIdentity.trim()) return;
    setRecoveryState('success');
  };

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* LEFT PANEL */}
        <section className="relative hidden min-h-screen overflow-hidden bg-white lg:block">
          {/* soft decorative circles like the approved mockup */}
          <div className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-[#cfd8ff]/85" />
          <div className="pointer-events-none absolute -left-4 top-20 h-36 w-36 rounded-full bg-[#e8ecff]/90" />
          <div className="pointer-events-none absolute left-16 top-12 h-24 w-24 rounded-full bg-[#d9efe7]/90" />

          <div className="relative z-10 flex min-h-screen flex-col px-14 pb-0 pt-12 xl:px-20 2xl:px-24">
            <div className="max-w-[620px]">
              <Image
                src="/logo.png"
                alt="Alternative Learning System logo"
                width={230}
                height={230}
                priority
                className="h-auto w-[185px] object-contain xl:w-[205px]"
              />

              <h1 className="mt-8 max-w-[640px] text-[46px] font-extrabold leading-[1.06] tracking-[-0.045em] text-[#17265b] xl:text-[58px]">
                Alternative Learning System
              </h1>

              <p className="mt-5 max-w-[570px] text-[21px] font-medium leading-relaxed text-slate-600 xl:text-[22px]">
                Empowering Lifelong Learning for a Brighter Tomorrow
              </p>

              <p className="mt-5 max-w-[570px] text-[15px] leading-7 text-slate-500 xl:text-base">
                A modern learning management system for ALS educators and learners.
                Access modules, track progress, and support lifelong learning anytime,
                anywhere.
              </p>
            </div>

            {/* REAL CLASSROOM / LEARNING VISUAL */}
            <div className="relative -mx-14 mt-auto h-[38vh] min-h-[320px] overflow-hidden xl:-mx-20 xl:h-[42vh] 2xl:-mx-24">
              <Image
                src="/login-learning-scene.png"
                alt="Classroom learning workspace with books and laptop"
                fill
                priority
                sizes="50vw"
                className="object-cover object-bottom"
              />
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white via-white/75 to-transparent" />
            </div>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f9fd] px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[#d8e3ff]/75" />
          <div className="pointer-events-none absolute -bottom-12 right-6 h-44 w-44 rounded-full bg-[#d7efe5]/75" />
          <div className="pointer-events-none absolute bottom-8 right-20 grid grid-cols-4 gap-3 opacity-45">
            {Array.from({ length: 12 }).map((_, index) => (
              <span key={index} className="h-2 w-2 rounded-full bg-indigo-200" />
            ))}
          </div>

          <div className="relative z-10 w-full max-w-[560px]">
            <div className="rounded-[30px] border border-slate-200 bg-white px-6 py-8 shadow-[0_24px_70px_rgba(30,41,59,0.10)] sm:px-9 sm:py-10 xl:px-10">
              <div className="text-center">
                <Image
                  src="/logo.png"
                  alt="Alternative Learning System logo"
                  width={160}
                  height={160}
                  priority
                  className="mx-auto h-auto w-[130px] object-contain sm:w-[145px]"
                />

                <h2 className="mt-4 text-[26px] font-extrabold tracking-[-0.03em] text-[#17265b] sm:text-[30px]">
                  ALS Learning Management System
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to your account to continue
                </p>
              </div>

              {/* STUDENT / TEACHER SWITCH */}
              <div className="mt-8 grid grid-cols-2 rounded-full border border-slate-200 bg-white p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setRole('student');
                    setError('');
                  }}
                  className={`flex h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all ${
                    role === 'student'
                      ? 'bg-[#2f6df6] text-white shadow-[0_8px_24px_rgba(47,109,246,0.28)]'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <GraduationCap size={18} />
                  Student
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRole('teacher');
                    setError('');
                  }}
                  className={`flex h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all ${
                    role === 'teacher'
                      ? 'bg-[#2f6df6] text-white shadow-[0_8px_24px_rgba(47,109,246,0.28)]'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <UserRoundCheck size={18} />
                  Teacher
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="identity" className="mb-2 block text-sm font-semibold text-slate-800">
                    Email or ID
                  </label>

                  <div className="flex h-[54px] items-center rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50">
                    <Mail size={18} className="shrink-0 text-slate-400" />
                    <input
                      id="identity"
                      type="text"
                      value={identity}
                      onChange={(event) => setIdentity(event.target.value)}
                      placeholder="Enter your email or ID"
                      autoComplete="username"
                      className="ml-3 h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-800">
                    Password
                  </label>

                  <div className="flex h-[54px] items-center rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50">
                    <LockKeyhole size={18} className="shrink-0 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="ml-3 h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-[#2f6df6]"
                    />
                    Remember me
                  </label>

                  <button
                    type="button"
                    onClick={openRecovery}
                    className="text-sm font-semibold text-[#2f6df6] transition hover:text-[#1f59d8]"
                  >
                    Recover Account?
                  </button>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="flex h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-[#2f6df6] text-base font-semibold text-white shadow-[0_12px_30px_rgba(47,109,246,0.28)] transition hover:bg-[#245de0]"
                >
                  <KeyRound size={17} />
                  Sign In
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>

      {/* ACCOUNT RECOVERY MODAL */}
      {recoveryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_30px_100px_rgba(15,23,42,0.3)]">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                {recoveryState === 'success' ? (
                  <CheckCircle2 size={22} />
                ) : (
                  <KeyRound size={21} />
                )}
              </div>

              <button
                type="button"
                onClick={() => setRecoveryOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close account recovery"
              >
                <X size={18} />
              </button>
            </div>

            {recoveryState === 'success' ? (
              <div className="mt-5">
                <h3 className="text-xl font-extrabold text-slate-900">
                  Recovery request received
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Your recovery request has been recorded. Please contact your ALS teacher or system administrator if you still cannot access your account.
                </p>
                <button
                  type="button"
                  onClick={() => setRecoveryOpen(false)}
                  className="mt-6 h-11 w-full rounded-xl bg-[#2f6df6] text-sm font-bold text-white hover:bg-[#245de0]"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={submitRecovery} className="mt-5">
                <h3 className="text-xl font-extrabold text-slate-900">
                  Recover your account
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Enter your email address or ID associated with your Alternative Learning System account.
                </p>

                <label htmlFor="recoveryIdentity" className="mt-5 block text-sm font-bold text-slate-800">
                  Email or ID
                </label>

                <div className="mt-2 flex h-12 items-center rounded-xl border border-slate-200 px-3.5 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50">
                  <Mail size={17} className="text-slate-400" />
                  <input
                    id="recoveryIdentity"
                    value={recoveryIdentity}
                    onChange={(event) => setRecoveryIdentity(event.target.value)}
                    required
                    placeholder="Enter your email or ID"
                    className="ml-3 h-full flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRecoveryOpen(false)}
                    className="h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="h-11 rounded-xl bg-[#2f6df6] text-sm font-bold text-white hover:bg-[#245de0]"
                  >
                    Continue
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
