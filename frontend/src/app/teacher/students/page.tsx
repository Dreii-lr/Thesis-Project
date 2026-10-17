"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Plus, ExternalLink } from "lucide-react";
import { useStudents } from "@/src/context/StudentContext";
import ApiState from "@/src/components/ui/ApiState";

export default function StudentsListPage() {
  const { students, isLoading, error, refreshStudents } = useStudents();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.trim().toLowerCase();
    return [
      student.first_name,
      student.middle_name,
      student.last_name,
      student.account_id,
      student.personal_details.lrn_number,
      student.email,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const statuses = {
    MAPPED: { label: "Mapped", bg: "bg-amber-100 text-amber-800" },
    ACTIVE: { label: "Active", bg: "bg-green-100 text-green-800" },
    COMPLETED: { label: "Completed", bg: "bg-blue-100 text-blue-800" },
    INACTIVE: { label: "Inactive", bg: "bg-gray-100 text-gray-800" },
  };

  return (
    <div className="w-full h-full flex flex-col p-6 lg:p-8 bg-gray-50/30">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Students
          </h1>
          <p className="text-gray-500 text-sm">
            View and monitor your class roster.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/teacher/learner-accounts/mapping"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Mapping Learner
          </Link>
        </div>
      </div>

      <ApiState
        loading={isLoading}
        error={error}
        onRetry={() => void refreshStudents()}
      />

      {/* Main Content Area */}
      <div className="bg-white border border-gray-200 rounded-lg flex flex-col overflow-hidden flex-1 min-w-0">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <div className="relative w-full max-w-xs">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search students..."
              aria-label="Search students"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
            />
          </div>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="overflow-x-auto w-full flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Student ID
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Student Name
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  LRN
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {!isLoading && !error && filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const status = student.status
                    ? statuses[student.status]
                    : { label: "Unavailable", bg: "bg-gray-100 text-gray-800" };
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-gray-50 transition-colors bg-white"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {student.account_id || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {student.first_name} {student.last_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {student.personal_details.lrn_number || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${status.bg}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <Link
                          href={`/teacher/students/${student.id}`}
                          className="inline-flex text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-md hover:bg-blue-50"
                          title="View Profile"
                        >
                          <ExternalLink size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500 text-sm"
                  >
                    {isLoading
                      ? "Loading students..."
                      : error
                        ? "Student records could not be loaded."
                        : "No students found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 flex items-center justify-between text-sm text-gray-500 bg-gray-50 mt-auto">
          <span>
            {isLoading || error
              ? "—"
              : `Showing ${filteredStudents.length} of ${students.length} entries`}
          </span>
        </div>
      </div>
    </div>
  );
}
