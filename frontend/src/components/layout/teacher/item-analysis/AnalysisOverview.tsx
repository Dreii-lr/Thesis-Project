'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight, BookOpen, FileText } from 'lucide-react';
import { noAnalysisTopics, type CohortAnalysis } from '@/src/lib/assessment-analysis-api';

interface AnalysisOverviewProps {
  analysis: CohortAnalysis | null;
  unavailable: boolean;
  role: 'admin' | 'teacher';
  onReviewQuestions: () => void;
}

const priorityNames: Record<string, string> = { HIGH: 'High priority', MEDIUM: 'Medium priority', LOW: 'Low priority' };
const priorityStyles: Record<string, string> = {
  HIGH: 'bg-rose-50 text-rose-700',
  MEDIUM: 'bg-amber-50 text-amber-800',
  LOW: 'bg-blue-50 text-blue-700',
};

export default function AnalysisOverview({ analysis, unavailable, role, onReviewQuestions }: AnalysisOverviewProps) {
  if (!analysis) {
    return (
      <div className="flex min-w-0 flex-col items-center px-3 py-8 text-center">
        <FileText size={26} className="text-blue-500" aria-hidden="true" />
        <h3 className="mt-4 text-base font-semibold text-slate-800">{unavailable ? 'Saved report is unavailable' : 'Review the recorded answers'}</h3>
        <p className="mt-2 max-w-lg text-xs leading-6 text-slate-500">
          {unavailable ? 'Use Retry loading to check the report. Question and learner records remain available.' : 'Question Analysis and Learner Insights are available before you generate a report. The generated summary will appear here.'}
        </p>
        <button type="button" onClick={onReviewQuestions} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-500">
          Review questions <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (noAnalysisTopics(analysis)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="mt-1 shrink-0 text-amber-700" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-amber-900">Curriculum review needed</h3>
            <p className="mt-2 text-xs leading-6 text-amber-900 [overflow-wrap:anywhere]">{analysis.message || 'No matching curriculum topic was returned for this assessment.'}</p>
            <p className="mt-2 text-xs leading-6 text-amber-800">The recorded questions and learner answers are still available in the other tabs. This outcome is not a saved analysis report.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        <section aria-labelledby="analysis-summary-heading" className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
          <p className="text-xs font-medium text-blue-700">Saved analysis</p>
          <h3 id="analysis-summary-heading" className="mt-2 text-base font-semibold text-slate-800">Class summary</h3>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600 [overflow-wrap:anywhere]">{analysis.cohort_overview?.performance_summary || 'No summary was returned in this report.'}</p>
        </section>

        <section aria-labelledby="analysis-topics-heading" className="min-w-0">
          <h3 id="analysis-topics-heading" className="text-sm font-semibold text-slate-800">Topics to revisit</h3>
          <p className="mt-1 text-xs leading-6 text-slate-500">Review the diagnosed topics and the learner responses behind them.</p>
          <div className="mt-3 space-y-3">
            {analysis.struggling_topics.map((topic, index) => (
              <article key={`${topic.topic_name}:${index}`} className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h4 className="min-w-0 flex-1 basis-40 break-words text-sm font-semibold text-slate-800">{topic.topic_name}</h4>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityStyles[topic.severity] || 'bg-slate-100 text-slate-600'}`}>
                    {priorityNames[topic.severity] || topic.severity}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">Recorded error rate: {Math.round(topic.error_rate_percent)}%</p>
                <p className="mt-3 text-xs leading-6 text-slate-600 [overflow-wrap:anywhere]">{topic.description}</p>
                {topic.misconception && (
                  <details className="mt-3 rounded-lg bg-slate-50 px-3">
                    <summary className="cursor-pointer py-3 text-xs font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-500">Common mistake</summary>
                    <p className="pb-3 text-xs leading-6 text-slate-600 [overflow-wrap:anywhere]">{topic.misconception}</p>
                  </details>
                )}
                {!!topic.struggling_students?.length && (
                  <details className="mt-2">
                    <summary className="cursor-pointer py-3 text-xs font-semibold text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-500">View affected learners ({topic.struggling_students.length})</summary>
                    <ul className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
                      {topic.struggling_students.map((name, learnerIndex) => <li key={`${name}:${learnerIndex}`} className="break-words text-xs leading-6 text-slate-600">{name}</li>)}
                    </ul>
                  </details>
                )}
              </article>
            ))}
            {!analysis.struggling_topics.length && <p className="rounded-xl border border-slate-200 p-4 text-xs leading-6 text-slate-500">No topics were flagged in this report. This is not a complete measure of learner competency.</p>}
          </div>
        </section>
      </div>

      <aside aria-labelledby="analysis-lessons-heading" className="min-w-0 rounded-xl border border-slate-200 p-5">
        <BookOpen size={21} className="text-blue-600" aria-hidden="true" />
        <h3 id="analysis-lessons-heading" className="mt-3 text-sm font-semibold text-slate-800">Recommended lessons</h3>
        <p className="mt-1 text-xs leading-6 text-slate-500">Related materials returned with the saved report.</p>
        <div className="mt-4 space-y-4">
          {(analysis.recommended_lessons || []).map((lesson, index) => (
            <article key={`${lesson.lesson_id}:${index}`} className="min-w-0 border-t border-slate-100 pt-4">
              <h4 className="break-words text-sm font-semibold leading-6 text-slate-700">{lesson.lesson_title}</h4>
              <p className="mt-1 break-words text-xs text-slate-500">{lesson.module_title}</p>
              <details className="mt-2">
                <summary className="cursor-pointer py-2 text-xs font-semibold text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-500">Why this lesson?</summary>
                <p className="text-xs leading-6 text-slate-600 [overflow-wrap:anywhere]">{lesson.relevance_reason}</p>
              </details>
              {role === 'teacher' && lesson.material_id && (
                <Link href={`/teacher/lesson-content/${encodeURIComponent(lesson.material_id)}`} className="mt-2 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-500">
                  Open material <ArrowRight size={14} aria-hidden="true" />
                </Link>
              )}
            </article>
          ))}
          {!analysis.recommended_lessons?.length && <p className="text-xs leading-6 text-slate-500">No related lesson recommendations were returned.</p>}
        </div>
      </aside>
    </div>
  );
}
