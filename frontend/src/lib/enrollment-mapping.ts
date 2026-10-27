import { getCurrentUser, normalizeUserRole, type DemoRole } from './auth-api';
import { fetchStudentByIdFromApi, fetchStudentsFromApi, mapStudentInApi } from './students-api';
import { mappingPayload, matchingLearner, type EnrollmentApplication } from './enrollment';

export interface ApplicationPlacement { email: string; lrn: string; program: string; modality: string }
export async function mapReviewedApplication(application: EnrollmentApplication, placement: ApplicationPlacement, actorId: string, role: DemoRole, linkExisting = false) {
  const current = await getCurrentUser(true, true);
  if (!current || current.user_id !== actorId || normalizeUserRole(current) !== role || role !== 'teacher') throw new Error('Your teacher session has changed. Reload before mapping a learner.');
  const payload = mappingPayload(application, placement.email, placement.lrn, placement.program, placement.modality);
  const students = await fetchStudentsFromApi();
  const existing = students.find(student => student.personal_details.lrn_number === placement.lrn.trim());
  if (existing) {
    if (!matchingLearner(application, existing)) throw new Error('This LRN belongs to a different learner record. Check the identity details before continuing.');
    if (!linkExisting) throw new Error('A matching learner already exists. Review the record, then select Link existing learner. No duplicate was created.');
    return { student: existing, linked: true };
  }
  if (linkExisting) throw new Error('No learner with that LRN was found. Refresh the directory or create the reviewed mapping.');
  if (students.some(student => student.email.toLowerCase() === placement.email.trim().toLowerCase())) throw new Error('This email is already recorded. Review the existing learner account first.');
  const session = await getCurrentUser(true, true);
  if (!session || session.user_id !== actorId || normalizeUserRole(session) !== 'teacher') throw new Error('Your teacher session has changed. Reload before continuing.');
  const created = await mapStudentInApi(payload);
  const confirmed = await fetchStudentByIdFromApi(created.id);
  if (confirmed.status !== 'MAPPED' || confirmed.personal_details.lrn_number !== placement.lrn.trim() || !matchingLearner(application, confirmed)) throw new Error('The mapping request was accepted, but its saved details could not be confirmed. Refresh and check existing learner records before retrying.');
  return { student: confirmed, linked: false };
}
