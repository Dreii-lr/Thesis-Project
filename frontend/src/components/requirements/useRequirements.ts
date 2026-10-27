'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RequirementRecord } from '@/src/lib/requirements';

const EVENT = 'als-requirements-demo-updated';
const DATABASE = 'als-requirements-demo-v1';

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('records', { keyPath: 'id' });
      request.result.createObjectStore('files');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Browser storage is unavailable. Enable site storage and try again.'));
    request.onblocked = () => reject(new Error('Close older requirements tabs and try again.'));
  });
}

function announce() {
  window.dispatchEvent(new Event(EVENT));
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(EVENT);
    channel.postMessage('updated');
    channel.close();
  }
}

export async function saveRequirement(record: RequirementRecord, file?: File, expectedUpdatedAt?: string | null): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['records', 'files'], 'readwrite');
      const records = transaction.objectStore('records');
      let conflict = false;
      const current = records.get(record.id);
      current.onsuccess = () => {
        if (expectedUpdatedAt !== undefined && (current.result?.updatedAt || null) !== expectedUpdatedAt) {
          conflict = true;
          transaction.abort();
          return;
        }
        records.put(record);
        if (file) transaction.objectStore('files').put(file, record.versions[0].id);
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () => reject(new Error(conflict ? 'This submission changed in another tab. Close this dialog and refresh before trying again.' : 'Your submission could not be saved. Browser storage may be full.'));
    });
  } finally { db.close(); }
  announce();
}

export async function requirementFile(versionId: string): Promise<Blob | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('files').objectStore('files').get(versionId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('The saved file could not be opened.'));
    });
  } finally { db.close(); }
}

export async function clearSampleRequirements(records: RequirementRecord[]) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['records', 'files'], 'readwrite');
      records.filter(record => record.sample).forEach(record => {
        transaction.objectStore('records').delete(record.id);
        record.versions.forEach(version => transaction.objectStore('files').delete(version.id));
      });
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () => reject(new Error('Sample records could not be removed.'));
    });
  } finally { db.close(); }
  announce();
}

export function useRequirements() {
  const [records, setRecords] = useState<RequirementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const version = useRef(0);
  const reload = useCallback(async () => {
    const requestVersion = ++version.current;
    try {
      const db = await database();
      const result = await new Promise<RequirementRecord[]>((resolve, reject) => {
        const request = db.transaction('records').objectStore('records').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error('Saved requirements could not be loaded.'));
      }).finally(() => db.close());
      if (requestVersion === version.current) { setRecords(result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))); setError(''); }
    } catch (err) { if (requestVersion === version.current) setError(err instanceof Error ? err.message : 'Requirements are unavailable.'); }
    finally { if (requestVersion === version.current) setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    const requests = version;
    void Promise.resolve().then(() => { if (active) return reload(); });
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(EVENT) : null;
    if (channel) channel.onmessage = () => void reload();
    window.addEventListener(EVENT, reload);
    window.addEventListener('focus', reload);
    return () => { active = false; requests.current++; channel?.close(); window.removeEventListener(EVENT, reload); window.removeEventListener('focus', reload); };
  }, [reload]);
  return { records, loading, error, reload };
}
