import { DEFAULT_REQUIREMENTS, STANDARD_MAX_FILE_SIZE_MB, STANDARD_ALLOWED_EXTENSIONS, type RequirementItem, type StudentRequirementSubmission } from './requirements-api';
import { DOCS_MS_URL } from './document-processor-api';

export type RequirementId =
  | 'rpl'
  | 'af1'
  | 'af2'
  | 'flt'
  | 'psa_police_clearance'
  | 'proof_of_education'
  | 'birth'
  | 'school'
  | 'identity'
  | (string & {});
export type RequirementStatus = 'auto_verified' | 'review' | 'correction' | 'verified' | 'exempted';
export type DemoScenario = 'pass' | 'review' | 'correction';
export type ReviewerRole = 'teacher' | 'admin';

export { DEFAULT_REQUIREMENTS, STANDARD_MAX_FILE_SIZE_MB, STANDARD_ALLOWED_EXTENSIONS, type RequirementItem };
export const REQUIREMENTS: RequirementItem[] = DEFAULT_REQUIREMENTS;

export const STATUS_LABELS: Record<RequirementStatus, string> = {
  auto_verified: 'Verified', review: 'Under review', correction: 'Correction needed', verified: 'Verified by admin', exempted: 'Exempted by admin',
};

export interface RequirementEvent { id: string; at: string; actor: string; message: string }
export interface RequirementVersion {
  id: string; at: string; type: string; fileName: string; fileSize: number; mime: string;
  status: RequirementStatus; note: string; scenario?: DemoScenario | 'assistance' | 'submission';
  fileUrl?: string;
}
export interface RequirementRecord {
  id: string; ownerId: string; learnerName: string; email: string; program: string;
  requirementId: RequirementId; status: RequirementStatus; note: string;
  updatedAt: string; versions: RequirementVersion[]; events: RequirementEvent[]; sample?: boolean;
  accountId?: string;
}

export type OverallLearnerStatus = 'complete' | 'review' | 'correction' | 'missing';

export interface LearnerRequirementSummary {
  studentId: string;
  studentName: string;
  accountId: string;
  program: string;
  submissions: Record<string, RequirementRecord>;
  satisfiedCount: number;
  totalRequired: number;
  overallStatus: OverallLearnerStatus;
  waitingCount: number;
  actionCount: number;
  latestUpdate: string;
}

export const STANDARD_ALS_PROGRAMS = [
  { id: 'BLP', label: 'Basic Literacy Program (BLP)', shortLabel: 'BLP' },
  { id: 'ELEMENTARY', label: 'Elementary (ALS Elementary)', shortLabel: 'Elementary' },
  { id: 'SECONDARY', label: 'Secondary (Junior High School)', shortLabel: 'Secondary' },
] as const;

