'use client';

import Link from 'next/link';
import { AlertCircle, CheckCircle2, Clock3, FileText, LoaderCircle, RefreshCw, Sparkles, Users } from 'lucide-react';
import { noAnalysisTopics, type AnalysisStep, type CohortAnalysis } from '@/src/lib/assessment-analysis-api';

export type AnalysisFailure = { step: AnalysisStep; message: string };

interface AnalysisStatusProps {
  analysis: CohortAnalysis | null;
  saved: boolean;
  loading?: boolean;
  generating: boolean;
  eligible: boolean;
  submissions: number;
  error: AnalysisFailure | null;
  materialHref?: string;
  onRefresh: () => void;
  onGenerate: () => void;
  onView: () => void;
}

const errorMessages = {
  loading: { title: 'Saved analysis could not be loaded', description: 'Retry loading to check whether a report is available.' },
  generating: { title: 'Analysis could not be generated', description: 'Retry loading to check for a saved report before trying again.' },
  confirming: { title: 'We couldn’t confirm the saved report', description: 'The generation request finished, but its saved copy could not be retrieved. Retry loading before generating again.' },
};

export function analysisDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function AnalysisStatus({
  analysis, saved, loading = false, generating, eligible, submissions,
  error, materialHref, onRefresh, onGenerate, onView,
}: AnalysisStatusProps) {
  const noTopics = !!analysis && noAnalysisTopics(analysis);
  const busy = loading || generating;
  const generatedDate = saved ? analysisDate(analysis?.updated_at || analysis?.created_at) : null;
  let title = 'Ready for analysis';
  let description = 'Generate a report from the recorded submissions. Its saved copy will open automatically when you return.';
  let Icon = FileText;

  if (loading) {
    title = 'Loading saved analysis…';
    description = 'Checking whether this assessment already has a report.';
    Icon = LoaderCircle;
  } else if (generating) {
    title = 'Analyzing learner answers…';
    description = 'Please wait while the report is generated and its saved copy is checked.';
    Icon = LoaderCircle;
  } else if (error) {
    ({ title, description } = errorMessages[error.step]);
    Icon = AlertCircle;
  } else if (saved) {
    title = 'Analysis saved';
    description = 'This report reflects the submissions recorded when it was generated. You can return to it anytime.';
    Icon = CheckCircle2;
  } else if (noTopics) {
    title = 'No matching curriculum topic';
    description = 'No report was saved. Review the processed materials for this program and subject, then try again.';
    Icon = AlertCircle;
  } else if (!submissions) {
    title = 'Awaiting learner submissions';
    description = 'Question details remain available. Analysis can be generated after learners submit their work.';
    Icon = Users;
  } else if (!eligible) {
    title = 'Assessment is not completed yet';
    description = 'Generation becomes available after the assessment and its grace period have ended.';
    Icon = Clock3;
  }

  const warning = !busy && (!!error || noTopics);
  const canGenerate = !busy && !saved && !error && eligible && submissions > 0;
  const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <section aria-label="Saved analysis status" aria-busy={busy} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 flex-1 basis-72 items-start gap-3">
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${warning ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
            <Icon size={19} className={busy ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p role="status" aria-live="polite" className="text-sm font-semibold text-slate-800">{title}</p>
            <p className="mt-1.5 max-w-2xl text-xs leading-6 text-slate-500 [overflow-wrap:anywhere]">{description}</p>
            {generatedDate && <p className="mt-2 text-xs text-slate-500">Generated {generatedDate}</p>}
            {!busy && noTopics && materialHref && (
              <Link href={materialHref} className="mt-2 inline-flex min-h-10 items-center text-xs font-semibold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-blue-500">
                Review Lesson Modules
              </Link>
            )}
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <button type="button" disabled={busy} onClick={onRefresh} className={`${buttonClass} border border-slate-200 text-slate-600 hover:bg-slate-50`}>
            <RefreshCw size={14} aria-hidden="true" />
            {error ? 'Retry loading' : 'Refresh'}
          </button>
          {saved && !busy ? (
            <button type="button" onClick={onView} className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}>View analysis</button>
          ) : !error && !loading && (
            <button type="button" disabled={!canGenerate} onClick={onGenerate} className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}>
              <Sparkles size={14} aria-hidden="true" />
              {generating ? 'Generating…' : noTopics ? 'Try analysis again' : 'Generate analysis'}
            </button>
          )}
        </div>
      </div>
      {error && !busy && (
        <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900 [overflow-wrap:anywhere]">{error.message}</p>
      )}
    </section>
  );
}
