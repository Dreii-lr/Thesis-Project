'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EnrollmentApplication } from '@/src/lib/enrollment';

const DATABASE = 'als-enrollment-preview-v1';
const EVENT = 'als-enrollment-updated';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('applications', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Application storage is unavailable. Enable browser storage and try again.'));
    request.onblocked = () => reject(new Error('Close older enrollment tabs and try again.'));
  });
}
function announce() {
  window.dispatchEvent(new Event(EVENT));
  if (typeof BroadcastChannel !== 'undefined') { const channel = new BroadcastChannel(EVENT); channel.postMessage('updated'); channel.close(); }
}
export async function getApplications(): Promise<EnrollmentApplication[]> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('applications').objectStore('applications').getAll();
      request.onsuccess = () => resolve(request.result.sort((a: EnrollmentApplication, b: EnrollmentApplication) => b.updatedAt.localeCompare(a.updatedAt)));
      request.onerror = () => reject(new Error('Applications could not be loaded.'));
    });
  } finally { db.close(); }
}
export async function saveApplication(application: EnrollmentApplication): Promise<EnrollmentApplication> {
  const db = await openDatabase();
  const saved = { ...application, revision: application.revision + 1, updatedAt: new Date().toISOString() };
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('applications', 'readwrite');
      const store = transaction.objectStore('applications');
      let conflict = false;
      const request = store.get(application.id);
      request.onsuccess = () => {
        if ((request.result?.revision || 0) !== application.revision) { conflict = true; transaction.abort(); return; }
        store.put(saved);
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () => reject(new Error(conflict ? 'This application changed in another tab. Reload it before saving again.' : 'The application could not be saved. Browser storage may be full.'));
    });
  } finally { db.close(); }
  announce();
  return saved;
}
export async function deleteDraft(application: EnrollmentApplication) {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('applications', 'readwrite');
      const store = transaction.objectStore('applications');
      const request = store.get(application.id);
      let invalid = false;
      request.onsuccess = () => {
        if (!request.result || request.result.status !== 'DRAFT' || request.result.revision !== application.revision) { invalid = true; transaction.abort(); return; }
        store.delete(application.id);
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () => reject(new Error(invalid ? 'Only the current saved draft can be removed. Refresh the list.' : 'The draft could not be removed.'));
    });
  } finally { db.close(); }
  announce();
}
export function useEnrollment() {
  const [applications, setApplications] = useState<EnrollmentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const version = useRef(0);
  const reload = useCallback(async () => {
    const request = ++version.current;
    try { const result = await getApplications(); if (request === version.current) { setApplications(result); setError(''); } }
    catch (err) { if (request === version.current) setError(err instanceof Error ? err.message : 'Applications are unavailable.'); }
    finally { if (request === version.current) setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    const requests = version;
    void Promise.resolve().then(() => { if (active) return reload(); });
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(EVENT) : null;
    if (channel) channel.onmessage = () => void reload();
    window.addEventListener(EVENT, reload); window.addEventListener('focus', reload);
    return () => { active = false; requests.current++; channel?.close(); window.removeEventListener(EVENT, reload); window.removeEventListener('focus', reload); };
  }, [reload]);
  return { applications, loading, error, reload };
}
