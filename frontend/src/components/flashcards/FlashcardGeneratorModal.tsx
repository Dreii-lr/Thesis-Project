'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, X, Check, BookOpen, Layers, Loader2, AlertTriangle, FileText } from 'lucide-react';
import type { StudyCard } from '@/src/data/mockStudentFlashcards';
import type { SubjectRecord } from '@/src/lib/subjects-api';
import {
  DEFAULT_USER_CATEGORIES,
  type UserCategoryItem,
} from '@/src/lib/user-categories-api';
import {
  getMaterials,
  getLessonsByMaterial,
  matchMaterialToCategory,
  matchMaterialToSubject,
  type GeneratedLessonItem,
  type MaterialItem,
} from '@/src/lib/document-processor-api';
import {
  generateCuratedFlashcardsFromTopic,
} from '@/src/lib/curated-flashcards';
import { generateFlashcardsAIApi } from '@/src/lib/curated-flashcards-api';

interface GeneratorProps {
  categories?: UserCategoryItem[];
  initialProgramCode?: string;
  subjects: SubjectRecord[];
  initialSubjectId?: string;
  initialLessonId?: string;
  initialMaterialId?: string;
  initialTopic?: string;
  onGenerated: (data: {
    title: string;
    description: string;
    categoryId?: string;
    programCode: string;
    programName: string;
    subjectId: string;
    subject: string;
    cards: StudyCard[];
  }) => void;
  onClose: () => void;
}

