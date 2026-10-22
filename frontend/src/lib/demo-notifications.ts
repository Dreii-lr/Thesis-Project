import type { DemoRole, UserRead } from './auth-api';

export type RequestStatus = 'pending' | 'approved' | 'declined';

export interface SubmissionRequest {
  id: string;
  studentId: string;
  studentName: string;
  assessmentId: string;
  assessmentTitle: string;
  subject: string;
  reason: string;
  createdAt: string;
  status: RequestStatus;
  reviewedAt?: string;
}

export interface DemoNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  kind: 'request' | 'assessment' | 'announcement' | 'account';
  href?: string;
  request?: SubmissionRequest;
}

export interface NotificationStore {
  version: 1;
  startedAt: string;
  requests: SubmissionRequest[];
  read: Record<string, string[]>;
}

export const NOTIFICATION_PREVIEW_LIMIT = 5;
export const NOTIFICATION_STORAGE_KEY = 'als-notifications-demo-v1';

export function notificationUserId(user: UserRead | null) {
  return String(user?.user_id || user?.account_id || user?.id || user?.student_id || user?.email || 'demo-student');
}

export function createNotificationStore(now = new Date().toISOString()): NotificationStore {
  return {
    version: 1,
    startedAt: now,
    read: {},
    requests: [{
      id: 'sample-submission-request', studentId: 'sample-student', studentName: 'Alex Santos',
      assessmentId: 'sample-math-quiz', assessmentTitle: 'Fractions and Decimals Quiz', subject: 'Mathematics',
      reason: 'I was unable to finish the quiz because my internet connection stopped working. May I request another chance to submit?',
      createdAt: now, status: 'pending',
    }],
  };
}

export function parseNotificationStore(value: string): NotificationStore | null {
  try {
    const data = JSON.parse(value);
    if (data?.version !== 1 || typeof data.startedAt !== 'string' || !Number.isFinite(Date.parse(data.startedAt)) ||
      !Array.isArray(data.requests) || !data.read || typeof data.read !== 'object' || Array.isArray(data.read)) return null;
    const fields = ['id', 'studentId', 'studentName', 'assessmentId', 'assessmentTitle', 'subject', 'reason', 'createdAt'];
    if (data.requests.some((request: SubmissionRequest) => !request || fields.some(field => typeof request[field as keyof SubmissionRequest] !== 'string') ||
      !Number.isFinite(Date.parse(request.createdAt)) || !['pending', 'approved', 'declined'].includes(request.status) ||
      (request.reviewedAt !== undefined && !Number.isFinite(Date.parse(request.reviewedAt))))) return null;
    if (Object.values(data.read).some(ids => !Array.isArray(ids) || ids.some(id => typeof id !== 'string'))) return null;
    return data;
  } catch { return null; }
}

export function addSubmissionRequest(store: NotificationStore, request: SubmissionRequest): NotificationStore {
  // One request per learner and assessment keeps repeated clicks from creating duplicates.
  if (store.requests.some(item => item.studentId === request.studentId && item.assessmentId === request.assessmentId)) return store;
  return { ...store, requests: [request, ...store.requests] };
}

export function reviewSubmissionRequest(store: NotificationStore, id: string, status: 'approved' | 'declined', now = new Date().toISOString()): NotificationStore {
  return { ...store, requests: store.requests.map(request => request.id === id && request.status === 'pending'
    ? { ...request, status, reviewedAt: now } : request) };
}

export function markNotificationsRead(store: NotificationStore, owner: string, ids: string[]): NotificationStore {
  return { ...store, read: { ...store.read, [owner]: [...new Set([...(store.read[owner] || []), ...ids])] } };
}

export function getDemoNotifications(store: NotificationStore, role: DemoRole, studentId: string): DemoNotification[] {
  const minutesAgo = (minutes: number) => new Date(Date.parse(store.startedAt) - minutes * 60000).toISOString();
  const examples: Record<DemoRole, [string, string, DemoNotification['kind'], string][]> = {
    student: [
      ['A new quiz is ready', 'Your Mathematics practice quiz is ready to view in My Subjects.', 'assessment', '/student/subjects'],
      ['Keep your learning streak going', 'Make a little time today to review your learning materials.', 'announcement', '/student/modules'],
      ['Your results are available', 'Visit My Results to review your assessment scores and feedback.', 'assessment', '/student/results'],
      ['Plan your next study session', 'Check your calendar for upcoming learning activities.', 'announcement', '/student/calendar'],
      ['Try a flashcard review', 'A quick review can help you prepare for your next assessment.', 'announcement', '/student/flashcards'],
      ['Welcome to your learning space', 'Your subjects, activities, and progress are all in one place.', 'account', '/student/dashboard'],
    ],
    teacher: [
      ['Assessment submissions to review', 'Open your submissions workspace to review learner work.', 'assessment', '/teacher/submissions'],
      ['Your class calendar', 'Review your upcoming assessments and learning activities.', 'announcement', '/teacher/calendar'],
      ['Learning materials workspace', 'Manage the modules shared with your learners.', 'announcement', '/teacher/module-uploads'],
      ['Keep attendance up to date', 'Your attendance records are ready for your next class.', 'announcement', '/teacher/attendance'],
      ['Review learner progress', 'Visit your learner directory to follow their learning journey.', 'account', '/teacher/students'],
      ['Welcome to your teaching space', 'Manage your classes and learning resources from your dashboard.', 'account', '/teacher/dashboard'],
    ],
    admin: [
      ['Learner accounts overview', 'Review student accounts from your learner directory.', 'account', '/admin/students'],
      ['Teacher directory', 'Manage the teachers supporting your learning programs.', 'account', '/admin/teachers'],
      ['Learning program reminder', 'Review the subjects offered in each learning program.', 'announcement', '/admin/user-categories'],
      ['Learner mapping workspace', 'Keep learners connected to their assigned programs.', 'account', '/admin/mapping'],
      ['Attendance overview', 'Your attendance workspace is ready to view.', 'announcement', '/admin/attendance'],
      ['Welcome to your admin space', 'Keep your school community organized from your dashboard.', 'account', '/admin/dashboard'],
    ],
  };
  const notifications: DemoNotification[] = examples[role].map(([title, message, kind, href], index) => ({
    id: `${role}-sample-${index}`, title, message, kind, href, createdAt: minutesAgo((index + 1) * 45),
  }));

  for (const request of store.requests) {
    if (role === 'teacher') notifications.push({
      id: `request-${request.id}`, title: 'Request for submission',
      message: `${request.studentName} requested another chance to submit ${request.assessmentTitle}.`,
      createdAt: request.createdAt, kind: 'request', request,
    });
    if (role === 'student' && request.studentId === studentId) {
      notifications.push({
        id: `sent-${request.id}`, title: 'Your submission request was sent',
        message: request.status === 'pending' ? `Your request for ${request.assessmentTitle} is waiting for teacher review.` : `You requested another chance to submit ${request.assessmentTitle}.`,
        createdAt: request.createdAt, kind: 'request', request,
      });
      if (request.reviewedAt) notifications.push({
        id: `reviewed-${request.id}`, title: `Submission request ${request.status}`,
        message: `Your teacher ${request.status} your demo request for ${request.assessmentTitle}.`,
        createdAt: request.reviewedAt, kind: 'request', request,
      });
    }
  }
  return notifications.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
