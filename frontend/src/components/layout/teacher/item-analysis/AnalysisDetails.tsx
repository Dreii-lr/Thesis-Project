'use client';

import { useState } from 'react';
import { CheckCircle2, Eye } from 'lucide-react';
import type { ItemAnalysisQuestion, ItemAnalysisReport } from '@/src/lib/item-analysis';
import type { CohortAnalysis } from '@/src/lib/assessment-analysis-api';
import { recordPage } from '@/src/lib/record-view';
import Modal from '@/src/components/ui/Modal';
import RecordToolbar from '@/src/components/ui/RecordToolbar';
import RecordPagination from '@/src/components/ui/RecordPagination';

const outcomeNames = { correct: 'Correct', incorrect: 'Incorrect', skipped: 'Skipped', pending: 'Needs review' };
const outcomeStyles = {
  correct: 'bg-emerald-50 text-emerald-700',
  incorrect: 'bg-rose-50 text-rose-700',
  skipped: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-50 text-amber-800',
};
const headClass = 'px-4 py-3 text-left text-xs font-medium text-slate-500';
const cellClass = 'px-4 py-4 text-xs text-slate-600';
const percent = (value: number | null) => value === null ? '—' : Math.round(value) + '%';

function DetailsButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
      <Eye size={16} aria-hidden="true" />
    </button>
  );
}

