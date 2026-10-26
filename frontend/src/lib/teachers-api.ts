import { authenticatedRequest } from "./auth-api";
import type { UserRecord } from "./students-api";

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

export async function createTeacherAccount(
  payload: TeacherCreatePayload,
): Promise<UserRecord> {
  return await authenticatedRequest<UserRecord>("/users/create-teacher-account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
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
