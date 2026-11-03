'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BarChart3, CheckCircle2, RefreshCw, Target, Users } from 'lucide-react';
import type { AssessmentRow, TargetCategory } from '@/src/lib/assessments-api';
import {
  AnalysisRequestError,
  analysisReady,
  generateAnalysisOnce,
  loadAnalysisOptions,
  loadAssessmentAnalysis,
  noAnalysisTopics,
  type CohortAnalysis,
} from '@/src/lib/assessment-analysis-api';
import { analysisHref, analysisRoute, analysisSubjectMatches } from '@/src/lib/analysis-navigation';
import { buildItemAnalysis } from '@/src/lib/item-analysis';
import { subjectName, type SubjectRecord } from '@/src/lib/subjects-api';
import { useApiData } from '@/src/lib/use-api-data';
import ApiState from '@/src/components/ui/ApiState';
import PageHeader, { studentHeaderActionClass } from '@/src/components/layout/student/StudentPageHeader';
import RecordToolbar from '@/src/components/ui/RecordToolbar';
import { ItemBreakdown, LearnerInsights } from './AnalysisDetails';
import AnalysisOverview from './AnalysisOverview';
import AnalysisStatus, { type AnalysisFailure } from './AnalysisStatus';

const fieldClass = 'mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-normal text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400';
const panelClass = 'min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm';
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'items', label: 'Question Analysis' },
  { id: 'learners', label: 'Learner Insights' },
] as const;
type AnalysisTab = typeof tabs[number]['id'];

