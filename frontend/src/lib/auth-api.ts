export type DemoRole = 'student' | 'teacher' | 'admin';
export type UserRole = DemoRole;

// Keep session cookies on the frontend origin; Next.js proxies to BACKEND_URL.
export const API_BASE_URL = '/api/v1';

export interface ProfileUrl {
  public_id?: string | null;
  public_url?: string | null;
}

export interface UserRead {
  id?: string | number;
  user_id?: string;
  account_id?: string;
  student_id?: string;
  teacher_id?: string;
  email: string;
  role?: string;
  user_type?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  profile_url?: ProfileUrl | null;
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
  if (rawRole === 'admin') {
    return 'admin';
  }
  return null;
}

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (Array.isArray(body?.detail)) {
      const messages = body.detail
        .filter((item: { msg?: unknown }) => typeof item?.msg === 'string')
        .map((item: { loc?: unknown[]; msg: string }) => {
          const field = item.loc?.slice(1).join('.');
          return field ? `${field}: ${item.msg}` : item.msg;
        });
      if (messages.length) return messages.join('; ');
    }
    const message = [body?.message, body?.detail, body?.error?.message]
      .find((value) => typeof value === 'string' && value.length > 0);
    return message || fallback;
  } catch {
    return fallback;
  }
}

export async function loginAndFetchUser(
  identity: string,
  password: string
): Promise<UserRead> {
  return mutateSession(async () => {
    const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({
        account_id: identity.trim(),
        password,
      }),
    });

    if (!loginRes.ok) {
      const msg = await extractErrorMessage(loginRes,
        loginRes.status === 401 ? 'Invalid email/ID or password.' : 'Unable to sign in. Please try again.');
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
    cachedCurrentUser = user;
    cachedUserTimestamp = Date.now();

    const actualRole = normalizeUserRole(user);
    if (!actualRole) {
      throw new Error('This account does not have access to the admin, teacher, or student portal.');
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

let cachedCurrentUser: UserRead | null = null;
let cachedUserTimestamp = 0;
let currentUserInFlight: Promise<UserRead | null> | null = null;
const USER_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function clearCurrentUserCache(): void {
  cachedCurrentUser = null;
  cachedUserTimestamp = 0;
  currentUserInFlight = null;
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
    clearCurrentUserCache();
    throw new SessionError(
      await extractErrorMessage(refreshed, 'Your session has expired. Please sign in again.'),
      refreshed.status
    );
  }
  // Retry only once: an invalid session must never cause a refresh loop.
  requireOpenSession();
  return request();
}

export async function getCurrentUser(
  reportErrors = false,
  forceRefresh = false
): Promise<UserRead | null> {
  if (!forceRefresh && cachedCurrentUser && Date.now() - cachedUserTimestamp < USER_CACHE_TTL_MS) {
    return cachedCurrentUser;
  }

  if (currentUserInFlight && !forceRefresh) {
    return currentUserInFlight;
  }

  const fetchPromise = (async () => {
    try {
      const meRes = await authenticatedFetch('/auth/me');

      if (!meRes.ok) {
        clearCurrentUserCache();
        if (reportErrors) {
          throw new SessionError(
            await extractErrorMessage(meRes, 'Unable to verify your account. Please try again.'),
            meRes.status
          );
        }
        return null;
      }
      const user: UserRead = await meRes.json();
      cachedCurrentUser = user;
      cachedUserTimestamp = Date.now();
      return user;
    } catch (error) {
      clearCurrentUserCache();
      if (reportErrors) {
        if (error instanceof TypeError) {
          throw new Error('Unable to reach the server. Please check your connection and try again.');
        }
        throw error;
      }
      return null;
    } finally {
      currentUserInFlight = null;
    }
  })();

  currentUserInFlight = fetchPromise;
  return fetchPromise;
}

export async function logoutUser(): Promise<void> {
  clearCurrentUserCache();
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
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ email: identity.trim() }),
    });
  } catch {
    throw new Error('Unable to reach the server. Please check your connection and try again.');
  }
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response,
      'Unable to send the recovery email. Please try again later.'));
  }
}

export async function authenticatedRequest<T>(
  path: string,
  options: RequestInit = {},
  expectResources = true
): Promise<T> {
  const response = await authenticatedFetch(path, options);
  if (!response.ok) {
    throw new SessionError(
      await extractErrorMessage(response, 'Unable to load or save data. Please try again.'),
      response.status
    );
  }

  const body = await response.json();
  if (!expectResources) return undefined as T;
  const data = body?.data;
  if (!data || typeof data !== 'object' || !('resources' in data)) {
    throw new Error('Unexpected server response. Please try again.');
  }
  return data.resources as T;
}

export async function uploadProfilePictureApi(file: File, userId?: string): Promise<UserRead> {
  const formData = new FormData();
  formData.append('file', file);

  const path = userId
    ? `/users/${encodeURIComponent(userId)}/profile-picture`
    : '/users/profile-picture';

  const response = await authenticatedFetch(path, {
    method: 'PATCH',
    body: formData,
  });

  if (!response.ok) {
    throw new SessionError(
      await extractErrorMessage(response, 'Unable to upload profile picture. Please try again.'),
      response.status
    );
  }

  const body = await response.json();
  clearCurrentUserCache();
  return body?.data?.resources as UserRead;
}

export async function deleteProfilePictureApi(userId?: string): Promise<UserRead> {
  const path = userId
    ? `/users/${encodeURIComponent(userId)}/profile-picture`
    : '/users/profile-picture';

  const response = await authenticatedFetch(path, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new SessionError(
      await extractErrorMessage(response, 'Unable to remove profile picture. Please try again.'),
      response.status
    );
  }

  const body = await response.json();
  clearCurrentUserCache();
  return body?.data?.resources as UserRead;
}

