'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import type { DemoRole } from '@/src/lib/auth-api';
import {
  addSubmissionRequest, createNotificationStore, getDemoNotifications, markNotificationsRead,
  notificationUserId, NOTIFICATION_STORAGE_KEY, parseNotificationStore, reviewSubmissionRequest,
  type NotificationStore, type SubmissionRequest,
} from '@/src/lib/demo-notifications';

const changeEvent = 'als-demo-notifications-change';
let memorySnapshot = '';
let storageUnavailable = false;

function getSnapshot() {
  if (!memorySnapshot) memorySnapshot = JSON.stringify(createNotificationStore());
  if (storageUnavailable) return memorySnapshot;
  try {
    const saved = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    return saved && parseNotificationStore(saved) ? saved : memorySnapshot;
  } catch { storageUnavailable = true; return memorySnapshot; }
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === NOTIFICATION_STORAGE_KEY || event.key === null) callback();
  };
  window.addEventListener(changeEvent, callback);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(changeEvent, callback);
    window.removeEventListener('storage', onStorage);
  };
}

function updateStore(update: (store: NotificationStore) => NotificationStore) {
  const store = parseNotificationStore(getSnapshot()) || createNotificationStore();
  memorySnapshot = JSON.stringify(update(store));
  try { window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, memorySnapshot); }
  catch { storageUnavailable = true; /* Continue the demonstration in memory. */ }
  window.dispatchEvent(new Event(changeEvent));
}

export function useNotifications(role: DemoRole) {
  const { user } = useAuth();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => '');
  const store = useMemo(() => parseNotificationStore(snapshot), [snapshot]);
  const studentId = notificationUserId(user);
  const owner = `${role}:${studentId}`;
  const notifications = useMemo(() => store ? getDemoNotifications(store, role, studentId) : [], [store, role, studentId]);
  const readIds = store?.read[owner] || [];

  return {
    ready: Boolean(store), notifications, requests: store?.requests || [], studentId,
    studentName: user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Student',
    unreadCount: notifications.filter(item => !readIds.includes(item.id)).length,
    isRead: (id: string) => readIds.includes(id),
    markRead: (ids: string[]) => updateStore(current => markNotificationsRead(current, owner, ids)),
    markUnread: (id: string) => updateStore(current => ({ ...current, read: { ...current.read, [owner]: (current.read[owner] || []).filter(value => value !== id) } })),
    sendRequest: (request: SubmissionRequest) => updateStore(current => addSubmissionRequest(current, request)),
    reviewRequest: (id: string, status: 'approved' | 'declined') => updateStore(current => reviewSubmissionRequest(current, id, status)),
  };
}
