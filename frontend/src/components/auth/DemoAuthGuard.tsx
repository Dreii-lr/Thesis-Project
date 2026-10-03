'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logoutUser, normalizeUserRole, SessionError } from '@/src/lib/auth-api';

export type DemoRole = 'student' | 'teacher';

const SESSION_KEY = 'als-lms-demo-session';

type DemoSession = {
  role: DemoRole;
  identity: string;
  signedInAt: string;
};

export function saveDemoSession(role: DemoRole, identity: string) {
  const session: DemoSession = {
    role,
    identity,
    signedInAt: new Date().toISOString(),
  };

  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* Display cache only. */ }
}

export function getDemoSession(): DemoSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as DemoSession;
    if (!session?.role || !session?.identity) return null;
    return session;
  } catch {
    return null;
  }
}

export async function clearDemoSession() {
  await logoutUser();
  try { localStorage.removeItem(SESSION_KEY); } catch { /* The server session is already revoked. */ }
}

export default function DemoAuthGuard({
  role,
  children,
}: {
  role: DemoRole;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function verifyBackendSession() {
      try {
      const user = await getCurrentUser(true);

      if (!active) return;

      if (!user) {
        localStorage.removeItem(SESSION_KEY);
        router.replace('/login');
        return;
      }

      const backendRole = normalizeUserRole(user);

      if (backendRole !== role) {
        router.replace(backendRole ? `/${backendRole}/dashboard` : '/login');
        return;
      }

      saveDemoSession(role, user.email || String(user.user_id));
      setReady(true);
      setError('');
      } catch (err) {
        if (!active) return;
        setReady(false);
        if (err instanceof SessionError && (err.status === 401 || err.status === 403)) {
          router.replace('/login');
        } else {
          setError(err instanceof Error ? err.message : 'Unable to check your session. Please try again.');
        }
      }
    }

    verifyBackendSession();
    const onFocus = () => { void verifyBackendSession(); };
    window.addEventListener('focus', onFocus);

    return () => {
      active = false;
      window.removeEventListener('focus', onFocus);
    };
  }, [role, router]);

  if (error) {
    return <div role="alert" className="p-8 text-center">
      <p>{error}</p>
      <button onClick={() => window.location.reload()} className="mt-4 underline">Try again</button>
    </div>;
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-r-transparent" />
          Checking your session...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
