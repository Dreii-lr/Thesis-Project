import { authenticatedRequest } from "./auth-api";
import type { TargetCategory } from "./assessments-api";

export type UserStatus = "MAPPED" | "ACTIVE" | "INACTIVE" | "COMPLETED";
export type LearningModality = "FTF" | "BLENDED";

export interface PersonalDetailsInput {
  user_id?: string | null;
  is_interested?: boolean | null;
  gender?: string | null;
  birth_date?: string | null;
  nationality?: string | null;
  civil_status?: string | null;
  religion?: string | null;
  learning_modalities?: LearningModality | null;
  lrn_number?: string | null;
}
export interface ContactDetailsInput {
  street_building_no?: string | null;
  municipality?: string | null;
  province?: string | null;
  contact_no?: string | null;
}
export interface ParentGuardianInfo {
  name?: string | null;
  contact_no?: string | null;
}
export interface SiblingInfo {
  name?: string | null;
  last_grade_level_completed?: string | null;
  occupation?: string | null;
}
export interface FamilyDetailsInput {
  mother?: ParentGuardianInfo | null;
  father?: ParentGuardianInfo | null;
  guardian?: ParentGuardianInfo | null;
  siblings?: SiblingInfo[] | null;
}
export interface FamilyDetailsRead extends DetailDates {
  family_details_id?: string | null;
  user_id?: string | null;
  mother?: ParentGuardianInfo | Record<string, unknown> | null;
  father?: ParentGuardianInfo | Record<string, unknown> | null;
  guardian?: ParentGuardianInfo | Record<string, unknown> | null;
  siblings?: (SiblingInfo | Record<string, unknown>)[] | null;
}
interface DetailDates {
  created_at?: string | null;
  updated_at?: string | null;
}
export interface UserRecord {
  user_id?: string | null;
  account_id?: string | null;
  student_id?: string | null;
  teacher_id?: string | null;
  employee_id?: string | null;
  firebase_uid?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  suffix?: string | null;
  password?: string | null;
  role?: "STUDENT" | "TEACHER" | "EMPLOYEE" | "ADMIN" | null;
  user_category?: TargetCategory | null;
  status?: UserStatus | null;
  created_at?: string | null;
  updated_at?: string | null;
  personal_details?:
    | (PersonalDetailsInput &
        DetailDates & {
          personal_details_id?: string | null;
          student_id?: string | null;
        })
    | null;
  contact_details?:
    | (ContactDetailsInput &
        DetailDates & {
          contact_details_id?: string | null;
          user_id?: string | null;
        })
    | null;
  family_details?: FamilyDetailsRead | null;
}
export interface ListUsersResponse {
  users?: UserRecord[] | null;
  total?: number | null;
  offset?: number | null;
  limit?: number | null;
}

export interface PersonalDetails {
  user_id?: string | null;
  student_id?: string | null;
  is_interested?: boolean | null;
  gender: string;
  birth_date: string;
  nationality: string;
  civil_status: string;
  religion: string;
  place_of_birth: string;
  lrn_number: string;
  learning_modalities?: LearningModality | null;
}
export interface ContactDetails {
  street_building_no: string;
  municipality: string;
  province: string;
  contact_no: string;
}
export interface FamilyDetails extends FamilyDetailsInput {
  mother_name: string;
  father_name: string;
  guardian_name: string;
  guardian_relation: string;
  contact_no: string;
}
export interface Student {
  id: string;
  account_id?: string;
  student_id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  suffix: string;
  user_category: string;
  status: UserStatus | null;
  personal_details: PersonalDetails;
  contact_details: ContactDetails;
  family_details: FamilyDetails;
}
export interface StudentMappingPayload {
  email: string | null;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  suffix?: string | null;
  user_category?: TargetCategory;
  personal_details?: PersonalDetailsInput | null;
  contact_details?: ContactDetailsInput | null;
  family_details?: FamilyDetailsInput | null;
}
export interface StudentUpdatePayload {
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  suffix?: string | null;
  user_category?: TargetCategory | null;
  status?: UserStatus | null;
  personal_details?: PersonalDetailsInput | null;
  contact_details?: ContactDetailsInput | null;
  family_details?: FamilyDetailsInput | null;
}

export function formatCategoryLevel(category?: string): string {
  switch ((category || "").toUpperCase()) {
    case "ELEMENTARY":
      return "Elementary";
    case "SECONDARY":
      return "Secondary (High School)";
    case "BLP":
      return "Basic Literacy Program";
    default:
      return category || "N/A";
  }
}

