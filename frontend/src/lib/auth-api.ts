import type { DemoRole } from '@/src/components/auth/DemoAuthGuard';

// Keep session cookies on the frontend origin; Next.js proxies to BACKEND_URL.
export const API_BASE_URL = '/api/v1';

export interface UserRead {
  id?: string | number;
  user_id?: string;
  email: string;
  role?: string;
  user_type?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  [key: string]: unknown;
}

export function normalizeUserRole(user: UserRead): DemoRole | null {
  const rawRole = String(user.role || user.user_type || '').toLowerCase();
  if (rawRole === 'teacher') {
    return 'teacher';
  }
  if (rawRole === 'student') {
    return 'student';
  }
  return null;
}

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    const message = [body?.message, body?.detail, body?.error?.message]
      .find((value) => typeof value === 'string' && value.length > 0);
    return message || fallback;
  } catch {
    return fallback;
  }
}

export async function loginAndFetchUser(
  identity: string,
  password: string,
  expectedRole: DemoRole
): Promise<UserRead> {
  return mutateSession(async () => {
    const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({
        email: identity.trim(),
        password,
        role: expectedRole,
      }),
    });

    if (!loginRes.ok) {
      const msg = await extractErrorMessage(loginRes, 'Invalid email/ID or password.');
      throw new Error(msg);
    }

    sessionVersion += 1;
    sessionEnded = false;
    // A newly issued session must work without refreshing it immediately.
    const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: 'include', cache: 'no-store',
    });
    if (!meRes.ok) {
      throw new SessionError(await extractErrorMessage(meRes,
        'Your session could not be verified. Please allow cookies for this site and try again.'), meRes.status);
    }
    const user: UserRead = await meRes.json();

    const actualRole = normalizeUserRole(user);
    if (!actualRole || actualRole !== expectedRole) {
      // The backend checks the selected role before issuing session cookies.
      // Never revoke every session as a side effect of selecting the wrong portal.
      throw new Error(actualRole
        ? `This account is registered as a ${actualRole}, not a ${expectedRole}.`
        : 'This account does not have access to the teacher or student portal.');
    }

    return user;
  });
}

export class SessionError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'SessionError';
  }
}

let refreshInFlight: Promise<Response> | null = null;
let logoutInFlight: Promise<void> | null = null;
let sessionQueue: Promise<unknown> = Promise.resolve();
let sessionVersion = 0;
let sessionEnded = false;

function mutateSession<T>(action: () => Promise<T>): Promise<T> {
  const result = sessionQueue.then(async (): Promise<T> => {
    // Same-origin tabs share HttpOnly cookies, so coordinate their writes too.
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return await navigator.locks.request('als-auth-session', action);
    }
    return action();
  });
  sessionQueue = result.catch(() => undefined);
  return result;
}

function requireOpenSession() {
  if (sessionEnded) throw new SessionError('Please sign in to continue.', 401);
}

async function refreshSession(requestVersion: number): Promise<Response> {
  // Parallel profile/guard checks must share one refresh request.
  if (!refreshInFlight) {
    refreshInFlight = mutateSession(async () => {
      requireOpenSession();
      // A delayed 401 may belong to cookies already replaced by another request.
      if (requestVersion !== sessionVersion) return new Response(null, { status: 204 });
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST', credentials: 'include', cache: 'no-store',
      });
      if (response.ok) sessionVersion += 1;
      return response;
    }).finally(() => { refreshInFlight = null; });
  }
  return (await refreshInFlight).clone();
}

export async function authenticatedFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  await sessionQueue;
  requireOpenSession();
  const requestVersion = sessionVersion;
  const request = () => fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    cache: 'no-store',
  });
  const response = await request();
  if (response.status !== 401) return response;

  await sessionQueue;
  requireOpenSession();
  if (requestVersion !== sessionVersion) return request();
  const error = await response.clone().json().catch(() => ({}));
  // Revoked/disabled/invalid credentials need sign-in, not another token refresh.
  if (error?.error_code && !['TOKEN_EXPIRED', 'TOKEN_MISSING', 'UNAUTHORIZED'].includes(error.error_code)) {
    return response;
  }
  const refreshed = await refreshSession(requestVersion);
  if (!refreshed.ok) {
    throw new SessionError(
      await extractErrorMessage(refreshed, 'Your session has expired. Please sign in again.'),
      refreshed.status
    );
  }
  // Retry only once: an invalid session must never cause a refresh loop.
  requireOpenSession();
  return request();
}

export async function getCurrentUser(reportErrors = false): Promise<UserRead | null> {
  try {
    const meRes = await authenticatedFetch('/auth/me');

    if (!meRes.ok) {
      if (reportErrors) {
        throw new SessionError(await extractErrorMessage(meRes, 'Unable to verify your account. Please try again.'), meRes.status);
      }
      return null;
    }
    return await meRes.json();
  } catch (error) {
    if (reportErrors) {
      if (error instanceof TypeError) {
        throw new Error('Unable to reach the server. Please check your connection and try again.');
      }
      throw error;
    }
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  if (logoutInFlight) return logoutInFlight;
  const previouslyEnded = sessionEnded;
  sessionEnded = true;
  logoutInFlight = mutateSession(async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Sign out failed. Please try again.'));
    }
    sessionVersion += 1;
    sessionEnded = true;
  }).catch((error) => {
    sessionEnded = previouslyEnded;
    throw error;
  }).finally(() => { logoutInFlight = null; });
  return logoutInFlight;
}

export async function requestAccountRecovery(identity: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: identity.trim() }),
    });
  } catch {
    // Gracefully resolve if backend /auth/recover endpoint is not implemented yet
  }
}
