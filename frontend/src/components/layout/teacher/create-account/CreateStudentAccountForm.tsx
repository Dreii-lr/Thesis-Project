"use client";

import { Info, CheckCircle2 } from "lucide-react";
import EditStudentForm, {
  type StudentFormActionProps,
} from "@/src/components/learners/EditStudentForm";

function TeacherLearnerStatusAction({ student }: StudentFormActionProps) {
  return (
    <>
      {student.status === "MAPPED" && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 shadow-sm">
          <Info size={20} className="shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Learner Mapped — Awaiting Admin Activation</p>
            <p className="text-xs text-amber-700 mt-0.5">
              This learner has been mapped. You can review and update their personal, contact, and family details below.
              An administrator will review the record and create their official student login account.
            </p>
          </div>
        </div>
      )}
      {student.status === "ACTIVE" && (
        <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800 shadow-sm">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <p className="font-medium">
            This learner account is active and enrolled in the ALS learning portal.
          </p>
        </div>
      )}
    </>
  );
}

export default function CreateStudentAccountForm({ id, basePath = '/teacher/learner-accounts?tab=enrollment' }: { id: string; basePath?: string }) {
  return (
    <EditStudentForm
      id={id}
      basePath={basePath}
      heading="Learner Details Review"
      actions={TeacherLearnerStatusAction}
    />
  );
}

