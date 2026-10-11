"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/src/lib/auth-api";
import {
  AuthProvider,
  useOptionalAuth,
  type AuthContextType,
} from "@/src/context/AuthContext";

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

function GuardContent({
  role,
  auth,
  children,
}: {
  role: DemoRole;
  auth: AuthContextType;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, role: userRole, isLoading, error } = auth;

  useEffect(() => {
    if (isLoading) return;

    if (!user || error) {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch {
        /* Display cache only. */
      }
      router.replace("/login");
      return;
    }

    if (userRole !== role) {
      router.replace(userRole ? `/${userRole}/dashboard` : "/login");
    }
  }, [isLoading, user, userRole, error, role, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-r-transparent" />
          Checking your session...
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div role="alert" className="p-8 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-blue-600 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (userRole !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-r-transparent" />
          Redirecting to your portal...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function DemoAuthGuard({
  role,
  children,
}: {
  role: DemoRole;
  children: React.ReactNode;
}) {
  const auth = useOptionalAuth();

  if (auth) {
    return (
      <GuardContent role={role} auth={auth}>
        {children}
      </GuardContent>
    );
  }

  return (
    <AuthProvider>
      <DemoAuthGuard role={role}>{children}</DemoAuthGuard>
    </AuthProvider>
  );
}
