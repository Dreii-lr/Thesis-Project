"use client";

import { useState } from "react";
import {
  X,
  UserPlus,
  ShieldCheck,
  Check,
  Copy,
  ChevronDown,
  Phone,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  createTeacherAccount,
  type TeacherCreatePayload,
} from "@/src/lib/teachers-api";
import type { UserRecord } from "@/src/lib/students-api";

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
  const [copiedField, setCopiedField] = useState<"id" | "pwd" | null>(null);

  if (!isOpen) return null;

  const handleResetForm = () => {
    setFirstName("");
    setLastName("");
    setMiddleName("");
    setSuffix("");
    setAccountId("");
    setPassword("");
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
    handleResetForm();
    onClose();
  };

  const handleCopy = async (text: string, field: "id" | "pwd") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast) {
      setErrorMessage("First Name and Last Name are required.");
      return;
    }

    // Determine effective password to show upon success
    const effectivePassword =
      password.trim() ||
      (birthDate ? birthDate.replace(/-/g, "") : "Password123!");

    const payload: TeacherCreatePayload = {
      first_name: trimmedFirst,
      last_name: trimmedLast,
      middle_name: middleName.trim() || null,
      suffix: suffix.trim() || null,
      account_id: accountId.trim() || null,
      password: password.trim() || null,
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in">
      {/* ------------------------------------------------------------- */}
      {/* SUCCESS CREDENTIALS DIALOG                                    */}
      {/* ------------------------------------------------------------- */}
      {createdTeacher ? (
        <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <Check size={28} className="stroke-[2.5]" />
          </div>

          <div className="mt-4 text-center">
            <h3 className="text-lg font-bold text-slate-900">
              Teacher Account Created!
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Official faculty login credentials have been generated and synced with authentication.
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
        <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
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
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 space-y-6 overflow-y-auto p-6"
          >
            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
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
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Maria"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-[#a4473a] focus:bg-white focus:ring-2 focus:ring-[#f7e5e2] sm:text-sm"
                  />
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
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Santos"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-[#a4473a] focus:bg-white focus:ring-2 focus:ring-[#f7e5e2] sm:text-sm"
                  />
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
                    type="text"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="Leave blank to auto-generate"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 font-mono text-xs text-slate-800 outline-none transition focus:border-[#a4473a] focus:bg-white focus:ring-2 focus:ring-[#f7e5e2] sm:text-sm"
                  />
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
                  <input
                    id="teacher-password"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank for Password123!"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-[#a4473a] focus:bg-white focus:ring-2 focus:ring-[#f7e5e2] sm:text-sm"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Default fallback is{" "}
                    <span className="font-mono text-slate-600">
                      Password123!
                    </span>{" "}
                    or birthdate (YYYYMMDD).
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
                    type="tel"
                    value={contactNo}
                    onChange={(e) => setContactNo(e.target.value)}
                    placeholder="e.g. 0917-123-4567"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-[#a4473a] sm:text-sm"
                  />
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
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-[#a4473a] sm:text-sm"
                  />
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

            {/* Hidden submit trigger */}
            <button type="submit" className="hidden" aria-hidden="true" />
          </form>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4">
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <ShieldCheck size={14} className="text-emerald-500" />
              Cloud-First Auth Synced
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition sm:text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
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
