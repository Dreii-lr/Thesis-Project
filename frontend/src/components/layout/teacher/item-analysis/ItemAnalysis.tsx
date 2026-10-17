'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BarChart3, BookOpen, ClipboardCheck, RefreshCw, Sparkles, Target, Users } from 'lucide-react';
import { CATEGORY_LABELS, type AssessmentRow, type TargetCategory } from '@/src/lib/assessments-api';
import { analysisReady, getCohortAnalysis, loadAnalysisOptions, loadAssessmentAnalysis, type CohortAnalysis } from '@/src/lib/assessment-analysis-api';
import { buildItemAnalysis } from '@/src/lib/item-analysis';
import { subjectName, type SubjectRecord } from '@/src/lib/subjects-api';
import { useApiData } from '@/src/lib/use-api-data';
import ApiState from '@/src/components/ui/ApiState';
import { ItemBreakdown, LearnerInsights } from './AnalysisDetails';

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const panelClass = 'rounded-2xl border border-slate-200/80 bg-white shadow-sm';

export default function ItemAnalysis() {
  const options = useApiData(loadAnalysisOptions);
  const [selectedId, setSelectedId] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const data = options.loading || options.error ? null : options.data;
  const task = data?.tasks.find(item => item.assessment_id === selectedId) || data?.tasks[0];
  const program = task?.target_category || selectedProgram || data?.categories[0]?.code || '';

  return <div className="mx-auto w-full max-w-[1480px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <section className="portal-hero relative isolate overflow-hidden rounded-3xl p-6 text-white shadow-lg shadow-blue-900/10 sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 -z-10 h-72 w-72 rounded-full border-[36px] border-white/5" />
      <p className="flex items-center gap-2 text-[11px] font-semibold text-blue-100"><BarChart3 size={15} />Assessment insights</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Item Analysis</h1>
      <p className="mt-2 max-w-xl text-xs leading-6 text-blue-100/90">Review learner answers, understand common mistakes, and plan focused practice with AI assessment insights.</p>
    </section>
    <ApiState loading={options.loading} error={options.error} onRetry={options.reload} />
    {data && !task && <section className={`${panelClass} p-10 text-center`}><BookOpen size={26} className="mx-auto text-blue-400" /><h2 className="mt-4 text-sm font-bold text-slate-700">No quizzes or exams available</h2><p className="mt-2 text-xs leading-6 text-slate-400">Your quizzes and exams will appear here after you create them.</p><Link href="/teacher/assessment-tasks" className="mt-4 inline-block text-xs font-semibold text-blue-700">View assessments</Link></section>}
    {data && task && <>
      <section className={`${panelClass} p-5`}><div className="grid gap-5 lg:grid-cols-2"><div><label htmlFor="analysis-assessment" className="text-xs font-semibold text-slate-700">Assessment</label><select id="analysis-assessment" value={task.assessment_id} onChange={event => { setSelectedId(event.target.value); setSelectedProgram(''); }} className={`${fieldClass} mt-2`}>{data.tasks.map(item => <option key={item.assessment_id} value={item.assessment_id}>{item.assessment_type === 'QUIZ' ? 'Quiz' : 'Exam'} · {item.title}</option>)}</select><p className="mt-2 break-all font-mono text-[10px] text-slate-400">assessment_id: {task.assessment_id}</p></div><div><p className="text-xs font-semibold leading-6 text-slate-700">{subjectName(data.subjects, task.subject_code, program)}</p>{task.target_category ? <p className="mt-2 text-xs text-slate-400">{CATEGORY_LABELS[task.target_category]} · {task.assessment_type === 'QUIZ' ? 'Quiz' : 'Exam'}</p> : <label className="mt-2 block text-[11px] text-slate-500">Learning program<select aria-label="Analysis learning program" value={program} onChange={event => setSelectedProgram(event.target.value)} className={`${fieldClass} mt-2`}>{data.categories.map(category => <option key={category.category_id} value={category.code}>{category.name}</option>)}</select></label>}</div></div></section>
      {program ? <AnalysisWorkspace key={`${task.assessment_id}:${program}`} task={task} program={program as TargetCategory} subjects={data.subjects} /> : <p className="text-xs text-amber-800">A learning program must exist before this assessment can be analyzed.</p>}
    </>}
  </div>;
}

