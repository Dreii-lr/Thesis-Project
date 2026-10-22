'use client';

import { useState } from 'react';
import StudentLoading from '@/src/components/layout/student/StudentLoading';
import { CheckCheck, Inbox } from 'lucide-react';
import type { DemoRole } from '@/src/lib/auth-api';
import NotificationItem from './NotificationItem';
import SubmissionRequestButton from './SubmissionRequestButton';
import { useNotifications } from './useNotifications';

export default function NotificationsPage({ role }: { role: DemoRole }) {
  const studentView = role === 'student';
  const { ready, notifications, unreadCount, isRead, markRead, markUnread, reviewRequest } = useNotifications(role);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const filtered = notifications.filter(item => item.id === expanded || filter === 'all' || (filter === 'read' ? isRead(item.id) : !isRead(item.id)));

  return <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className={studentView ? "text-2xl font-semibold tracking-tight text-slate-900" : "text-2xl font-bold tracking-tight text-slate-900"}>Notifications</h1><p className="mt-1 text-sm text-slate-500">{role === 'teacher' ? 'Review class updates and submission requests.' : studentView ? 'View assessment updates and request responses.' : 'View account and school updates.'}</p></div>
      <button type="button" disabled={!unreadCount} onClick={() => markRead(notifications.map(item => item.id))} className={studentView ? "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-700 disabled:opacity-40" : "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-700 disabled:opacity-40"}>{!(studentView) && <CheckCheck size={15} />}Mark all as read</button>
    </div>

    <section aria-label="All notifications" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 sm:px-6">
        <div className={studentView ? "flex gap-6 sm:gap-7" : "flex gap-5 sm:gap-7"} aria-label="Filter notifications">
          {(['all', 'unread', 'read'] as const).map(value => {
            const count = value === 'all' ? notifications.length : value === 'unread' ? unreadCount : notifications.length - unreadCount;
            return <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); setExpanded(null); }} className={`flex items-center gap-2 border-b-2 py-4 text-xs font-semibold capitalize transition-colors ${filter === value ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {value}<span className={studentView ? `rounded-full px-1.5 py-0.5 text-xs tabular-nums ${filter === value ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}` : `rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${filter === value ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
            </button>;
          })}
        </div>
        <span className={studentView ? "hidden text-xs text-slate-500 sm:block" : "hidden text-[11px] text-slate-400 sm:block"}>Newest first</span>
      </div>

      <div>{filtered.map(item => <NotificationItem key={item.id} notification={item} role={role} read={isRead(item.id)} expanded={expanded === item.id} onToggle={() => { markRead([item.id]); setExpanded(expanded === item.id ? null : item.id); }} onUnread={() => { markUnread(item.id); setExpanded(null); }} onReview={reviewRequest} />)}</div>
      {!filtered.length && (!ready && studentView ? <StudentLoading label="Loading notifications..." /> : <div className="px-6 py-16 text-center">{!studentView && <span className={studentView ? "mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-500" : "mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400"}>{!(studentView) && <Inbox size={23} strokeWidth={1.5} />}</span>}<h2 className="mt-4 text-sm font-semibold text-slate-800">{!ready ? 'Loading notifications...' : filter === 'unread' ? 'You’re all caught up' : filter === 'read' ? 'No read notifications' : 'No notifications yet'}</h2><p className="mt-1.5 text-xs text-slate-500">{filter === 'read' ? 'Notifications you open will appear here.' : 'New updates will appear here.'}</p></div>)}
      <div className={studentView ? "border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-6" : "border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400 sm:px-6"}>Demo notifications · Saved in this browser</div>
    </section>

    {studentView && <details className={studentView ? "group mt-6 rounded-xl border border-slate-200 bg-white" : "group mt-5 rounded-xl border border-slate-200 bg-white"}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-medium text-slate-500 [&::-webkit-details-marker]:hidden">Submission request demo<span className="text-xs text-slate-500"><span className="group-open:hidden">Show</span><span className="hidden group-open:inline">Hide</span></span></summary>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-4 py-4"><div><p className="text-xs font-semibold text-slate-700">Reading Comprehension Quiz</p><p className={studentView ? "mt-1 text-xs text-slate-500" : "mt-1 text-[11px] text-slate-400"}>English · Not submitted · Sample assessment</p></div><SubmissionRequestButton assessmentId="demo-reading-quiz" assessmentTitle="Reading Comprehension Quiz" subject="English" /></div>
    </details>}
  </div>;
}
