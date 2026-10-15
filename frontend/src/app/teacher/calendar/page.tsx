'use client';

import AssessmentCalendar from '@/src/components/calendar/AssessmentCalendar';
import { loadTeacherCalendar } from '@/src/lib/assessment-calendar';
import { useApiData } from '@/src/lib/use-api-data';

export default function TeacherCalendarPage() {
  const records = useApiData(loadTeacherCalendar);
  return <AssessmentCalendar role="teacher" events={records.data?.events || []} programs={records.data?.programs || []} warning={records.data?.warning} loading={records.loading} error={records.error} onRefresh={records.reload} />;
}
