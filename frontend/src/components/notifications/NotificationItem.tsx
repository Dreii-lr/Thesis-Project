'use client';

import Link from 'next/link';
import { useId } from 'react';
import { ArrowUpRight, Bell, BookOpen, Check, CheckCircle2, ChevronDown, Clock3, Send, UserRound, X, XCircle } from 'lucide-react';
import type { DemoRole } from '@/src/lib/auth-api';
import type { DemoNotification } from '@/src/lib/demo-notifications';

export default function NotificationItem({ notification, role, read, expanded, onToggle, onUnread, onReview, compact = false }: {
  notification: DemoNotification; role: DemoRole; read: boolean; expanded: boolean;
  onToggle: () => void; onUnread?: () => void;
  onReview: (id: string, status: 'approved' | 'declined') => void; compact?: boolean;
}) {
  const studentView = role === 'student';
  const request = notification.request;
  const Icon = notification.kind === 'request' ? Send : notification.kind === 'assessment' ? BookOpen : notification.kind === 'account' ? UserRound : Bell;
  const detailId = useId();
  const StatusIcon = request?.status === 'approved' ? CheckCircle2 : request?.status === 'declined' ? XCircle : Clock3;

  return <article className={`overflow-hidden border-b border-slate-100 transition-colors last:border-0 ${read ? 'bg-white' : 'bg-blue-50/30'}`}>
    <button type="button" aria-expanded={expanded} aria-controls={detailId} onClick={onToggle} className={studentView ? `flex w-full items-start gap-3 text-left transition-colors hover:bg-slate-50 ${compact ? 'px-4 py-3.5' : 'px-4 py-6 sm:px-6'}` : `flex w-full items-start gap-3 text-left transition-colors hover:bg-slate-50 ${compact ? 'px-4 py-3.5' : 'px-4 py-5 sm:px-6'}`}>
      {!studentView && <span className={studentView ? `flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${read ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}` : `flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${read ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>{!(studentView) && <Icon size={16} strokeWidth={1.7} />}</span>}
      <span className={`flex min-w-0 flex-1 gap-x-4 gap-y-1 ${compact ? 'flex-col' : 'flex-col sm:flex-row sm:justify-between'}`}>
        <span className="min-w-0"><span className="flex items-center gap-2"><span className={studentView ? `${compact ? 'text-xs' : 'text-sm'} leading-5 ${read ? 'font-medium text-slate-600' : 'font-semibold text-slate-900'}` : `${compact ? 'text-xs' : 'text-[13px]'} leading-5 ${read ? 'font-medium text-slate-600' : 'font-semibold text-slate-900'}`}>{notification.title}</span>{!read && <span aria-label="Unread" className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />}</span><span className={`mt-0.5 block text-xs leading-5 text-slate-500 ${compact ? 'line-clamp-2' : 'line-clamp-2 sm:line-clamp-1'}`}>{notification.message}</span></span>
        <time dateTime={notification.createdAt} className={studentView ? "shrink-0 text-xs leading-5 text-slate-500" : "shrink-0 text-[10px] leading-5 text-slate-400"}>{new Date(notification.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>
      </span>
      {studentView ? <span className="shrink-0 text-xs font-medium text-slate-500">{expanded ? 'Hide' : 'View'}</span> : <ChevronDown size={13} className={`mt-1 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />}
    </button>
    {expanded && <div id={detailId} className={studentView ? `border-t border-slate-100 ${compact ? 'p-4' : 'px-4 pb-6 pt-4 sm:px-6'}` : `border-t border-slate-100 ${compact ? 'p-4' : 'px-4 pb-5 pt-4 sm:px-5'}`}>
      {request ? <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className={studentView ? "text-xs font-semibold uppercase tracking-wide text-slate-500" : "text-[10px] font-semibold uppercase tracking-wide text-slate-400"}>Submission request · Demo</span><span className={studentView ? `inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${request.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : request.status === 'declined' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}` : `inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${request.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : request.status === 'declined' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{!studentView && <StatusIcon size={11} />}{request.status === 'pending' ? 'Pending review' : request.status === 'approved' ? 'Approved' : 'Declined'}</span></div>
        <div><h3 className={studentView ? "text-xs font-semibold text-slate-800" : "text-xs font-bold text-slate-800"}>{request.assessmentTitle}</h3><p className={studentView ? "mt-1 text-xs text-slate-500" : "mt-1 text-[11px] text-slate-500"}>{request.subject} · {request.studentName}</p></div>
        <p className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-3 text-xs leading-6 text-slate-600">{request.reason}</p>
        {role === 'teacher' && request.status === 'pending' && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => onReview(request.id, 'approved')} className={studentView ? "inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700" : "inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-blue-700"}>{!(studentView) && <Check size={13} />}Approve request</button><button type="button" onClick={() => onReview(request.id, 'declined')} className={studentView ? "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700" : "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"}>{!(studentView) && <X size={13} />}Decline</button></div>}
        <p role="status" className={studentView ? "text-xs leading-5 text-slate-500" : "text-[10px] leading-5 text-slate-400"}>{request.status === 'pending' ? 'Demo request only.' : 'Demo decision saved. Assessment access is unchanged.'}</p>
      </div> : <div><p className="text-xs leading-6 text-slate-500">{notification.message}</p>{notification.href && <Link href={notification.href} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800">Open workspace{!(studentView) && <ArrowUpRight size={13} />}</Link>}</div>}
      {onUnread && read && <button type="button" onClick={onUnread} className={studentView ? "mt-3 text-xs font-semibold text-blue-600 hover:underline" : "mt-3 text-[11px] font-semibold text-blue-600 hover:underline"}>Mark as unread</button>}
    </div>}
  </article>;
}
