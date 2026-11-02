'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RequirementRecord } from '@/src/lib/requirements';
import { mapSubmissionToRecord } from '@/src/lib/requirements';
import { getMyRequirementSubmissions, listStaffSubmissionsApi } from '@/src/lib/requirements-api';

const EVENT = 'als-requirements-updated';

// One-time silent cleanup of legacy demo IndexedDB database from browser
if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
  try {
    indexedDB.deleteDatabase('als-requirements-demo-v1');
  } catch {
    // ignore
  }
}

/**
 * Notifies all active tabs and components that requirements data has been updated in the database.
 */
export function notifyRequirementsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT));
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(EVENT);
      channel.postMessage('updated');
      channel.close();
    }
  }
}

/**
 * React hook for requirements submissions with PostgreSQL database as the single source of truth.
 * Zero client-side persistent storage (no IndexedDB, no localStorage).
 * Data is held exclusively in fast in-memory React state and stays synchronized with the backend.
 */
export function useRequirements(role: 'student' | 'teacher' | 'admin' = 'student') {
  const [records, setRecords] = useState<RequirementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const version = useRef(0);

  const reload = useCallback(async () => {
    const requestVersion = ++version.current;
    try {
      let mappedRecords: RequirementRecord[] = [];
      if (role === 'teacher' || role === 'admin') {
        const res = await listStaffSubmissionsApi({ limit: 100 });
        mappedRecords = res.submissions.map(mapSubmissionToRecord);
      } else {
        const subs = await getMyRequirementSubmissions();
        mappedRecords = subs.map(mapSubmissionToRecord);
      }

      if (requestVersion === version.current) {
        setRecords(mappedRecords.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
        setError('');
      }
    } catch (err) {
      if (requestVersion === version.current) {
        setError(err instanceof Error ? err.message : 'Requirements are unavailable.');
      }
    } finally {
      if (requestVersion === version.current) {
        setLoading(false);
      }
    }
  }, [role]);

  useEffect(() => {
    let active = true;
    const requests = version;
    void Promise.resolve().then(() => { if (active) return reload(); });
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(EVENT) : null;
    if (channel) channel.onmessage = () => void reload();
    window.addEventListener(EVENT, reload);
    window.addEventListener('focus', reload);
    return () => {
      active = false;
      requests.current++;
      channel?.close();
      window.removeEventListener(EVENT, reload);
      window.removeEventListener('focus', reload);
    };
  }, [reload]);

  return { records, loading, error, reload };
}
