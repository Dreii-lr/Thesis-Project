'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
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

export function clearDemoSession() {
  localStorage.removeItem(SESSION_KEY);
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

  useEffect(() => {
    const session = getDemoSession();

    if (!session || session.role !== role) {
      router.replace('/login');
      return;
    }

    setReady(true);
  }, [role, router]);

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
