"use client";

import StudentPageHeader, {
  studentContentCardClass,
} from "@/src/components/layout/student/StudentPageHeader";

import StudentLoading from "@/src/components/layout/student/StudentLoading";

import { useCallback, useState, Suspense } from "react";
import { RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { useStudentSubjects } from "@/src/context/StudentSubjectsContext";
import {
  getLearningProgramInfo,
  type CuratedStudyDeck,
} from "@/src/lib/curated-flashcards";
import {
  createFlashcardSession,
  flashcardStudyReducer,
  type FlashcardSession,
  type StudyAction,
} from "@/src/lib/flashcard-study";
import FlashcardStudy from "./FlashcardStudy";
import { useCuratedFlashcards } from "./useCuratedFlashcards";

function FlashcardLibraryContent({ ownerId }: { ownerId: string }) {
  const {
    program,
    subjects = [],
    loading: programLoading,
    error: programError,
    reload: reloadProgram,
  } = useStudentSubjects();
  const searchParams = useSearchParams();
  const requestedSubject = searchParams.get("subject");

  const studentProgram = program ? getLearningProgramInfo(program.code) : null;
  const {
    decks,
    loading: decksLoading,
    error: decksError,
    reload,
  } = useCuratedFlashcards(studentProgram?.code, {
    enabled: !programLoading && !programError && Boolean(program),
    scopeKey: ownerId,
  });

  const [search, setSearch] = useState("");
  const [subjectSelection, setSubjectSelection] = useState({
    requested: requestedSubject,
    value: requestedSubject || "ALL",
  });
  const selectedSubject =
    subjectSelection.requested === requestedSubject
      ? subjectSelection.value
      : requestedSubject || "ALL";
  const setSelectedSubject = (value: string) =>
    setSubjectSelection({ requested: requestedSubject, value });
  const [studyingId, setStudyingId] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [sessions, setSessions] = useState<Record<string, FlashcardSession>>(
    {},
  );

  const active = decks.find((deck) => deck.id === studyingId);
  const sessionKey = active ? `${active.id}:${active.updatedAt}` : "";

  const onAction = useCallback(
    (action: StudyAction) => {
      if (!active) return;
      setSessions((previous) => ({
        ...previous,
        [sessionKey]: flashcardStudyReducer(
          previous[sessionKey] || createFlashcardSession(active.cards),
          action,
        ),
      }));
    },
    [active, sessionKey],
  );

  const startStudy = (deck: CuratedStudyDeck) => {
    setStudyingId(deck.id);
    setFocused(false);
  };

  // Distinct subjects present in student's decks
  const availableSubjects = Array.from(
    new Set(decks.map((d) => d.subject)),
  ).filter(Boolean);

  const visible = decks.filter((deck) => {
    const matchesSearch =
      `${deck.title} ${deck.subject} ${deck.description} ${deck.cards.map((card) => `${card.term} ${card.definition}`).join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase().trim());

    if (selectedSubject === "ALL") return matchesSearch;

    const matchedSubjectObj = subjects.find((s) =>
      [s.subject_id, s.name, s.code].some(
        (value) =>
          value?.trim().toLowerCase() === selectedSubject.trim().toLowerCase(),
      ),
    );

    const matchesSubject =
      deck.subjectId === selectedSubject ||
      deck.subject.trim().toLowerCase() ===
        selectedSubject.trim().toLowerCase() ||
      (matchedSubjectObj &&
        (deck.subjectId === matchedSubjectObj.subject_id ||
          [matchedSubjectObj.name, matchedSubjectObj.code].some(
            (value) =>
              value?.trim().toLowerCase() === deck.subject.trim().toLowerCase(),
          )));

    return matchesSearch && matchesSubject;
  });

  if (programLoading)
    return <StudentLoading label="Opening your study sets..." />;
  if (programError || !studentProgram)
    return (
      <section
        role="alert"
        className="m-6 rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700"
      >
        <p>
          {programError ||
            "Your learning program could not be loaded. Please try again."}
        </p>
        <button
          type="button"
          onClick={reloadProgram}
          className="mt-3 font-semibold underline"
        >
          Try again
        </button>
      </section>
    );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 font-sans">
      {/* Header section (strictly view-only: no create button) */}
      <StudentPageHeader
        eyebrow={<>{studentProgram.label} Study Space</>}
        title="My study flashcards"
        description={
          <>
            Study key concepts curated by your teachers for{" "}
            <strong className="font-semibold text-white">
              {studentProgram.label}
            </strong>
            . Flip cards to practise at your own pace.
          </>
        }
        actions={
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-50">
            Enrolled: {studentProgram.label}
          </span>
        }
      />

      {decksError && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700"
        >
          <p>{decksError}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-1 font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Active Study View */}
      {active ? (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setStudyingId(null);
                setFocused(false);
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600"
            >
              Back to flashcards
            </button>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border ${"bg-blue-50 text-blue-700 border-blue-100"}`}
            >
              {active.programName} · {active.subject}
            </span>
          </div>

          <div
            className={`grid items-start gap-6 ${
              focused
                ? "mx-auto max-w-4xl"
                : "xl:grid-cols-[minmax(0,1fr)_260px]"
            }`}
          >
            <FlashcardStudy
              key={`${active.id}:${active.updatedAt}`}
              deck={active}
              session={
                sessions[sessionKey] || createFlashcardSession(active.cards)
              }
              onAction={onAction}
              focused={focused}
              onToggleFocus={() => setFocused((value) => !value)}
            />

            {!focused && (
              <aside className="hidden space-y-4 xl:block">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <h2 className="mb-3 px-1 text-sm font-semibold text-slate-800">
                    {studentProgram.label} sets
                  </h2>
                  <div className="space-y-2">
                    {decks.map((deck) => (
                      <button
                        type="button"
                        key={deck.id}
                        onClick={() => startStudy(deck)}
                        aria-pressed={active.id === deck.id}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          active.id === deck.id
                            ? "border-blue-200 bg-blue-50 text-blue-900 shadow-sm"
                            : "border-transparent text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-xs font-semibold leading-5 line-clamp-1">
                          {deck.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {deck.cards.length} cards · {deck.subject}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <h3 className="text-xs font-semibold text-blue-900">
                    Practice at your own pace
                  </h3>
                  <p className="mt-2 text-xs leading-6 text-blue-800/70">
                    These flashcards are prepared by your teachers. Practicing
                    helps you remember key ideas and does not affect your
                    grades.
                  </p>
                </div>
              </aside>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Search & Subject filter toolbar */}
          <section className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
            <div className="flex w-full min-w-0 flex-col gap-2 sm:w-64">
              <label
                htmlFor="student-flashcard-subject"
                className="text-xs font-medium text-slate-600"
              >
                Subject
              </label>
              <select
                id="student-flashcard-subject"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-400"
              >
                <option value="ALL">All Subjects ({decks.length})</option>
                {subjects.length > 0
                  ? subjects.map((sub) => (
                      <option key={sub.subject_id} value={sub.subject_id}>
                        {sub.name}
                      </option>
                    ))
                  : availableSubjects.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
              </select>
            </div>

            <label className="relative w-full sm:w-72">
              <span className="mb-2 block text-xs font-medium text-slate-600">
                Search flashcards
              </span>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, subject, or term…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-3 pr-3 text-xs outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <button
              type="button"
              onClick={reload}
              disabled={decksLoading}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={decksLoading ? "animate-spin" : ""}
              />
              Refresh sets
            </button>
          </section>

          {/* Decks Grid (strictly view-only: no edit or delete buttons) */}
          {decksLoading || programLoading ? (
            <StudentLoading label="Opening your study sets..." />
          ) : decksError ? null : !visible.length ? (
            <section className="relative overflow-hidden rounded-xl border border-blue-100 bg-white border border-slate-200 from-white via-white  p-8 text-center sm:p-12">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {decks.length
                  ? "No matching flashcards"
                  : "No flashcards published yet"}
              </h2>
              <p className="mt-2 text-xs leading-6 text-slate-500 sm:text-sm max-w-md mx-auto">
                {decks.length ? (
                  "Try another subject or search to find your study sets."
                ) : (
                  <>
                    Your teachers have not published any study sets for{" "}
                    <strong className="font-semibold text-slate-700">
                      {studentProgram.label}
                    </strong>{" "}
                    yet. Check back soon!
                  </>
                )}
              </p>
              {(search || selectedSubject !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedSubject("ALL");
                  }}
                  className="mt-4 font-semibold text-xs text-blue-600 underline"
                >
                  Clear filters
                </button>
              )}
            </section>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((deck) => (
                <article key={deck.id} className={studentContentCardClass}>
                  <div className="mb-6 flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${"bg-blue-50 text-blue-700 border-blue-100"}`}
                    >
                      {deck.programName}
                    </span>
                  </div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {deck.subject}
                  </p>
                  <h2 className="mt-2 break-words text-lg font-semibold leading-6 tracking-tight text-slate-900">
                    {deck.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-500">
                    {deck.description ||
                      "A collection of ideas to practise at your own pace."}
                  </p>
                  <p className="mb-6 mt-3 text-xs text-slate-500">
                    {deck.cards.length} cards · By {deck.author}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => startStudy(deck)}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Study set
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="mt-6 flex items-start gap-2 text-xs leading-6 text-slate-500">
            These flashcards are curated by teachers for {studentProgram.label}.
            Flipping and studying cards is private practice and does not affect
            your grades.
          </p>
        </>
      )}
    </div>
  );
}

export default function FlashcardLibrary(props: { ownerId: string }) {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-sm text-slate-500">
          Opening your study sets…
        </div>
      }
    >
      <FlashcardLibraryContent {...props} />
    </Suspense>
  );
}
