'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileQuestion,
  GraduationCap,
  Layers,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Users,
  X,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  loadAnalysisOptions,
  loadAssessmentAnalysis,
  getCohortAnalysis,
  type CohortAnalysis,
} from '@/src/lib/assessment-analysis-api';
import {
  buildItemAnalysis,
  type AnalysisAssessment,
  type AnalysisSubmission,
} from '@/src/lib/item-analysis';
import type { AssessmentRow, TargetCategory } from '@/src/lib/assessments-api';
import type { SubjectRecord } from '@/src/lib/subjects-api';
import { subjectName } from '@/src/lib/subjects-api';

interface AssessmentAnalysisViewProps {
  role: 'admin' | 'teacher';
}

interface AnalyzableItem {
  id: string;
  title: string;
  subject_code: string;
  subject_name: string;
  target_category: string;
  category_label: string;
  assessment_type: string;
  status: string;
  max_score: number;
}

interface QuestionDistribution {
  answer: string;
  count: number;
  correct: boolean;
}

interface QuestionResponse {
  account_id: string;
  student_name: string;
  answer: string;
  is_correct: boolean;
}

interface QuestionItem {
  id: string;
  number: number;
  prompt: string;
  type: string;
  expected: string;
  correct: number;
  incorrect: number;
  skipped: number;
  correct_rate: number;
  error_rate: number;
  distribution: QuestionDistribution[];
  responses: QuestionResponse[];
}

interface StudentBreakdownItem {
  account_id: string;
  student_name: string;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  personal_struggling_topics: string[];
}

const severityBadgeStyles: Record<string, string> = {
  HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
  MEDIUM: 'bg-amber-50 text-amber-800 border-amber-200',
  LOW: 'bg-blue-50 text-blue-700 border-blue-200',
};

const categoryLabels: Record<string, string> = {
  ALL: 'All Programs',
  SECONDARY: 'Junior High School (Secondary)',
  ELEMENTARY: 'Elementary',
  BLP: 'Basic Literacy Program (BLP)',
};

function getTypeBadgeClass(type: string): string {
  switch (type.toUpperCase()) {
    case 'EXAM':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'TEST':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'QUIZ':
    default:
      return 'bg-purple-50 text-purple-700 border-purple-200';
  }
}

