export function datePart(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function timePart(value: Date) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function nextMinute(now: Date) {
  return new Date(Math.ceil(now.getTime() / 60000) * 60000);
}

export function assessmentEnd(date: string, time: string, duration: number | '') {
  if (!date || !time || !Number.isInteger(duration) || Number(duration) < 1) return null;
  const start = new Date(`${date}T${time}`);
  if (!Number.isFinite(start.getTime())) return null;
  return new Date(start.getTime() + Number(duration) * 60000);
}

export function validateAssessmentSchedule(date: string, time: string, duration: number | '', grace: number, now = new Date()) {
  if (!date || !time) return 'Choose an assessment date and start time.';
  const start = new Date(`${date}T${time}`);
  if (!Number.isFinite(start.getTime())) return 'Choose a valid assessment date and start time.';
  if (date < datePart(now)) return 'The assessment date cannot be in the past.';
  if (start.getTime() < now.getTime()) return 'The start time cannot be in the past. Choose a later time.';
  if (!Number.isInteger(duration) || Number(duration) < 1) return 'Duration must be a positive number of minutes.';
  if (!Number.isInteger(grace) || grace < 0 || grace > 180) return 'The start grace period must be between 0 and 180 whole minutes.';
  if (grace >= Number(duration)) return 'The start grace period must be shorter than the duration.';
  const end = assessmentEnd(date, time, duration);
  if (!end || datePart(end) !== date) return 'The assessment must finish on the selected day. Choose an earlier start time or a shorter duration.';
  return null;
}

export interface AssessmentSchedule {
  start_date: string | null;
  end_date: string | null;
  duration_minutes: number | null;
  grace_period_minutes: number;
}

export function scheduledEnd(task: AssessmentSchedule) {
  const start = task.start_date ? Date.parse(task.start_date) : NaN;
  const end = task.end_date ? Date.parse(task.end_date) : NaN;
  const durationEnd = Number.isFinite(start) && task.duration_minutes && task.duration_minutes > 0
    ? start + task.duration_minutes * 60000 : NaN;
  if (Number.isFinite(end) && Number.isFinite(durationEnd)) return Math.min(end, durationEnd);
  return Number.isFinite(end) ? end : durationEnd;
}

export function assessmentStartMessage(task: AssessmentSchedule, now = Date.now()) {
  const start = task.start_date ? Date.parse(task.start_date) : NaN;
  const end = scheduledEnd(task);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 'This assessment has no valid schedule.';
  if (now < start) return 'This assessment has not started yet.';
  if (now >= end) return 'This assessment has ended.';
  if (now > start + Math.max(0, task.grace_period_minutes) * 60000) return 'The grace period to start has ended.';
  return null;
}

export function attemptDeadline(task: AssessmentSchedule, startedAt: string) {
  const started = Date.parse(startedAt);
  const end = scheduledEnd(task);
  const durationEnd = task.duration_minutes && task.duration_minutes > 0 ? started + task.duration_minutes * 60000 : end;
  return Math.min(end, durationEnd);
}

export function remainingSeconds(deadline: number, now = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function assessmentDisplayStatus(task: AssessmentSchedule & { status: string; assessment_type: string }, now = Date.now()) {
  if (task.assessment_type === 'ACTIVITY' || task.status === 'DRAFT' || task.status === 'COMPLETED') return task.status;
  if (task.start_date && now < Date.parse(task.start_date)) return 'SCHEDULED';
  if (now >= scheduledEnd(task)) return 'COMPLETED';
  return 'ACTIVE';
}
