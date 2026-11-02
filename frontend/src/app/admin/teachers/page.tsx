"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  RefreshCw,
  Search,
  Phone,
  MapPin,
  X,
  Mail,
  Loader2,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import CreateTeacherModal from "@/src/components/admin/CreateTeacherModal";
import RepairTeacherEmailModal from "@/src/components/admin/RepairTeacherEmailModal";
import { getTeacherPage } from "@/src/lib/teacher-validation";
import { fetchTeachersFromApi } from "@/src/lib/teachers-api";
import type { UserRecord } from "@/src/lib/students-api";

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingTeacher, setViewingTeacher] = useState<UserRecord | null>(null);
  const [repairingTeacher, setRepairingTeacher] = useState<UserRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const loadTeachers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTeachersFromApi();
      setTeachers(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load teachers. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return loadTeachers();
    });
    return () => { active = false; };
  }, []);

  const handleTeacherCreated = (newTeacher: UserRecord) => {
    setTeachers((prev) => [newTeacher, ...prev]);
    setCurrentPage(1);
  };

  const page = getTeacherPage(teachers, search, statusFilter, currentPage);

  const handleTeacherRepaired = (updated: UserRecord) => {
    setTeachers(current => current.map(teacher => teacher.user_id === updated.user_id ? updated : teacher));
    setViewingTeacher(updated);
  };

  const getInitials = (first?: string | null, last?: string | null) => {
    const f = (first || "").trim()[0] || "";
    const l = (last || "").trim()[0] || "";
    return (f + l).toUpperCase() || "T";
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "N/A";
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            <span>Faculty &amp; Staff</span>
            <span>/</span>
            <span className="text-[#a4473a]">Teachers</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Teacher Directory</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage instructional staff accounts, credentials, and faculty records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void loadTeachers()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#a4473a] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow hover:bg-[#8e3d33] transition active:scale-95"
          >
            <UserPlus size={16} />
            <span>+ Create Teacher</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadTeachers()}
            className="text-xs font-bold underline hover:no-underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
          <div><h2 className="text-sm font-bold text-slate-900">All Teachers</h2><p className="mt-1 text-[11px] text-slate-400">{isLoading ? "Loading faculty roster..." : `${teachers.length} faculty records`}</p></div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <div className="relative w-full min-w-0 sm:w-64 sm:min-w-[240px] sm:flex-1 sm:max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                aria-label="Search teachers"
                placeholder="Search teacher by name, ID, or contact..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-[#a4473a] focus:ring-2 focus:ring-[#f7e5e2]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE");
                setCurrentPage(1);
              }}
              aria-label="Filter teachers by status"
              className="w-full max-w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 sm:w-auto text-xs sm:text-sm font-medium text-slate-700 outline-none transition focus:border-[#a4473a]"
            >
              <option value="ALL">All Statuses (Active &amp; Inactive)</option>
              <option value="ACTIVE">Active Faculty Only</option>
              <option value="INACTIVE">Inactive Faculty</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Teacher Details</th>
                <th className="px-4 py-3.5">Account ID</th>
                <th className="px-4 py-3.5">Contact Info &amp; Location</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 size={24} className="animate-spin text-[#a4473a]" />
                      <span className="text-xs">Loading faculty roster...</span>
                    </div>
                  </td>
                </tr>
              ) : page.total === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                      <Users size={24} />
                    </div>
                    <p className="font-semibold text-slate-800 text-sm">
                      {teachers.length === 0
                        ? "No teachers registered yet"
                        : "No teachers match your search query"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {teachers.length === 0
                        ? "Click \"+ Create Teacher\" above to add the first faculty member."
                        : "Try adjusting your search terms or filter settings."}
                    </p>
                  </td>
                </tr>
              ) : (
                page.rows.map((teacher) => {
                  const fullName = [
                    teacher.first_name,
                    teacher.middle_name,
                    teacher.last_name,
                    teacher.suffix,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  const isActive = teacher.status === "ACTIVE";

                  return (
                    <tr
                      key={teacher.user_id || teacher.account_id}
                      className="transition hover:bg-slate-50/50"
                    >
                      {/* Teacher Details */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#f7e5e2] bg-[#fcf5f4] text-xs font-bold text-[#a4473a]">
                            {getInitials(teacher.first_name, teacher.last_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900 text-sm">
                              {fullName || "Unnamed Teacher"}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Registered: {formatDate(teacher.created_at)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Account ID */}
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-800">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          {teacher.account_id || "N/A"}
                        </span>
                      </td>

                      {/* Contact Info & Location */}
                      <td className="px-4 py-3.5 text-xs">
                        <p className="font-semibold text-slate-800">
                          {teacher.contact_details?.contact_no || "No phone"}
                        </p>
                        <p className="text-slate-400 truncate max-w-[180px]">
                          {[
                            teacher.contact_details?.municipality,
                            teacher.contact_details?.province,
                          ]
                            .filter(Boolean)
                            .join(", ") || "No address specified"}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            {teacher.status || "Inactive"}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setViewingTeacher(teacher)}
                          title="View Profile"
                          aria-label={`View profile for ${fullName || teacher.account_id || "teacher"}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-[#fcf5f4] hover:text-[#a4473a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a4473a]"
                        >
                          <Eye size={17} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && !error && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
            <p role="status" className="text-[11px] text-slate-400">Showing <span className="font-semibold text-slate-600">{page.start}–{page.end}</span> of <span className="font-semibold text-slate-600">{page.total}</span> teachers</p>
            <nav aria-label="Teacher directory pagination" className="flex max-w-full flex-wrap items-center gap-1">
              <button type="button" aria-label="Previous page" disabled={page.currentPage === 1} onClick={() => setCurrentPage(page.currentPage - 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"><ChevronLeft size={15} /></button>
              {page.pages.map((number, index) => number === "ellipsis" ? <span key={`gap-${index}`} className="px-1.5 text-xs text-slate-400">…</span> : (
                <button key={number} type="button" aria-label={`Page ${number}`} aria-current={number === page.currentPage ? "page" : undefined} onClick={() => setCurrentPage(number)} className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition ${number === page.currentPage ? "bg-[#a4473a] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>{number}</button>
              ))}
              <button type="button" aria-label="Next page" disabled={page.currentPage === page.totalPages} onClick={() => setCurrentPage(page.currentPage + 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"><ChevronRight size={15} /></button>
            </nav>
          </div>
        )}
      </div>

      {/* Create Teacher Modal */}
      <CreateTeacherModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTeacherCreated={handleTeacherCreated}
      />

      {repairingTeacher && <RepairTeacherEmailModal key={repairingTeacher.user_id} teacher={repairingTeacher} onClose={() => setRepairingTeacher(null)} onRepaired={handleTeacherRepaired} />}

      {/* Teacher Profile Quick View Modal */}
      {viewingTeacher && !repairingTeacher && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div role="dialog" aria-modal="true" aria-label="Teacher profile" className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#f7e5e2] bg-[#fcf5f4] text-sm font-bold text-[#a4473a]">
                  {getInitials(viewingTeacher.first_name, viewingTeacher.last_name)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {[
                      viewingTeacher.first_name,
                      viewingTeacher.middle_name,
                      viewingTeacher.last_name,
                      viewingTeacher.suffix,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </h3>
                  <p className="text-xs font-mono text-[#a4473a] font-bold">
                    {viewingTeacher.account_id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingTeacher(null)}
                aria-label="Close teacher profile"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Content */}
            <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Status</span>
                  <span className="font-bold text-slate-800">
                    {viewingTeacher.status || "ACTIVE"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">System Role</span>
                  <span className="font-bold text-slate-800">
                    {viewingTeacher.role || "TEACHER"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Registered Date</span>
                  <span className="font-bold text-slate-800">
                    {formatDate(viewingTeacher.created_at)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3.5">
                <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500"><Mail size={14} />Account Email</p>
                {viewingTeacher.email ? <p className="break-all font-semibold text-slate-800">{viewingTeacher.email}</p> : (
                  <div><p className="text-xs leading-5 text-slate-500">An email is needed to complete this teacher’s sign-in setup.</p>
                    <button type="button" disabled={!viewingTeacher.user_id} onClick={() => setRepairingTeacher(viewingTeacher)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#fcf5f4] px-3 py-2 text-xs font-semibold text-[#a4473a] hover:bg-[#f7e5e2] disabled:opacity-50"><Mail size={14} />Set Up Sign-in Email</button>
                  </div>
                )}
              </div>

              {/* Personal Info */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">
                      Gender
                    </span>
                    <span className="font-semibold text-slate-800">
                      {viewingTeacher.personal_details?.gender || "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">
                      Birth Date
                    </span>
                    <span className="font-semibold text-slate-800">
                      {viewingTeacher.personal_details?.birth_date || "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">
                      Civil Status
                    </span>
                    <span className="font-semibold text-slate-800">
                      {viewingTeacher.personal_details?.civil_status || "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">
                      Nationality
                    </span>
                    <span className="font-semibold text-slate-800">
                      {viewingTeacher.personal_details?.nationality || "Filipino"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Contact &amp; Location
                </h4>
                <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone size={14} className="text-slate-400 shrink-0" />
                    <span>
                      {viewingTeacher.contact_details?.contact_no ||
                        "No contact number provided"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    <span>
                      {[
                        viewingTeacher.contact_details?.street_building_no,
                        viewingTeacher.contact_details?.municipality,
                        viewingTeacher.contact_details?.province,
                      ]
                        .filter(Boolean)
                        .join(", ") || "No address provided"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 shrink-0 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setViewingTeacher(null)}
                className="w-full rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