export default function FlashcardGeneratorModal({
  categories,
  initialProgramCode = 'SECONDARY',
  subjects,
  initialSubjectId,
  initialLessonId,
  initialMaterialId,
  initialTopic,
  onGenerated,
  onClose,
}: GeneratorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const availableCategories =
    categories && categories.length > 0 ? categories : DEFAULT_USER_CATEGORIES;

  const defaultCat =
    availableCategories.find(
      (c) => (c.code || '').toUpperCase() === (initialProgramCode || 'SECONDARY').toUpperCase(),
    ) || availableCategories[0];

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    defaultCat?.category_id || '',
  );
  const activeCategory =
    availableCategories.find((c) => c.category_id === selectedCategoryId) ||
    defaultCat ||
    availableCategories[0];

  const [subjectId, setSubjectId] = useState<string>(initialSubjectId || '');
  const [topic, setTopic] = useState(initialTopic || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<StudyCard[]>([]);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [error, setError] = useState('');

  // Grounded Lesson and Module selection states
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [materialLessonsMap, setMaterialLessonsMap] = useState<Record<string, GeneratedLessonItem[]>>({});
  const [lessons, setLessons] = useState<GeneratedLessonItem[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(initialMaterialId || '');
  const [generationScope, setGenerationScope] = useState<'FULL_MODULE' | 'SINGLE_TOPIC'>('FULL_MODULE');
  const [selectedLessonId, setSelectedLessonId] = useState<string>(initialLessonId || '');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      try {
        dialog.showModal();
      } catch {
        // ignore if already opened
      }
    }
    return () => {
      try {
        if (dialog?.open) dialog.close();
      } catch {
        // ignore
      }
    };
  }, []);

  const visibleSubjects = subjects.filter((s) => {
    if (!activeCategory) return true;
    if (s.category_id && s.category_id === activeCategory.category_id) return true;
    const code = (s.category_code || '').toUpperCase();
    if (code && activeCategory?.code && code === activeCategory.code.toUpperCase()) return true;
    return false;
  });

  const availableCategorySubjects =
    visibleSubjects.length > 0
      ? visibleSubjects
      : (activeCategory?.subjects || []).map((s) => ({
          subject_id: s.subject_id,
          name: s.name,
          category_id: s.category_id,
          category_code: activeCategory?.code || '',
          description: s.description || null,
          is_active: s.is_active,
          created_at: s.created_at,
          updated_at: s.updated_at || null,
        }));

  const selectedSubject =
    availableCategorySubjects.find((s) => s.subject_id === subjectId) ||
    subjects.find((s) => s.subject_id === subjectId);
  const subjectName = selectedSubject?.name || 'General Study';

  // Load generated lessons from document-processing-ms for active category & selected subject
  const loadLessonsForSubject = useCallback(async () => {
    if (!activeCategory || !subjectId || !selectedSubject) {
      setMaterials([]);
      setMaterialLessonsMap({});
      setLessons([]);
      setSelectedMaterialId('');
      setSelectedLessonId('');
      setLoadingLessons(false);
      return;
    }

    setLoadingLessons(true);
    setError('');
    try {
      const allMaterials = await getMaterials({ pageSize: 50 }).catch(() => []);
      const categoryMaterials = (allMaterials || []).filter(
        (m) => m && m.id && matchMaterialToCategory(m, activeCategory),
      );

      // Filter specifically by the chosen subject
      let matchedMaterials = categoryMaterials.filter((m) =>
        matchMaterialToSubject(m, selectedSubject),
      );

      // Fallback: if no explicit strand match, check if any material's strand or goal directly mentions subject name
      if (matchedMaterials.length === 0 && selectedSubject.name) {
        const sNameLow = selectedSubject.name.toLowerCase();
        matchedMaterials = categoryMaterials.filter(
          (m) =>
            (m.learning_strand || '').toLowerCase().includes(sNameLow) ||
            (m.main_learning_goal || '').toLowerCase().includes(sNameLow),
        );
      }

      setMaterials(matchedMaterials);

      if (matchedMaterials.length === 0) {
        setMaterialLessonsMap({});
        setLessons([]);
        setSelectedMaterialId('');
        setSelectedLessonId('');
        setLoadingLessons(false);
        return;
      }

      const lessonPromises = matchedMaterials.slice(0, 15).map(async (m) => {
        try {
          const res = await getLessonsByMaterial(m.id);
          return { materialId: m.id, lessons: res?.lessons || [] };
        } catch {
          return { materialId: m.id, lessons: [] };
        }
      });
      const results = await Promise.all(lessonPromises);

      const lMap: Record<string, GeneratedLessonItem[]> = {};
      const collectedLessons: GeneratedLessonItem[] = [];
      for (const res of results) {
        if (res.materialId && Array.isArray(res.lessons)) {
          lMap[res.materialId] = res.lessons;
          collectedLessons.push(...res.lessons);
        }
      }

      setMaterialLessonsMap(lMap);
      setLessons(collectedLessons);

      // Resolve active material
      const targetMatId =
        (initialMaterialId && matchedMaterials.find((m) => m.id === initialMaterialId)?.id) ||
        (initialLessonId && collectedLessons.find((l) => l.id === initialLessonId)?.material_id) ||
        matchedMaterials[0]?.id ||
        '';

      setSelectedMaterialId(targetMatId);

      // Resolve active lesson
      const matLessons = targetMatId ? (lMap[targetMatId] || []) : collectedLessons;
      const targetLesson =
        (initialLessonId && matLessons.find((l) => l.id === initialLessonId)) ||
        matLessons[0];

      if (targetLesson) {
        setSelectedLessonId(targetLesson.id);
        setTopic(targetLesson.lesson_title || targetLesson.main_topic || '');
      } else {
        setSelectedLessonId('');
      }
    } catch (err) {
      console.warn('Could not load lessons from document-processor:', err);
    } finally {
      setLoadingLessons(false);
    }
  }, [activeCategory, subjectId, selectedSubject, initialLessonId, initialMaterialId]);

  useEffect(() => {
    loadLessonsForSubject();
  }, [loadLessonsForSubject]);

  const activeMaterialObj = materials.find((m) => m.id === selectedMaterialId) || materials[0];
  const currentMaterialLessons = selectedMaterialId ? (materialLessonsMap[selectedMaterialId] || []) : lessons;
  const activeLessonObj = currentMaterialLessons.find((l) => l.id === selectedLessonId) || currentMaterialLessons[0];

  const handleGenerate = async () => {
    if (!subjectId) {
      setError('Please select a subject before generating flashcards.');
      return;
    }

    if (lessons.length === 0) {
      setError(`Generation is disabled: No generated lessons exist for "${subjectName}" in Document Processing.`);
      return;
    }

    if (generationScope === 'SINGLE_TOPIC' && !selectedLessonId) {
      setError('Please select a specific topic from the module.');
      return;
    }

    setError('');
    setIsGenerating(true);

    try {
      const targetTopic =
        generationScope === 'SINGLE_TOPIC'
          ? (activeLessonObj?.lesson_title || activeLessonObj?.main_topic)
          : (activeMaterialObj?.main_learning_goal || activeMaterialObj?.learning_strand || topic);

      const aiResult = await generateFlashcardsAIApi({
        topic: targetTopic || undefined,
        materialId: selectedMaterialId || activeMaterialObj?.id || undefined,
        lessonId: generationScope === 'SINGLE_TOPIC' ? selectedLessonId : undefined,
        generationScope,
        programCode: activeCategory?.code || 'SECONDARY',
        program: activeCategory?.name || 'Secondary',
        subjectId: subjectId || undefined,
        subjectName,
        subject: subjectName,
        numCards: 5,
      });

      if (aiResult?.cards && aiResult.cards.length > 0) {
        setGeneratedCards(aiResult.cards);
        if (aiResult.title) setGeneratedTitle(aiResult.title);
        if (aiResult.description) setGeneratedDescription(aiResult.description);
      } else {
        throw new Error('No cards were returned by the generator.');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'AI flashcard generation failed.';
      console.warn(
        '[FlashcardGenerator] Live AI microservice call failed, falling back to local curriculum generation:',
        err,
      );
      setError(`${errorMsg} (Displaying curriculum topic preview)`);
      try {
        const fallbackTopic =
          generationScope === 'FULL_MODULE'
            ? `${activeMaterialObj?.main_learning_goal || subjectName} (Full Module)`
            : (activeLessonObj?.lesson_title || activeLessonObj?.main_topic || 'ALS Study');
        const fallbackCards = generateCuratedFlashcardsFromTopic(
          fallbackTopic,
          subjectName,
          activeCategory?.code || 'SECONDARY',
          5,
        );
        setGeneratedCards(fallbackCards);
        const isFil = (subjectName || '').toLowerCase().includes('filipino') || (subjectName || '').toLowerCase().includes('tagalog');
        if (isFil) {
          setGeneratedTitle(fallbackTopic);
          setGeneratedDescription(`Aralin at mga pagsasanay para sa ${fallbackTopic}`);
        }
      } catch (fallbackErr) {
        setError(errorMsg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    if (!generatedCards.length) return;
    const cleanTopic =
      generationScope === 'FULL_MODULE'
        ? (activeMaterialObj?.main_learning_goal || `${subjectName} Module Study Set`)
        : (activeLessonObj?.lesson_title || activeLessonObj?.main_topic || 'ALS Study Set');
    const fallbackTitle = cleanTopic.length > 50 ? `${cleanTopic.slice(0, 47)}…` : cleanTopic;
    const finalTitle = generatedTitle.trim() || fallbackTitle;
    const fallbackDesc =
      generationScope === 'FULL_MODULE'
        ? `Study set covering all lessons in module "${cleanTopic}" for ${activeCategory?.name || 'ALS'}.`
        : `Study set covering "${cleanTopic}" for ${activeCategory?.name || 'Learning Program'}.`;
    const finalDesc = generatedDescription.trim() || fallbackDesc;

    onGenerated({
      title: finalTitle,
      description: finalDesc,
      categoryId: activeCategory?.category_id,
      programCode: activeCategory?.code || 'SECONDARY',
      programName: activeCategory?.name || 'Secondary',
      subjectId,
      subject: subjectName,
      cards: generatedCards,
    });
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%_-_1.5rem)] max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm"
    >
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Sparkles size={20} />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">Generate study set</h2>
            <p className="text-[11px] text-slate-500">Auto-create cards strictly grounded in DepEd ALS lesson modules.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
          aria-label="Close generator"
        >
          <X size={19} />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* STEP 1: DYNAMIC LEARNING PROGRAMS */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            1. Target Learning Program <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {availableCategories.map((cat) => {
              const isSelected = cat.category_id === activeCategory?.category_id;
              const code = (cat.code || '').toUpperCase();
              const isElem = code.includes('ELEM');
              const isBLP = code.includes('BLP') || code.includes('BASIC');

              const activeClass = isElem
                ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 ring-1 ring-emerald-500 shadow-sm'
                : isBLP
                ? 'border-amber-500 bg-amber-50/40 text-amber-950 ring-1 ring-amber-500 shadow-sm'
                : 'border-indigo-500 bg-indigo-50/40 text-indigo-950 ring-1 ring-indigo-500 shadow-sm';

              return (
                <label
                  key={cat.category_id}
                  className={`flex flex-col p-3 rounded-xl cursor-pointer border transition ${
                    isSelected
                      ? activeClass
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="genProgram"
                    value={cat.category_id}
                    checked={isSelected}
                    onChange={() => {
                      setSelectedCategoryId(cat.category_id);
                      setSubjectId('');
                      setSelectedMaterialId('');
                      setSelectedLessonId('');
                      setMaterials([]);
                      setMaterialLessonsMap({});
                      setLessons([]);
                      setGeneratedCards([]);
                      setGeneratedTitle('');
                      setGeneratedDescription('');
                      setError('');
                    }}
                    className="sr-only"
                  />
                  <span className="text-xs font-bold">{cat.name}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                    {cat.description || (isElem ? 'Elementary Level' : isBLP ? 'Foundational Program' : 'Junior High')}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* STEP 2: SUBJECT SELECTION (MANDATORY) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700">
            2. Subject <span className="text-red-500">*</span>
          </label>
          <select
            value={subjectId}
            onChange={(e) => {
              const newSubId = e.target.value;
              setSubjectId(newSubId);
              setSelectedMaterialId('');
              setSelectedLessonId('');
              setGeneratedCards([]);
              setGeneratedTitle('');
              setGeneratedDescription('');
              setError('');
            }}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">-- Choose a subject first --</option>
            {availableCategorySubjects.map((s) => (
              <option key={s.subject_id} value={s.subject_id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* STEP 3: GROUNDED MODULE & LESSON CONTENTS SCOPE */}
        <div className="space-y-3 pt-1">
          <label className="block text-xs font-semibold text-slate-700">
            3. Grounded Lesson Contents & Scope <span className="text-red-500">*</span>
          </label>

          {!subjectId ? (
            /* SUBJECT NOT SELECTED YET: PROMPT USER */
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center text-xs text-slate-500">
              <BookOpen size={20} className="mx-auto mb-2 text-slate-400" />
              <p className="font-semibold text-slate-700">Please select a subject above</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Generated lesson contents and scope options will appear here once a subject is chosen.
              </p>
            </div>
          ) : loadingLessons ? (
            <div className="flex items-center justify-center py-6 text-xs text-indigo-600 gap-2 border border-slate-200 rounded-2xl bg-slate-50/50">
              <Loader2 size={16} className="animate-spin" />
              Checking generated lessons for {subjectName} in Document Processing...
            </div>
          ) : lessons.length === 0 ? (
            /* NO LESSONS FOUND FOR THIS SUBJECT */
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-amber-950 text-xs">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                No Generated Lessons Found for {subjectName}
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Flashcard generation is strictly grounded in DepEd ALS module content. There are currently no generated lesson contents for <strong>{activeCategory?.name} · {subjectName}</strong> in Document Processing.
              </p>
              <p className="text-[11px] text-amber-700">
                AI Flashcard generation is <strong>disabled</strong> for this subject until modules are uploaded and lesson contents are generated in the Document Processing workspace.
              </p>
            </div>
          ) : (
            /* LESSONS AVAILABLE: RENDER MODULE PICKER & SCOPE SELECTION */
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-4">
              {/* Module Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <FileText size={13} className="text-indigo-600" />
                  Select Ingested Module
                </label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => {
                    const newMatId = e.target.value;
                    setSelectedMaterialId(newMatId);
                    const mLessons = materialLessonsMap[newMatId] || [];
                    if (mLessons.length > 0) {
                      setSelectedLessonId(mLessons[0].id);
                      setTopic(mLessons[0].lesson_title || mLessons[0].main_topic || '');
                    } else {
                      setSelectedLessonId('');
                    }
                  }}
                  className="w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  {materials.map((m) => {
                    const count = (materialLessonsMap[m.id] || []).length;
                    return (
                      <option key={m.id} value={m.id}>
                        {m.main_learning_goal || m.learning_strand || `Module ${m.id.slice(0, 8)}`} ({count} {count === 1 ? 'lesson' : 'lessons'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Scope Selector: Full Module vs 1 Topic */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Generation Scope
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGenerationScope('FULL_MODULE')}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                      generationScope === 'FULL_MODULE'
                        ? 'border-indigo-500 bg-white ring-1 ring-indigo-500 shadow-xs'
                        : 'border-slate-200 bg-white/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <Layers size={13} className="text-indigo-600" />
                      Full lesson contents
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Synthesize cards covering all {currentMaterialLessons.length} topics in this whole module.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenerationScope('SINGLE_TOPIC')}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                      generationScope === 'SINGLE_TOPIC'
                        ? 'border-indigo-500 bg-white ring-1 ring-indigo-500 shadow-xs'
                        : 'border-slate-200 bg-white/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <BookOpen size={13} className="text-indigo-600" />
                      Select 1 topic for module
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Extract cards specifically from one selected lesson/topic within the module.
                    </span>
                  </button>
                </div>
              </div>

              {/* Sub-selection if SINGLE_TOPIC is chosen */}
              {generationScope === 'SINGLE_TOPIC' && (
                <div className="pt-2 border-t border-indigo-100/60 space-y-2">
                  <label className="block text-xs font-semibold text-slate-800">
                    Choose Specific Topic
                  </label>
                  <select
                    value={selectedLessonId}
                    onChange={(e) => {
                      const chosenId = e.target.value;
                      setSelectedLessonId(chosenId);
                      const l = currentMaterialLessons.find((item) => item.id === chosenId);
                      if (l) {
                        setTopic(l.lesson_title || l.main_topic || '');
                      }
                    }}
                    className="w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    {currentMaterialLessons.map((l, idx) => (
                      <option key={l.id} value={l.id}>
                        Topic {idx + 1}: {l.lesson_title || l.main_topic}
                      </option>
                    ))}
                  </select>

                  {activeLessonObj && (
                    <div className="rounded-xl bg-white p-3 border border-indigo-100 text-xs text-slate-600 space-y-1">
                      <p className="font-semibold text-slate-900">{activeLessonObj.lesson_title || activeLessonObj.main_topic}</p>
                      {activeLessonObj.keywords && activeLessonObj.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {activeLessonObj.keywords.slice(0, 5).map((kw) => (
                            <span key={kw} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                              #{kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}

        {/* GENERATE BUTTON */}
        <div>
          {!subjectId ? (
            <button
              type="button"
              disabled={true}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-200 py-3 text-xs font-semibold text-slate-400 cursor-not-allowed"
            >
              <BookOpen size={15} /> Select a Subject to Enable Generation
            </button>
          ) : lessons.length === 0 && !loadingLessons ? (
            <button
              type="button"
              disabled={true}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-200 py-3 text-xs font-semibold text-slate-400 cursor-not-allowed"
            >
              <AlertTriangle size={15} /> Generation Disabled (No Lessons Found for {subjectName})
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || loadingLessons || lessons.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Generating flashcards with AI...
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  {generationScope === 'FULL_MODULE'
                    ? 'Generate from Full Module'
                    : 'Generate from Selected Topic'}
                </>
              )}
            </button>
          )}
        </div>

        {/* PREVIEW OF GENERATED CARDS */}
        {generatedCards.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900">
                  {generatedTitle || 'Generated Cards Preview'} ({generatedCards.length})
                </span>
                {generatedDescription && (
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{generatedDescription}</p>
                )}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold shrink-0">Ready to review</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {generatedCards.map((c, i) => (
                <div key={c.id || i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-slate-900">
                      <span className="mr-1.5 inline-block text-indigo-600 font-mono">#{i + 1}</span>
                      {c.term}
                    </p>
                  </div>
                  <p className="mt-1 text-slate-600 leading-relaxed">{c.definition}</p>
                  {c.example && (
                    <p className="mt-1.5 text-[11px] text-slate-500 italic">
                      <span className="font-semibold not-italic text-slate-600">Example: </span>
                      {c.example}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAccept}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
            >
              <Check size={16} /> Open in editor to save & publish
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
