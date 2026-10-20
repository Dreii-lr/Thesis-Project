'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  Layers3,
  Search,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { useStudentSubjects } from '@/src/context/StudentSubjectsContext';
import {
  LEARNING_PROGRAMS,
  getProgramBadgeClass,
  getLearningProgramInfo,
  type CuratedStudyDeck,
  type LearningProgramCode,
} from '@/src/lib/curated-flashcards';
import {
  createFlashcardSession,
  flashcardStudyReducer,
  type FlashcardSession,
  type StudyAction,
} from '@/src/lib/flashcard-study';
import FlashcardStudy from './FlashcardStudy';
import { useCuratedFlashcards } from './useCuratedFlashcards';

function FlashcardLibraryContent({ ownerId }: { ownerId: string }) {
  const { program, subjects = [], loading: programLoading } = useStudentSubjects();
  const searchParams = useSearchParams();
  const requestedSubject = searchParams.get('subject');

  // Resolve student's program code (SECONDARY, ELEMENTARY, or BLP)
  const rawCode = (program?.code || '').toUpperCase();
  const studentProgram: LearningProgramCode = rawCode.includes('ELEM')
    ? 'ELEMENTARY'
    : rawCode.includes('BLP') || rawCode.includes('BASIC')
    ? 'BLP'
    : 'SECONDARY';

  const { decks, loading: decksLoading, error: decksError, reload } = useCuratedFlashcards(studentProgram);

  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [studyingId, setStudyingId] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [sessions, setSessions] = useState<Record<string, FlashcardSession>>({});

  useEffect(() => {
    if (requestedSubject) {
      setSelectedSubject(requestedSubject);
    }
  }, [requestedSubject]);

  const active = decks.find((deck) => deck.id === studyingId);
  const sessionKey = active ? `${active.id}:${active.updatedAt}` : '';

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
  const availableSubjects = Array.from(new Set(decks.map((d) => d.subject))).filter(Boolean);

  const visible = decks.filter((deck) => {
    const matchesSearch = `${deck.title} ${deck.subject} ${deck.description}`
      .toLowerCase()
      .includes(search.toLowerCase().trim());

    if (selectedSubject === 'ALL') return matchesSearch;

    const matchedSubjectObj = subjects.find(
      (s) => s.subject_id === selectedSubject || s.name.toLowerCase() === selectedSubject.toLowerCase(),
    );

    const matchesSubject =
      deck.subjectId === selectedSubject ||
      deck.subject === selectedSubject ||
      (matchedSubjectObj &&
        (deck.subjectId === matchedSubjectObj.subject_id ||
          deck.subject.toLowerCase() === matchedSubjectObj.name.toLowerCase()));

    return matchesSearch && matchesSubject;
  });

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 font-sans">
      {/* Header section (strictly view-only: no create button) */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
            <Layers3 size={13} /> {LEARNING_PROGRAMS[studentProgram].label} Study Space
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            My study flashcards
          </h1>
          <p className="mt-1.5 text-xs leading-6 text-slate-500 sm:text-sm">
            Study key concepts curated by your teachers for{' '}
            <strong className="font-semibold text-slate-700">
              {LEARNING_PROGRAMS[studentProgram].label}
            </strong>
            . Flip cards to practise at your own pace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border ${
              LEARNING_PROGRAMS[studentProgram].badgeClass
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current opacity-70"></span>
            Enrolled: {LEARNING_PROGRAMS[studentProgram].label}
          </span>
        </div>
      </div>

      {decksError && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700"
        >
          <p>{decksError}</p>
          <button type="button" onClick={reload} className="mt-1 font-semibold underline">
            Try again
          </button>
        </div>
      )}

      {/* Active Study View */}
      {active ? (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setStudyingId(null);
                setFocused(false);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600"
            >
              <ArrowLeft size={15} /> Back to flashcards
            </button>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold border ${getProgramBadgeClass(
                active.programCode,
              )}`}
            >
              {active.programName} · {active.subject}
            </span>
          </div>

          <div
            className={`grid items-start gap-6 ${
              focused ? 'mx-auto max-w-4xl' : 'xl:grid-cols-[minmax(0,1fr)_260px]'
            }`}
          >
            <FlashcardStudy
              key={`${active.id}:${active.updatedAt}`}
              deck={active}
              session={sessions[sessionKey] || createFlashcardSession(active.cards)}
              onAction={onAction}
              focused={focused}
              onToggleFocus={() => setFocused((value) => !value)}
            />

            {!focused && (
              <aside className="hidden space-y-4 xl:block">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <h2 className="mb-3 px-1 text-sm font-bold text-slate-800">
                    {LEARNING_PROGRAMS[studentProgram].label} sets
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
                            ? 'border-blue-200 bg-blue-50 text-blue-900 shadow-sm'
                            : 'border-transparent text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <p className="text-xs font-semibold leading-5 line-clamp-1">{deck.title}</p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {deck.cards.length} cards · {deck.subject}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <ShieldCheck size={19} className="mb-3 text-blue-600" />
                  <h3 className="text-xs font-bold text-blue-900">Practice at your own pace</h3>
                  <p className="mt-2 text-[11px] leading-6 text-blue-800/70">
                    These flashcards are prepared by your teachers. Practicing helps you remember key ideas and does not affect your grades.
                  </p>
                </div>
              </aside>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Search & Subject filter toolbar */}
          <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500">Subject:</span>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-400"
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
              <span className="sr-only">Search flashcards</span>
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, subject, or term…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </section>

          {/* Decks Grid (strictly view-only: no edit or delete buttons) */}
          {decksLoading || programLoading ? (
            <p role="status" className="p-12 text-center text-sm text-slate-500">
              Opening your study sets…
            </p>
          ) : !visible.length ? (
            <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50 p-8 text-center sm:p-12">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <BookOpen size={24} />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                No flashcards published yet
              </h2>
              <p className="mt-2 text-xs leading-6 text-slate-500 sm:text-sm max-w-md mx-auto">
                Your teachers have not published any study sets for{' '}
                <strong className="font-semibold text-slate-700">
                  {LEARNING_PROGRAMS[studentProgram].label}
                </strong>{' '}
                {search ? 'matching your search' : 'yet'}. Check back soon!
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-4 font-semibold text-xs text-blue-600 underline"
                >
                  Clear search
                </button>
              )}
            </section>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((deck) => (
                <article
                  key={deck.id}
                  className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="mb-5 flex items-center justify-between gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Layers3 size={20} />
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold border ${getProgramBadgeClass(
                        deck.programCode,
                      )}`}
                    >
                      {deck.programName}
                    </span>
                  </div>

                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {deck.subject}
                  </p>
                  <h2 className="mt-2 break-words text-lg font-bold leading-6 tracking-tight text-slate-900">
                    {deck.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-500">
                    {deck.description || 'A collection of ideas to practise at your own pace.'}
                  </p>
                  <p className="mb-5 mt-3 text-[11px] text-slate-400">
                    {deck.cards.length} cards · By {deck.author}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => startStudy(deck)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                    >
                      Study set <ChevronRight size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="mt-6 flex items-start gap-2 text-[11px] leading-6 text-slate-400">
            <ShieldCheck size={14} className="mt-1 shrink-0" />
            These flashcards are curated by teachers for {LEARNING_PROGRAMS[studentProgram].label}. Flipping and studying cards is private practice and does not affect your grades.
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
