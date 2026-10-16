"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { useOptionalAuth } from "@/src/context/AuthContext";
import {
  getStudentAttendance,
  type StudentAttendanceHistory,
  type AttendanceStatus,
} from "@/src/lib/attendance-api";
import {
  listSubjects,
  type SubjectRecord,
  subjectName as resolveSubjectName,
} from "@/src/lib/subjects-api";
import {
  formatAttendanceDate,
  subjectName as fallbackSubjectName,
} from "@/src/data/mockTeacher";

export default function StudentAttendancePage() {
  const auth = useOptionalAuth();
  const user = auth?.user;
  const targetId = user?.student_id || user?.user_id || (user ? 'me' : null);

  const [data, setData] = useState<StudentAttendanceHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | AttendanceStatus>(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);

  useEffect(() => {
    let isMounted = true;
    listSubjects()
      .then((items) => {
        if (!isMounted) return;
        setSubjects(items);
      })
      .catch((err) => {
        console.warn("Failed to load subjects for student attendance:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getSubjectTitle = (codeOrTitle: string) => {
    if (!codeOrTitle) return "";
    if (subjects.length > 0) {
      const resolved = resolveSubjectName(subjects, codeOrTitle, null);
      if (resolved && resolved !== codeOrTitle) return resolved;
    }
    return fallbackSubjectName(codeOrTitle) || codeOrTitle;
  };

  const fetchAttendance = async () => {
    if (!targetId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const history = await getStudentAttendance(String(targetId));
      setData(history);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load attendance history.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAttendance();
  }, [targetId]);

  const filteredRecords = useMemo(() => {
    if (!data?.records) return [];
    return data.records.filter((rec) => {
      const matchesStatus =
        statusFilter === "all" || rec.status === statusFilter;
      const term = searchQuery.toLowerCase().trim();
      const friendlySubj = getSubjectTitle(rec.subject).toLowerCase();
      const matchesQuery =
        !term ||
        rec.date.toLowerCase().includes(term) ||
        rec.subject.toLowerCase().includes(term) ||
        friendlySubj.includes(term) ||
        (rec.remarks && rec.remarks.toLowerCase().includes(term));
      return matchesStatus && matchesQuery;
    });
  }, [data, statusFilter, searchQuery, subjects]);

  const attendanceRate = Math.round(data?.attendance_rate ?? 0);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-7">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <CalendarCheck size={14} /> Student Portal
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Learner Attendance
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Track your learning session attendance, participation rate, and
          teacher remarks.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => void fetchAttendance()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold hover:bg-red-200"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Attendance Rate */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CalendarCheck size={20} />
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                attendanceRate >= 90
                  ? "bg-emerald-50 text-emerald-700"
                  : attendanceRate >= 75
                    ? "bg-blue-50 text-blue-700"
                    : "bg-amber-50 text-amber-700"
              }`}
            >
              {attendanceRate >= 90
                ? "Excellent"
                : attendanceRate >= 75
                  ? "Good standing"
                  : "Needs attention"}
            </span>
          </div>
          <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
            {isLoading ? "..." : `${attendanceRate}%`}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Overall attendance rate
          </p>
        </div>

        {/* Present Days */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
          <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
            {isLoading ? "..." : (data?.present_days ?? 0)}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Sessions marked present
          </p>
        </div>

        {/* Absent Days */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <XCircle size={20} />
          </div>
          <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
            {isLoading ? "..." : (data?.absent_days ?? 0)}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Sessions marked absent
          </p>
        </div>

        {/* Excused & Total */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock size={20} />
          </div>
          <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
            {isLoading ? "..." : (data?.excused_days ?? 0)}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Excused (
            {isLoading ? "..." : `${data?.total_days ?? 0} total sessions`})
          </p>
        </div>
      </div>

      {/* Attendance History Section */}
      <section className="mt-8 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Session History
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Detailed log of learning sessions recorded by your teacher.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | AttendanceStatus)
              }
              aria-label="Filter by attendance status"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Excused">Excused</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-2.5 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject or date..."
                className="w-48 rounded-xl border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 sm:w-60"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Learning Strand / Subject</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Remarks / Absence Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    Loading attendance history...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    <CalendarDays
                      size={32}
                      className="mx-auto mb-2 text-slate-300"
                    />
                    No attendance records found. Your learning sessions will
                    appear here as your teacher records them.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {formatAttendanceDate(item.date)}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {getSubjectTitle(item.subject)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${
                          item.status === "Present"
                            ? "bg-emerald-50 text-emerald-700"
                            : item.status === "Absent"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {item.reason_of_absence || item.remarks || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {data && (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Showing {filteredRecords.length} of {data.records?.length ?? 0}{" "}
            recorded sessions
          </div>
        )}
      </section>
    </div>
  );
}
