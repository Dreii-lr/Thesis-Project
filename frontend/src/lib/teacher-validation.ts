import type { UserRecord } from "./students-api";

export interface TeacherFormValues {
  firstName: string;
  lastName: string;
  email: string;
  accountId: string;
  password: string;
  birthDate: string;
  contactNo: string;
}
export type TeacherField = keyof TeacherFormValues;
export type TeacherFieldErrors = Partial<Record<TeacherField, string>>;
export const TEACHERS_PER_PAGE = 10;

export function validateTeacherEmail(email: string): string | undefined {
  if (!email.trim()) return "Email address is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) {
    return "Enter a valid email address.";
  }
}

export function validateTeacherForm(values: TeacherFormValues): TeacherFieldErrors {
  const errors: TeacherFieldErrors = {};
  if (!values.firstName.trim()) errors.firstName = "First name is required.";
  if (!values.lastName.trim()) errors.lastName = "Last name is required.";
  const emailError = validateTeacherEmail(values.email);
  if (emailError) errors.email = emailError;
  if (values.accountId.trim() && !/^TCH-[0-9]{4}-[0-9]{4,}$/.test(values.accountId.trim())) {
    errors.accountId = "Use TCH-YYYY-XXXX, or leave it blank to auto-generate.";
  }
  if (values.password && (!values.password.trim() || Array.from(values.password).length < 6)) {
    errors.password = "Use at least 6 characters for the initial password.";
  } else if (new TextEncoder().encode(values.password).length > 72) {
    errors.password = "The initial password must be at most 72 UTF-8 bytes.";
  }
  if (values.birthDate) {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit" });
    const date = new Date(`${values.birthDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.birthDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== values.birthDate) {
      errors.birthDate = "Enter a valid birth date.";
    } else if (values.birthDate > today) {
      errors.birthDate = "Birth date cannot be in the future.";
    }
  }
  if (values.contactNo.trim() && !/^[0-9]{1,11}$/.test(values.contactNo.trim())) {
    errors.contactNo = "Use digits only, with a maximum of 11 digits.";
  }
  return errors;
}

export function getTeacherPage(teachers: UserRecord[], search: string, status: "ALL" | "ACTIVE" | "INACTIVE", requestedPage: number) {
  const query = search.trim().toLowerCase();
  const filtered = teachers.filter(teacher => {
    const values = [teacher.first_name, teacher.middle_name, teacher.last_name, teacher.suffix].filter(Boolean).join(" ");
    const matchesSearch = !query || [values, teacher.account_id, teacher.contact_details?.contact_no, teacher.contact_details?.municipality]
      .some(value => (value || "").toLowerCase().includes(query));
    return matchesSearch && (status === "ALL" || (status === "ACTIVE" ? teacher.status === "ACTIVE" : teacher.status !== "ACTIVE"));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / TEACHERS_PER_PAGE));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const offset = (currentPage - 1) * TEACHERS_PER_PAGE;
  const rows = filtered.slice(offset, offset + TEACHERS_PER_PAGE);
  const pages: (number | "ellipsis")[] = [];
  for (let number = 1; number <= totalPages; number++) {
    if (number === 1 || number === totalPages || Math.abs(number - currentPage) <= 1) pages.push(number);
    else if (pages[pages.length - 1] !== "ellipsis") pages.push("ellipsis");
  }
  return { rows, total: filtered.length, totalPages, currentPage, pages, start: rows.length ? offset + 1 : 0, end: offset + rows.length };
}
