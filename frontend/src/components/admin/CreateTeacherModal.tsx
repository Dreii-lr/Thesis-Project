"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  X,
  UserPlus,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  Copy,
  ChevronDown,
  Phone,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  createTeacherAccount,
  TeacherRequestError,
  type TeacherCreatePayload,
} from "@/src/lib/teachers-api";
import type { UserRecord } from "@/src/lib/students-api";
import { validateTeacherForm, type TeacherField, type TeacherFieldErrors } from "@/src/lib/teacher-validation";

interface CreateTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeacherCreated?: (teacher: UserRecord) => void;
}

export default function CreateTeacherModal({
  isOpen,
  onClose,
  onTeacherCreated,
}: CreateTeacherModalProps) {
  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<TeacherFieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const pending = useRef(false);

  // Optional contact/personal details
  const [contactNo, setContactNo] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [civilStatus, setCivilStatus] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [province, setProvince] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success credentials dialog state
  const [createdTeacher, setCreatedTeacher] = useState<UserRecord | null>(null);
  const [resolvedPassword, setResolvedPassword] = useState("");
  const [copiedField, setCopiedField] = useState<"id" | "pwd" | "email" | null>(null);

  if (!isOpen) return null;

  const handleResetForm = () => {
    setFirstName("");
    setLastName("");
    setMiddleName("");
    setSuffix("");
    setAccountId("");
    setPassword("");
    setEmail("");
    setShowPassword(false);
    setFieldErrors({});
    setContactNo("");
    setBirthDate("");
    setGender("");
    setCivilStatus("");
    setMunicipality("");
    setProvince("");
    setErrorMessage(null);
    setCreatedTeacher(null);
    setResolvedPassword("");
    setCopiedField(null);
  };

  const handleClose = () => {
    if (pending.current) return;
    handleResetForm();
    onClose();
  };

  const handleCopy = async (text: string, field: "id" | "pwd" | "email") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  };

  const clearFieldError = (field: TeacherField) => {
    setFieldErrors(current => ({ ...current, [field]: undefined }));
  };

  const showFieldErrors = (errors: TeacherFieldErrors) => {
    setFieldErrors(errors);
    const field = Object.keys(errors)[0];
    const control = formRef.current?.querySelector<HTMLElement>(`[data-field="${field}"]`);
    const details = control?.closest("details");
    if (details) details.open = true;
    control?.focus();
  };

  const errorProps = (field: TeacherField) => ({
    "data-field": field,
    "aria-invalid": !!fieldErrors[field],
    "aria-describedby": fieldErrors[field] ? `teacher-${field}-error` : undefined,
  });

  const fieldError = (field: TeacherField) => fieldErrors[field] ? (
    <p id={`teacher-${field}-error`} role="alert" className="mt-1.5 text-[11px] font-medium text-rose-600">{fieldErrors[field]}</p>
  ) : null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending.current) return;
    setErrorMessage(null);
    const errors = validateTeacherForm({ firstName, lastName, email, accountId, password, birthDate, contactNo });
    if (Object.keys(errors).length) {
      showFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const effectivePassword = password || (birthDate ? birthDate.replace(/-/g, "") : "Password123!");

    const payload: TeacherCreatePayload = {
      email: email.trim().toLowerCase(),
      first_name: trimmedFirst,
      last_name: trimmedLast,
      middle_name: middleName.trim() || null,
      suffix: suffix.trim() || null,
      account_id: accountId.trim() || null,
      password: password || null,
      user_category: null, // ALS Teachers facilitate across all programs
      personal_details: {
        birth_date: birthDate || null,
        gender: gender || null,
        civil_status: civilStatus || null,
        nationality: "Filipino",
      },
      contact_details: {
        contact_no: contactNo.trim() || null,
        municipality: municipality.trim() || null,
        province: province.trim() || null,
      },
    };

    pending.current = true;
    setIsSubmitting(true);
    try {
      const created = await createTeacherAccount(payload);
      setCreatedTeacher(created);
      setResolvedPassword(effectivePassword);
      if (onTeacherCreated) {
        onTeacherCreated(created);
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to create teacher account. Please try again.";
      setErrorMessage(msg);
      if (err instanceof TeacherRequestError) showFieldErrors(err.fields);
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Create teacher account" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in">
      {/* ------------------------------------------------------------- */}
      {/* SUCCESS CREDENTIALS DIALOG                                    */}
      {/* ------------------------------------------------------------- */}
      {createdTeacher ? (
        <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <Check size={28} className="stroke-[2.5]" />
          </div>

          <div className="mt-4 text-center">
            <h3 className="text-lg font-bold text-slate-900">
              Teacher Account Created!
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              The teacher can now sign in using the account ID and initial password.
            </p>
          </div>

          <div className="mt-5 space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-sans font-medium text-slate-500">
                Faculty Name:
              </span>
              <span className="font-sans font-bold text-slate-900">
                {createdTeacher.first_name} {createdTeacher.last_name}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-sans font-medium text-slate-500">
                Account ID (Login):
              </span>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-rose-50 px-2 py-0.5 font-bold text-[#a4473a]">
                  {createdTeacher.account_id}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(createdTeacher.account_id || "", "id")
                  }
                  title="Copy Account ID"
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  {copiedField === "id" ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
              <span className="font-sans font-medium text-slate-500">Registered Email:</span>
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate font-semibold text-slate-800">{createdTeacher.email}</span>
                <button type="button" onClick={() => handleCopy(createdTeacher.email || "", "email")} title="Copy email" aria-label="Copy registered email" className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200">
                  {copiedField === "email" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-sans font-medium text-slate-500">
                Initial Password:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-slate-200/70 px-2 py-0.5 font-bold text-slate-800">
                  {resolvedPassword}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(resolvedPassword, "pwd")}
                  title="Copy Password"
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  {copiedField === "pwd" ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
            <strong>Important:</strong> Provide this Account ID and initial password to the teacher. Teachers sign in to the portal using their Account ID.
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="mt-5 w-full rounded-xl bg-[#a4473a] py-2.5 text-xs font-bold text-white shadow hover:bg-[#8e3d33] transition"
          >
            Done &amp; Return to Roster
          </button>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* CREATION FORM MODAL                                           */
        /* ------------------------------------------------------------- */
        <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#f7e5e2] bg-[#fcf5f4] text-[#a4473a]">
                <UserPlus size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Create Teacher Account
                </h2>
                <p className="text-xs text-slate-500">
                  Register new faculty member with official portal credentials.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              aria-label="Close teacher account form"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <form
            id="teacher-account-form"
            ref={formRef}
            noValidate
            onSubmit={handleSubmit}
            className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-6 [&_[aria-invalid=true]]:border-rose-400 [&_[aria-invalid=true]]:ring-rose-100"
          >
            {/* Error Message */}
            {errorMessage && (
              <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Section 1: Full Name */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span>1. Faculty Identity</span>
                  <span className="text-sm text-rose-500">*</span>
                </h3>
                <span className="text-[11px] font-medium text-slate-400">
                  Official DepEd ALS Records
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="teacher-firstName"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="teacher-firstName"
                    {...errorProps("firstName")}
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); clearFieldError("firstName"); }}
                    placeholder="e.g. Maria"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-[#a4473a] focus:bg-white focus:ring-2 focus:ring-[#f7e5e2] sm:text-sm"
                  />
                  {fieldError("firstName")}
                </div>

                <div>
                  <label
                    htmlFor="teacher-lastName"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="teacher-lastName"
                    {...errorProps("lastName")}
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); clearFieldError("lastName"); }}
                    placeholder="e.g. Santos"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-[#a4473a] focus:bg-white focus:ring-2 focus:ring-[#f7e5e2] sm:text-sm"
                  />
                  {fieldError("lastName")}
                </div>

                <div>
                  <label
                    htmlFor="teacher-middleName"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Middle Name{" "}
                    <span className="font-normal text-slate-400">(Optional)</span>
                  </label>
                  <input
                    id="teacher-middleName"
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="e.g. Flores"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-[#a4473a] focus:bg-white focus:ring-2 focus:ring-[#f7e5e2] sm:text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="teacher-suffix"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Suffix{" "}
                    <span className="font-normal text-slate-400">(Optional)</span>
                  </label>
                  <input
                    id="teacher-suffix"
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    placeholder="e.g. Jr., III"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-[#a4473a] focus:bg-white focus:ring-2 focus:ring-[#f7e5e2] sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 2: Account Credentials */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                2. Portal Access &amp; Credentials
              </h3>

              <div>
                <label htmlFor="teacher-email" className="mb-1 block text-xs font-semibold text-slate-700">Email Address <span className="text-rose-500">*</span></label>
                <input id="teacher-email" type="email" autoComplete="email" required maxLength={254} value={email}
                  onChange={e => { setEmail(e.target.value); clearFieldError("email"); }} {...errorProps("email")}
                  placeholder="e.g. maria.santos@deped.gov.ph"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-[#a4473a] focus:bg-white focus:ring-2 focus:ring-[#f7e5e2] sm:text-sm" />
                {fieldError("email")}
                <p className="mt-1 text-[11px] text-slate-400">Use the teacher’s active email for account access and password recovery.</p>
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="teacher-accountId"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Account ID
                  </label>
                  <input
                    id="teacher-accountId"
                    {...errorProps("accountId")}
                    type="text"
                    value={accountId}
                    onChange={(e) => { setAccountId(e.target.value); clearFieldError("accountId"); }}
                    placeholder="Leave blank to auto-generate"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 font-mono text-xs text-slate-800 outline-none transition focus:border-[#a4473a] focus:bg-white focus:ring-2 focus:ring-[#f7e5e2] sm:text-sm"
                  />
                  {fieldError("accountId")}
                  <p className="mt-1 text-[11px] text-slate-400">
                    Auto-assigned as{" "}
                    <span className="font-mono text-slate-600">
                      TCH-YYYY-XXXX
                    </span>{" "}
                    if left blank.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="teacher-password"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Initial Password
                  </label>
                  <div className="relative">
                    <input
                      id="teacher-password"
                      {...errorProps("password")}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
                      placeholder="Leave blank to use the default password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 pr-11 text-xs text-slate-800 outline-none transition focus:border-[#a4473a] focus:bg-white focus:ring-2 focus:ring-[#f7e5e2] sm:text-sm"
                    />
                    <button type="button" aria-label={showPassword ? "Hide initial password" : "Show initial password"} onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-[#a4473a]">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fieldError("password")}
                  <p className="mt-1 text-[11px] text-slate-400">
                    Leave blank to use the birth date (YYYYMMDD), or{" "}
                    <span className="font-mono text-slate-600">
                      Password123!
                    </span>{" "}
                    when no birth date is provided. Supplied passwords need at least 6 characters.
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 3: Optional Contact & Personal Details (Collapsible) */}
            <details className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600">
                <span className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400" />
                  3. Contact &amp; Personal Info (Optional)
                </span>
                <ChevronDown
                  size={16}
                  className="text-slate-400 transition-transform group-open:rotate-180"
                />
              </summary>

              <div className="mt-4 grid grid-cols-1 gap-3.5 border-t border-slate-200/60 pt-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="teacher-contactNo"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Contact Phone
                  </label>
                  <input
                    id="teacher-contactNo"
                    {...errorProps("contactNo")}
                    type="tel"
                    value={contactNo}
                    onChange={(e) => { setContactNo(e.target.value); clearFieldError("contactNo"); }}
                    placeholder="e.g. 0917-123-4567"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-[#a4473a] sm:text-sm"
                  />
                  {fieldError("contactNo")}
                </div>

                <div>
                  <label
                    htmlFor="teacher-birthDate"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Birth Date
                  </label>
                  <input
                    id="teacher-birthDate"
                    {...errorProps("birthDate")}
                    type="date"
                    value={birthDate}
                    onChange={(e) => { setBirthDate(e.target.value); clearFieldError("birthDate"); }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-[#a4473a] sm:text-sm"
                  />
                  {fieldError("birthDate")}
                </div>

                <div>
                  <label
                    htmlFor="teacher-gender"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Gender
                  </label>
                  <select
                    id="teacher-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-[#a4473a] sm:text-sm"
                  >
                    <option value="">Select Gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other / Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="teacher-civilStatus"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Civil Status
                  </label>
                  <select
                    id="teacher-civilStatus"
                    value={civilStatus}
                    onChange={(e) => setCivilStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-[#a4473a] sm:text-sm"
                  >
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="teacher-municipality"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Municipality / City
                  </label>
                  <input
                    id="teacher-municipality"
                    type="text"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    placeholder="e.g. Lucena City"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-[#a4473a] sm:text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="teacher-province"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Province
                  </label>
                  <input
                    id="teacher-province"
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="e.g. Quezon Province"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-[#a4473a] sm:text-sm"
                  />
                </div>
              </div>
            </details>

          </form>

          {/* Footer */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <ShieldCheck size={14} className="text-emerald-500" />
              Teacher ID login · Email for recovery
            </span>

            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition sm:text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="teacher-account-form"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#a4473a] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#8e3d33] transition active:scale-95 disabled:opacity-50 sm:text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <span>Register Teacher</span>
                    <UserPlus size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
