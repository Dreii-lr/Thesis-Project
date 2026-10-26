"use client";

import Image from "next/image";
import { useSidebar } from "@/src/context/SidebarContext";
import {
  LayoutDashboard,
  GraduationCap,
  UserPlus,
  UserCheck,
  ClipboardCheck,
  BookOpen,
  Layers,
  ChartNoAxesCombined,
  User,
  Users,
  Layers3,
  ChevronDown,
  FileCheck2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getUserCategories, type UserCategoryItem } from "@/src/lib/user-categories-api";
import { listSubjects } from "@/src/lib/subjects-api";

export default function AdminSidebar() {
  const { isExpanded } = useSidebar();
  const pathname = usePathname();

  const [flashcardsOpen, setFlashcardsOpen] = useState(true);
  const [categories, setCategories] = useState<UserCategoryItem[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getUserCategories().catch(() => []),
      listSubjects().catch(() => []),
    ])
      .then(([cats, subs]) => {
        if (!active) return;
        const enriched = (cats || []).map((cat) => {
          const catSubs = (subs || []).filter(
            (s) =>
              (s.category_id && s.category_id === cat.category_id) ||
              (s.category_code && (cat.code || '').toUpperCase() === s.category_code.toUpperCase()),
          );
          return {
            ...cat,
            subjects: catSubs.map((s) => ({
              subject_id: s.subject_id,
              name: s.name,
              category_id: s.category_id,
              is_active: s.is_active,
              created_at: s.created_at,
            })),
          };
        });
        setCategories(enriched);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingCategories(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const navSections = [
    {
      title: "LEARNER MANAGEMENT",
      items: [
        { name: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
        { name: "Students", icon: GraduationCap, href: "/admin/students" },
        { name: "Requirements", icon: FileCheck2, href: "/admin/requirements" },
        { name: "Learner Mapping", icon: UserPlus, href: "/admin/mapping" },
        { name: "Learner Accounts", icon: UserCheck, href: "/admin/create-account" },
        { name: "Attendance", icon: ClipboardCheck, href: "/admin/attendance" },
      ],
    },
    {
      title: "FACULTY & STAFF",
      items: [
        { name: "Teachers", icon: Users, href: "/admin/teachers" },
      ],
    },
    {
      title: "ACADEMICS & ASSESSMENTS",
      items: [
        { name: "Analysis", icon: ChartNoAxesCombined, href: "/admin/analysis" },
      ],
    },
    {
      title: "LEARNING PROGRAMS",
      items: [
        { name: "Subjects", icon: BookOpen, href: "/admin/subjects" },
        { name: "Learning Programs", icon: Layers, href: "/admin/user-categories" },
        { name: "Flashcards", icon: Layers3, href: "/admin/flashcards" },
      ],
    },
    {
      title: "ACCOUNT",
      items: [{ name: "My Profile", icon: User, href: "/admin/profile" }],
    },
  ];

  const isItemActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === "/admin" || pathname === "/admin/dashboard";
    }

    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <aside
      className={`${
        isExpanded ? "w-[272px]" : "w-[84px]"
      } sticky top-0 z-20 hidden h-screen shrink-0 flex-col border-r border-slate-200/80 bg-white transition-all duration-300 ease-in-out md:flex`}
    >
      <div
        className={`flex h-[72px] items-center border-b border-slate-100 ${
          isExpanded ? "justify-start px-5" : "justify-center px-3"
        }`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 shadow-sm">
          <Image
            src="/logo.png"
            alt="ALS Logo"
            width={44}
            height={44}
            className="h-10 w-10 object-contain"
          />
        </div>

        {isExpanded && (
          <div className="ml-3 min-w-0">
            <p className="truncate text-[15px] font-bold tracking-tight text-slate-900">
              LMS Assistant
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
              ALS Admin Portal
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-5">
        {navSections.map((section) => (
          <div key={section.title}>
            {isExpanded ? (
              <h3 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {section.title}
              </h3>
            ) : (
              <div className="mx-3 mb-3 h-px bg-slate-100" />
            )}

            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = isItemActive(item.href);

                if (item.name === "Flashcards") {
                  if (!isExpanded) {
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`group relative flex h-10 items-center justify-center rounded-xl transition-all duration-200 ${
                          isActive
                            ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                        }`}
                        title="Flashcards"
                      >
                        <Layers3
                          size={18}
                          className={`shrink-0 ${
                            isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700"
                          }`}
                          strokeWidth={isActive ? 2.25 : 1.9}
                        />
                      </Link>
                    );
                  }

                  return (
                    <div key={item.name} className="space-y-1">
                      <div
                        className={`group relative flex h-10 items-center justify-between rounded-xl transition-all duration-200 ${
                          isActive
                            ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                        }`}
                      >
                        <Link
                          href="/admin/flashcards"
                          className="flex flex-1 items-center px-3 h-full min-w-0"
                        >
                          {isActive && (
                            <span className="absolute left-0 h-5 w-1 rounded-r-full bg-blue-600" />
                          )}
                          <Layers3
                            size={18}
                            className={`shrink-0 ${
                              isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700"
                            }`}
                            strokeWidth={isActive ? 2.25 : 1.9}
                          />
                          <span className="ml-3 truncate text-[13px] font-medium">
                            Flashcards
                          </span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => setFlashcardsOpen(!flashcardsOpen)}
                          className="mr-2 p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                          title={flashcardsOpen ? "Collapse programs" : "Expand programs"}
                        >
                          <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ${
                              flashcardsOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>

                      {flashcardsOpen && (
                        <div className="ml-4 mt-1 space-y-1 border-l border-slate-100 pl-2.5">
                          {loadingCategories && (
                            <p className="px-2 py-1 text-[11px] text-slate-400">Loading programs...</p>
                          )}
                          {!loadingCategories &&
                            categories.map((cat) => {
                              const isCatOpen =
                                openCategory === cat.category_id || openCategory === cat.code;
                              const catSubjects = cat.subjects || [];

                              return (
                                <div key={cat.category_id || cat.code} className="space-y-0.5">
                                  <div className="flex items-center justify-between group rounded-lg px-2 py-1.5 hover:bg-slate-50">
                                    <Link
                                      href={`/admin/flashcards?program=${(cat.code || '').toLowerCase()}`}
                                      className="truncate text-[11px] font-semibold text-slate-700 hover:text-blue-600 flex-1"
                                    >
                                      {cat.name}
                                    </Link>
                                    {catSubjects.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setOpenCategory(
                                            isCatOpen ? null : cat.category_id || cat.code,
                                          );
                                        }}
                                        className="p-0.5 text-slate-400 hover:text-slate-600"
                                      >
                                        <ChevronDown
                                          size={11}
                                          className={`transition-transform duration-150 ${
                                            isCatOpen ? "rotate-180" : ""
                                          }`}
                                        />
                                      </button>
                                    )}
                                  </div>

                                  {isCatOpen && catSubjects.length > 0 && (
                                    <div className="ml-2 space-y-0.5 border-l border-slate-200 pl-2 py-0.5">
                                      {catSubjects.map((sub) => (
                                        <Link
                                          key={sub.subject_id}
                                          href={`/admin/flashcards?program=${(cat.code || '').toLowerCase()}&subject=${sub.subject_id}`}
                                          className="block truncate rounded px-1.5 py-1 text-[10px] text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                                          title={sub.name}
                                        >
                                          {sub.name}
                                        </Link>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-label={item.name}
                    aria-current={isActive ? "page" : undefined}
                    className={`group relative flex h-10 items-center rounded-xl transition-all duration-200 ${
                      isExpanded ? "justify-start px-3" : "justify-center px-0"
                    } ${
                      isActive
                        ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                    title={!isExpanded ? item.name : undefined}
                  >
                    {isActive && isExpanded && (
                      <span className="absolute left-0 h-5 w-1 rounded-r-full bg-blue-600" />
                    )}

                    <item.icon
                      size={18}
                      className={`shrink-0 transition-colors ${
                        isActive
                          ? "text-blue-600"
                          : "text-slate-400 group-hover:text-slate-700"
                      }`}
                      strokeWidth={isActive ? 2.25 : 1.9}
                    />

                    {isExpanded && (
                      <span className="ml-3 truncate text-[13px] font-medium">
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {isExpanded && (
        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-inset ring-slate-100">
            <p className="text-[11px] font-semibold text-slate-700">
              Alternative Learning System
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
              Lifelong learning through accessible digital tools.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