function formatTypeLabel(type: string): string {
  const upper = type.toUpperCase();
  if (upper === 'QUIZ') return 'Quizzes';
  if (upper === 'EXAM') return 'Exams';
  if (upper === 'TEST') return 'Tests';
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

export default function AssessmentAnalysisView({ role }: AssessmentAnalysisViewProps) {
  // ─── Live Backend Tasks & Subjects ──────────────────────────────────────────
  const [backendTasks, setBackendTasks] = useState<AssessmentRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ─── Filter States ──────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [requestedAssessmentId, setSelectedAssessmentId] = useState<string>('');

  // ─── Active Tab State ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'learners'>('overview');

  // ─── Live Assessment Data & Analysis State ──────────────────────────────────
  const [loadingAssessmentData, setLoadingAssessmentData] = useState<boolean>(false);
  const [currentAssessmentDetails, setCurrentAssessmentDetails] = useState<AnalysisAssessment | null>(null);
  const [currentSubmissions, setCurrentSubmissions] = useState<AnalysisSubmission[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<CohortAnalysis | null>(null);
  const [analysisLoadError, setAnalysisLoadError] = useState<string | null>(null);

  // ─── AI Generation State ────────────────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationNotice, setGenerationNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

  // ─── Tab-Specific UI States ─────────────────────────────────────────────────
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [questionSearch, setQuestionSearch] = useState<string>('');
  const [questionFilter, setQuestionFilter] = useState<'all' | 'high_error'>('all');
  const [learnerSearch, setLearnerSearch] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // ─── 1. Fetch Analyzable Tasks from Backend on Mount ────────────────────────
  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    setLoadError(null);
    try {
      const { tasks, subjects: subList } = await loadAnalysisOptions();
      setBackendTasks(tasks);
      setSubjects(subList);
      if (tasks.length > 0) {
        setSelectedAssessmentId((prev) => (prev ? prev : tasks[0].assessment_id));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to fetch assessments from backend.');
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) return fetchTasks(); });
    return () => { active = false; };
  }, [fetchTasks]);

  // ─── 2. Available Assessment Types (Dynamic Discovery from Backend) ─────────
  const availableAssessmentTypes = useMemo(() => {
    const types = new Set<string>();
    for (const t of backendTasks) {
      const raw = (t.assessment_type || '').toUpperCase();
      if (raw && raw !== 'ACTIVITY') {
        types.add(raw);
      }
    }
    if (types.size === 0) return ['QUIZ', 'EXAM', 'TEST'];
    return Array.from(types).sort();
  }, [backendTasks]);

  // ─── 3. Unified Analyzable Items (Strictly Live Backend Records) ────────────
  const allAnalyzableItems: AnalyzableItem[] = useMemo(() => {
    return backendTasks
      .filter((t) => {
        const type = (t.assessment_type || '').toUpperCase();
        return ['QUIZ', 'EXAM', 'TEST'].includes(type) && type !== 'ACTIVITY';
      })
      .map((t) => ({
        id: t.assessment_id,
        title: t.title,
        subject_code: t.subject_code,
        subject_name: subjectName(subjects, t.subject_code, t.target_category),
        target_category: t.target_category || 'SECONDARY',
        category_label: categoryLabels[t.target_category || 'SECONDARY'] || (t.target_category || 'General'),
        assessment_type: t.assessment_type,
        status: t.status,
        max_score: t.max_score,
      }));
  }, [backendTasks, subjects]);

  // ─── 4. Filtered Assessments based on Program & Type Filters ────────────────
  const filteredAssessments = useMemo(() => {
    return allAnalyzableItems.filter((a) => {
      if (a.assessment_type.toUpperCase() === 'ACTIVITY') return false;
      const matchesCategory = selectedCategory === 'ALL' || a.target_category === selectedCategory;
      const matchesType = selectedType === 'ALL' || a.assessment_type.toUpperCase() === selectedType.toUpperCase();
      return matchesCategory && matchesType;
    });
  }, [allAnalyzableItems, selectedCategory, selectedType]);

  const selectedAssessmentId = filteredAssessments.some((item) => item.id === requestedAssessmentId)
    ? requestedAssessmentId : filteredAssessments[0]?.id || '';

  // Active selected assessment record
  const selectedTask = useMemo(() => {
    return backendTasks.find((t) => t.assessment_id === selectedAssessmentId);
  }, [backendTasks, selectedAssessmentId]);

  const selectedItemSummary = useMemo(() => {
    return allAnalyzableItems.find((a) => a.id === selectedAssessmentId);
  }, [allAnalyzableItems, selectedAssessmentId]);

  // ─── 5. Fetch Live Assessment Details, Submissions & Saved Analysis ─────────
  useEffect(() => {
    let active = true;
    async function loadData() {
      await Promise.resolve();
      if (!active) return;
      if (!selectedAssessmentId || !selectedTask) {
        setCurrentAssessmentDetails(null);
        setCurrentSubmissions([]);
        setCurrentAnalysis(null);
        return;
      }
      setLoadingAssessmentData(true);
      setAnalysisLoadError(null);
      try {
        const targetProgram = (
          selectedCategory !== 'ALL' ? selectedCategory : selectedTask?.target_category || 'SECONDARY'
        ) as TargetCategory;

        const result = await loadAssessmentAnalysis(selectedTask!, targetProgram, subjects);
        if (active) {
          setCurrentAssessmentDetails(result.assessment);
          setCurrentSubmissions(result.submissions);
          setCurrentAnalysis(result.analysis);
          if (result.analysis?.updated_at || result.analysis?.created_at) {
            const dateStr = result.analysis.updated_at || result.analysis.created_at;
            setLastGeneratedAt(new Date(dateStr!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          } else {
            setLastGeneratedAt(null);
          }
          if (result.analysisError) {
            setAnalysisLoadError(result.analysisError);
          }
        }
      } catch (err) {
        if (active) {
          setAnalysisLoadError(err instanceof Error ? err.message : 'Failed to load assessment details.');
        }
      } finally {
        if (active) setLoadingAssessmentData(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [selectedAssessmentId, selectedCategory, selectedTask, subjects]);

  // ─── 6. Item Breakdown & Question Pool Computation via item-analysis.ts ─────
  const itemAnalysisReport = useMemo(() => {
    if (!currentAssessmentDetails) return null;
    try {
      return buildItemAnalysis(currentAssessmentDetails, currentSubmissions);
    } catch {
      return null;
    }
  }, [currentAssessmentDetails, currentSubmissions]);

  const currentQuestions: QuestionItem[] = useMemo(() => {
    if (!itemAnalysisReport) return [];
    return itemAnalysisReport.items.map((item) => ({
      id: item.id,
      number: item.number,
      prompt: item.prompt,
      type: item.type || 'Question',
      expected: item.expected || 'N/A',
      correct: item.correct,
      incorrect: item.incorrect,
      skipped: item.skipped,
      correct_rate: item.correctRate !== null ? Math.round(item.correctRate) : 0,
      error_rate: item.errorRate !== null ? Math.round(item.errorRate) : 0,
      distribution: item.distribution.map((d) => ({
        answer: d.answer,
        count: d.count,
        correct: d.correct,
      })),
      responses: item.responses.map((r) => ({
        account_id: r.learner_id,
        student_name: r.student_name,
        answer: r.answer,
        is_correct: r.outcome === 'correct',
      })),
    }));
  }, [itemAnalysisReport]);

  // ─── 7. Student Breakdown List Computation ──────────────────────────────────
  const studentsList: StudentBreakdownItem[] = useMemo(() => {
    // If AI analysis was generated and contains student_breakdowns, prioritize it
    if (currentAnalysis?.student_breakdowns && currentAnalysis.student_breakdowns.length > 0) {
      return currentAnalysis.student_breakdowns.map((s) => ({
        account_id: s.account_id,
        student_name: s.student_name,
        score: s.score,
        max_score: s.max_score,
        percentage: s.percentage,
        passed: s.passed,
        personal_struggling_topics: s.personal_struggling_topics || [],
      }));
    }

    // Fallback to student submissions if analysis not yet generated
    if (currentSubmissions.length > 0 && currentAssessmentDetails) {
      const maxScore = currentAssessmentDetails.max_score || 1;
      const passThreshold = maxScore * 0.5;
      return currentSubmissions.map((sub) => {
        const score = sub.final_score ?? 0;
        const pct = Math.round((score / maxScore) * 100);
        return {
          account_id: sub.account_id || sub.learner_id,
          student_name: sub.student_name || sub.learner_id,
          score,
          max_score: maxScore,
          percentage: pct,
          passed: score >= passThreshold,
          personal_struggling_topics: [],
        };
      });
    }

    return [];
  }, [currentAnalysis, currentSubmissions, currentAssessmentDetails]);

  // ─── 8. Cohort Overview Metrics Computation ─────────────────────────────────
  const overview = useMemo(() => {
    if (currentAnalysis?.cohort_overview) {
      return currentAnalysis.cohort_overview;
    }

    // Default calculations from raw submissions before AI generation
    const totalStudents = currentSubmissions.length;
    const maxScore = currentAssessmentDetails?.max_score || selectedTask?.max_score || 1;
    const avgScore =
      totalStudents > 0
        ? currentSubmissions.reduce((acc, s) => acc + (s.final_score ?? 0), 0) / totalStudents
        : 0;
    const passingCount = currentSubmissions.filter((s) => (s.final_score ?? 0) >= maxScore * 0.5).length;
    const passingRate = totalStudents > 0 ? Math.round((passingCount / totalStudents) * 100) : 0;

    return {
      total_students: totalStudents,
      class_average: avgScore,
      passing_rate: passingRate,
      performance_summary:
        totalStudents === 0
          ? 'No student submissions have been recorded for this assessment yet. AI struggle diagnostics will be available once learners complete the assessment.'
          : 'No AI struggle analysis has been generated for this assessment cohort yet. Click "Generate AI Analysis" to evaluate learner submissions and identify root misconceptions.',
    };
  }, [currentAnalysis, currentSubmissions, currentAssessmentDetails, selectedTask]);

  // ─── 9. Button State & Submission Gate Logic ───────────────────────────────
  // Rule: Button is OPEN if no generated content and users have taken it; hidden if no user took it.
  const hasGeneratedAnalysis = currentAnalysis !== null;
  const hasLearnerSubmissions = currentSubmissions.length > 0;
  const canGenerate = Boolean(
    selectedTask &&
    !hasGeneratedAnalysis &&
    hasLearnerSubmissions &&
    !isGenerating &&
    !loadingAssessmentData
  );

  const buttonLabel = isGenerating
    ? 'Analyzing Answers...'
    : hasGeneratedAnalysis
    ? 'Analysis Already Generated'
    : 'Generate AI Analysis';

  // ─── 10. Generate AI Analysis Action Handler ────────────────────────────────
  const handleGenerateAnalysis = async () => {
    if (!selectedTask) return;
    setIsGenerating(true);
    setGenerationNotice(null);

    try {
      const targetProgram = (
        selectedCategory !== 'ALL' ? selectedCategory : selectedTask.target_category || 'SECONDARY'
      ) as TargetCategory;

      const generated = await getCohortAnalysis(selectedTask.assessment_id, targetProgram, true);
      setCurrentAnalysis(generated);
      setLastGeneratedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setGenerationNotice({
        type: 'success',
        message: `AI Diagnostic analysis successfully generated for "${selectedTask.title}". Curriculum topics and student misconceptions have been diagnosed.`,
      });
    } catch (err) {
      setGenerationNotice({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Failed to generate AI analysis. Please ensure student submissions are completed.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── 11. Tab Filters & Selections ───────────────────────────────────────────
  const filteredQuestions = useMemo(() => {
    return currentQuestions.filter((q) => {
      const matchSearch =
        q.prompt.toLowerCase().includes(questionSearch.toLowerCase()) ||
        String(q.number).includes(questionSearch);
      const matchFilter = questionFilter === 'all' || q.error_rate >= 50;
      return matchSearch && matchFilter;
    });
  }, [currentQuestions, questionSearch, questionFilter]);

  const activeQuestion = useMemo(() => {
    return (
      filteredQuestions.find((q) => q.id === selectedQuestionId) ||
      filteredQuestions[0] ||
      currentQuestions[0]
    );
  }, [filteredQuestions, selectedQuestionId, currentQuestions]);

  const filteredStudents = useMemo(() => {
    return studentsList.filter(
      (s) =>
        s.student_name.toLowerCase().includes(learnerSearch.toLowerCase()) ||
        s.account_id.toLowerCase().includes(learnerSearch.toLowerCase())
    );
  }, [studentsList, learnerSearch]);

  const activeStudent = useMemo(() => {
    return (
      filteredStudents.find((s) => s.account_id === selectedStudentId) ||
      filteredStudents[0] ||
      studentsList[0]
    );
  }, [filteredStudents, selectedStudentId, studentsList]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-6 sm:p-8 text-white shadow-xl shadow-blue-900/15">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-20 h-72 w-72 rounded-full border-[36px] border-white/10"
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <BarChart3 size={14} />
                {role === 'admin' ? 'Admin Academic Analytics' : 'Teacher Assessment Portal'}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                  hasGeneratedAnalysis
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                    : !hasLearnerSubmissions
                    ? 'bg-amber-500/10 text-amber-200 border-amber-400/20'
                    : 'bg-amber-500/20 text-amber-200 border-amber-400/30'
                }`}
              >
                {hasGeneratedAnalysis
                  ? 'AI Diagnostics Active'
                  : !hasLearnerSubmissions
                  ? 'Awaiting Submissions'
                  : 'AI Diagnostics Pending'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Assessment Analysis &amp; Struggle Diagnostics
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Examine cohort performance on specific quizzes, exams, and tests, evaluate root cognitive misconceptions, and review curriculum-grounded lesson recommendations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* If analysis already exists: show disabled button */}
            {hasGeneratedAnalysis ? (
              <button
                type="button"
                disabled={true}
                title="This assessment already has a generated struggle analysis in the backend."
                className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold shadow-md bg-white/40 text-blue-200 cursor-not-allowed opacity-75 backdrop-blur-sm"
              >
                <CheckCircle2 size={16} className="text-emerald-300" />
                {buttonLabel}
              </button>
            ) : hasLearnerSubmissions ? (
              /* If no analysis yet, but users have taken it: show OPEN / ENABLED Generate button */
              <button
                type="button"
                onClick={handleGenerateAnalysis}
                disabled={!canGenerate}
                title="Click to run AI diagnostic struggle analysis on completed student submissions."
                className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 bg-white text-blue-800 hover:bg-blue-50 cursor-pointer shadow-blue-950/20"
              >
                {isGenerating ? (
                  <Sparkles size={16} className="animate-spin text-blue-300" />
                ) : (
                  <Sparkles size={16} className="text-blue-800" />
                )}
                {buttonLabel}
              </button>
            ) : (
              /* If no user has taken it: DO NOT SHOW the button! Show an informative status */
              <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-blue-100 border border-white/15 backdrop-blur-sm">
                <Clock size={15} className="text-amber-300" />
                <span>Awaiting Learner Submissions</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Generation Alert Notification */}
      {generationNotice && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-xs sm:text-sm shadow-sm animate-in fade-in ${
            generationNotice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50/90 text-emerald-900'
              : 'border-rose-200 bg-rose-50/90 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {generationNotice.type === 'success' ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-rose-600" />
            )}
            <p>{generationNotice.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setGenerationNotice(null)}
            className="p-1 text-slate-500 hover:text-slate-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Global Fetch Load Error Alert */}
      {loadError && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-rose-600" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={fetchTasks}
            className="rounded-lg bg-rose-600 px-3 py-1 font-semibold text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Selector & Filter Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Learning Program */}
          <div>
            <label
              htmlFor="program-filter"
              className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5"
            >
              1. Learning Program
            </label>
            <select
              id="program-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-colors"
            >
              <option value="ALL">All Programs (Show All)</option>
              <option value="SECONDARY">Junior High School (Secondary)</option>
              <option value="ELEMENTARY">Elementary</option>
              <option value="BLP">Basic Literacy Program (BLP)</option>
            </select>
          </div>

          {/* 2. Assessment Type Filter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="type-filter"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                2. Assessment Type
              </label>
              <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                Activities Excluded
              </span>
            </div>
            <select
              id="type-filter"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-colors"
            >
              <option value="ALL">
                All Evaluated Types ({availableAssessmentTypes.map(formatTypeLabel).join(' & ')})
              </option>
              {availableAssessmentTypes.map((type) => (
                <option key={type} value={type}>
                  {formatTypeLabel(type)} Only ({type})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Specific Quiz, Exam, or Test Selection */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="assessment-select"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                3. Select Specific Assessment to Analyze
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {loadingTasks ? (
                  <span className="flex items-center gap-1 text-blue-600">
                    <RefreshCw size={12} className="animate-spin" /> Fetching backend...
                  </span>
                ) : (
                  `${filteredAssessments.length} ${filteredAssessments.length === 1 ? 'task' : 'tasks'} found`
                )}
              </span>
            </div>
            <select
              id="assessment-select"
              value={selectedAssessmentId}
              onChange={(e) => {
                setSelectedAssessmentId(e.target.value);
                setGenerationNotice(null);
              }}
              disabled={loadingTasks || filteredAssessments.length === 0}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-colors disabled:opacity-50"
            >
              {loadingTasks ? (
                <option value="">Loading assessments from backend...</option>
              ) : filteredAssessments.length === 0 ? (
                <option value="">No completed assessments found</option>
              ) : (
                filteredAssessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.assessment_type}] [{a.target_category}] {a.title} ({a.subject_name})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Selected Assessment Metadata Badge Strip */}
        {selectedItemSummary && (
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100 text-xs">
            <span
              className={`rounded-md px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase border ${getTypeBadgeClass(
                selectedItemSummary.assessment_type
              )}`}
            >
              {selectedItemSummary.assessment_type}
            </span>
            <span className="font-semibold text-slate-700">{selectedItemSummary.title}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">{selectedItemSummary.subject_name}</span>
            <span className="text-slate-300">•</span>
            <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
              {selectedItemSummary.category_label}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              Max Score: {selectedItemSummary.max_score} pts
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {currentQuestions.length} Question Pool Items
            </span>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              Status: {selectedItemSummary.status}
            </span>
            <span className="ml-auto text-[11px] text-slate-400 italic">
              *Activities are performance tasks and excluded from cohort struggle analysis
            </span>
          </div>
        )}
      </section>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* SCREEN 1: NOT FOUND EMPTY STATE (0 Assessments Found)                     */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {!loadingTasks && filteredAssessments.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <FileQuestion size={32} />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-800">No Evaluated Assessments Found</h3>
          <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-slate-500 leading-relaxed">
            No quizzes, exams, or tests match the selected learning program and assessment type. Activities are
            performance tasks and are strictly excluded from cohort struggle diagnostics.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedType('ALL');
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
            >
              <RefreshCw size={14} />
              Reset Filters
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Submissions Evaluated</span>
                <Users size={18} className="text-blue-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{overview.total_students}</p>
              <p className="mt-1 text-xs text-slate-400">Completed student attempts</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Class Average</span>
                <BarChart3 size={18} className="text-emerald-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {overview.class_average.toFixed(1)}{' '}
                <span className="text-base font-normal text-slate-400">
                  / {selectedItemSummary?.max_score ?? 100}
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {selectedItemSummary?.max_score
                  ? Math.round((overview.class_average / selectedItemSummary.max_score) * 100)
                  : 0}
                % overall cohort score
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Passing Rate</span>
                <ClipboardCheck size={18} className="text-blue-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-blue-700">{overview.passing_rate}%</p>
              <p className="mt-1 text-xs text-slate-400">
                {Math.round((overview.total_students * overview.passing_rate) / 100)} of {overview.total_students} passed
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Struggling Topics</span>
                <Target size={18} className="text-rose-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-rose-600">
                {hasGeneratedAnalysis ? currentAnalysis?.struggling_topics?.length ?? 0 : '0'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {hasGeneratedAnalysis
                  ? 'Requires teacher intervention'
                  : !hasLearnerSubmissions
                  ? 'Awaiting student submissions'
                  : 'Pending AI struggle diagnosis'}
              </p>
            </div>
          </section>

          {/* Diagnostic Tabs Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200">
            {([
              { id: 'overview', label: 'AI Struggle Overview', icon: Sparkles },
              { id: 'items', label: 'Item Breakdown & Distractors', icon: Target },
              { id: 'learners', label: 'Learner Insights & Diagnostics', icon: GraduationCap },
            ] as const).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-bold transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ───────────────────────────────────────────────────────────────────── */}
          {/* TAB 1: AI STRUGGLE OVERVIEW                                           */}
          {/* ───────────────────────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div>
              {loadingAssessmentData ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                  <RefreshCw size={28} className="animate-spin text-blue-600 mb-3" />
                  <p className="text-sm font-semibold">Loading assessment and diagnostic data...</p>
                </div>
              ) : !hasGeneratedAnalysis ? (
                !hasLearnerSubmissions ? (
                  /* SCREEN 2A: NO USER HAS TAKEN IT YET (NO GENERATE BUTTON SHOWN) */
                  <div className="rounded-3xl border border-dashed border-amber-200 bg-amber-50/40 p-8 sm:p-12 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <Users size={32} />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-800">Awaiting Student Submissions</h3>
                    <p className="mx-auto mt-2 max-w-lg text-xs sm:text-sm text-slate-600 leading-relaxed">
                      No learners have submitted answers for this assessment yet. AI struggle diagnostics and
                      curriculum lesson recommendations will become available once students in this learning program
                      complete their submissions.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold text-amber-800">
                      <Clock size={14} />
                      <span>Diagnostic generation will unlock once completed submissions are recorded</span>
                    </div>
                  </div>
                ) : (
                  /* SCREEN 2B: USERS HAVE TAKEN IT - READY FOR AI GENERATION (BUTTON SHOWN) */
                  <div className="rounded-3xl border border-dashed border-blue-200 bg-blue-50/40 p-8 sm:p-12 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                      <Sparkles size={32} />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-800">No AI Struggle Analysis Generated Yet</h3>
                    <p className="mx-auto mt-2 max-w-lg text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {overview.total_students} completed student submission{overview.total_students === 1 ? '' : 's'} recorded.
                      Click the <strong>&ldquo;Generate AI Analysis&rdquo;</strong> button to evaluate student
                      responses, identify root misconceptions, and receive curriculum-aligned remedial lessons.
                    </p>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={handleGenerateAnalysis}
                        disabled={!canGenerate}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <Sparkles size={16} />
                        {isGenerating ? 'Analyzing Answers...' : 'Generate AI Analysis Now'}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                /* SCREEN 3: GENERATED ANALYSIS RENDERED */
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)]">
                  <div className="space-y-6">
                    {/* Performance Summary Narrative Card */}
                    <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-6 shadow-sm">
                      <div className="flex items-center gap-2.5 text-blue-900 mb-3">
                        <Sparkles size={18} className="text-blue-600" />
                        <h3 className="text-base font-bold">What the Answers Suggest</h3>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-700">
                        {currentAnalysis.cohort_overview?.performance_summary ||
                          'Cohort answers evaluated by the AI diagnostic service.'}
                      </p>
                      <p className="mt-4 text-[11px] font-medium text-slate-400">
                        Analysis evaluated: {lastGeneratedAt || 'Cached'} • Curriculum Grounding: DepEd ALS Learning Strands
                      </p>
                    </section>

                    {/* Struggling Topics Section */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-900">
                          Topics Requiring Focused Remediation ({currentAnalysis.struggling_topics.length})
                        </h3>
                        <span className="text-xs text-slate-500">Ranked by Cohort Error Rate</span>
                      </div>

                      {currentAnalysis.struggling_topics.length === 0 ? (
                        /* POSITIVE STATE: 0 STRUGGLING TOPICS DETECTED */
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <CheckCircle2 size={24} />
                          </div>
                          <h4 className="mt-3 text-base font-bold text-emerald-900">No Struggling Topics Found</h4>
                          <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm text-emerald-700">
                            The cohort demonstrated solid mastery across all evaluated questions. No persistent
                            misconceptions or struggling topics were flagged by the AI diagnostic.
                          </p>
                        </div>
                      ) : (
                        currentAnalysis.struggling_topics.map((topic, index) => (
                          <article
                            key={index}
                            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                      severityBadgeStyles[topic.severity] || severityBadgeStyles.MEDIUM
                                    }`}
                                  >
                                    {topic.severity} Priority
                                  </span>
                                  <span className="text-xs font-semibold text-rose-600">
                                    {topic.error_rate_percent}% Cohort Error Rate
                                  </span>
                                </div>
                                <h4 className="mt-2 text-base font-bold text-slate-900">{topic.topic_name}</h4>
                              </div>
                            </div>

                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                              {topic.description}
                            </p>

                            {/* Root Cognitive Misconception Card */}
                            <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4">
                              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-900 flex items-center gap-1.5">
                                <HelpCircle size={14} className="text-amber-700" />
                                Root Cognitive Misconception
                              </p>
                              <p className="mt-1 text-xs text-amber-950 leading-relaxed">
                                {topic.misconception}
                              </p>
                            </div>

                            {/* Affected Questions & Learners */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <span className="font-semibold text-slate-700">Affected Items:</span>
                                {topic.affected_question_ids.map((qid) => (
                                  <span
                                    key={qid}
                                    className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700"
                                  >
                                    {qid}
                                  </span>
                                ))}
                              </div>

                              <details className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-800">
                                <summary>
                                  View Struggling Learners ({topic.struggling_students.length})
                                </summary>
                                <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-200">
                                  {topic.struggling_students.length > 0
                                    ? topic.struggling_students.join(', ')
                                    : 'None recorded'}
                                </div>
                              </details>
                            </div>
                          </article>
                        ))
                      )}
                    </section>
                  </div>

                  {/* Recommended Lessons Column */}
                  <aside className="space-y-4">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-900 mb-4">
                        <BookOpen size={20} className="text-blue-600" />
                        <h3 className="text-base font-bold">Recommended ALS Remedial Lessons</h3>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">
                        DepEd ALS modules grounded via pgvector curriculum similarity matching.
                      </p>

                      <div className="space-y-4">
                        {currentAnalysis.recommended_lessons.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                            No specific remedial lessons recommended. Cohort performance meets expectations.
                          </div>
                        ) : (
                          currentAnalysis.recommended_lessons.map((lesson, index) => (
                            <article
                              key={index}
                              className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/30"
                            >
                              <div className="flex items-center justify-between gap-2 text-[10px] text-blue-700 font-semibold mb-1">
                                <span>{lesson.module_title}</span>
                                {lesson.similarity_score && (
                                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800">
                                    {Math.round(lesson.similarity_score * 100)}% match
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                {lesson.lesson_title}
                              </h4>
                              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                                {lesson.relevance_reason}
                              </p>
                              <div className="mt-3">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                                  Open ALS Curriculum Module <ChevronRight size={14} />
                                </span>
                              </div>
                            </article>
                          ))
                        )}
                      </div>
                    </section>
                  </aside>
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────── */}
          {/* TAB 2: ITEM BREAKDOWN & DISTRACTORS                                   */}
          {/* ───────────────────────────────────────────────────────────────────── */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative min-w-0 flex-1 sm:max-w-md">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    aria-label="Search questions"
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    placeholder="Search question prompt or item number..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    aria-label="Filter items"
                    value={questionFilter}
                    onChange={(e) => setQuestionFilter(e.target.value === 'high_error' ? 'high_error' : 'all')}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All Items ({currentQuestions.length})</option>
                    <option value="high_error">High Error Rate (≥50%)</option>
                  </select>
                </div>
              </div>

              {currentQuestions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs sm:text-sm text-slate-500">
                  No question pool items configured for this assessment.
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs sm:text-sm text-slate-500">
                  No question items found matching your search filter &ldquo;{questionSearch}&rdquo;.
                </div>
              ) : (
                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
                  {/* Left: Questions List */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
                    {filteredQuestions.map((q) => {
                      const isSelected = q.id === activeQuestion?.id;
                      const isHighError = q.error_rate >= 50;
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setSelectedQuestionId(q.id)}
                          className={`flex w-full items-start gap-3 p-4 text-left transition-colors ${
                            isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                            {String(q.number).padStart(2, '0')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-xs sm:text-sm font-semibold text-slate-800">
                              {q.prompt}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                              <span>{q.type}</span>
                              <span>•</span>
                              <span className={isHighError ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                                {q.correct_rate}% Correct
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${
                                  q.correct_rate >= 70
                                    ? 'bg-emerald-500'
                                    : q.correct_rate >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${q.correct_rate}%` }}
                              />
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-slate-300 mt-1 shrink-0" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Right: Active Question Detail with Distractors */}
                  {activeQuestion && (
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                      <div>
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800">
                          Item {activeQuestion.number} • {activeQuestion.type}
                        </span>
                        <h4 className="mt-2 text-base font-bold text-slate-900 leading-snug">
                          {activeQuestion.prompt}
                        </h4>
                      </div>

                      {/* Expected Correct Answer */}
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-900">
                        <Check size={16} className="shrink-0 text-emerald-600" />
                        <div>
                          <span className="font-bold">Correct Expected Answer:</span> {activeQuestion.expected}
                        </div>
                      </div>

                      {/* Stat Counters */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
                          <p className="text-xl font-extrabold text-emerald-600">{activeQuestion.correct}</p>
                          <p className="text-[10px] font-bold uppercase text-slate-400">Correct</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
                          <p className="text-xl font-extrabold text-rose-600">{activeQuestion.incorrect}</p>
                          <p className="text-[10px] font-bold uppercase text-slate-400">Incorrect</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
                          <p className="text-xl font-extrabold text-slate-600">{activeQuestion.error_rate}%</p>
                          <p className="text-[10px] font-bold uppercase text-slate-400">Error Rate</p>
                        </div>
                      </div>

                      {/* Distractor Choice Distribution Chart */}
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                          Cohort Distractor Selection Distribution
                        </h5>
                        <div className="space-y-3">
                          {activeQuestion.distribution.length === 0 ? (
                            <p className="text-xs text-slate-400">No choice distribution data available.</p>
                          ) : (
                            activeQuestion.distribution.map((dist, idx) => {
                              const totalChoices = activeQuestion.correct + activeQuestion.incorrect;
                              const percentVal = totalChoices ? Math.round((dist.count / totalChoices) * 100) : 0;
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span
                                      className={`font-medium ${
                                        dist.correct ? 'font-bold text-emerald-700' : 'text-slate-700'
                                      }`}
                                    >
                                      {dist.answer} {dist.correct && '(Correct Key)'}
                                    </span>
                                    <span className="font-mono text-slate-500">
                                      {dist.count} ({percentVal}%)
                                    </span>
                                  </div>
                                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        dist.correct ? 'bg-emerald-500' : 'bg-slate-300'
                                      }`}
                                      style={{ width: `${percentVal}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Learner Responses Sample */}
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Learner Answer Roster
                        </h5>
                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-100">
                          {activeQuestion.responses.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400">
                              No recorded learner responses for this item yet.
                            </div>
                          ) : (
                            activeQuestion.responses.map((resp, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 text-xs">
                                <div>
                                  <span className="font-semibold text-slate-800">{resp.student_name}</span>
                                  <p className="text-slate-500 mt-0.5">{resp.answer || 'No response recorded'}</p>
                                </div>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    resp.is_correct
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-rose-50 text-rose-700'
                                  }`}
                                >
                                  {resp.is_correct ? 'Correct' : 'Incorrect'}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────────── */}
          {/* TAB 3: LEARNER INSIGHTS                                               */}
          {/* ───────────────────────────────────────────────────────────────────── */}
          {activeTab === 'learners' && (
            <div className="space-y-4">
              <div className="max-w-md">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    aria-label="Search learners"
                    value={learnerSearch}
                    onChange={(e) => setLearnerSearch(e.target.value)}
                    placeholder="Search student by name or account ID..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {studentsList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs sm:text-sm text-slate-500">
                  No completed student submissions recorded for this assessment yet.
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs sm:text-sm text-slate-500">
                  No student records found matching your search filter &ldquo;{learnerSearch}&rdquo;.
                </div>
              ) : (
                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
                  {/* Left: Student Roster List */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
                    {filteredStudents.map((st) => {
                      const isSelected = st.account_id === activeStudent?.account_id;
                      return (
                        <button
                          key={st.account_id}
                          type="button"
                          onClick={() => setSelectedStudentId(st.account_id)}
                          className={`flex w-full items-center justify-between p-4 text-left transition-colors ${
                            isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                              {st.student_name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-bold text-slate-900">{st.student_name}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{st.account_id}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-xs sm:text-sm font-bold text-slate-800">
                              {st.score} / {st.max_score}
                            </p>
                            <span
                              className={`text-[10px] font-bold ${
                                st.passed ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {st.passed ? 'PASSED' : 'NEEDS PRACTICE'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right: Individual Student Profile */}
                  {activeStudent && (
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                            Individual Learner Diagnostic
                          </span>
                          <h4 className="text-lg font-bold text-slate-900">{activeStudent.student_name}</h4>
                          <p className="font-mono text-xs text-slate-400">{activeStudent.account_id}</p>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-extrabold text-slate-900">
                            {activeStudent.score}{' '}
                            <span className="text-sm font-normal text-slate-400">/ {activeStudent.max_score}</span>
                          </div>
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              activeStudent.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {activeStudent.percentage}% • {activeStudent.passed ? 'Passed' : 'Needs Practice'}
                          </span>
                        </div>
                      </div>

                      {/* Personal Struggling Topics */}
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Personal Topics for Practice &amp; Remediation
                        </h5>
                        {activeStudent.personal_struggling_topics.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {activeStudent.personal_struggling_topics.map((top, idx) => (
                              <span
                                key={idx}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900"
                              >
                                {top}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-800">
                            No personal struggling topics detected for this learner on evaluated items. Full competency demonstrated.
                          </div>
                        )}
                      </div>

                      {/* Submitted Answers for this Quiz/Exam/Test */}
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                          Submitted Answers for this Assessment
                        </h5>
                        <div className="space-y-3">
                          {currentQuestions.length === 0 ? (
                            <p className="text-xs text-slate-400">No question pool items found.</p>
                          ) : (
                            currentQuestions.map((q) => {
                              const studentResp = q.responses.find(
                                (r) =>
                                  r.account_id === activeStudent.account_id ||
                                  r.student_name === activeStudent.student_name
                              );
                              const isCorrect = studentResp ? studentResp.is_correct : false;

                              return (
                                <div
                                  key={q.id}
                                  className={`rounded-xl border p-3.5 text-xs transition-colors ${
                                    isCorrect
                                      ? 'border-emerald-100 bg-emerald-50/30'
                                      : 'border-rose-100 bg-rose-50/30'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-semibold text-slate-800">
                                      Item {q.number}: {q.prompt}
                                    </p>
                                    <span
                                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                        isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {isCorrect ? 'Correct' : 'Incorrect'}
                                    </span>
                                  </div>
                                  <div className="mt-2 text-slate-600">
                                    <span className="font-medium">Student Answer:</span>{' '}
                                    {studentResp ? studentResp.answer || '(Empty)' : 'No response recorded'}
                                  </div>
                                  {!isCorrect && (
                                    <div className="mt-1 text-emerald-800 font-medium">
                                      <span>Expected Correct:</span> {q.expected}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
