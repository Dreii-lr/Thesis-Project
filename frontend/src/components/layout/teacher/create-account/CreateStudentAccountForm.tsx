"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import EditStudentForm, {
  type StudentFormActionProps,
} from "@/src/components/learners/EditStudentForm";
import { useStudents } from "@/src/context/StudentContext";
import {
  enrollStudentInApi,
  fetchStudentByIdFromApi,
} from "@/src/lib/students-api";

function CreateStudentAccountAction({
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
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm">
          <p className="text-blue-700">
            This learner is mapped. Save any changes before creating the
            account.
          </p>
          {/* <button
            type="button"
            onClick={() => void handleCreateAccount()}
            disabled={isCreating || isSaving || dirty}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isCreating && <Loader2 size={16} className="animate-spin" />}
            {isCreating ? "Creating..." : "Create Learner Account"}
          </button> */}
        </div>
      )}
      {created && (
        <p
          role="status"
          className="mb-6 rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-700"
        >
          Student account created successfully.
        </p>
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

export default function CreateStudentAccountForm({ id }: { id: string }) {
  return (
    <EditStudentForm
      id={id}
      basePath="/teacher/learner-accounts"
      heading="Student Account Details"
      actions={CreateStudentAccountAction}
    />
  );
}
