'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Layers3,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import type { StudyCard } from '@/src/data/mockStudentFlashcards';
import { listSubjects, type SubjectRecord } from '@/src/lib/subjects-api';
import {
  getUserCategories,
  type UserCategoryItem,
  DEFAULT_USER_CATEGORIES,
} from '@/src/lib/user-categories-api';
import {
  getMaterials,
  getLessonsByMaterial,
  matchMaterialToCategory,
  matchMaterialToSubject,
} from '@/src/lib/document-processor-api';
import {
  getProgramBadgeClass,
  type CuratedFlashcardInput,
  type CuratedStudyDeck,
} from '@/src/lib/curated-flashcards';
import {
  createFlashcardSession,
  flashcardStudyReducer,
  type FlashcardSession,
  type StudyAction,
} from '@/src/lib/flashcard-study';
import Modal from '@/src/components/ui/Modal';
import FlashcardSetEditor from './FlashcardSetEditor';
import FlashcardGeneratorModal from './FlashcardGeneratorModal';
import FlashcardStudy from './FlashcardStudy';
import { useCuratedFlashcards } from './useCuratedFlashcards';

interface DashboardProps {
  authorName: string;
  authorId?: string;
  authorRole: 'teacher' | 'admin';
}

function FlashcardDashboardContent({
  authorName,
  authorId,
  authorRole,
}: DashboardProps) {
  const searchParams = useSearchParams();
  const requestedProgram = searchParams.get('program');
  const requestedSubject = searchParams.get('subject');
  const requestedLessonId = searchParams.get('lessonId');
  const requestedTopic = searchParams.get('topic');
  const requestedMaterialId = searchParams.get('materialId');

  // Backend categories (Learning Programs)
  const [categories, setCategories] = useState<UserCategoryItem[]>(DEFAULT_USER_CATEGORIES);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Backend subjects
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');

  const [search, setSearch] = useState('');
  const [studyingId, setStudyingId] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [sessions, setSessions] = useState<Record<string, FlashcardSession>>({});

  // Modals
  const [editor, setEditor] = useState<{
    existing?:
      | CuratedStudyDeck
      | {
          id?: string;
          title: string;
          description: string;
          categoryId?: string;
          programCode?: string;
          programName?: string;
          subjectId?: string;
          subject: string;
          cards: StudyCard[];
          materialId?: string | null;
          lessonId?: string | null;
          generationScope?: 'FULL_MODULE' | 'SINGLE_TOPIC' | null;
        };
    initialCards?: StudyCard[];
    initialProgramCode?: string;
  } | null>(null);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CuratedStudyDeck | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [notice, setNotice] = useState('');

  const { allDecks, save, remove, loading: decksLoading, error: decksError, reload: reloadDecks } =
    useCuratedFlashcards();

  // Load categories and subjects from backend API
  const loadBackendData = useCallback(async () => {
    setCategoriesLoading(true);
    setSubjectsLoading(true);
    try {
      const [cats, subs] = await Promise.all([getUserCategories(), listSubjects()]);
      if (cats && cats.length > 0) setCategories(cats);
      if (subs) setSubjects(subs);
    } catch (err) {
      console.warn('Could not load backend categories or subjects:', err);
    } finally {
      setCategoriesLoading(false);
      setSubjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackendData();
  }, [loadBackendData]);

  // Sync with URL query parameters (?program=...&subject=...)
  useEffect(() => {
    if (requestedProgram && categories.length > 0) {
      const progLower = requestedProgram.toLowerCase();
      const matched = categories.find(
        (c) =>
          (c.code || '').toLowerCase() === progLower ||
          c.category_id === requestedProgram ||
          (progLower === 'junior' && (c.code || '').toLowerCase() === 'secondary') ||
          (progLower === 'basic_literacy' && (c.code || '').toLowerCase() === 'blp'),
      );
      if (matched) {
        setSelectedCategoryId(matched.category_id);
      }
    } else if (!selectedCategoryId && categories.length > 0) {
      // Default to first category (e.g. Elementary or Secondary)
      const defaultCat =
        categories.find((c) => (c.code || '').toUpperCase() === 'SECONDARY') || categories[0];
      setSelectedCategoryId(defaultCat.category_id);
    }
  }, [requestedProgram, categories, selectedCategoryId]);

  useEffect(() => {
    if (requestedSubject) {
      setSelectedSubjectId(requestedSubject);
    }
  }, [requestedSubject]);

  useEffect(() => {
    if (requestedLessonId) {
      setIsGeneratorOpen(true);
    }
  }, [requestedLessonId]);

  const activeCategory =
    categories.find((c) => c.category_id === selectedCategoryId) ||
    categories.find((c) => (c.code || '').toUpperCase() === 'SECONDARY') ||
    categories[0];

  // Subjects belonging to the active category
  const categorySubjects = subjects.filter((s) => {
    if (!activeCategory) return true;
    if (s.category_id && s.category_id === activeCategory.category_id) return true;
    if (
      s.category_code &&
      activeCategory.code &&
      s.category_code.toUpperCase() === activeCategory.code.toUpperCase()
    )
      return true;
    return false;
  });

  const selectedSubjectObj = categorySubjects.find((s) => s.subject_id === selectedSubjectId);

  // Check if generated lessons exist in document-processing for activeCategory and active subject
  const [availableLessonsCount, setAvailableLessonsCount] = useState<number | null>(null);
  const [isCheckingLessons, setIsCheckingLessons] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;
    async function checkLessons() {
      if (!activeCategory) return;
      setIsCheckingLessons(true);
      try {
        const allMaterials = await getMaterials({ pageSize: 50 }).catch(() => []);
        let matchedMaterials = (allMaterials || []).filter((m) =>
          m && m.id && matchMaterialToCategory(m, activeCategory),
        );

        if (selectedSubjectObj) {
          const subjectSpecific = matchedMaterials.filter((m) =>
            matchMaterialToSubject(m, selectedSubjectObj),
          );
          if (subjectSpecific.length > 0) {
            matchedMaterials = subjectSpecific;
          } else {
            const sNameLow = selectedSubjectObj.name.toLowerCase();
            matchedMaterials = matchedMaterials.filter(
              (m) =>
                (m.learning_strand || '').toLowerCase().includes(sNameLow) ||
                (m.main_learning_goal || '').toLowerCase().includes(sNameLow),
            );
          }
        }

        if (matchedMaterials.length === 0) {
          if (!isCancelled) setAvailableLessonsCount(0);
          return;
        }
        const lessonPromises = matchedMaterials.slice(0, 10).map((m) =>
          getLessonsByMaterial(m.id).catch(() => null),
        );
        const results = await Promise.all(lessonPromises);
        let count = 0;
        for (const res of results) {
          if (res && Array.isArray(res.lessons)) {
            count += res.lessons.length;
          }
        }
        if (!isCancelled) setAvailableLessonsCount(count);
      } catch (err) {
        console.warn('Could not check lessons from document-processor:', err);
        if (!isCancelled) setAvailableLessonsCount(null);
      } finally {
        if (!isCancelled) setIsCheckingLessons(false);
      }
    }
    checkLessons();
    return () => {
      isCancelled = true;
    };
  }, [activeCategory, selectedSubjectId, subjects]);

  const hasLessons = (availableLessonsCount ?? 1) > 0;

  // Filter decks by active program
  const programDecks = allDecks.filter((d) => {
    if (!activeCategory) return true;
    if (d.categoryId && d.categoryId === activeCategory.category_id) return true;
    const catCode = (activeCategory.code || '').toUpperCase();
    const catName = (activeCategory.name || '').toLowerCase();
    const deckProg = (d.programCode || d.programName || '').toUpperCase();
    const deckProgLower = (d.programCode || d.programName || '').toLowerCase();
    if (deckProg && catCode && (deckProg === catCode || deckProg.includes(catCode) || catCode.includes(deckProg))) return true;
    if (deckProgLower && catName && (deckProgLower === catName || deckProgLower.includes(catName) || catName.includes(deckProgLower))) return true;
    return false;
  });

  // Filter visible decks by search and subject
  const visible = programDecks.filter((deck) => {
    const matchesSearch = `${deck.title} ${deck.subject} ${deck.description}`
      .toLowerCase()
      .includes(search.toLowerCase().trim());
    const matchesSubject =
      selectedSubjectId === 'ALL' ||
      deck.subjectId === selectedSubjectId ||
      deck.subject.toLowerCase() ===
        categorySubjects.find((s) => s.subject_id === selectedSubjectId)?.name?.toLowerCase();
    return matchesSearch && matchesSubject;
  });

  const active = allDecks.find((deck) => deck.id === studyingId);
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
    setNotice('');
  };

  const handleSaveDeck = async (input: CuratedFlashcardInput) => {
    try {
      const saved = await save(input, {
        authorName,
        authorId,
        authorRole,
      });
      if (saved) {
        setSessions((previous) => ({
          ...previous,
          [`${saved.id}:${saved.updatedAt}`]: createFlashcardSession(saved.cards),
        }));
      }
      setEditor(null);
      if (input.categoryId) setSelectedCategoryId(input.categoryId);
      setNotice(input.id ? 'Your changes have been saved.' : 'Study set created and published for learners.');
    } catch (err) {
      console.error('Failed to save study set:', err);
    }
  };

  const handleDeleteDeck = async () => {
    if (!pendingDelete) return;
    try {
      await remove(pendingDelete.id);
      if (studyingId === pendingDelete.id) setStudyingId(null);
      setPendingDelete(null);
      setNotice('Study set deleted.');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete study set.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 font-sans">
      {/* Header section (1:1 with FlashcardLibrary.tsx) */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
            <Layers3 size={13} /> {authorRole === 'admin' ? 'Curriculum Management' : 'Content Management'}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {authorRole === 'admin' ? 'Curriculum flashcards' : 'Flashcard study sets'}
          </h1>
          <p className="mt-1.5 text-xs leading-6 text-slate-500 sm:text-sm">
            Create and generate flashcard sets. Learners will only see sets tailored to their enrolled Learning Program.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick / AI Generator CTA */}
          <button
            type="button"
            disabled={!hasLessons}
            onClick={() => setIsGeneratorOpen(true)}
            title={
              !hasLessons
                ? `Flashcard generation is disabled: No generated lessons found for ${activeCategory?.name} in Document Processing.`
                : 'Generate study set grounded in DepEd ALS module content'
            }
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold shadow-sm transition ${
              !hasLessons
                ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <Sparkles size={15} /> Generate study set
          </button>

          {/* Create Study Set CTA */}
          <button
            type="button"
            disabled={!hasLessons}
            onClick={() => setEditor({ initialProgramCode: activeCategory?.code })}
            title={
              !hasLessons
                ? `Manual creation is disabled: No curriculum lessons found for ${activeCategory?.name} in Document Processing.`
                : 'Create study set manually'
            }
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold shadow-sm transition ${
              !hasLessons
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-blue-600 text-white shadow-blue-600/15 hover:bg-blue-700'
            }`}
          >
            <Plus size={16} /> Create study set
          </button>
        </div>
      </div>

      {decksError && (
        <div role="alert" className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700">
          <p>{decksError}</p>
          <button type="button" onClick={reloadDecks} className="mt-1 font-semibold underline">
            Try again
          </button>
        </div>
      )}

      {notice && (
        <p role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs leading-6 text-emerald-800">
          <CheckCircle2 size={15} className="mt-1 shrink-0" />
          {notice}
        </p>
      )}

      {!hasLessons && !isCheckingLessons && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-amber-950">Curriculum Grounding Required</p>
            <p className="mt-0.5 leading-relaxed text-amber-800">
              No generated lessons were found in Document Processing for <strong>{activeCategory?.name}{selectedSubjectObj ? ` · ${selectedSubjectObj.name}` : ''}</strong>. Flashcard creation and AI generation are disabled until curriculum modules are uploaded and lesson contents are generated.
            </p>
          </div>
        </div>
      )}

      {/* Active Study Mode (Testing the deck from student view) */}
      {active ? (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setStudyingId(null);
                setFocused(false);
                setNotice('');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600"
            >
              <ArrowLeft size={15} /> Back to flashcards dashboard
            </button>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getProgramBadgeClass(
                  active.programCode,
                )}`}
              >
                {active.programName}
              </span>
              <button
                type="button"
                onClick={() => setEditor({ existing: active })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:text-blue-600"
              >
                <Pencil size={13} /> Edit set
              </button>
            </div>
          </div>

          <div className="mx-auto max-w-4xl">
            <FlashcardStudy
              key={`${active.id}:${active.updatedAt}`}
              deck={active}
              session={sessions[sessionKey] || createFlashcardSession(active.cards)}
              onAction={onAction}
              focused={focused}
              onToggleFocus={() => setFocused((v) => !v)}
            />
          </div>
        </>
      ) : (
        <>
          {/* Dynamic Program Tabs from Backend */}
          <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
            <div role="group" aria-label="Learning Program" className="inline-flex rounded-xl bg-slate-100 p-1 flex-wrap">
              {categoriesLoading ? (
                <span className="px-3 py-2 text-xs text-slate-400">Loading learning programs…</span>
              ) : (
                categories.map((cat) => {
                  const isSelected = activeCategory?.category_id === cat.category_id;
                  const count = allDecks.filter(
                    (d) =>
                      (cat.category_id && d.categoryId === cat.category_id) ||
                      ((d.programCode || '').toUpperCase() === (cat.code || '').toUpperCase()),
                  ).length;
                  return (
                    <button
                      key={cat.category_id || cat.code}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedCategoryId(cat.category_id);
                        setSelectedSubjectId('ALL');
                        setSearch('');
                      }}
                      className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {cat.name} <span className="ml-1 text-[10px] opacity-60">({count})</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Subject filter & search input */}
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Subject:</span>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Subjects ({programDecks.length})</option>
                  {categorySubjects.map((s) => (
                    <option key={s.subject_id} value={s.subject_id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="relative w-full sm:w-64">
                <span className="sr-only">Search flashcards</span>
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title or term…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
          </section>

          {/* Program Scoping Banner */}
          {activeCategory && (
            <div className="mb-5 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-2.5 text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>
                  Displaying sets for <strong>{activeCategory.name}</strong>. Only learners enrolled in {activeCategory.name} can view these flashcards.
                </span>
              </div>
              <span className="text-[11px] font-semibold text-blue-700/70">Backend Synced</span>
            </div>
          )}

          {/* Decks Grid (1:1 with FlashcardLibrary.tsx lines 84-87) */}
          {decksLoading || categoriesLoading ? (
            <p role="status" className="p-12 text-center text-sm text-slate-500">
              Loading study sets…
            </p>
          ) : !visible.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <p className="text-sm font-semibold text-slate-800">
                {authorRole === 'admin' ? 'No curriculum flashcards found' : 'No flashcard study sets found'} for {activeCategory?.name || 'this program'}
                {search ? ' matching your search' : ''}.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {authorRole === 'admin'
                  ? 'Generate official curriculum sets with AI or create a new set manually.'
                  : 'Create your first study set or use the generator to build cards for this program.'}
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <button
                  type="button"
                  disabled={!hasLessons}
                  onClick={() => setIsGeneratorOpen(true)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold ${
                    !hasLessons
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  <Sparkles size={14} /> Generate set
                </button>
                <button
                  type="button"
                  disabled={!hasLessons}
                  onClick={() => setEditor({ initialProgramCode: activeCategory?.code })}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold ${
                    !hasLessons
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Plus size={14} /> Create set
                </button>
              </div>
            </div>
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

                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{deck.subject}</p>
                  <h2 className="mt-2 break-words text-lg font-bold leading-6 tracking-tight text-slate-900">
                    {deck.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-500">
                    {deck.description || 'A collection of ideas to practise.'}
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
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${deck.title}`}
                        onClick={() => setEditor({ existing: deck })}
                        className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${deck.title}`}
                        onClick={() => {
                          setPendingDelete(deck);
                          setDeleteError('');
                        }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create / Edit Modal with dynamic backend categories & subjects */}
      {editor && (
        <FlashcardSetEditor
          existing={editor.existing}
          categories={categories}
          initialProgramCode={editor.initialProgramCode || activeCategory?.code}
          initialCards={editor.initialCards}
          subjects={subjects}
          subjectsLoading={subjectsLoading}
          subjectsError={null}
          onRetrySubjects={loadBackendData}
          onSave={handleSaveDeck}
          onClose={() => setEditor(null)}
        />
      )}

      {/* Generator Modal with dynamic backend categories & subjects */}
      {isGeneratorOpen && (
        <FlashcardGeneratorModal
          categories={categories}
          initialProgramCode={activeCategory?.code}
          subjects={subjects}
          initialSubjectId={selectedSubjectId !== 'ALL' ? selectedSubjectId : undefined}
          initialLessonId={requestedLessonId || undefined}
          initialMaterialId={requestedMaterialId || undefined}
          initialTopic={requestedTopic || undefined}
          onGenerated={(data) => {
            setEditor({
              existing: {
                id: data.id,
                title: data.title,
                description: data.description,
                categoryId: data.categoryId,
                programCode: data.programCode,
                programName: data.programName,
                subjectId: data.subjectId,
                subject: data.subject,
                cards: data.cards,
                materialId: data.materialId,
                lessonId: data.lessonId,
                generationScope: data.generationScope,
              },
            });
          }}
          onClose={() => setIsGeneratorOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {pendingDelete && (
        <Modal title="Delete this study set?" onClose={() => setPendingDelete(null)}>
          <p className="text-sm leading-7 text-slate-500">
            This removes <strong className="font-semibold text-slate-800">{pendingDelete.title}</strong> ({pendingDelete.programName}) and its {pendingDelete.cards.length} cards. Students in this program will no longer be able to study this set.
          </p>
          {deleteError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{deleteError}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600"
            >
              Keep set
            </button>
            <button
              type="button"
              onClick={handleDeleteDeck}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              <Trash2 size={14} /> Delete set
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function TeacherFlashcardDashboard(props: DashboardProps) {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-slate-500">Loading flashcards dashboard…</div>}>
      <FlashcardDashboardContent {...props} />
    </Suspense>
  );
}
