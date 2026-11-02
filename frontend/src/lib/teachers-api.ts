import { authenticatedFetch, authenticatedRequest, SessionError } from "./auth-api";
import type { UserRecord } from "./students-api";
import type { TeacherField, TeacherFieldErrors } from "./teacher-validation";

export interface TeacherPersonalDetails {
  gender?: string | null;
  birth_date?: string | null;
  nationality?: string | null;
  civil_status?: string | null;
  religion?: string | null;
}

export interface TeacherContactDetails {
  contact_no?: string | null;
  street_building_no?: string | null;
  municipality?: string | null;
  province?: string | null;
}

export interface TeacherCreatePayload {
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  suffix?: string | null;
  account_id?: string | null;
  password?: string | null;
  user_category?: null;
  personal_details?: TeacherPersonalDetails | null;
  contact_details?: TeacherContactDetails | null;
}

export interface ListTeachersResponse {
  users: UserRecord[];
  total: number;
  offset: number;
  limit: number;
}

export class TeacherRequestError extends SessionError {
  constructor(message: string, status: number, public fields: TeacherFieldErrors = {}) {
    super(message, status);
    this.name = "TeacherRequestError";
  }
}

async function teacherMutation(path: string, payload: object): Promise<UserRecord> {
  const response = await authenticatedFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const fields: TeacherFieldErrors = {};
    const fieldNames: Record<string, TeacherField> = {
      first_name: "firstName", last_name: "lastName", email: "email", account_id: "accountId",
      password: "password", birth_date: "birthDate", contact_no: "contactNo",
    };
    if (Array.isArray(body?.detail)) {
      for (const item of body.detail) {
        const field = fieldNames[item.loc?.[item.loc.length - 1]];
        if (field && typeof item.msg === "string") fields[field] = item.msg.replace(/^Value error, /, "");
      }
    }
    const message = typeof body?.message === "string" ? body.message
      : typeof body?.detail === "string" ? body.detail
      : Object.values(fields)[0] || "Unable to save the teacher account. Please try again.";
    if (response.status === 409) {
      if (/email/i.test(message)) fields.email = message;
      else if (/account|ID/.test(message)) fields.accountId = message;
    }
    throw new TeacherRequestError(message, response.status, fields);
  }
  const teacher = body?.data?.resources;
  if (!teacher?.user_id) throw new Error("The account response could not be verified. Refresh the directory before trying again.");
  return teacher as UserRecord;
}

export async function createTeacherAccount(payload: TeacherCreatePayload): Promise<UserRecord> {
  return teacherMutation("/users/create-teacher-account", { ...payload, email: payload.email.trim().toLowerCase() });
}

export async function repairTeacherEmail(userId: string, email: string): Promise<UserRecord> {
  return teacherMutation(`/users/teachers/${encodeURIComponent(userId)}/repair-email`, { email: email.trim().toLowerCase() });
}

export async function fetchTeachersFromApi(
  offset = 0,
  limit = 100,
): Promise<UserRecord[]> {
  const teachers: UserRecord[] = [];
  for (let current = offset; ; current += limit) {
    const page = await authenticatedRequest<ListTeachersResponse>(
      `/users/teachers?offset=${current}&limit=${limit}`,
    );
    if (!Array.isArray(page.users) || typeof page.total !== "number") {
      throw new Error("Unexpected teacher list response.");
    }
    teachers.push(...page.users);
    if (page.users.length < limit || teachers.length >= page.total) {
      return teachers;
    }
  }
}
