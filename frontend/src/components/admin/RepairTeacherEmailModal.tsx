"use client";

import { useRef, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Loader2, Mail, X } from "lucide-react";
import { repairTeacherEmail, TeacherRequestError } from "@/src/lib/teachers-api";
import { validateTeacherEmail } from "@/src/lib/teacher-validation";
import type { UserRecord } from "@/src/lib/students-api";

export default function RepairTeacherEmailModal({ teacher, onClose, onRepaired }: {
  teacher: UserRecord;
  onClose: () => void;
  onRepaired: (teacher: UserRecord) => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    setError(null);
    const invalidEmail = validateTeacherEmail(email);
    if (invalidEmail) {
      setEmailError(invalidEmail);
      inputRef.current?.focus();
      return;
    }
    pending.current = true;
    setIsSaving(true);
    try {
      const updated = await repairTeacherEmail(teacher.user_id!, email);
      onRepaired(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to link this email. Please try again.");
      if (err instanceof TeacherRequestError && err.fields.email) {
        setEmailError(err.fields.email);
        inputRef.current?.focus();
      }
    } finally {
      pending.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="repair-teacher-title" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-[#fcf5f4] p-3 text-[#a4473a]"><Mail size={20} /></span>
            <div><h2 id="repair-teacher-title" className="text-base font-bold text-slate-900">Set Up Teacher Sign-in</h2><p className="mt-1 font-mono text-xs text-[#a4473a]">{teacher.account_id}</p></div>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Close sign-in setup" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X size={18} /></button>
        </div>
        {saved ? (
          <div className="pt-5">
            <div role="status" className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-800">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <div><p className="font-bold">Teacher sign-in email linked.</p><p>The teacher can sign in with their account ID and existing password. If the password is forgotten, use Forgot Password on the login page with this email.</p></div>
            </div>
            <button type="button" onClick={onClose} className="mt-5 w-full rounded-xl bg-[#a4473a] py-2.5 text-sm font-semibold text-white hover:bg-[#8e3d33]">Done</button>
          </div>
        ) : (
          <form noValidate onSubmit={submit} className="space-y-4 pt-4">
            <p className="text-xs leading-5 text-slate-500">Add the teacher’s active email to complete sign-in setup. This keeps the same teacher account and teaching records.</p>
            {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><AlertCircle size={16} className="shrink-0" />{error}</div>}
            <div>
              <label htmlFor="repair-teacher-email" className="mb-1 block text-xs font-semibold text-slate-700">Email Address <span className="text-rose-500">*</span></label>
              <input ref={inputRef} id="repair-teacher-email" type="email" autoComplete="email" required maxLength={254} disabled={isSaving} value={email} onChange={event => { setEmail(event.target.value); setEmailError(null); }} aria-invalid={!!emailError} aria-describedby={emailError ? "repair-email-error" : undefined} placeholder="Teacher’s active email address" className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none focus:border-[#a4473a] focus:ring-2 focus:ring-[#f7e5e2] aria-invalid:border-rose-400" />
              {emailError && <p role="alert" id="repair-email-error" className="mt-1.5 text-[11px] text-rose-600">{emailError}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={isSaving || !teacher.user_id} className="inline-flex items-center gap-2 rounded-xl bg-[#a4473a] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#8e3d33] disabled:opacity-50">{isSaving && <Loader2 size={15} className="animate-spin" />}{isSaving ? "Saving..." : "Link Email"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