function AnalysisWorkspace({ task, program, subjects }: { task: AssessmentRow; program: TargetCategory; subjects: SubjectRecord[] }) {
  const load = useCallback(() => loadAssessmentAnalysis(task, program, subjects), [task, program, subjects]);
  const source = useApiData(load);
  const [generated, setGenerated] = useState<CohortAnalysis | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'items' | 'learners'>('overview');
  const [now, setNow] = useState(() => Date.now());
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => { mounted.current = false; window.clearInterval(timer); };
  }, []);
  const data = source.loading || source.error ? null : source.data;
  const analysis = generated || data?.analysis;
  const report = data ? buildItemAnalysis({ ...data.assessment, topics: (analysis?.struggling_topics || []).map(topic => ({ ...topic, recommendation: topic.description })) }, data.submissions) : null;
  const eligible = analysisReady(task, now);
  const generate = async () => {
    if (pending.current || !eligible || !report?.total) return;
    pending.current = true; setGenerating(true); setError('');
    try {
      const result = await getCohortAnalysis(task.assessment_id, program, true);
      if (mounted.current) { setGenerated(result); setTab('overview'); }
    } catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : 'Unable to generate the analysis.'); }
    finally { pending.current = false; if (mounted.current) setGenerating(false); }
  };
  return <>
    <ApiState loading={source.loading} error={source.error} onRetry={source.reload} />
    {data && report && <>
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-sm font-bold text-slate-800">Your assessment at a glance</h2><p className="mt-1.5 text-xs leading-6 text-slate-400">{report.total} completed submissions · {report.items.length} questions in the pool</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={generating} onClick={() => { setGenerated(null); setError(''); source.reload(); }} className="rounded-xl border border-slate-200 bg-white p-3 text-slate-500 disabled:opacity-50" aria-label="Refresh analysis records"><RefreshCw size={15} /></button><button type="button" onClick={() => void generate()} disabled={generating || !eligible || !report.total} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Sparkles size={15} />{generating ? 'Analyzing answers...' : analysis ? 'Regenerate AI analysis' : 'Generate AI analysis'}</button></div></div>
      {!eligible && <p className="rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">AI analysis becomes available when the quiz or exam is completed. Drafts cannot be analyzed.</p>}
      {!report.total && <p className="rounded-xl bg-slate-100 p-4 text-xs leading-6 text-slate-500">No completed submissions are available for this learning program yet.</p>}
      {(error || (!generated && data.analysisError)) && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-xs leading-6 text-rose-700">{error || data.analysisError}</p>}
      {generating && <p role="status" className="text-xs text-blue-600">The AI is reviewing answer patterns and matching curriculum topics. This may take a moment.</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
        { label: 'Submissions reviewed', value: report.total, note: 'Completed attempts', icon: Users },
        { label: 'Class average', value: `${report.average.toFixed(1)} / ${data.assessment.max_score}`, note: report.provisional ? 'Provisional · awaiting grading' : 'Based on recorded final scores', icon: BarChart3 },
        { label: 'Items to revisit', value: report.reviewItems, note: '50% or more incorrect / skipped', icon: Target },
        { label: 'Answers needing review', value: report.pending, note: 'Excluded from item error rates', icon: ClipboardCheck },
      ].map(metric => <section key={metric.label} className={`${panelClass} p-4 sm:p-5`}><div className="flex items-start justify-between gap-2"><p className="text-[11px] font-medium leading-5 text-slate-500">{metric.label}</p><metric.icon size={15} className="shrink-0 text-blue-400" /></div><p className="mt-3 text-2xl font-bold tracking-tight text-slate-800">{metric.value}</p><p className="mt-2 text-[10px] leading-5 text-slate-400">{metric.note}</p></section>)}</div>
      <div className="flex flex-wrap gap-1 border-b border-slate-200" aria-label="Analysis views">{(['overview', 'items', 'learners'] as const).map(value => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)} className={`border-b-2 px-4 py-3 text-xs font-semibold ${tab === value ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>{value === 'overview' ? 'AI overview' : value === 'items' ? 'Item breakdown' : 'Learner insights'}</button>)}</div>
      {tab === 'overview' && <Overview analysis={analysis || null} />}
      {tab === 'items' && <ItemBreakdown report={report} />}
      {tab === 'learners' && <LearnerInsights report={report} maxScore={data.assessment.max_score} />}
      <p className="text-[10px] leading-5 text-slate-400">Counts use completed submissions for this assessment and learning program. Skipped responses count as mistakes; items not delivered do not. Essay correctness remains pending until item-level review is available.</p>
    </>}
  </>;
}

function Overview({ analysis }: { analysis: CohortAnalysis | null }) {
  if (!analysis) return <section className={`${panelClass} px-6 py-10 text-center`}><Sparkles size={28} className="mx-auto text-blue-500" /><h3 className="mt-4 text-lg font-bold text-slate-800">From answers to understanding</h3><p className="mx-auto mt-2 max-w-lg text-xs leading-6 text-slate-500">Generate an AI analysis to summarize common mistakes and find related lessons. You can inspect the recorded item and learner answers in the other tabs.</p></section>;
  if (analysis.topic_found === false || analysis.status === 'NO_TOPIC_FOUND') return <section role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs leading-6 text-amber-900">{analysis.message || 'No matching curriculum topic was found. Review the uploaded materials and try again.'}</section>;
  return <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]"><div className="space-y-4"><section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 sm:p-6"><div className="flex items-center gap-2"><Sparkles size={17} className="text-blue-600" /><h3 className="text-sm font-bold text-blue-900">What the answers suggest</h3></div><p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{analysis.cohort_overview?.performance_summary || 'No performance summary was returned.'}</p><p className="mt-3 text-[10px] text-slate-400">{analysis.updated_at || analysis.created_at ? `Generated ${new Date(analysis.updated_at || analysis.created_at!).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}` : 'AI assessment analysis'}</p></section>
      <h3 className="text-sm font-bold text-slate-800">Topics that need attention</h3>{(analysis.struggling_topics || []).map((topic, index) => <article key={`${topic.topic_name}:${index}`} className={`${panelClass} p-5`}><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold text-slate-800">{topic.topic_name}</h4><span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-700">{Math.round(topic.error_rate_percent)}% error rate · {topic.severity}</span></div><p className="mt-3 text-xs leading-6 text-slate-500">{topic.description}</p>{topic.misconception && <div className="mt-4 rounded-xl bg-blue-50/60 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Common misconception</p><p className="mt-1.5 text-xs leading-6 text-slate-600">{topic.misconception}</p></div>}{topic.struggling_students?.length > 0 && <details className="mt-3"><summary className="cursor-pointer text-[11px] font-semibold text-blue-700">View affected learners</summary><p className="mt-2 text-xs leading-6 text-slate-500">{topic.struggling_students.join(', ')}</p></details>}</article>)}{!analysis.struggling_topics?.length && <p className="text-xs text-slate-400">No struggling topics were identified in this analysis.</p>}</div>
      <aside className={`${panelClass} p-5`}><BookOpen size={22} className="text-blue-500" /><h3 className="mt-4 text-sm font-bold text-slate-800">Recommended lessons</h3><div className="mt-4 space-y-4">{(analysis.recommended_lessons || []).map((lesson, index) => <article key={`${lesson.lesson_id}:${index}`} className="border-t border-slate-100 pt-4"><h4 className="text-xs font-semibold leading-6 text-slate-700">{lesson.lesson_title}</h4><p className="mt-1 text-[10px] text-slate-400">{lesson.module_title}</p><p className="mt-2 text-xs leading-6 text-slate-500">{lesson.relevance_reason}</p>{lesson.material_id && <Link href={`/teacher/lesson-content/${encodeURIComponent(lesson.material_id)}`} className="mt-3 inline-block text-xs font-semibold text-blue-700">Open material →</Link>}</article>)}{!analysis.recommended_lessons?.length && <p className="text-xs leading-6 text-slate-400">No lesson recommendations were returned.</p>}</div></aside></div>;
}
