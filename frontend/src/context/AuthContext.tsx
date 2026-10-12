'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCurrentUser,
  normalizeUserRole,
  type UserRead,
} from '@/src/lib/auth-api';
import {
  clearDemoSession,
  type DemoRole,
} from '@/src/components/auth/DemoAuthGuard';

export interface AuthContextType {
  user: UserRead | null;
  role: DemoRole | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<UserRead | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRead | null>(null);
  const [role, setRole] = useState<DemoRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadUser = useCallback(async (force = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const currentUser = await getCurrentUser(true, force);
      if (currentUser) {
        const resolvedRole = normalizeUserRole(currentUser);
        setUser(currentUser);
        setRole(resolvedRole);
        return currentUser;
      } else {
        setUser(null);
        setRole(null);
        return null;
      }
    } catch (err: unknown) {
      setUser(null);
      setRole(null);
      setError(err instanceof Error ? err.message : 'Session verification failed.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadUser();
    return () => {
      active = false;
    };
  }, [loadUser]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await clearDemoSession();
    } finally {
      setUser(null);
      setRole(null);
      setIsLoading(false);
      router.replace('/login');
      router.refresh();
    }
  }, [router]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      role,
      isLoading,
      error,
      refreshUser: () => loadUser(true),
      logout,
    }),
    [user, role, isLoading, error, loadUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useOptionalAuth(): AuthContextType | null {
  return useContext(AuthContext);
}
