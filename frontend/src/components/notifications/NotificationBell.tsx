'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Bell, CheckCheck, X } from 'lucide-react';
import type { DemoRole } from '@/src/lib/auth-api';
import { NOTIFICATION_PREVIEW_LIMIT } from '@/src/lib/demo-notifications';
import NotificationItem from './NotificationItem';
import { useNotifications } from './useNotifications';

export default function NotificationBell({ role }: { role: DemoRole }) {
  const { notifications, unreadCount, isRead, markRead, reviewRequest } = useNotifications(role);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const pathname = usePathname();
  const open = openPath === pathname;
  const preview = notifications.slice(0, NOTIFICATION_PREVIEW_LIMIT);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpenPath(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpenPath(null); button.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return <div ref={wrapper} className="relative">
    <button ref={button} type="button" onClick={() => { setOpenPath(open ? null : pathname); setExpanded(null); }} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={open} aria-controls={panelId} className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${open ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
      <Bell size={19} strokeWidth={1.8} />{unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white ring-2 ring-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <section id={panelId} aria-label="Recent notifications" onBlur={event => { if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) setOpenPath(null); }} className="fixed right-4 top-[64px] z-[80] w-[calc(100vw-2rem)] max-w-[400px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_60px_-12px_rgba(15,23,42,0.25)] sm:absolute sm:right-0 sm:top-12 sm:w-[400px]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4"><div><h2 className="text-sm font-bold text-slate-800">Notifications <span className="ml-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600">{unreadCount} unread</span></h2><p className="mt-1 text-[10px] text-slate-400">Latest {preview.length} · Demo</p></div><button type="button" onClick={() => { setOpenPath(null); button.current?.focus(); }} aria-label="Close notifications" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">{role === 'student' ? <span className="text-xs font-medium">Close</span> : <X size={15} />}</button></div>
      <div className="max-h-[min(60vh,480px)] overflow-y-auto">
        {preview.map(item => <NotificationItem key={item.id} compact role={role} notification={item} read={isRead(item.id)} expanded={expanded === item.id} onToggle={() => { markRead([item.id]); setExpanded(expanded === item.id ? null : item.id); }} onReview={reviewRequest} />)}
        {!preview.length && <p className="p-8 text-center text-xs text-slate-400">You’re all caught up.</p>}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3"><button type="button" disabled={!unreadCount} onClick={() => markRead(notifications.map(item => item.id))} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 hover:text-blue-600 disabled:opacity-40">{role !== 'student' && <CheckCheck size={13} />}Mark all read</button><Link href={`/${role}/notifications`} onClick={() => setOpenPath(null)} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800">View all{role !== 'student' && <ArrowRight size={13} />}</Link></div>
    </section>}
  </div>;
}
