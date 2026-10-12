"use client";

import { useRef, useState } from "react";
import { Loader2, UserCheck, ShieldCheck, CheckCircle2 } from "lucide-react";
import EditStudentForm, {
  type StudentFormActionProps,
} from "@/src/components/learners/EditStudentForm";
import { useStudents } from "@/src/context/StudentContext";
import {
  enrollStudentInApi,
  fetchStudentByIdFromApi,
} from "@/src/lib/students-api";

function AdminStudentAccountAction({
  student,
  dirty,
  isSaving,
  onPendingChange,
  onStudentChange,
}: StudentFormActionProps) {
  const { refreshStudents } = useStudents();
  const pending = useRef(false);
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateAccount = async () => {
    if (
      pending.current ||
      isSaving ||
      dirty ||
      created ||
      student.status !== "MAPPED"
    )
      return;
    if (!student.personal_details.birth_date) {
      setError("Save a birth date before creating this student account.");
      return;
    }

    pending.current = true;
    setIsCreating(true);
    onPendingChange(true);
    setError(null);
    try {
      await enrollStudentInApi(student.id);
      setCreated(true);
      onStudentChange({ ...student, status: "ACTIVE" });
      await refreshStudents();
      try {
        onStudentChange(await fetchStudentByIdFromApi(student.id));
      } catch {
        setError(
          "The account was created, but its updated details could not be loaded. Refresh the page to check them.",
        );
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create this student account.",
      );
    } finally {
      pending.current = false;
      setIsCreating(false);
      onPendingChange(false);
    }
  };

  return (
    <>
      {student.status === "MAPPED" && !created && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-sm shadow-sm">
          <div className="flex items-center gap-2.5 text-blue-900">
            <ShieldCheck size={22} className="shrink-0 text-blue-600" />
            <div>
              <p className="font-semibold text-blue-900">Learner Ready for Account Activation</p>
              <p className="text-xs text-blue-700 mt-0.5">
                This learner record is mapped. Verify any student details and create their official student account.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleCreateAccount()}
            disabled={isCreating || isSaving || dirty}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isCreating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <UserCheck size={16} />
            )}
            {isCreating ? "Creating Account..." : "Create Learner Account"}
          </button>
        </div>
      )}
      {created && (
        <div
          role="status"
          className="mb-6 flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900 shadow-sm"
        >
          <CheckCircle2 size={18} className="shrink-0 text-green-600 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">Student Account Created Successfully!</p>
            <p className="text-xs text-green-700 mt-0.5">
              The learner account is now active and enrolled. Login credentials have been provisioned on Firebase.
            </p>
          </div>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </>
  );
}

export default function AdminStudentAccountForm({
  id,
  basePath = "/admin/mapping",
}: {
  id: string;
  basePath?: string;
}) {
  return (
    <EditStudentForm
      id={id}
      basePath={basePath}
      heading="Review & Create Learner Account"
      actions={AdminStudentAccountAction}
    />
  );
}
