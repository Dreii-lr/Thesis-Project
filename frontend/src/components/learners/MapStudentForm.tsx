"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Phone,
  Plus,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useStudents } from "@/src/context/StudentContext";
import Modal from "@/src/components/ui/Modal";
import { SessionError } from "@/src/lib/auth-api";
import {
  getUserCategories,
  type UserCategoryItem,
} from "@/src/lib/user-categories-api";
import type { StudentMappingPayload } from "@/src/lib/students-api";
import type { TargetCategory } from "@/src/lib/assessments-api";

interface SiblingRow {
  id: string;
  name: string;
  last_grade_level_completed: string;
  occupation: string;
}

export interface MapStudentFormProps {
  role: "admin" | "teacher";
  basePath: string;
}

export default function MapStudentForm({ role, basePath }: MapStudentFormProps) {
  const router = useRouter();
  const isAdmin = role === "admin";
  const { mapStudent, refreshStudents } = useStudents();
  const formRef = useRef<HTMLFormElement>(null);
  const pending = useRef(false);

  const [categories, setCategories] = useState<UserCategoryItem[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mappingConflict, setMappingConflict] = useState(false);

  const [siblings, setSiblings] = useState<SiblingRow[]>([]);

  const [modalData, setModalData] = useState<{
    isOpen: boolean;
    name: string;
    id: string;
    recordId: string;
    category: string;
  }>({
    isOpen: false,
    name: "",
    id: "",
    recordId: "",
    category: "",
  });

  useEffect(() => {
    let active = true;
    getUserCategories()
      .then((data) => {
        if (active && Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch((err) => {
        console.warn("Failed to load categories:", err);
      })
      .finally(() => {
        if (active) setIsCategoriesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const addSibling = () => {
    setSiblings((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: "",
        last_grade_level_completed: "",
        occupation: "",
      },
    ]);
  };

  const updateSibling = (
    id: string,
    field: keyof Omit<SiblingRow, "id">,
    value: string,
  ) => {
    setSiblings((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const removeSibling = (id: string) => {
    setSiblings((prev) => prev.filter((row) => row.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending.current || modalData.isOpen) return;

    setError(null);
    setMappingConflict(false);

    const formData = new FormData(e.currentTarget);
    const firstName = ((formData.get("first_name") as string) || "").trim();
    const lastName = ((formData.get("last_name") as string) || "").trim();
    const birthDate = ((formData.get("birth_date") as string) || "").trim();
    const userCategory = (
      (formData.get("user_category") as string) || ""
    ).trim() as TargetCategory;
    const lrnNumber = ((formData.get("lrn_number") as string) || "").trim();
    const email = ((formData.get("email") as string) || "").trim();

    if (!firstName || !lastName) {
      setError("First name and last name are required.");
      return;
    }
    if (!birthDate) {
      setError("Birth date is required.");
      return;
    }
    if (!userCategory) {
      setError("Please select a learning program.");
      return;
    }

    pending.current = true;
    setIsSubmitting(true);

    const validSiblings = siblings
      .filter(
        (s) =>
          s.name.trim() ||
          s.last_grade_level_completed.trim() ||
          s.occupation.trim(),
      )
      .map((s) => ({
        name: s.name.trim() || null,
        last_grade_level_completed: s.last_grade_level_completed.trim() || null,
        occupation: s.occupation.trim() || null,
      }));

    const payload: StudentMappingPayload = {
      email: email || null,
      first_name: firstName,
      last_name: lastName,
      middle_name:
        ((formData.get("middle_name") as string) || "").trim() || null,
      suffix: ((formData.get("suffix") as string) || "").trim() || null,
      user_category: userCategory,
      personal_details: {
        is_interested: formData.get("is_interested") === "true",
        gender: ((formData.get("gender") as string) || "").trim() || null,
        birth_date: birthDate,
        nationality:
          ((formData.get("nationality") as string) || "").trim() || "Filipino",
        civil_status:
          ((formData.get("civil_status") as string) || "").trim() || null,
        religion: ((formData.get("religion") as string) || "").trim() || null,
        learning_modalities:
          (formData.get("learning_modalities") as string as
            | "FTF"
            | "BLENDED") || "FTF",
        lrn_number: lrnNumber || null,
      },
      contact_details: {
        street_building_no:
          ((formData.get("street_building_no") as string) || "").trim() || null,
        municipality:
          ((formData.get("municipality") as string) || "").trim() || null,
        province: ((formData.get("province") as string) || "").trim() || null,
        contact_no:
          ((formData.get("contact_no") as string) || "").trim() || null,
      },
      family_details: {
        mother: {
          name: ((formData.get("mother_name") as string) || "").trim() || null,
          contact_no:
            ((formData.get("mother_contact_no") as string) || "").trim() ||
            null,
        },
        father: {
          name: ((formData.get("father_name") as string) || "").trim() || null,
          contact_no:
            ((formData.get("father_contact_no") as string) || "").trim() ||
            null,
        },
        guardian: {
          name:
            ((formData.get("guardian_name") as string) || "").trim() || null,
          contact_no:
            ((formData.get("guardian_contact_no") as string) || "").trim() ||
            null,
        },
        siblings: validSiblings.length > 0 ? validSiblings : [],
      },
    };

    try {
      const mappedStudent = await mapStudent(payload);
      await refreshStudents();

      setModalData({
        isOpen: true,
        name: `${mappedStudent.first_name} ${mappedStudent.last_name}`.trim(),
        id:
          mappedStudent.account_id ||
          mappedStudent.id ||
          mappedStudent.email ||
          "Assigned on record",
        recordId: mappedStudent.id,
        category: mappedStudent.user_category || userCategory,
      });
    } catch (err: unknown) {
      const isConflict =
        (err instanceof SessionError && err.status === 409) ||
        (err instanceof Error &&
          err.message.toLowerCase().includes("already exists"));

      setMappingConflict(isConflict);
      if (isConflict) {
        setError(
          lrnNumber
            ? `Learner Reference Number (LRN: ${lrnNumber}) or email is already recorded in the system. Check existing learner records.`
            : "A learner with these matching details is already mapped or registered in the database.",
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while inserting the student details.",
        );
      }
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-500";
  const labelClass =
    "text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 block";

  return (
    <div className="w-full min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div>
          <Link
            href={basePath}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors mb-3"
          >
            <ArrowLeft size={16} /> Back to {isAdmin ? "Learner Mapping" : "Learner Accounts"}
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Map New Learner
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Insert student details to register and map them in the system.
                Required fields are marked with an asterisk (
                <span className="text-red-500 font-bold">*</span>).
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200"
          >
            <div>
              <p className="font-semibold text-red-800">Registration Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
            {mappingConflict && (
              <Link
                href={basePath}
                className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 font-medium text-xs whitespace-nowrap transition-colors"
              >
                View Learners
              </Link>
            )}
          </div>
        )}

        {/* Main Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          <fieldset
            disabled={isSubmitting || modalData.isOpen}
            className="space-y-6"
          >
            {/* 1. Academic & Program Details */}
            <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Academic & Program Details
                  </h2>
                  <p className="text-xs text-slate-500">
                    Program classification and learning modality settings
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label htmlFor="user_category" className={labelClass}>
                    Learning Program <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="user_category"
                    name="user_category"
                    required
                    defaultValue="SECONDARY"
                    className={inputClass}
                  >
                    {isCategoriesLoading && categories.length === 0 ? (
                      <option value="SECONDARY">Loading programs...</option>
                    ) : (
                      categories.map((cat) => (
                        <option
                          key={cat.category_id}
                          value={cat.code.toUpperCase()}
                        >
                          {cat.name} ({cat.code})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label htmlFor="learning_modalities" className={labelClass}>
                    Learning Modality
                  </label>
                  <select
                    id="learning_modalities"
                    name="learning_modalities"
                    defaultValue="FTF"
                    className={inputClass}
                  >
                    <option value="FTF">Face-to-Face (FTF)</option>
                    <option value="BLENDED">Blended</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="is_interested" className={labelClass}>
                    Interested in ALS Program
                  </label>
                  <select
                    id="is_interested"
                    name="is_interested"
                    defaultValue="true"
                    className={inputClass}
                  >
                    <option value="true">Yes (Interested)</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
            </section>

            {/* 2. Personal Information */}
            <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <User size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Personal Information
                  </h2>
                  <p className="text-xs text-slate-500">
                    Basic identification and personal profile details
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label htmlFor="first_name" className={labelClass}>
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    required
                    placeholder="Enter first name"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="middle_name" className={labelClass}>
                    Middle Name
                  </label>
                  <input
                    id="middle_name"
                    name="middle_name"
                    type="text"
                    placeholder="Enter middle name"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className={labelClass}>
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    required
                    placeholder="Enter last name"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="suffix" className={labelClass}>
                    Suffix
                  </label>
                  <input
                    id="suffix"
                    name="suffix"
                    type="text"
                    placeholder="e.g., Jr., III"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="birth_date" className={labelClass}>
                    Birth Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="birth_date"
                    name="birth_date"
                    type="date"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="gender" className={labelClass}>
                    Gender
                  </label>
                  <select id="gender" name="gender" className={inputClass}>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="civil_status" className={labelClass}>
                    Civil Status
                  </label>
                  <select
                    id="civil_status"
                    name="civil_status"
                    className={inputClass}
                  >
                    <option value="">Select status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="nationality" className={labelClass}>
                    Nationality
                  </label>
                  <input
                    id="nationality"
                    name="nationality"
                    type="text"
                    defaultValue="Filipino"
                    placeholder="e.g., Filipino"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="religion" className={labelClass}>
                    Religion
                  </label>
                  <input
                    id="religion"
                    name="religion"
                    type="text"
                    placeholder="e.g., Roman Catholic"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label htmlFor="lrn_number" className={labelClass}>
                    Learner Reference Number (LRN)
                  </label>
                  <input
                    id="lrn_number"
                    name="lrn_number"
                    type="text"
                    placeholder="12-digit LRN (if available)"
                    maxLength={12}
                    className={inputClass}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Standard 12-digit DepEd reference number. Leave blank if the
                    student is a new enrollee without prior records.
                  </p>
                </div>
              </div>
            </section>

            {/* 3. Contact Details */}
            <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Phone size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Contact & Address Details
                  </h2>
                  <p className="text-xs text-slate-500">
                    Learner residential address and active contact information
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label htmlFor="street_building_no" className={labelClass}>
                    Street / Building / House No.
                  </label>
                  <input
                    id="street_building_no"
                    name="street_building_no"
                    type="text"
                    placeholder="e.g., 123 Rizal St."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="municipality" className={labelClass}>
                    Barangay / Municipality / City
                  </label>
                  <input
                    id="municipality"
                    name="municipality"
                    type="text"
                    placeholder="e.g., San Jose, Pasig"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="province" className={labelClass}>
                    Province
                  </label>
                  <input
                    id="province"
                    name="province"
                    type="text"
                    placeholder="e.g., Metro Manila / Rizal"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="contact_no" className={labelClass}>
                    Primary Contact Number
                  </label>
                  <input
                    id="contact_no"
                    name="contact_no"
                    type="tel"
                    placeholder="e.g., 09123456789"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="email" className={labelClass}>
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="e.g., student@example.com (optional)"
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            {/* 4. Family & Guardian Details */}
            <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Users size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Family & Guardian Details
                  </h2>
                  <p className="text-xs text-slate-500">
                    Parent and guardian contact records
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Mother */}
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Mother Information
                  </h3>
                  <div>
                    <label htmlFor="mother_name" className={labelClass}>
                      Mother's Name
                    </label>
                    <input
                      id="mother_name"
                      name="mother_name"
                      type="text"
                      placeholder="Full name of mother"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="mother_contact_no" className={labelClass}>
                      Contact Number
                    </label>
                    <input
                      id="mother_contact_no"
                      name="mother_contact_no"
                      type="tel"
                      placeholder="e.g., 09123456789"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Father */}
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Father Information
                  </h3>
                  <div>
                    <label htmlFor="father_name" className={labelClass}>
                      Father's Name
                    </label>
                    <input
                      id="father_name"
                      name="father_name"
                      type="text"
                      placeholder="Full name of father"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="father_contact_no" className={labelClass}>
                      Contact Number
                    </label>
                    <input
                      id="father_contact_no"
                      name="father_contact_no"
                      type="tel"
                      placeholder="e.g., 09123456789"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Guardian */}
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Guardian Information
                  </h3>
                  <div>
                    <label htmlFor="guardian_name" className={labelClass}>
                      Guardian's Name
                    </label>
                    <input
                      id="guardian_name"
                      name="guardian_name"
                      type="text"
                      placeholder="Full name of guardian"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="guardian_contact_no" className={labelClass}>
                      Contact Number
                    </label>
                    <input
                      id="guardian_contact_no"
                      name="guardian_contact_no"
                      type="tel"
                      placeholder="e.g., 09123456789"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 5. Sibling Information */}
            <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Sibling Information
                    </h2>
                    <p className="text-xs text-slate-500">
                      Record brothers and sisters educational/work background
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addSibling}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold transition-colors self-start sm:self-auto"
                >
                  <Plus size={14} /> Add Sibling
                </button>
              </div>

              {siblings.length === 0 ? (
                <div className="text-center py-6 px-4 border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs">
                  No siblings added. Click{" "}
                  <span className="font-semibold text-purple-700">
                    "Add Sibling"
                  </span>{" "}
                  if the learner has sibling details to record.
                </div>
              ) : (
                <div className="space-y-3">
                  {siblings.map((sibling, index) => (
                    <div
                      key={sibling.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col md:flex-row gap-4 items-start md:items-end animate-in fade-in duration-200"
                    >
                      <div className="flex-1 w-full">
                        <label className={labelClass}>
                          Sibling #{index + 1} Name
                        </label>
                        <input
                          type="text"
                          value={sibling.name}
                          onChange={(e) =>
                            updateSibling(sibling.id, "name", e.target.value)
                          }
                          placeholder="Full name"
                          className={inputClass}
                        />
                      </div>
                      <div className="flex-1 w-full">
                        <label className={labelClass}>
                          Last Grade Completed
                        </label>
                        <input
                          type="text"
                          value={sibling.last_grade_level_completed}
                          onChange={(e) =>
                            updateSibling(
                              sibling.id,
                              "last_grade_level_completed",
                              e.target.value,
                            )
                          }
                          placeholder="e.g., Grade 10"
                          className={inputClass}
                        />
                      </div>
                      <div className="flex-1 w-full">
                        <label className={labelClass}>Occupation</label>
                        <input
                          type="text"
                          value={sibling.occupation}
                          onChange={(e) =>
                            updateSibling(
                              sibling.id,
                              "occupation",
                              e.target.value,
                            )
                          }
                          placeholder="e.g., Student / Employed"
                          className={inputClass}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSibling(sibling.id)}
                        className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        title="Remove sibling"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <Link
                href={basePath}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? "Mapping Student..." : "Map Student"}
              </button>
            </div>
          </fieldset>
        </form>

        {/* Success Modal */}
        {modalData.isOpen && (
          <Modal
            title="Student Mapped Successfully"
            onClose={() => {
              setModalData((prev) => ({ ...prev, isOpen: false }));
              router.push(basePath);
            }}
          >
            <div className="text-center pt-2 pb-4">
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={36} className="text-emerald-600" />
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Learner Record Saved!
              </h2>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed max-w-sm mx-auto">
                {isAdmin
                  ? "The student details have been saved to the database. You can now review their record and create their official student account, or return to the directory."
                  : "The student details have been inserted into the database. You can now review their record, or return to the directory. An administrator will review and activate their student account."}
              </p>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-left mb-6 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 text-xs font-semibold uppercase">
                    Learner
                  </span>
                  <span className="font-semibold text-slate-900">
                    {modalData.name}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-200/50 pt-2">
                  <span className="text-slate-500 text-xs font-semibold uppercase">
                    Learning Program
                  </span>
                  <span className="font-medium text-slate-800">
                    {modalData.category}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-200/50 pt-2">
                  <span className="text-slate-500 text-xs font-semibold uppercase">
                    ID / Reference
                  </span>
                  <span className="font-mono text-xs text-blue-600 font-semibold">
                    {modalData.id}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalData((prev) => ({ ...prev, isOpen: false }));
                    router.push(basePath);
                  }}
                  className="flex-1 py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  {isAdmin ? "Back to Learner Mapping" : "Back to Accounts"}
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    setModalData((prev) => ({ ...prev, isOpen: false }));
                    router.push(
                      isAdmin
                        ? `/admin/mapping/${encodeURIComponent(modalData.recordId)}`
                        : `/teacher/learner-accounts/${encodeURIComponent(modalData.recordId)}`,
                    );
                  }}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  {isAdmin ? "Review & Create Learner Account" : "Review Learner Record"}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