export function groupSubmissionsByLearner(
  records: RequirementRecord[],
  catalog: RequirementItem[],
  enrolledStudents: Array<{ id: string; name: string; program: string; accountId?: string }> = []
): LearnerRequirementSummary[] {
  const learnersMap = new Map<string, LearnerRequirementSummary>();

  for (const student of enrolledStudents) {
    const studentId = student.id;
    if (!learnersMap.has(studentId)) {
      learnersMap.set(studentId, {
        studentId,
        studentName: student.name,
        accountId: student.accountId || '',
        program: student.program ? student.program.toUpperCase() : 'SECONDARY',
        submissions: {},
        satisfiedCount: 0,
        totalRequired: catalog.length,
        overallStatus: 'missing',
        waitingCount: 0,
        actionCount: 0,
        latestUpdate: '',
      });
    }
  }

  for (const record of records) {
    const studentId = record.ownerId;
    let learner = learnersMap.get(studentId);
    if (!learner) {
      learner = {
        studentId,
        studentName: record.learnerName || 'Learner',
        accountId: record.accountId || '',
        program: record.program ? record.program.toUpperCase() : 'SECONDARY',
        submissions: {},
        satisfiedCount: 0,
        totalRequired: catalog.length,
        overallStatus: 'missing',
        waitingCount: 0,
        actionCount: 0,
        latestUpdate: record.updatedAt || '',
      };
      learnersMap.set(studentId, learner);
    } else {
      if (!learner.studentName || learner.studentName === 'Learner') {
        learner.studentName = record.learnerName || learner.studentName;
      }
      if (!learner.accountId && record.accountId) {
        learner.accountId = record.accountId;
      }
      if (record.program) {
        learner.program = record.program.toUpperCase();
      }
    }

    const reqKey = record.requirementId.toLowerCase();
    learner.submissions[reqKey] = record;
    if (record.updatedAt && (!learner.latestUpdate || record.updatedAt > learner.latestUpdate)) {
      learner.latestUpdate = record.updatedAt;
    }
  }

  const summaries: LearnerRequirementSummary[] = [];

  for (const learner of learnersMap.values()) {
    let satisfiedCount = 0;
    let waitingCount = 0;
    let correctionCount = 0;

    for (const item of catalog) {
      const code = (item.id || item.code || '').toLowerCase();
      const submission = learner.submissions[code];
      if (submission) {
        if (isSatisfied(submission.status)) {
          satisfiedCount++;
        } else if (submission.status === 'review') {
          waitingCount++;
        } else if (submission.status === 'correction') {
          correctionCount++;
        }
      }
    }

    learner.satisfiedCount = satisfiedCount;
    learner.totalRequired = catalog.length || 1;
    learner.waitingCount = waitingCount;
    learner.actionCount = correctionCount + (catalog.length - satisfiedCount - waitingCount - correctionCount);

    if (catalog.length > 0 && satisfiedCount >= catalog.length) {
      learner.overallStatus = 'complete';
    } else if (waitingCount > 0) {
      learner.overallStatus = 'review';
    } else if (correctionCount > 0) {
      learner.overallStatus = 'correction';
    } else {
      learner.overallStatus = 'missing';
    }

    summaries.push(learner);
  }

  return summaries.sort((a, b) => {
    if (a.waitingCount > 0 && b.waitingCount === 0) return -1;
    if (b.waitingCount > 0 && a.waitingCount === 0) return 1;
    return a.studentName.localeCompare(b.studentName);
  });
}

export function isSatisfied(status?: RequirementStatus) {
  return status === 'auto_verified' || status === 'verified' || status === 'exempted';
}

export function createStudentSubmission(type: string, remarks?: string): { status: RequirementStatus; note: string } {
  if (type === 'Alternative proof for staff review') {
    return { status: 'review', note: remarks?.trim() ? `Alternative proof submitted: ${remarks.trim()}` : 'Alternative school evidence submitted for teacher/admin review.' };
  }
  const note = remarks?.trim()
    ? `Submitted for review: ${remarks.trim()}`
    : 'Document submitted by learner. Awaiting teacher verification.';
  return { status: 'review', note };
}

export function simulationResult(scenario: DemoScenario, type: string): { status: RequirementStatus; note: string } {
  if (type === 'Alternative proof for staff review') return { status: 'review', note: 'Alternative school evidence needs a staff decision.' };
  if (scenario === 'pass') return { status: 'auto_verified', note: 'Checks passed: accepted document type, readable required fields, and matching learner information.' };
  if (scenario === 'review') return { status: 'review', note: 'Submitted for staff check: the document and learner details need teacher confirmation.' };
  return { status: 'correction', note: 'The document is incomplete or unreadable. Please upload a clear, complete replacement.' };
}

export function validateRequirementFile(file: Pick<File, 'name' | 'size' | 'type'>, maxMb = STANDARD_MAX_FILE_SIZE_MB, allowedExts = STANDARD_ALLOWED_EXTENSIONS): string | null {
  const allowedMap: Record<string, string[]> = {
    pdf: ['application/pdf'],
    jpg: ['image/jpeg'],
    jpeg: ['image/jpeg'],
    png: ['image/png'],
    webp: ['image/webp'],
  };
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (allowedExts && allowedExts.length > 0) {
    const cleanExts = allowedExts.map(e => e.toLowerCase().replace(/^\./, ''));
    if (!cleanExts.includes(extension)) {
      return `Allowed file formats: ${cleanExts.join(', ').toUpperCase()}`;
    }
  } else if (!allowedMap[extension] || (file.type && !allowedMap[extension].includes(file.type))) {
    return 'Choose a PDF, JPG, PNG, or WebP file.';
  }
  const maxBytes = maxMb * 1024 * 1024;
  if (!file.size || file.size > maxBytes) {
    return `Choose a non-empty file up to ${maxMb} MB.`;
  }
  return null;
}

