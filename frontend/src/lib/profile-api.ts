import { authenticatedRequest, clearCurrentUserCache, getCurrentUser, normalizeUserRole, type DemoRole, type ProfileUrl, type UserRead } from './auth-api';
import type { ContactDetailsInput, FamilyDetailsInput, PersonalDetailsInput } from './students-api';

export interface AccountProfile extends UserRead {
  user_id: string;
  middle_name?: string;
  suffix?: string;
  user_category?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  personal_details: PersonalDetailsInput | null;
  contact_details: ContactDetailsInput | null;
  family_details: FamilyDetailsInput | null;
}

export interface ProfileUpdate {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  suffix?: string;
  personal_details?: Pick<PersonalDetailsInput, 'gender' | 'birth_date' | 'nationality' | 'civil_status' | 'religion'>;
  contact_details?: ContactDetailsInput;
  family_details?: FamilyDetailsInput;
}

export const PROFILE_ROLES = { student: 'Student', teacher: 'Teacher', admin: 'Admin' };
// Enable only after the existing password service has been verified independently.
export const PASSWORD_CHANGE_ENABLED = process.env.NEXT_PUBLIC_PROFILE_PASSWORD_CHANGE_ENABLED === 'true';

export function profileName(user: UserRead | null | undefined) {
  if (!user) return 'My account';
  return [user.first_name, user.middle_name, user.last_name, user.suffix].filter(value => typeof value === 'string' && value.trim()).join(' ').trim() || user.full_name || user.account_id || user.email || 'My account';
}

export function profileInitials(user: UserRead | null | undefined) {
  if (user?.first_name && user.last_name) return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  return profileName(user).split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function strings(value: unknown, fields: string[]) {
  const source = object(value);
  return Object.fromEntries(fields.filter(field => typeof source[field] === 'string').map(field => [field, source[field]])) as Record<string, string>;
}

export function readAccountProfile(value: unknown, expectedId: string, expectedRole: DemoRole): AccountProfile {
  const raw = object(value);
  if (raw.user_id !== expectedId || normalizeUserRole(raw as unknown as UserRead) !== expectedRole) throw new Error('The profile does not match your signed-in account. Refresh your session to continue.');
  const personal = raw.personal_details ? strings(raw.personal_details, ['gender', 'birth_date', 'nationality', 'civil_status', 'religion', 'lrn_number', 'learning_modalities']) : null;
  const contact = raw.contact_details ? strings(raw.contact_details, ['contact_no', 'street_building_no', 'barangay', 'municipality', 'province', 'province_code', 'municipality_code', 'barangay_code']) : null;
  const familyRaw = object(raw.family_details);
  const family: FamilyDetailsInput | null = raw.family_details ? {
    mother: strings(familyRaw.mother, ['name', 'contact_no']), father: strings(familyRaw.father, ['name', 'contact_no']), guardian: strings(familyRaw.guardian, ['name', 'contact_no']),
    siblings: Array.isArray(familyRaw.siblings) ? familyRaw.siblings.map(sibling => strings(sibling, ['name', 'last_grade_level_completed', 'occupation'])) : [],
  } : null;
  const photo = object(raw.profile_url);
  return {
    user_id: expectedId, role: expectedRole.toUpperCase(), email: typeof raw.email === 'string' ? raw.email : '',
    ...strings(raw, ['account_id', 'first_name', 'middle_name', 'last_name', 'suffix', 'created_at', 'updated_at', 'status', 'user_category']),
    profile_url: typeof photo.public_url === 'string' && /^https?:\/\//i.test(photo.public_url) ? strings(photo, ['public_id', 'public_url']) as ProfileUrl : null,
    personal_details: personal as PersonalDetailsInput | null, contact_details: contact, family_details: family,
  };
}

export async function assertProfileSession(id: string, role: DemoRole) {
  const current = await getCurrentUser(true, true);
  if (!current || current.user_id !== id || normalizeUserRole(current) !== role) throw new Error('Your signed-in account has changed. Reload this page before continuing.');
}

export async function getOwnProfile(id: string, role: DemoRole): Promise<AccountProfile> {
  await assertProfileSession(id, role);
  const raw = await authenticatedRequest<unknown>(`/users/${encodeURIComponent(id)}`);
  await assertProfileSession(id, role);
  return readAccountProfile(raw, id, role);
}

export function editableProfilePayload(input: ProfileUpdate, role: DemoRole): ProfileUpdate {
  const output: ProfileUpdate = strings(input, ['first_name', 'last_name', 'middle_name', 'suffix']);
  if (input.personal_details) output.personal_details = strings(input.personal_details, ['gender', 'birth_date', 'nationality', 'civil_status', 'religion']);
  if (input.contact_details) output.contact_details = strings(input.contact_details, ['contact_no', 'street_building_no', 'barangay', 'municipality', 'province', 'province_code', 'municipality_code', 'barangay_code']);
  if (role === 'student' && input.family_details) {
    const family = input.family_details;
    output.family_details = {
      mother: strings(family.mother, ['name', 'contact_no']), father: strings(family.father, ['name', 'contact_no']), guardian: strings(family.guardian, ['name', 'contact_no']),
      siblings: (family.siblings || []).map(sibling => strings(sibling, ['name', 'last_grade_level_completed', 'occupation'])),
    };
  }
  return output;
}

export async function updateOwnProfile(id: string, role: DemoRole, input: ProfileUpdate) {
  await assertProfileSession(id, role);
  const payload = editableProfilePayload(input, role);
  await authenticatedRequest<unknown>(`/users/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  clearCurrentUserCache();
  const saved = await getOwnProfile(id, role);
  if (!profileChangesSaved(payload, saved)) throw new Error('The server did not confirm every change. Your edits are still here. Refresh the profile before trying again.');
  return saved;
}

export function profileChangesSaved(expected: unknown, actual: unknown): boolean {
  if (Array.isArray(expected)) return Array.isArray(actual) && expected.length === actual.length && expected.every((value, index) => profileChangesSaved(value, actual[index]));
  if (expected && typeof expected === 'object') return Object.entries(expected).every(([key, value]) => profileChangesSaved(value, object(actual)[key]));
  return typeof expected === 'string' ? expected.trim().toLowerCase() === (typeof actual === 'string' ? actual : '').trim().toLowerCase() : expected === actual;
}

export function validateProfilePhoto(file: Pick<File, 'type' | 'size'>) {
  if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) return 'Choose a JPG, PNG, or WebP image.';
  if (!file.size || file.size > 5 * 1024 * 1024) return 'Choose a non-empty image up to 5 MB.';
  return null;
}

export function validatePasswordChange(current: string, next: string, confirm: string) {
  if (!current) return 'Enter your current password.';
  if (next.length < 6) return 'Your new password must contain at least 6 characters.';
  if (next === current) return 'Choose a password different from your current password.';
  if (next !== confirm) return 'The new passwords do not match.';
  return null;
}

export async function changeOwnPassword(id: string, role: DemoRole, current: string, next: string, confirm: string) {
  if (!PASSWORD_CHANGE_ENABLED) throw new Error('Password changes are temporarily unavailable. Please contact your administrator.');
  const issue = validatePasswordChange(current, next, confirm);
  if (issue) throw new Error(issue);
  await assertProfileSession(id, role);
  await authenticatedRequest('/users/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current_password: current, new_password: next, confirm_password: confirm }) }, false);
  clearCurrentUserCache();
}
