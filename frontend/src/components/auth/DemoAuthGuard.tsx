"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  logoutUser,
  normalizeUserRole,
  SessionError,
} from "@/src/lib/auth-api";

export type DemoRole = "student" | "teacher" | "admin";

const SESSION_KEY = "als-lms-demo-session";

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

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* Display cache only. */
  }
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
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* The server session is already revoked. */
  }
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
  const [verifiedRole, setVerifiedRole] = useState<DemoRole | null>(null);
  const [error, setError] = useState("");
  const verification = useRef(0);

  useEffect(() => {
    let active = true;

    async function verifyBackendSession() {
      const version = ++verification.current;
      setReady(false);
      setError("");
      try {
        const user = await getCurrentUser(true);

        if (!active || version !== verification.current) return;

        if (!user) {
          setVerifiedRole(null);
          try { localStorage.removeItem(SESSION_KEY); } catch { /* Display cache only. */ }
          router.replace("/login");
          return;
        }

        const backendRole = normalizeUserRole(user);

        if (backendRole !== role) {
          setVerifiedRole(null);
          router.replace(backendRole ? `/${backendRole}/dashboard` : "/login");
          return;
        }

        saveDemoSession(role, user.email || String(user.user_id));
        setVerifiedRole(role);
        setReady(true);
        setError("");
      } catch (err) {
        if (!active || version !== verification.current) return;
        setReady(false);
        if (
          err instanceof SessionError &&
          (err.status === 401 || err.status === 403)
        ) {
          setVerifiedRole(null);
          router.replace("/login");
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to check your session. Please try again.",
          );
        }
      }
    }

    verifyBackendSession();
    const onFocus = () => {
      void verifyBackendSession();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [role, router]);

  return (
    <>
      {error && (
        <div role="alert" className="p-8 text-center">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 underline">Try again</button>
        </div>
      )}
      {!ready && !error && (
        <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc]">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-r-transparent" />
            Checking your session...
          </div>
        </div>
      )}
      {/* Keep verified forms mounted during focus checks without displaying them. */}
      {verifiedRole === role && (
        <div className={ready && !error ? 'contents' : 'hidden'} inert={!ready || !!error}>
          {children}
        </div>
      )}
    </>
  );
}
