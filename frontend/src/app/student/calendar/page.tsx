'use client';

import { useCallback } from 'react';
import AssessmentCalendar from '@/src/components/calendar/AssessmentCalendar';
import { useAuth } from '@/src/context/AuthContext';
import { useStudentSubjects } from '@/src/context/StudentSubjectsContext';
import { CATEGORY_LABELS, listStudentTasks, type TargetCategory } from '@/src/lib/assessments-api';
import { studentCalendarEvents } from '@/src/lib/assessment-calendar';
import { useApiData } from '@/src/lib/use-api-data';

export default function StudentCalendarPage() {
  const { user } = useAuth();
  const { subjects, program } = useStudentSubjects();
  const load = useCallback(() => listStudentTasks(user), [user]);
  const records = useApiData(load);
  const code = typeof user?.user_category === 'string' ? user.user_category : '';
  const events = studentCalendarEvents(records.data || [], subjects, code, program?.name || CATEGORY_LABELS[code as TargetCategory] || code);
  return <AssessmentCalendar role="student" events={events} loading={records.loading} error={records.error} onRefresh={records.reload} />;
}