export function ItemBreakdown({ report }: { report: ItemAnalysisReport }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('number');
  const [pageNumber, setPageNumber] = useState(1);
  const items = report.items.filter(item => {
    const matchesSearch = (item.number + ' ' + item.prompt + ' ' + item.type).toLowerCase().includes(search.trim().toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'review' ? item.errorRate !== null && item.errorRate >= 50 : item.pending > 0);
    return matchesSearch && matchesFilter;
  }).sort((a, b) => sort === 'error' ? (b.errorRate ?? -1) - (a.errorRate ?? -1) : a.number - b.number);
  const page = recordPage(items, pageNumber);
  const selected = report.items.find(item => item.id === selectedId);

  return (
    <div className="min-w-0 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Question responses</h3>
        <p className="mt-1 text-xs leading-6 text-slate-500">Review the currently recorded answers. Open a question to see its answer distribution and learner responses.</p>
      </div>
      <RecordToolbar
        search={search}
        onSearch={value => { setSearch(value); setPageNumber(1); }}
        searchLabel="Search questions"
        placeholder="Search a question or question type…"
        sort={sort}
        onSort={value => { setSort(value); setPageNumber(1); }}
        sorts={[{ value: 'number', label: 'Question number' }, { value: 'error', label: 'Highest error rate' }]}
        filters={[{ key: 'status', label: 'Question status', value: filter, options: [{ value: 'all', label: 'All questions' }, { value: 'review', label: 'Items to revisit' }, { value: 'pending', label: 'Needs teacher review' }] }]}
        onApply={values => { setFilter(values.status); setPageNumber(1); }}
      />
      <div className="min-w-0 rounded-xl border border-slate-200">
        <div className="hidden max-w-full overflow-x-auto rounded-t-xl md:block">
          <table className="w-full min-w-[620px] table-fixed border-collapse" aria-label="Question responses">
            <colgroup><col className="w-12" /><col /><col className="w-24" /><col className="w-24" /><col className="w-24" /><col className="w-20" /></colgroup>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th scope="col" className={headClass}>No.</th>
                <th scope="col" className={headClass}>Question</th>
                <th scope="col" className={headClass}>Responses</th>
                <th scope="col" className={headClass}>Correct</th>
                <th scope="col" className={headClass}>Error rate</th>
                <th scope="col" className={headClass}><span className="sr-only">Details</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {page.rows.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className={`${cellClass} align-top font-medium`}>{item.number}</td>
                  <th scope="row" className={`${cellClass} align-top text-left font-normal`}>
                    <p className="font-medium leading-6 text-slate-700 [overflow-wrap:anywhere]">{item.prompt}</p>
                    <p className="mt-1 text-slate-500">{item.type}</p>
                    {item.pending > 0 && <p className="mt-2 text-amber-800">{item.pending} need review</p>}
                  </th>
                  <td className={cellClass}>{item.responses.length}</td>
                  <td className={cellClass}>{percent(item.correctRate)}</td>
                  <td className={cellClass}>{percent(item.errorRate)}</td>
                  <td className="px-3 py-3"><DetailsButton label={'View question ' + item.number} onClick={() => setSelectedId(item.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-slate-100 md:hidden">
          {page.rows.map(item => (
            <article key={item.id} className="min-w-0 p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-blue-700">Question {item.number} · {item.type}</p>
                  <h4 className="mt-2 text-sm font-medium leading-6 text-slate-700 [overflow-wrap:anywhere]">{item.prompt}</h4>
                </div>
                <DetailsButton label={'View question ' + item.number} onClick={() => setSelectedId(item.id)} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                <span>{item.responses.length} responses</span>
                <span>Correct: {percent(item.correctRate)}</span>
                <span>Error rate: {percent(item.errorRate)}</span>
              </div>
              {item.pending > 0 && <p className="mt-2 text-xs text-amber-800">{item.pending} answers need teacher review</p>}
            </article>
          ))}
        </div>
        {!page.total && (
          <div className="p-8 text-center">
            <h4 className="text-sm font-semibold text-slate-700">{report.items.length ? 'No matching questions' : 'No questions available'}</h4>
            <p className="mt-2 text-xs leading-6 text-slate-500">{report.items.length ? 'Adjust the search or clear the question filters.' : 'Question details will appear when they are available for this assessment.'}</p>
          </div>
        )}
        <RecordPagination page={page} onChange={setPageNumber} label="questions" />
      </div>
      <p className="text-xs leading-6 text-slate-500">Rates use evaluated responses. Incorrect and skipped answers count toward the error rate; answers awaiting review and undelivered items are kept separate.</p>
      {selected && (
        <Modal title={'Question ' + selected.number} onClose={() => setSelectedId(null)}>
          <QuestionDetails key={selected.id} item={selected} />
        </Modal>
      )}
    </div>
  );
}

function QuestionDetails({ item }: { item: ItemAnalysisQuestion }) {
  const [responsePage, setResponsePage] = useState(1);
  const responses = recordPage(item.responses, responsePage);
  const needsReview = item.type === 'Essay' || !item.expected;

  return (
    <div className="min-w-0 space-y-5">
      <div>
        <p className="text-xs font-medium text-blue-700">{item.type}</p>
        <h3 className="mt-2 text-sm font-semibold leading-7 text-slate-800 [overflow-wrap:anywhere]">{item.prompt}</h3>
        {needsReview ? (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-900">Teacher review is required. No automatic correctness judgment is shown for this response.</p>
        ) : (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs leading-6 text-emerald-800">
            <CheckCircle2 size={16} className="mt-1 shrink-0" aria-hidden="true" />
            <span className="min-w-0 [overflow-wrap:anywhere]">Correct answer: {item.expected}</span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[['Correct', item.correct], ['Incorrect', item.incorrect], ['Skipped', item.skipped], ['Needs review', item.pending]].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-lg font-semibold text-slate-800">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      {item.type !== 'Essay' && (
        <section aria-label="Answer distribution">
          <h4 className="text-sm font-semibold text-slate-800">Answer distribution</h4>
          <div className="mt-3 space-y-3">
            {item.distribution.map(option => (
              <div key={option.answer}>
                <div className="flex items-start justify-between gap-3 text-xs leading-6">
                  <p className={`min-w-0 [overflow-wrap:anywhere] ${option.correct ? 'font-medium text-emerald-700' : 'text-slate-600'}`}>{option.answer}{option.correct ? ' · Correct' : ''}</p>
                  <span className="shrink-0 text-slate-500">{option.count}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  <div className={`h-full rounded-full ${option.correct ? 'bg-emerald-400' : 'bg-slate-300'}`} style={{ width: `${item.responses.length ? option.count / item.responses.length * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-500">{item.responses.length} recorded responses; {item.skipped} skipped.</p>
        </section>
      )}
      <section>
        <h4 className="text-sm font-semibold text-slate-800">Learner answers</h4>
        <ul className="mt-2 divide-y divide-slate-100">
          {responses.rows.map(response => (
            <li key={response.learner_id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="break-words text-xs font-medium text-slate-700">{response.student_name}</p>
                <span className={`rounded-full px-2.5 py-1 text-xs ${outcomeStyles[response.outcome]}`}>{outcomeNames[response.outcome]}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-xs leading-6 text-slate-600 [overflow-wrap:anywhere]">{response.answer.trim() || 'No answer provided'}</p>
            </li>
          ))}
        </ul>
        {!responses.total && <p className="mt-3 text-xs text-slate-500">No responses are recorded for this question.</p>}
        <RecordPagination page={responses} onChange={setResponsePage} label="responses" />
      </section>
    </div>
  );
}

export function LearnerInsights({ report, maxScore, analysis }: { report: ItemAnalysisReport; maxScore: number; analysis: CohortAnalysis | null }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('name-asc');
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const students = report.students.filter(student => {
    const matchesSearch = (student.name + ' ' + student.accountId).toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (filter === 'all' || (filter === 'pending' ? student.provisional : !student.provisional));
  }).sort((a, b) => (sort === 'name-desc' ? -1 : 1) * a.name.localeCompare(b.name));
  const page = recordPage(students, pageNumber);
  const selected = report.students.find(student => student.id === selectedId);

  return (
    <div className="min-w-0 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Learner records</h3>
        <p className="mt-1 text-xs leading-6 text-slate-500">Scores and grading status come from the current submissions. Practice topics, when available, come from the saved report.</p>
      </div>
      <RecordToolbar
        search={search}
        onSearch={value => { setSearch(value); setPageNumber(1); }}
        searchLabel="Search learners"
        placeholder="Search learner name or account ID…"
        sort={sort}
        onSort={value => { setSort(value); setPageNumber(1); }}
        sorts={[{ value: 'name-asc', label: 'Learner A–Z' }, { value: 'name-desc', label: 'Learner Z–A' }]}
        filters={[{ key: 'status', label: 'Grading status', value: filter, options: [{ value: 'all', label: 'All statuses' }, { value: 'pending', label: 'Awaiting review' }, { value: 'graded', label: 'Graded' }] }]}
        onApply={values => { setFilter(values.status); setPageNumber(1); }}
      />
      <div className="min-w-0 rounded-xl border border-slate-200">
        <div className="hidden max-w-full overflow-x-auto rounded-t-xl md:block">
          <table className="w-full min-w-[620px] table-fixed border-collapse" aria-label="Learner records">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th scope="col" className={headClass}>Learner</th>
                <th scope="col" className={headClass}>Account ID</th>
                <th scope="col" className={headClass}>Recorded score</th>
                <th scope="col" className={headClass}>Status</th>
                <th scope="col" className={`${headClass} w-20`}><span className="sr-only">Details</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {page.rows.map(student => (
                <tr key={student.id} className="hover:bg-slate-50/60">
                  <th scope="row" className={`${cellClass} text-left font-medium text-slate-700 [overflow-wrap:anywhere]`}>{student.name}</th>
                  <td className={`${cellClass} [overflow-wrap:anywhere]`}>{student.accountId || 'Unavailable'}</td>
                  <td className={cellClass}>{student.provisional ? 'Awaiting review' : student.score + ' / ' + maxScore}</td>
                  <td className={cellClass}><span className={`inline-flex rounded-full px-2.5 py-1 ${student.provisional ? outcomeStyles.pending : 'bg-blue-50 text-blue-700'}`}>{student.provisional ? 'Awaiting review' : 'Graded'}</span></td>
                  <td className="px-3 py-3"><DetailsButton label={'View insights for ' + student.name} onClick={() => setSelectedId(student.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-slate-100 md:hidden">
          {page.rows.map(student => (
            <article key={student.id} className="min-w-0 p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="break-words text-sm font-semibold text-slate-700">{student.name}</h4>
                  <p className="mt-1 break-words text-xs text-slate-500">{student.accountId || 'Account ID unavailable'}</p>
                </div>
                <DetailsButton label={'View insights for ' + student.name} onClick={() => setSelectedId(student.id)} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-600">Recorded score: <span className="font-medium">{student.provisional ? 'Awaiting review' : student.score + ' / ' + maxScore}</span></p>
                <span className={`rounded-full px-2.5 py-1 text-xs ${student.provisional ? outcomeStyles.pending : 'bg-blue-50 text-blue-700'}`}>{student.provisional ? 'Awaiting review' : 'Graded'}</span>
              </div>
            </article>
          ))}
        </div>
        {!page.total && (
          <div className="p-8 text-center">
            <h4 className="text-sm font-semibold text-slate-700">{report.students.length ? 'No matching learners' : 'No completed submissions yet'}</h4>
            <p className="mt-2 text-xs leading-6 text-slate-500">{report.students.length ? 'Adjust the search or clear the grading-status filter.' : 'Learner insights appear after work is submitted. Missing work is not recorded as a zero score.'}</p>
          </div>
        )}
        <RecordPagination page={page} onChange={setPageNumber} label="learners" />
      </div>
      {selected && (
        <Modal title="Learner insights" onClose={() => setSelectedId(null)}>
          <LearnerDetails key={selected.id} student={selected} maxScore={maxScore} analysis={analysis} />
        </Modal>
      )}
    </div>
  );
}

function LearnerDetails({ student, maxScore, analysis }: { student: ItemAnalysisReport['students'][number]; maxScore: number; analysis: CohortAnalysis | null }) {
  const [pageNumber, setPageNumber] = useState(1);
  const page = recordPage(student.answers, pageNumber);
  const savedLearner = analysis?.student_breakdowns?.find(item => item.account_id === student.accountId);
  const topics = savedLearner?.personal_struggling_topics || [];
  let topicMessage = 'Topic suggestions will appear in a saved report. The recorded answers are available below.';
  if (savedLearner) topicMessage = 'No topics were flagged for this learner in the saved report. Review the answers for more detail.';
  else if (analysis) topicMessage = 'This learner is not included in the saved report. Review the current submission below.';

  return (
    <div className="min-w-0 space-y-5">
      <div className="rounded-xl bg-slate-50 p-4">
        <h3 className="break-words text-sm font-semibold text-slate-800">{student.name}</h3>
        <p className="mt-1 break-words text-xs text-slate-500">{student.accountId || 'Account ID unavailable'}</p>
        <p className="mt-3 text-xs text-slate-500">Current recorded score</p>
        <p className="mt-1 text-lg font-semibold text-slate-800">{student.provisional ? 'Awaiting review' : student.score + ' / ' + maxScore}</p>
        {student.provisional && <p className="mt-2 text-xs leading-6 text-amber-900">Recorded so far: {student.score} / {maxScore}. The teacher has not finalized this result.</p>}
      </div>
      <section>
        <h4 className="text-sm font-semibold text-slate-800">Topics in the saved report</h4>
        <div className="mt-3 flex flex-wrap gap-2">
          {topics.length ? topics.map(topic => <span key={topic} className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{topic}</span>) : <p className="text-xs leading-6 text-slate-500">{topicMessage}</p>}
        </div>
      </section>
      <section>
        <h4 className="text-sm font-semibold text-slate-800">Recorded answers</h4>
        <ul className="mt-2 divide-y divide-slate-100">
          {page.rows.map(answer => (
            <li key={answer.question} className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-500">Question {answer.question}</p>
                <span className={`rounded-full px-2.5 py-1 text-xs ${outcomeStyles[answer.outcome]}`}>{outcomeNames[answer.outcome]}</span>
              </div>
              <p className="mt-2 text-xs font-medium leading-6 text-slate-700 [overflow-wrap:anywhere]">{answer.prompt}</p>
              <p className="mt-2 whitespace-pre-line text-xs leading-6 text-slate-600 [overflow-wrap:anywhere]">Answer: {answer.answer.trim() || 'No answer provided'}</p>
              {['incorrect', 'skipped'].includes(answer.outcome) && answer.expected && <p className="mt-2 text-xs leading-6 text-emerald-700 [overflow-wrap:anywhere]">Correct answer: {answer.expected}</p>}
            </li>
          ))}
        </ul>
        {!page.total && <p className="mt-3 text-xs text-slate-500">No recorded answers are available.</p>}
        <RecordPagination page={page} onChange={setPageNumber} label="answers" />
      </section>
    </div>
  );
}
