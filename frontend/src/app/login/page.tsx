'use client';

import Image from 'next/image';
import { FormEvent, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  UserRoundCheck,
  X,
} from 'lucide-react';

import {
  saveDemoSession,
  type DemoRole,
} from '@/src/components/auth/DemoAuthGuard';
import {
  loginAndFetchUser,
  normalizeUserRole,
  requestAccountRecovery,
} from '@/src/lib/auth-api';

type RecoveryState = 'idle' | 'success';

function subscribeRememberedIdentity(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readRememberedIdentity() {
  try { return localStorage.getItem('als-lms-demo-remember') || ''; } catch { return ''; }
}

export default function LoginPage() {
  const router = useRouter();

  const [role, setRole] = useState<DemoRole>('student');
  const rememberedIdentity = useSyncExternalStore(subscribeRememberedIdentity, readRememberedIdentity, () => '');
  const [identityInput, setIdentity] = useState<string | null>(null);
  const identity = identityInput ?? rememberedIdentity;
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberInput, setRememberMe] = useState<boolean | null>(null);
  const rememberMe = rememberInput ?? Boolean(rememberedIdentity);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryIdentity, setRecoveryIdentity] = useState('');
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('idle');
  const [recoveryError, setRecoveryError] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

    setIsSubmitting(true);

    try {
      const user = await loginAndFetchUser(identity.trim(), password, role);
      const resolvedRole = normalizeUserRole(user);
      if (!resolvedRole) throw new Error('This account has no supported role.');

      saveDemoSession(resolvedRole, user.email || identity.trim());

      try {
      if (rememberMe) {
        localStorage.setItem('als-lms-demo-remember', identity.trim());
      } else {
        localStorage.removeItem('als-lms-demo-remember');
      }
      } catch { /* Remembering the identity is optional; authentication uses cookies. */ }

      router.replace(
        resolvedRole === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Login failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRecovery = () => {
    setRecoveryIdentity(identity);
    setRecoveryState('idle');
    setRecoveryError('');
    setRecoveryOpen(true);
  };

  const submitRecovery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isRecovering) return;
    setRecoveryError('');
    if (!recoveryIdentity.trim()) {
      setRecoveryError('Please enter your email or ID.');
      return;
    }

    setIsRecovering(true);
    try {
      await requestAccountRecovery(recoveryIdentity.trim());
      setRecoveryState('success');
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : 'Unable to send the recovery email. Please try again.');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* LEFT PANEL */}
        <section className="relative hidden min-h-screen overflow-hidden bg-white lg:block">
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  className="flex h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-[#2f6df6] text-base font-semibold text-white shadow-[0_12px_30px_rgba(47,109,246,0.28)] transition hover:bg-[#245de0] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <KeyRound size={17} />
                      Sign In
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>

      {/* ACCOUNT RECOVERY MODAL */}
      {recoveryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="recovery-title" className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_30px_100px_rgba(15,23,42,0.3)]">
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
                disabled={isRecovering}
              >
                <X size={18} />
              </button>
            </div>

            {recoveryState === 'success' ? (
              <div className="mt-5">
                <h3 id="recovery-title" className="text-xl font-extrabold text-slate-900">
                  Check your email
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  If an active account matches those details, a password reset link will be sent to its registered email address. Open the link to choose a new password, then return here to sign in with your email or ID.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Check your spam or junk folder too. If you no longer have access to that email address, contact your ALS teacher or administrator.</p>
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
                <h3 id="recovery-title" className="text-xl font-extrabold text-slate-900">
                  Recover your account
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Enter your account email address or student/teacher ID. We’ll email a link to reset your password.
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
                    maxLength={254}
                    disabled={isRecovering}
                    autoComplete="username"
                    autoFocus
                    placeholder="Enter your email or ID"
                    className="ml-3 h-full flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>

                {recoveryError && <p role="alert" className="mt-3 text-sm text-red-600">{recoveryError}</p>}

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRecoveryOpen(false)}
                    disabled={isRecovering}
                    className="h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isRecovering}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2f6df6] text-sm font-bold text-white hover:bg-[#245de0] disabled:opacity-70"
                  >
                    {isRecovering && <Loader2 size={16} className="animate-spin" />}
                    {isRecovering ? 'Sending...' : 'Send reset link'}
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
