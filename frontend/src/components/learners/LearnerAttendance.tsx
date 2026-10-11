'use client';

import { useCallback } from 'react';
import AttendanceTab from '@/src/components/layout/teacher/students/AttendanceTab';
import ApiState from '@/src/components/ui/ApiState';
import { getStudentAttendance } from '@/src/lib/attendance-api';
import { useApiData } from '@/src/lib/use-api-data';

export default function LearnerAttendance({ id }: { id: string }) {
  const load = useCallback(() => getStudentAttendance(id), [id]);
  const history = useApiData(load);
  return (
    <section>
      <ApiState loading={history.loading} error={history.error} onRetry={history.reload} />
      {!history.loading && !history.error && history.data && <AttendanceTab history={history.data} />}
    </section>
  );
}
