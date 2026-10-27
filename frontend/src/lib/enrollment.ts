import type { Student, StudentMappingPayload } from './students-api';
import type { TargetCategory } from './assessments-api';
import { todayInPhilippines } from './student-validation';
import type { RequirementId } from './requirements';

export type ApplicationStatus = 'DRAFT' | 'ENROLLING' | 'CORRECTION' | 'MAPPED';
export interface EnrollmentDetails {
  first_name: string; middle_name: string; last_name: string; suffix: string;
  birth_date: string; gender: string; nationality: string; civil_status: string; religion: string; lrn_number: string;
  email: string; contact_no: string; street_building_no: string; province: string; municipality: string; barangay: string;
  province_code: string; municipality_code: string; barangay_code: string;
  guardian_name: string; guardian_contact_no: string;
  schooling: string; last_school: string; last_grade: string; previous_als: string; availability: string; modality: string;
}
export interface ApplicationDocument {
  id: string; requirement: RequirementId; type: string; file: File; uploadedAt: string;
}
export interface ApplicationEvent { id: string; at: string; actor: string; message: string }
export interface EnrollmentApplication {
  id: string; reference: string; revision: number; status: ApplicationStatus; details: EnrollmentDetails;
  documents: ApplicationDocument[]; assistance: Record<RequirementId, string>; history: ApplicationEvent[];
  createdAt: string; updatedAt: string; submittedAt?: string; feedback: string;
  mappedUserId?: string; mappedAccountId?: string; program?: string;
}

export const APPLICATION_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: 'Draft', ENROLLING: 'Enrolling', CORRECTION: 'Needs correction', MAPPED: 'Mapped',
};
export const APPLICATION_STEPS = ['Learner details', 'Contact and address', 'Education background', 'Requirements', 'Review and submit'];
export const EMPTY_DETAILS: EnrollmentDetails = {
  first_name: '', middle_name: '', last_name: '', suffix: '', birth_date: '', gender: '', nationality: 'Filipino', civil_status: '', religion: '', lrn_number: '',
  email: '', contact_no: '', street_building_no: '', province: '', municipality: '', barangay: '', province_code: '', municipality_code: '', barangay_code: '',
  guardian_name: '', guardian_contact_no: '', schooling: '', last_school: '', last_grade: '', previous_als: '', availability: '', modality: 'FTF',
};
export function applicationName(application: Pick<EnrollmentApplication, 'details'>) {
  const d = application.details;
  return [d.first_name, d.middle_name, d.last_name, d.suffix].filter(Boolean).join(' ') || 'New applicant';
}
export function newApplication(): EnrollmentApplication {
  const id = crypto.randomUUID();
  const at = new Date().toISOString();
  return { id, reference: `BBK-${id.slice(0, 8).toUpperCase()}`, revision: 0, status: 'DRAFT', details: { ...EMPTY_DETAILS }, documents: [], assistance: { birth: '', school: '', identity: '' }, history: [], createdAt: at, updatedAt: at, feedback: '' };
}
export function applicationEvent(actor: string, message: string): ApplicationEvent {
  return { id: crypto.randomUUID(), at: new Date().toISOString(), actor, message };
}
export function validateApplication(application: EnrollmentApplication, step?: number): string | null {
  const d = application.details;
  if (step === undefined || step === 0) {
    if (!d.first_name.trim() || !d.last_name.trim()) return 'Enter your first and last name.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.birth_date) || !Number.isFinite(Date.parse(d.birth_date)) || new Date(d.birth_date).toISOString().slice(0, 10) !== d.birth_date || d.birth_date > todayInPhilippines()) return 'Enter a valid birth date that is not in the future.';
    if (d.lrn_number && !/^\d{12}$/.test(d.lrn_number)) return 'Enter a 12-digit LRN, or leave it blank if you need help.';
    if (d.guardian_contact_no && !/^\d{1,11}$/.test(d.guardian_contact_no)) return 'The guardian contact number must contain up to 11 digits.';
  }
  if (step === undefined || step === 1) {
    if (!d.email.trim() && !d.contact_no.trim()) return 'Provide a contact number or an available email so staff can reach you.';
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return 'Enter a valid email address, or leave it blank if unavailable.';
    if (d.contact_no && !/^\d{1,11}$/.test(d.contact_no)) return 'Your contact number must contain up to 11 digits.';
    if (![d.province, d.municipality, d.barangay].every(value => value.trim())) return 'Complete your province, municipality/city, and barangay.';
    if (![d.province_code, d.municipality_code, d.barangay_code].every(value => /^\d{9}$/.test(value))) return 'Select a complete address from the location lists.';
  }
  if (step === undefined || step === 2) {
    if (!['attended', 'never'].includes(d.schooling)) return 'Tell us whether you have attended formal school.';
    if (!d.last_grade || !['Yes', 'No', 'Not sure'].includes(d.previous_als) || !d.availability.trim()) return 'Complete your education background and learning availability.';
    if (!['FTF', 'BLENDED'].includes(d.modality)) return 'Select your preferred learning modality.';
  }
  if (step === undefined || step === 3) {
    for (const id of ['birth', 'school', 'identity'] as const) {
      if (!application.documents.some(document => document.requirement === id) && !application.assistance[id].trim()) return 'For each requirement, upload an available document or explain the assistance you need.';
    }
  }
  return null;
}
export function mappingPayload(application: EnrollmentApplication, email: string, lrn: string, program: string, modality: string): StudentMappingPayload {
  if (application.status !== 'ENROLLING') throw new Error('Only an application awaiting review can be mapped. Refresh the application first.');
  const issue = validateApplication(application);
  if (issue) throw new Error(issue);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !/^\d{12}$/.test(lrn.trim())) throw new Error('The existing mapping service requires a valid email and a confirmed 12-digit LRN. Request assistance or a correction if these are unavailable.');
  if (!['ELEMENTARY', 'SECONDARY', 'BLP'].includes(program) || !['FTF', 'BLENDED'].includes(modality)) throw new Error('Choose a supported learning program and modality.');
  const d = application.details;
  return {
    first_name: d.first_name, middle_name: d.middle_name, last_name: d.last_name, suffix: d.suffix, email: email.trim(), user_category: program as TargetCategory,
    personal_details: { birth_date: d.birth_date, gender: d.gender, nationality: d.nationality, civil_status: d.civil_status, religion: d.religion, lrn_number: lrn.trim(), learning_modalities: modality as 'FTF' | 'BLENDED' },
    contact_details: { contact_no: d.contact_no || null, street_building_no: d.street_building_no, province: d.province, municipality: d.municipality, barangay: d.barangay, province_code: d.province_code, municipality_code: d.municipality_code, barangay_code: d.barangay_code },
    family_details: { guardian: { name: d.guardian_name, contact_no: d.guardian_contact_no || null } },
  };
}
export function matchingLearner(application: EnrollmentApplication, student: Student) {
  const same = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
  return same(application.details.first_name, student.first_name) && same(application.details.last_name, student.last_name) && application.details.birth_date === student.personal_details.birth_date;
}
export function hasLearnerAccount(student: Pick<Student, 'status'>) {
  return ['ACTIVE', 'INACTIVE', 'COMPLETED'].includes(student.status || '');
}
