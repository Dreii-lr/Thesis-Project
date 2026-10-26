"use client";

import { useSidebar } from "@/src/context/SidebarContext";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeft, Home, ChevronRight } from "lucide-react";
import ProfileDropdown from "@/src/components/layout/ProfileDropDown";
import NotificationBell from "@/src/components/notifications/NotificationBell";
import Link from "next/link";

export default function Header() {
  const { toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = pathname.startsWith("/admin");
  const isFlashcardDraft =
    /^\/(?:teacher|admin)\/flashcards\/drafts\/[^/]+\/?$/.test(pathname);
  const homeHref = isAdmin ? "/admin/dashboard" : "/teacher/dashboard";
  const mobileLinks = isAdmin
    ? [
        ["Dashboard", "/admin/dashboard"],
        ["Students", "/admin/students"],
        ["Requirements", "/admin/requirements"],
        ["Learner Mapping", "/admin/mapping"],
        ["Attendance", "/admin/attendance"],
        ["Subjects", "/admin/subjects"],
        ["Learning Programs", "/admin/user-categories"],
        ["My Profile", "/admin/profile"],
      ]
    : [
        ["Dashboard", "/teacher/dashboard"],
        ["Students", "/teacher/students"],
        ["Student Requirements", "/teacher/requirements"],
        ["Learner Accounts", "/teacher/learner-accounts/mapping"],
        ["Attendance", "/teacher/attendance"],
        ["Lesson Modules", "/teacher/lesson-content"],
        ["Flashcards", "/teacher/flashcards"],
        ["Calendar", "/teacher/calendar"],
        ["Assessment Task", "/teacher/assessment-tasks"],
        ["Submissions", "/teacher/submissions"],
        ["Item Analysis", "/teacher/item-analysis"],
      ];

  const pathSegments = pathname?.split("/").filter(Boolean) || [];
  const breadcrumbSegments = isFlashcardDraft
    ? ["flashcards", "draft-editor"]
    : pathSegments.filter(
        (segment) => segment !== "teacher" && segment !== "admin",
      );

  const formatSegment = (segment: string) => {
    return segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <header className="sticky top-0 z-[60] flex h-[72px] w-full shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 md:flex"
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={19} strokeWidth={1.8} />
        </button>

        <select
          aria-label="Navigate workspace"
          value={
            mobileLinks.find(
              ([, href]) =>
                pathname === href || pathname.startsWith(`${href}/`),
            )?.[1] || ""
          }
          onChange={(event) => {
            const href = event.target.value;
            if (
              isFlashcardDraft &&
              !window.dispatchEvent(
                new CustomEvent("als-flashcard-draft-navigate", {
                  detail: { href },
                  cancelable: true,
                }),
              )
            )
              return;
            router.push(href);
          }}
          className="max-w-44 rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700 md:hidden"
        >
          <option value="" disabled>
            Navigation
          </option>
          {mobileLinks.map(([name, href]) => (
            <option key={href} value={href}>
              {name}
            </option>
          ))}
        </select>

        <div className="hidden h-5 w-px bg-slate-200 sm:block" />

        <div className="hidden min-w-0 items-center gap-1.5 text-[13px] text-slate-400 sm:flex">
          <Link
            href={homeHref}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-slate-50 hover:text-blue-600"
            title="Dashboard"
          >
            <Home size={15} strokeWidth={1.8} />
          </Link>

          {breadcrumbSegments.map((segment, index) => {
            const segmentIndex = pathSegments.indexOf(segment);
            const href =
              "/" + pathSegments.slice(0, segmentIndex + 1).join("/");
            const isLast = index === breadcrumbSegments.length - 1;

            return (
              <div
                key={`${segment}-${index}`}
                className="flex min-w-0 items-center gap-1.5"
              >
                <ChevronRight
                  size={14}
                  strokeWidth={1.7}
                  className="shrink-0 text-slate-300"
                />

                {isLast ? (
                  <span className="max-w-[260px] truncate font-semibold text-slate-700">
                    {formatSegment(segment)}
                  </span>
                ) : (
                  <Link
                    href={href}
                    className="max-w-[180px] truncate transition-colors hover:text-blue-600"
                  >
                    {formatSegment(segment)}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationBell role={isAdmin ? "admin" : "teacher"} />

        <div className="hidden h-6 w-px bg-slate-200 sm:block" />
        <ProfileDropdown />
      </div>
    </header>
  );
}