function familyText(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function parentInfo(
  parent?: ParentGuardianInfo | Record<string, unknown> | null,
): ParentGuardianInfo | null {
  return parent
    ? {
        name: familyText(parent.name),
        contact_no: familyText(parent.contact_no),
      }
    : null;
}

export function normalizeStudentRecord(raw: UserRecord): Student {
  if (!raw.user_id || raw.role !== "STUDENT")
    throw new Error("The requested learner record is unavailable.");
  const personal = raw.personal_details;
  const contact = raw.contact_details;
  const family = raw.family_details;
  return {
    id: raw.user_id,
    account_id: raw.account_id ?? raw.student_id ?? "",
    student_id: raw.account_id ?? raw.student_id ?? "",
    email: raw.email ?? "",
    first_name: raw.first_name ?? "",
    last_name: raw.last_name ?? "",
    middle_name: raw.middle_name ?? "",
    suffix: raw.suffix ?? "",
    user_category: raw.user_category ?? "",
    status: raw.status ?? null,
    personal_details: {
      user_id: raw.user_id,
      student_id: raw.student_id,
      is_interested: personal?.is_interested,
      gender: personal?.gender ?? "",
      birth_date: personal?.birth_date ?? "",
      nationality: personal?.nationality ?? "",
      civil_status: personal?.civil_status ?? "",
      religion: personal?.religion ?? "",
      place_of_birth: "",
      lrn_number: personal?.lrn_number ?? "",
      learning_modalities: personal?.learning_modalities,
    },
    contact_details: {
      street_building_no: contact?.street_building_no ?? "",
      municipality: contact?.municipality ?? "",
      province: contact?.province ?? "",
      contact_no: contact?.contact_no ?? "",
    },
    family_details: {
      mother: parentInfo(family?.mother),
      father: parentInfo(family?.father),
      guardian: parentInfo(family?.guardian),
      siblings: family?.siblings?.map((sibling) => ({
        name: familyText(sibling.name),
        last_grade_level_completed: familyText(
          sibling.last_grade_level_completed,
        ),
        occupation: familyText(sibling.occupation),
      })),
      mother_name: familyText(family?.mother?.name),
      father_name: familyText(family?.father?.name),
      guardian_name: familyText(family?.guardian?.name),
      guardian_relation: familyText(
        (family?.guardian as Record<string, unknown> | null)?.relationship ||
          (family?.guardian as Record<string, unknown> | null)
            ?.guardian_relation,
      ),
      contact_no: familyText(
        family?.guardian?.contact_no ||
          family?.mother?.contact_no ||
          family?.father?.contact_no,
      ),
    },
  };
}

export async function fetchStudentsFromApi(
  offset = 0,
  limit = 100,
): Promise<Student[]> {
  const students: Student[] = [];
  for (let current = offset; ; current += limit) {
    const page = await authenticatedRequest<ListUsersResponse>(
      `/users/?offset=${current}&limit=${limit}`,
    );
    if (!Array.isArray(page.users) || typeof page.total !== "number")
      throw new Error("Unexpected learner list response.");
    students.push(...page.users.map(normalizeStudentRecord));
    // The backend total excludes mapped and inactive learners, while rows include them.
    if (page.users.length < limit) return students;
  }
}

export async function fetchStudentByIdFromApi(id: string): Promise<Student> {
  return normalizeStudentRecord(
    await authenticatedRequest<UserRecord>(`/users/${encodeURIComponent(id)}`),
  );
}

function categoryValue(value: string): TargetCategory {
  const category = value.toUpperCase();
  if (
    category !== "ELEMENTARY" &&
    category !== "SECONDARY" &&
    category !== "BLP"
  )
    throw new Error("Please select a valid learning program.");
  return category;
}

function profilePayload(payload: StudentUpdatePayload) {
  const personal = payload.personal_details;
  return {
    ...(payload.first_name !== undefined
      ? { first_name: payload.first_name }
      : {}),
    ...(payload.last_name !== undefined
      ? { last_name: payload.last_name }
      : {}),
    ...(payload.middle_name !== undefined
      ? { middle_name: payload.middle_name }
      : {}),
    ...(payload.suffix !== undefined ? { suffix: payload.suffix } : {}),
    ...(personal
      ? {
          personal_details: {
            ...(personal.is_interested !== undefined
              ? { is_interested: personal.is_interested }
              : {}),
            gender: personal.gender,
            birth_date: personal.birth_date || null,
            nationality: personal.nationality,
            civil_status: personal.civil_status,
            religion: personal.religion,
            lrn_number: personal.lrn_number,
            ...(personal.learning_modalities !== undefined
              ? { learning_modalities: personal.learning_modalities }
              : {}),
          },
        }
      : {}),
    ...(payload.contact_details
      ? { contact_details: payload.contact_details }
      : {}),
    ...(payload.family_details
      ? { family_details: payload.family_details }
      : {}),
  };
}

export async function mapStudentInApi(
  payload: StudentMappingPayload,
): Promise<Student> {
  const created = await authenticatedRequest<UserRecord>("/users/mapping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...profilePayload(payload),
      email: payload.email || null,
      ...(payload.user_category
        ? { user_category: categoryValue(payload.user_category) }
        : {}),
    }),
  });
  console.log(created); // --- IGNORE ---
  return normalizeStudentRecord(created);
}

export async function updateStudentInApi(
  id: string,
  payload: StudentUpdatePayload,
): Promise<Student> {
  // The dependency binds scalar category changes as query parameters.
  const params = new URLSearchParams();
  if (payload.user_category)
    params.set("user_category", categoryValue(payload.user_category));
  if (payload.status) params.set("status", payload.status);
  const query = params.size ? "?" + params.toString() : "";
  const updated = await authenticatedRequest<UserRecord>(
    `/users/${encodeURIComponent(id)}${query}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profilePayload(payload)),
    },
  );
  return normalizeStudentRecord(updated);
}

export function enrollStudentInApi(id: string): Promise<void> {
  return authenticatedRequest<void>(
    `/users/${encodeURIComponent(id)}`,
    { method: "POST" },
    false,
  );
}

export async function deactivateStudentInApi(id: string): Promise<Student> {
  return normalizeStudentRecord(
    await authenticatedRequest<UserRecord>(
      `/users/${encodeURIComponent(id)}/unenroll`,
      { method: "PATCH" },
    ),
  );
}
