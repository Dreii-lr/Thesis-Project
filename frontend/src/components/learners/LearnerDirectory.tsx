"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Plus, RefreshCw, Search } from "lucide-react";
import { useStudents } from "@/src/context/StudentContext";
import ApiState from "@/src/components/ui/ApiState";
import { formatCategoryLevel, type UserStatus } from "@/src/lib/students-api";

const statuses: UserStatus[] = ["MAPPED", "ACTIVE", "INACTIVE", "COMPLETED"];

export default function LearnerDirectory({
  mode,
}: {
  mode: "admin" | "accounts" | "mapping";
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const { students, isLoading, error, refreshStudents } = useStudents();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(mode === "accounts" ? "MAPPED" : "");
  const [program, setProgram] = useState("");
  const mapping = mode === "mapping";
  const accounts = mode === "accounts";
  const filtered = students.filter((student) => {
    const matchSearch = [
      student.first_name,
      student.middle_name,
      student.last_name,
      student.suffix,
      student.account_id,
      student.email,
      student.personal_details.lrn_number,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    return (
      matchSearch &&
      (!status || student.status === status) &&
      (!program || student.user_category === program)
    );
  });
  const inputClass =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100";

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {mapping
              ? "Learner Mapping"
              : accounts
                ? isAdmin
                  ? "Learner Account Activation"
                  : "Learner Accounts"
                : "Students"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mapping
              ? "Map learners and update their enrollment details."
              : accounts
                ? isAdmin
                  ? "Review mapped learners and activate their official student login accounts."
                  : "View mapped and active learners and review their enrollment details."
                : "View learner profiles, account status, and attendance records."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void refreshStudents()}
            disabled={isLoading}
            className={`${inputClass} inline-flex items-center gap-2 disabled:opacity-50`}
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />{" "}
            Refresh
          </button>
          <Link
            href={
              isAdmin
                ? "/admin/mapping/add-student"
                : "/teacher/learner-accounts/mapping"
            }
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={16} /> Mapping Learner
          </Link>
        </div>
      </div>
      <ApiState
        loading={isLoading}
        error={error}
        onRetry={() => void refreshStudents()}
      />
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-0 flex-1 sm:min-w-64">
            <Search
              size={16}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              aria-label="Search learners"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, ID, LRN, or email..."
              className={`${inputClass} w-full pl-9`}
            />
          </div>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={inputClass}
          >
            <option value="">All statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by learning program"
            value={program}
            onChange={(event) => setProgram(event.target.value)}
            className={inputClass}
          >
            <option value="">All programs</option>
            {Array.from(
              new Set(
                students
                  .map((student) => student.user_category)
                  .filter(Boolean),
              ),
            )
              .sort()
              .map((value) => (
                <option key={value} value={value}>
                  {formatCategoryLevel(value)}
                </option>
              ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Student ID",
                  "Learner",
                  "Learning program",
                  "Status",
                  "Actions",
                ].map((label) => (
                  <th key={label} scope="col" className="px-5 py-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!isLoading &&
                !error &&
                filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-blue-50/40">
                    <td className="px-5 py-4 font-medium">
                      {student.account_id || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium">
                        {student.first_name} {student.middle_name}{" "}
                        {student.last_name} {student.suffix}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        LRN: {student.personal_details.lrn_number || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatCategoryLevel(student.user_category)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-semibold ${student.status === "MAPPED" ? "bg-amber-50 text-amber-700" : student.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}
                      >
                        {student.status || "Unavailable"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {(() => {
                        let targetPath = "";
                        let actionLabel = "";
                        if (isAdmin) {
                          if (mapping) {
                            targetPath = `/admin/mapping/${encodeURIComponent(student.id)}`;
                            actionLabel = student.status === "MAPPED" ? "Review & Create Account" : "Update details";
                          } else if (accounts) {
                            targetPath = `/admin/create-account/${encodeURIComponent(student.id)}`;
                            actionLabel = student.status === "MAPPED" ? "Review & Create Account" : "View details";
                          } else {
                            targetPath = `/admin/students/${encodeURIComponent(student.id)}`;
                            actionLabel = "View profile";
                          }
                        } else {
                          if (mode === "admin") {
                            targetPath = `/teacher/learner-accounts/${encodeURIComponent(student.id)}`;
                            actionLabel = "View profile";
                          } else {
                            targetPath = `/teacher/learner-accounts/${encodeURIComponent(student.id)}`;
                            actionLabel = student.status === "MAPPED" ? "Review details" : "Edit details";
                          }
                        }
                        return (
                          <Link
                            href={targetPath}
                            className="inline-flex items-center gap-2 rounded-md p-2 font-medium text-blue-600 hover:bg-blue-50"
                          >
                            {actionLabel} <ArrowRight size={14} />
                          </Link>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              {!isLoading && !error && !filtered.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    No learners match your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-sm text-slate-500">
          {isLoading || error
            ? "Records unavailable until loading succeeds."
            : `Showing ${filtered.length} of ${students.length} learners`}
        </div>
      </div>
    </div>
  );
}
