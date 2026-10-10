"use client";

import Image from "next/image";
import { useSidebar } from "@/src/context/SidebarContext";
import {
  LayoutDashboard,
  GraduationCap,
  UserPlus,
  ClipboardCheck,
  CloudUpload,
  SquareText,
  FileCheck,
  Library,
  FilePlus,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TeacherSidebar() {
  const { isExpanded } = useSidebar();
  const pathname = usePathname();

  const navSections = [
    {
      title: "LEARNER MANAGEMENT",
      items: [
        {
          name: "Dashboard",
          icon: LayoutDashboard,
          href: "/teacher/dashboard",
        },
        { name: "Students", icon: GraduationCap, href: "/teacher/students" },
        {
          name: "Create Account",
          icon: UserPlus,
          href: "/teacher/create-account",
        },
        {
          name: "Attendance",
          icon: ClipboardCheck,
          href: "/teacher/attendance",
        },
      ],
    },
    {
      title: "CONTENT MANAGEMENT",
      items: [
        {
          name: "Module Uploads",
          icon: CloudUpload,
          href: "/teacher/module-uploads",
        },
        {
          name: "Lesson Content",
          icon: SquareText,
          href: "/teacher/lesson-content",
        },
        { name: "Calendar", icon: Library, href: "/teacher/calendar" },
      ],
    },
    {
      title: "ACADEMICS & ASSESSMENTS",
      items: [
        {
          name: "Assessment Task",
          icon: FilePlus,
          href: "/teacher/assessment-tasks",
        },
        { name: "Submissions", icon: FileText, href: "/teacher/submissions" },
      ],
    },
  ];

  const isItemActive = (href: string) => {
    if (href === "/teacher/dashboard") {
      return pathname === "/teacher" || pathname === "/teacher/dashboard";
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
              ALS Teacher Portal
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

                return (
                  <Link
                    key={item.name}
                    href={item.href}
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