export function reviewRequirement(record: RequirementRecord, role: ReviewerRole, action: 'verify' | 'exempt' | 'correct' | 'forward', note: string, actor: string): RequirementRecord {
  if (role !== 'admin' && (action === 'verify' || action === 'exempt')) throw new Error('Only admins can verify or exempt a requirement.');
  if (action === 'exempt' && record.requirementId !== 'school') throw new Error('Only conditional school records can be exempted.');
  if (action === 'verify' && !record.versions[0]?.fileName) throw new Error('A document is required before verification. Use an exemption for an approved school-record exception.');
  if (!note.trim()) throw new Error('Add a reason or feedback before saving your decision.');
  const status: RequirementStatus = action === 'verify' ? 'verified' : action === 'exempt' ? 'exempted' : action === 'correct' ? 'correction' : 'review';
  const at = new Date().toISOString();
  const label = action === 'forward' ? 'Forwarded to admin' : STATUS_LABELS[status];
  return { ...record, status, note: note.trim(), updatedAt: at, events: [{ id: crypto.randomUUID(), at, actor, message: `${label}: ${note.trim()}` }, ...record.events] };
}

export function formatRequirementDate(value: string) {
  return new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function resolveRequirementFileUrl(fileUrl?: string | null, storageKey?: string | null): string | undefined {
  if (!fileUrl) return undefined;
  // If the file_url is the secured Cloudflare R2 direct endpoint, route through microservice public endpoint
  if (fileUrl.includes('r2.cloudflarestorage.com')) {
    const key = storageKey || fileUrl.split('.cloudflarestorage.com/')[1]?.split('/').slice(1).join('/');
    if (key) {
      return `${DOCS_MS_URL}/document-processor/requirements/file/${key.replace(/^\//, '')}`;
    }
  }
  return fileUrl;
}

export function mapSubmissionToRecord(sub: StudentRequirementSubmission): RequirementRecord {
  const normalizedStatus = (sub.status?.toLowerCase() || 'review') as RequirementStatus;
  const currentVersion: RequirementVersion = {
    id: sub.submission_id,
    at: sub.updated_at || sub.created_at,
    type: sub.document_type || 'Official Document',
    fileName: sub.file_name || 'Document',
    fileSize: sub.file_size_bytes || 0,
    mime: sub.mime_type || (sub.file_name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
    status: normalizedStatus,
    note: sub.student_remarks || '',
    scenario: sub.requested_assistance ? 'assistance' : 'submission',
    fileUrl: resolveRequirementFileUrl(sub.file_url, sub.storage_key),
  };

  const pastVersions: RequirementVersion[] = (sub.versions_payload || []).map((v, idx) => ({
    id: v.version_id || `${sub.submission_id}-v-${idx}`,
    at: v.submitted_at || sub.created_at,
    type: sub.document_type || 'Official Document',
    fileName: v.file_name || 'Previous Document',
    fileSize: v.file_size_bytes || 0,
    mime: v.mime_type || 'application/pdf',
    status: 'review' as RequirementStatus,
    note: v.student_remarks || '',
    scenario: 'submission',
    fileUrl: resolveRequirementFileUrl(v.file_url, v.storage_key),
  }));

  const events: RequirementEvent[] = [];
  if (sub.reviewed_at || sub.teacher_feedback) {
    events.push({
      id: `${sub.submission_id}-reviewed`,
      at: sub.reviewed_at || sub.updated_at || sub.created_at,
      actor: 'Teacher / Reviewer',
      message: `Status updated to ${STATUS_LABELS[normalizedStatus] || sub.status}${sub.teacher_feedback ? `: ${sub.teacher_feedback}` : ''}`,
    });
  }
  events.push({
    id: `${sub.submission_id}-submitted`,
    at: sub.created_at,
    actor: sub.student_name || 'Learner',
    message: `Document submitted: ${sub.document_type}${sub.student_remarks ? ` (${sub.student_remarks})` : ''}`,
  });

  return {
    id: sub.submission_id,
    ownerId: sub.user_id,
    learnerName: sub.student_name || 'Learner',
    email: '',
    program: sub.student_category || '',
    requirementId: (sub.requirement_code?.toLowerCase() || '') as RequirementId,
    status: normalizedStatus,
    note: sub.teacher_feedback || sub.student_remarks || 'Document submitted for teacher verification.',
    updatedAt: sub.updated_at || sub.created_at || new Date().toISOString(),
    versions: [currentVersion, ...pastVersions],
    events,
    accountId: sub.account_id || '',
  };
}