export default function ItemAnalysis({ role = 'teacher' }: { role?: 'admin' | 'teacher' }) {
  const options = useApiData(loadAnalysisOptions);
  const params = useSearchParams();
  const data = options.loading || options.error ? null : options.data;
  const selection = analysisRoute(params, data?.categories || [], data?.subjects || []);
  const search = params.get('q') || '';
  const sort = params.get('sort') || 'name-asc';
  const selectedId = params.get('assessment') || '';

  const tasks = (data?.tasks || []).filter(task => {
    const title = task.title + ' ' + subjectName(data?.subjects || [], task.subject_code, task.target_category);
    return !selection.error
      && title.toLowerCase().includes(search.trim().toLowerCase())
      && (!selection.program || !task.target_category || task.target_category === selection.program)
      && (selection.type === 'ALL' || task.assessment_type === selection.type)
      && (!selection.subject || analysisSubjectMatches(task, selection.subject));
  }).sort((a, b) => {
    if (sort === 'newest') return (b.created_at || '').localeCompare(a.created_at || '');
    return (sort === 'name-desc' ? -1 : 1) * a.title.localeCompare(b.title);
  });

  const task = tasks.find(item => item.assessment_id === selectedId);
  const program = task?.target_category || selection.program;
  const selectionError = selection.error || (selectedId && !task
    ? 'This assessment is unavailable for the selected program, subject, or filters. Choose another assessment.'
    : '');

  function navigate(changes: Record<string, string | null>, replace = false) {
    const href = analysisHref(window.location.pathname, params.toString(), changes);
    if (replace) window.history.replaceState(null, '', href);
    else window.history.pushState(null, '', href);
  }

  function chooseProgram(value: string) {
    navigate({ program: value, subject: null, assessment: null, q: null });
  }

  function chooseSubject(value: string) {
    const subject = selection.subjects.find(item => item.subject_id === value);
    const category = data?.categories.find(item => item.category_id === subject?.category_id || item.code === subject?.category_code);
    navigate({ subject: value, program: category?.code || selection.program || null, assessment: null, q: null });
  }

  function chooseAssessment(id: string) {
    const selected = tasks.find(item => item.assessment_id === id);
    if (!selected) {
      navigate({ assessment: null });
      return;
    }
    const selectedProgram = selected.target_category || selection.program;
    const subject = selectedProgram
      ? data?.subjects.find(item => item.is_active && analysisSubjectMatches(selected, item)
        && (item.category_code === selectedProgram || data.categories.some(category => category.code === selectedProgram && item.category_id === category.category_id)))
      : selection.subject;
    navigate({ assessment: id, program: selectedProgram || null, subject: subject?.subject_id || selection.subject?.subject_id || null });
  }

  function clearFilters() {
    navigate({ program: null, subject: null, assessment: null, type: null, q: null });
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1480px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        compact
        eyebrow={role === 'admin' ? 'Academic oversight' : 'Academics & assessments'}
        title="Assessment Analysis"
        description="Review recorded answers, understand common mistakes, and plan the next lesson."
        actions={
          <button type="button" disabled={options.loading} onClick={options.reload} className={studentHeaderActionClass}>
            <RefreshCw size={14} className="mr-2" aria-hidden="true" />Refresh assessments
          </button>
        }
      />
      <ApiState loading={options.loading} error={options.error} onRetry={options.reload} />

      {data && (
        <section aria-labelledby="analysis-selection-heading" className={`${panelClass} p-5 sm:p-6`}>
          <h2 id="analysis-selection-heading" className="text-sm font-semibold text-slate-800">
            {role === 'admin' ? 'All teacher assessments' : 'Your assessments'}
          </h2>
          <p className="mt-1 text-xs leading-6 text-slate-500">Choose the program, subject, and assessment. An existing saved report opens automatically.</p>
          <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-3">
            <label htmlFor="analysis-program" className="min-w-0 text-xs font-semibold text-slate-700">
              1. Learning program
              <select id="analysis-program" aria-label="Learning program" value={selection.category?.code || ''} onChange={event => chooseProgram(event.target.value)} className={fieldClass}>
                <option value="">All programs</option>
                {data.categories.map(item => <option key={item.category_id} value={item.code}>{item.name}</option>)}
              </select>
            </label>
            <label htmlFor="analysis-subject" className="min-w-0 text-xs font-semibold text-slate-700">
              2. Subject
              <select id="analysis-subject" aria-label="Subject" value={selection.subject?.subject_id || ''} onChange={event => chooseSubject(event.target.value)} className={fieldClass}>
                <option value="">All subjects</option>
                {selection.subjects.map(item => (
                  <option key={item.subject_id} value={item.subject_id}>
                    {item.name}{!selection.program ? ' · ' + (item.category_name || item.category_code || '') : ''}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="analysis-assessment" className="min-w-0 text-xs font-semibold text-slate-700">
              3. Assessment
              <select id="analysis-assessment" aria-label="Assessment" value={task?.assessment_id || ''} disabled={!!selection.error || !tasks.length} onChange={event => chooseAssessment(event.target.value)} className={fieldClass}>
                <option value="">Choose an assessment</option>
                {tasks.map(item => <option key={item.assessment_id} value={item.assessment_id}>{item.assessment_type === 'QUIZ' ? 'Quiz' : item.assessment_type === 'TEST' ? 'Test' : 'Exam'} · {item.title}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <RecordToolbar
              search={search}
              onSearch={value => navigate({ q: value, assessment: null }, true)}
              searchLabel="Search assessments"
              placeholder="Search assessment or subject…"
              sort={sort}
              onSort={value => navigate({ sort: value })}
              sorts={[{ value: 'name-asc', label: 'Assessment A–Z' }, { value: 'name-desc', label: 'Assessment Z–A' }, { value: 'newest', label: 'Newest assessment' }]}
              filters={[{ key: 'type', label: 'Assessment type', value: selection.type, options: [{ value: 'ALL', label: 'All types' }, { value: 'QUIZ', label: 'Quiz' }, { value: 'EXAM', label: 'Exam' }, { value: 'TEST', label: 'Test' }] }]}
              onApply={values => navigate({ type: values.type, assessment: null })}
            />
          </div>

          <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-500">
            <p className="min-w-0 break-words">
              {selection.category?.name || 'All programs'} / {selection.subject?.name || 'All subjects'}
              <span className="ml-2 text-slate-400">· {tasks.length} {tasks.length === 1 ? 'assessment' : 'assessments'}</span>
            </p>
            {(selection.program || selection.subject || search || selection.type !== 'ALL') && (
              <button type="button" onClick={clearFilters} className="min-h-10 font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-500">Clear all filters</button>
            )}
          </div>
          {selectionError && (
            <div role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
              {selectionError}
              <button type="button" onClick={clearFilters} className="ml-2 min-h-10 font-semibold underline">Clear selections</button>
            </div>
          )}
          {!selectionError && !tasks.length && (
            <div className="mt-4 rounded-xl bg-slate-50 p-5 text-center">
              <h3 className="text-sm font-semibold text-slate-700">{data.tasks.length ? 'No matching assessments' : 'No assessments available'}</h3>
              <p className="mt-2 text-xs leading-6 text-slate-500">{data.tasks.length ? 'Try another subject, adjust the search, or clear your filters.' : 'Quizzes, exams, and tests will appear here after they are created.'}</p>
              {data.tasks.length ? (
                <button type="button" onClick={clearFilters} className="mt-2 min-h-10 text-xs font-semibold text-blue-700">Clear filters and search</button>
              ) : (
                <Link href={role === 'admin' ? '/admin/dashboard' : '/teacher/assessment-tasks'} className="mt-2 inline-flex min-h-10 items-center text-xs font-semibold text-blue-700">
                  {role === 'admin' ? 'Back to dashboard' : 'View assessments'}
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      {data && task && !selectionError && (
        program ? (
          <AnalysisWorkspace key={`${task.assessment_id}:${program}`} role={role} task={task} program={program as TargetCategory} subjects={data.subjects} subjectId={selection.subject?.subject_id} />
        ) : <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">Choose a learning program to load this assessment’s saved analysis.</p>
      )}
    </div>
  );
}

function AnalysisWorkspace({ role, task, program, subjects, subjectId }: { role: 'admin' | 'teacher'; task: AssessmentRow; program: TargetCategory; subjects: SubjectRecord[]; subjectId?: string }) {
  const load = useCallback(() => loadAssessmentAnalysis(task, program, subjects), [task, program, subjects]);
  const source = useApiData(load);
  const [attempt, setAttempt] = useState<{ analysis: CohortAnalysis; saved: boolean } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<AnalysisFailure | null>(null);
  const [tab, setTab] = useState<AnalysisTab>('overview');
  const [now, setNow] = useState(() => Date.now());
  const pending = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, []);

  const data = source.loading || source.error ? null : source.data;
  const analysis = attempt?.analysis || data?.analysis || null;
  const saved = attempt ? attempt.saved : !!data?.analysis && !noAnalysisTopics(data.analysis);
  const failure = error || (data?.analysisError ? { step: 'loading' as const, message: data.analysisError } : null);
  const eligible = analysisReady(task, now);
  const report = useMemo(() => {
    if (!data) return null;
    const topics = saved ? (analysis?.struggling_topics || []).map(topic => ({ ...topic, recommendation: topic.description })) : [];
    return buildItemAnalysis({ ...data.assessment, topics }, data.submissions);
  }, [data, analysis, saved]);
  const subject = subjects.find(item => item.category_code === program && analysisSubjectMatches(task, item));
  const materialHref = role === 'teacher'
    ? analysisHref('/teacher/lesson-content', '', { program, subject: subjectId || subject?.subject_id || null })
    : undefined;

  function refresh() {
    if (pending.current) return;
    setAttempt(null);
    setError(null);
    source.reload();
  }

  async function generate() {
    if (pending.current || !eligible || !report?.total || saved || failure || !data) return;
    pending.current = true;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateAnalysisOnce(task.assessment_id, program, () => mounted.current);
      if (mounted.current) {
        setAttempt(result);
        setTab('overview');
      }
    } catch (caught) {
      if (mounted.current) {
        setError({
          step: caught instanceof AnalysisRequestError ? caught.step : 'generating',
          message: caught instanceof Error ? caught.message : 'Analysis could not be completed. Retry loading to check for a saved report.',
        });
      }
    } finally {
      pending.current = false;
      if (mounted.current) setGenerating(false);
    }
  }

  function changeTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    setTab(tabs[next].id);
    document.getElementById('analysis-tab-' + tabs[next].id)?.focus();
  }

  function openTab(value: AnalysisTab) {
    setTab(value);
    window.requestAnimationFrame(() => document.getElementById('analysis-panel-' + value)?.focus());
  }

  return (
    <>
      {(source.loading || data) && (
        <AnalysisStatus
          analysis={analysis}
          saved={saved}
          loading={source.loading}
          generating={generating}
          eligible={eligible}
          submissions={report?.total || 0}
          error={failure}
          materialHref={materialHref}
          onRefresh={refresh}
          onGenerate={() => void generate()}
          onView={() => openTab('overview')}
        />
      )}
      <ApiState loading={false} error={source.error} onRetry={refresh} />
      {data && report && (
        <>
          <AnalysisSummary analysis={saved ? analysis : null} submissions={report.total} />
          <section className={`${panelClass} max-w-full`}>
            <div className="flex min-w-0 flex-wrap items-end justify-between gap-2 border-b border-slate-100 px-4 pt-3 sm:px-5">
              <div role="tablist" aria-label="Analysis views" className="flex min-w-0 flex-wrap gap-1">
                {tabs.map((item, index) => (
                  <button
                    key={item.id}
                    id={'analysis-tab-' + item.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.id}
                    aria-controls={'analysis-panel-' + item.id}
                    tabIndex={tab === item.id ? 0 : -1}
                    onClick={() => setTab(item.id)}
                    onKeyDown={event => changeTab(event, index)}
                    className={`min-h-11 border-b-2 px-3 py-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-blue-500 ${tab === item.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="pb-3 text-xs text-slate-400">{tab === 'overview' ? saved ? 'Saved report' : 'Report overview' : 'Current submission records'}</p>
            </div>
            {tabs.map(item => (
              <div key={item.id} id={'analysis-panel-' + item.id} role="tabpanel" aria-labelledby={'analysis-tab-' + item.id} hidden={tab !== item.id} tabIndex={0} className="min-w-0 scroll-mt-24 p-4 outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:p-5">
                {item.id === 'overview' && <AnalysisOverview analysis={analysis} unavailable={!!failure} role={role} onReviewQuestions={() => openTab('items')} />}
                {item.id === 'items' && <ItemBreakdown report={report} />}
                {item.id === 'learners' && <LearnerInsights report={report} maxScore={data.assessment.max_score} analysis={saved ? analysis : null} />}
              </div>
            ))}
          </section>
          <p className="text-xs leading-6 text-slate-500">
            {saved ? 'The overview uses the saved report. Question and learner views show currently available submissions.' : 'Question and learner views use the recorded submissions for this assessment and program.'}
            {' '}Skipped responses and answers awaiting teacher review are shown separately. Undelivered items are not treated as skipped answers.
          </p>
        </>
      )}
    </>
  );
}

function AnalysisSummary({ analysis, submissions }: { analysis: CohortAnalysis | null; submissions: number }) {
  const summary = analysis?.cohort_overview;
  const metrics = [
    { label: 'Submissions', value: summary?.total_students ?? submissions, note: summary ? 'Included in the saved report' : 'Submitted or graded attempts', Icon: Users },
    { label: 'Class average', value: summary ? summary.class_average.toLocaleString('en-PH', { maximumFractionDigits: 2 }) + ' pts' : '—', note: summary ? 'Recorded scores at generation' : 'Available in the saved report', Icon: BarChart3 },
    { label: 'Passing rate', value: summary ? summary.passing_rate.toLocaleString('en-PH', { maximumFractionDigits: 2 }) + '%' : '—', note: summary ? 'Returned with the saved report' : 'Available in the saved report', Icon: CheckCircle2 },
    { label: 'Topics to revisit', value: analysis ? analysis.struggling_topics.length : '—', note: analysis ? 'From the saved report' : 'Available after analysis', Icon: Target },
  ];
  return (
    <div aria-label="Assessment summary" className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
      {metrics.map(({ label, value, note, Icon }) => (
        <section key={label} className={`${panelClass} p-4 sm:p-5`}>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xs font-medium leading-5 text-slate-500">{label}</h2>
            <Icon size={16} className="shrink-0 text-blue-500" aria-hidden="true" />
          </div>
          <p className="mt-3 break-words text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">{value}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
        </section>
      ))}
    </div>
  );
}
