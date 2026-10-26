export type RequirementId = 'birth' | 'school' | 'identity';
export type RequirementStatus = 'auto_verified' | 'review' | 'correction' | 'verified' | 'exempted';
export type DemoScenario = 'pass' | 'review' | 'correction';
export type ReviewerRole = 'teacher' | 'admin';

export const REQUIREMENTS: { id: RequirementId; title: string; description: string; types: string[]; guidance: string; conditional?: boolean }[] = [
  { id: 'birth', title: 'Birth / date-of-birth proof', description: 'Submit one accepted document showing your name and date of birth.', types: ['PSA Birth Certificate', 'Local Civil Registrar Birth Certificate', 'Baptismal Certificate', 'Barangay Certification of Birth'], guidance: 'An accepted alternative completes this requirement. For a baptismal certificate, your date of birth must be shown separately from the baptism date.' },
  { id: 'school', title: 'Previous school records', description: 'Submit your last report card or permanent school record, if applicable.', types: ['Form 138 / Report Card', 'Form 137 / Permanent Record', 'Alternative proof for staff review'], guidance: 'Unable to obtain your records, or never attended formal school? Request teacher assistance below. Staff will confirm an alternative or exemption.', conditional: true },
  { id: 'identity', title: 'Identification', description: 'Submit one accepted identification document.', types: ['Government-issued ID', 'Barangay Clearance', 'Student ID'], guidance: 'Include both sides when your details appear on the back. Make sure your name and issuing organization are readable.' },
];

export const STATUS_LABELS: Record<RequirementStatus, string> = {
  auto_verified: 'Automatically verified', review: 'Needs staff review', correction: 'Needs correction', verified: 'Verified by admin', exempted: 'Exempted by admin',
};

export interface RequirementEvent { id: string; at: string; actor: string; message: string }
export interface RequirementVersion {
  id: string; at: string; type: string; fileName: string; fileSize: number; mime: string;
  status: RequirementStatus; note: string; scenario: DemoScenario | 'assistance';
}
export interface RequirementRecord {
  id: string; ownerId: string; learnerName: string; email: string; program: string;
  requirementId: RequirementId; status: RequirementStatus; note: string;
  updatedAt: string; versions: RequirementVersion[]; events: RequirementEvent[]; sample?: boolean;
}

export function isSatisfied(status?: RequirementStatus) {
  return status === 'auto_verified' || status === 'verified' || status === 'exempted';
}

export function simulationResult(scenario: DemoScenario, type: string): { status: RequirementStatus; note: string } {
  if (type === 'Alternative proof for staff review') return { status: 'review', note: 'Alternative school evidence needs a staff decision.' };
  if (scenario === 'pass') return { status: 'auto_verified', note: 'Demo checks passed: accepted document type, readable required fields, and matching learner information. No actual document analysis was performed.' };
  if (scenario === 'review') return { status: 'review', note: 'Demo result: the name or required details need a staff check. Your submission has been retained.' };
  return { status: 'correction', note: 'Demo result: the document is incomplete or unreadable. Upload a clear, complete replacement.' };
}

export function validateRequirementFile(file: Pick<File, 'name' | 'size' | 'type'>): string | null {
  const allowed: Record<string, string[]> = { pdf: ['application/pdf'], jpg: ['image/jpeg'], jpeg: ['image/jpeg'], png: ['image/png'], webp: ['image/webp'] };
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (!allowed[extension] || (file.type && !allowed[extension].includes(file.type))) return 'Choose a PDF, JPG, PNG, or WebP file.';
  if (!file.size || file.size > 10 * 1024 * 1024) return 'Choose a non-empty file up to 10 MB.';
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
