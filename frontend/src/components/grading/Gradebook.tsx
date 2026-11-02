'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, CheckCheck, ChevronLeft, ChevronRight, ClipboardList, Clock3, RefreshCw, Search, Users } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import type { UserRead } from '@/src/lib/auth-api';
import { listUserCategories, type UserCategoryItem } from '@/src/lib/user-categories-api';
import { listSubjects, type SubjectRecord } from '@/src/lib/subjects-api';
import { loadGradebook, verifyGradebookSession } from '@/src/lib/grading-api';
import { useApiData } from '@/src/lib/use-api-data';
import { DEFAULT_WEIGHTS, formatGrade, GRADE_COMPONENTS, type ComponentAssignments, type GradeWeights } from '@/src/lib/grading';
import { buildGradebookRoster, calculateRosterGrade, emptyGradebookFilters, filterGradebookEntries, filterGradebookGroups, gradebookDateError, gradebookEntries, gradebookFilterCount, gradebookPage, gradebookProgramHref, gradebookSubjectHref, gradebookSubjects, GRADEBOOK_STATUSES, type GradebookFilters, type GradebookSort, type GradebookTab, type RosterGradeGroup } from '@/src/lib/gradebook-view';
import type { TeacherSubmission } from '@/src/lib/assessments-api';
import PageHeader, { studentHeaderActionClass } from '@/src/components/layout/student/StudentPageHeader';
import ApiState from '@/src/components/ui/ApiState';
import Modal from '@/src/components/ui/Modal';
import GradeTable from './GradeTable';
import AssessmentRecords, { SubmissionStatus } from './AssessmentRecords';
import GradebookControls, { GradebookFilterChips } from './GradebookControls';
import GradeWeightsEditor from './GradeWeights';
import GradeReviewDialog from './GradeReviewDialog';

const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50';
async function loadCatalog() {
  const [categories, subjects] = await Promise.all([listUserCategories(), listSubjects()]);
  return { categories, subjects };
}

export default function Gradebook(props: { programCode?: string; subjectId?: string }) {
  const { user, role } = useAuth();
  if (!user || role !== 'teacher') return null;
  return <Suspense fallback={<ApiState loading error={null} onRetry={() => window.location.reload()} />}><GradebookCatalog {...props} user={user} /></Suspense>;
}

function GradebookCatalog({ user, programCode, subjectId }: { user: UserRead; programCode?: string; subjectId?: string }) {
  const catalog = useApiData(loadCatalog);
  const [query, setQuery] = useState('');
  const { categories = [], subjects = [] } = catalog.data || {};
  const category = categories.find(item => item.code.toLowerCase() === programCode?.toLowerCase() || item.category_id === programCode);
  const available = category ? gradebookSubjects(subjects, category) : [];
  const subject = available.find(item => item.subject_id === subjectId);
  if (catalog.loading || catalog.error) return <div className="p-6"><ApiState loading={catalog.loading} error={catalog.error} onRetry={catalog.reload} /></div>;
  if ((programCode && !category) || (subjectId && !subject)) return <div className="mx-auto max-w-3xl p-8"><div className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><BookOpen size={30} className="mx-auto text-blue-500" /><h1 className="mt-4 text-lg font-semibold text-slate-800">{category ? 'Subject unavailable' : 'Program unavailable'}</h1><p className="mt-2 text-sm text-slate-500">Choose an available subject from its registered program.</p><Link href={category ? gradebookProgramHref(category.code) : '/teacher/grades'} className={`${buttonClass} mt-5`}>Back to {category ? category.name : 'Gradebook'}</Link></div></div>;
  if (category && subject) return <SubjectGradebook key={`${user.user_id}:${category.category_id}:${subject.subject_id}`} user={user} category={category} subject={subject} subjects={subjects} />;
  const search = query.trim().toLowerCase();
  return <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
    <PageHeader eyebrow="Academics & assessments · Gradebook" title={category ? `${category.name} Gradebook` : 'Gradebook'} description={category ? 'Choose a subject to review every learner and their assessment scores.' : 'Choose a learning program, then open a subject’s grading workspace.'} actions={<button type="button" onClick={catalog.reload} className={studentHeaderActionClass}><RefreshCw size={14} />Refresh</button>}>
      <p className="text-xs leading-6 text-blue-50">{category ? `${available.length} subjects in this program` : `${categories.length} learning programs`} · Learners appear even before they submit work.</p>
    </PageHeader>
    {category && <Link href="/teacher/grades" className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-blue-700"><ArrowLeft size={14} />All programs</Link>}
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900">{category ? 'Program subjects' : 'Learning programs'}</h2><p className="mt-1 text-[11px] text-slate-400">Select a card or use the Gradebook sidebar.</p></div><label className="relative min-w-0 basis-64"><span className="sr-only">Search {category ? 'subjects' : 'programs'}</span><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${category ? 'subjects' : 'programs'}…`} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50" /></label></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{category ? available.filter(item => item.name.toLowerCase().includes(search)).map(item => <Link key={item.subject_id} href={gradebookSubjectHref(category.code, item.subject_id)} className="group rounded-2xl border border-slate-200 p-5 transition hover:border-blue-200 hover:bg-blue-50/40 focus-visible:outline-2 focus-visible:outline-blue-500"><BookOpen size={21} className="text-blue-600" /><h3 className="mt-4 text-sm font-semibold text-slate-800">{item.name}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{item.description || `Learner grades and assessment records for ${category.name}.`}</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-blue-700">Open Gradebook<ArrowRight size={14} /></span></Link>) : categories.filter(item => item.name.toLowerCase().includes(search)).map(item => <Link key={item.category_id} href={gradebookProgramHref(item.code)} className="group rounded-2xl border border-slate-200 p-5 transition hover:border-blue-200 hover:bg-blue-50/40 focus-visible:outline-2 focus-visible:outline-blue-500"><span className="inline-flex rounded-xl bg-blue-50 p-3 text-blue-600"><BookOpen size={21} /></span><h3 className="mt-4 text-sm font-semibold text-slate-800">{item.name}</h3><p className="mt-2 text-xs text-slate-500">{gradebookSubjects(subjects, item).length} registered subjects</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-blue-700">View subjects<ArrowRight size={14} /></span></Link>)}</div>
      {!(category ? available : categories).filter(item => item.name.toLowerCase().includes(search)).length && <div className="py-12 text-center"><p className="text-sm font-semibold text-slate-700">{search ? 'No matches found' : category ? 'No active subjects in this program' : 'No learning programs available'}</p><p className="mt-2 text-xs text-slate-400">{search ? 'Try another name or clear your search.' : 'Registered programs and subjects will appear here.'}</p>{search && <button type="button" onClick={() => setQuery('')} className={`${buttonClass} mt-4`}>Clear search</button>}</div>}
    </section>
  </div>;
}

function SubjectGradebook({ user, category, subject, subjects }: { user: UserRead; category: UserCategoryItem; subject: SubjectRecord; subjects: SubjectRecord[] }) {
  const load = useCallback(() => loadGradebook(user, 'teacher', { category, subject, subjects }), [user, category, subject, subjects]);
  const source = useApiData(load), params = useSearchParams(), pathname = usePathname();
  const [weights, setWeights] = useState<GradeWeights>({ ...DEFAULT_WEIGHTS });
  const [assignments, setAssignments] = useState<ComponentAssignments>({});
  const [selected, setSelected] = useState<TeacherSubmission | null>(null), [learner, setLearner] = useState<RosterGradeGroup | null>(null);
  const [notice, setNotice] = useState(''), [sessionError, setSessionError] = useState('');
  const tab: GradebookTab = params.get('view') === 'records' ? 'records' : 'learners';
  const query = params.get('q') || '';
  const sort: GradebookSort = ['name-asc', 'name-desc', ...(tab === 'records' ? ['newest', 'oldest'] : [])].includes(params.get('sort') || '') ? params.get('sort') as GradebookSort : 'name-asc';
  const requestedFilters: GradebookFilters = {
    statuses: (params.get('status') || '').split(',').filter(value => GRADEBOOK_STATUSES.some(([key]) => key === value)),
    types: tab === 'records' ? (params.get('type') || '').split(',').filter(value => ['ACTIVITY', 'QUIZ', 'EXAM', 'TEST'].includes(value)) : [],
    dateFrom: tab === 'records' ? params.get('from') || '' : '', dateTo: tab === 'records' ? params.get('to') || '' : '',
  };
  const filters = gradebookDateError(requestedFilters) ? { ...requestedFilters, dateFrom: '', dateTo: '' } : requestedFilters;
  const requestedPage = Math.max(1, Number(params.get('page')) || 1);
  function location(changes: Record<string, string>, push = false) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) { if (value) next.set(key, value); else next.delete(key); }
    const href = `${pathname}${next.size ? `?${next}` : ''}`;
    if (push) window.history.pushState(null, '', href); else window.history.replaceState(null, '', href);
  }
  const changeFilters = (next: GradebookFilters) => location({ status: next.statuses.join(','), type: next.types.join(','), from: next.dateFrom, to: next.dateTo, page: '' });
  const changeTab = (next: GradebookTab) => location({ view: next === 'records' ? 'records' : '', status: '', type: '', from: '', to: '', sort: '', page: '' }, true);
  const refresh = () => { setSelected(null); setLearner(null); setNotice(''); source.reload(); };

  useEffect(() => {
    let active = true;
    const check = () => { void verifyGradebookSession(user, 'teacher').catch(() => { if (active) { setSelected(null); setLearner(null); setSessionError('Your session could not be verified. Reload before continuing.'); } }); };
    window.addEventListener('focus', check);
    return () => { active = false; window.removeEventListener('focus', check); };
  }, [user]);

  const data = source.data;
  const groups = useMemo(() => data ? buildGradebookRoster(data.students, data.records, data.tasks, { category, subject, subjects }, user.user_id!, data.failedAssessmentIds) : [], [data, category, subject, subjects, user.user_id]);
  const entries = useMemo(() => gradebookEntries(groups, data?.failedAssessmentIds), [groups, data?.failedAssessmentIds]);
  const visibleGroups = filterGradebookGroups(groups, query, filters, sort), visibleEntries = filterGradebookEntries(entries, query, filters, sort);
  const learnerPage = gradebookPage(visibleGroups, requestedPage), recordPage = gradebookPage(visibleEntries, requestedPage);
  const page = tab === 'learners' ? learnerPage : recordPage;
  const ready = !!data && !source.loading && !source.error && !sessionError;
  const subjectRecords = groups.flatMap(group => group.records);
  const counts = [
    { label: 'Learners', value: groups.filter(group => !group.unmatched).length, icon: Users },
    { label: 'Assessments', value: data?.tasks.length || 0, icon: ClipboardList },
    { label: 'Graded submissions', value: subjectRecords.filter(record => record.submission.status === 'GRADED').length, icon: CheckCheck },
    { label: 'Awaiting review', value: subjectRecords.filter(record => record.submission.status === 'SUBMITTED').length, icon: Clock3 },
  ];
  const selectedEntries = learner ? gradebookEntries([learner], data?.failedAssessmentIds) : [];

  return <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
    <nav aria-label="Gradebook breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-slate-400"><Link href="/teacher/grades" className="min-h-8 content-center hover:text-blue-700">Gradebook</Link><ChevronRight size={12} /><Link href={gradebookProgramHref(category.code)} className="min-h-8 content-center hover:text-blue-700">{category.name}</Link><ChevronRight size={12} /><span aria-current="page" className="font-semibold text-slate-700">{subject.name}</span></nav>
    <PageHeader eyebrow={`Academics & assessments · ${category.name}`} title={`${subject.name} Gradebook`} description="Review every learner’s progress, including those who have not submitted work yet." actions={<button type="button" onClick={refresh} disabled={source.loading} className={studentHeaderActionClass}><RefreshCw size={14} className={source.loading ? 'animate-spin' : ''} />Refresh</button>}>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">{counts.map(({ label, value, icon: Icon }) => <div key={label}><p className="flex items-center gap-2 text-[11px] text-blue-100"><Icon size={14} />{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{ready ? value : '—'}</p></div>)}</div>
    </PageHeader>
    <ApiState loading={source.loading && !sessionError} error={sessionError || source.error} onRetry={() => sessionError ? window.location.reload() : source.reload()} />
    {notice && <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">{notice}</p>}
    {ready && <>
      {!!data.warnings.length && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">{data.warnings.map(message => <p key={message}>{message}</p>)}</div>}
      {!!data.failedAssessmentIds.length && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">Some submission records could not be loaded. They are marked Unavailable. Refresh to retry.</p>}
      <section aria-label="Subject gradebook" className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_16px_-10px_rgba(15,23,42,0.12)]">
        <div className="space-y-4 border-b border-slate-100 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900">Your gradebook <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{groups.length} learners</span></h2><p className="mt-1 text-[11px] text-slate-400">{category.name} · {subject.name}</p></div><p className="text-[11px] text-slate-400">{data.loadedAt ? `Updated ${new Date(data.loadedAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}` : ''}</p></div>
          <div role="tablist" aria-label="Gradebook views" className="inline-flex max-w-full gap-1 rounded-xl bg-slate-100 p-1">{(['learners', 'records'] as const).map(value => <button key={value} id={`grade-tab-${value}`} type="button" role="tab" aria-selected={tab === value} aria-controls="gradebook-results" onClick={() => changeTab(value)} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 'learners' : event.key === 'End' ? 'records' : tab === 'learners' ? 'records' : 'learners'; changeTab(next); document.getElementById(`grade-tab-${next}`)?.focus(); } }} tabIndex={tab === value ? 0 : -1} className={`min-h-10 rounded-lg px-4 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-blue-500 ${tab === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{value === 'learners' ? 'Learner Grades' : 'Assessment Records'}</button>)}</div>
          <div className="flex flex-wrap items-center justify-between gap-3"><label className="relative block min-w-0 flex-1 basis-52"><span className="sr-only">Search {tab === 'learners' ? 'learners' : 'assessment records'}</span><Search size={15} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" /><input type="search" value={query} onChange={event => location({ q: event.target.value, page: '' })} placeholder={tab === 'learners' ? 'Search learner name or account ID…' : 'Search learner or assessment…'} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-3 text-xs outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-50" /></label><GradebookControls key={tab} filters={filters} onChange={changeFilters} sort={sort} onSort={value => location({ sort: value, page: '' })} tab={tab} resultCount={draft => tab === 'learners' ? filterGradebookGroups(groups, query, draft, sort).length : filterGradebookEntries(entries, query, draft, sort).length} /></div>
          {!!gradebookFilterCount(filters) && <div className="flex flex-wrap items-center gap-2"><GradebookFilterChips filters={filters} onChange={changeFilters} /><button type="button" onClick={() => changeFilters(emptyGradebookFilters())} className="min-h-8 px-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700">Clear all</button></div>}
        </div>
        <div id="gradebook-results" role="tabpanel" aria-labelledby={`grade-tab-${tab}`} tabIndex={0} className="outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
          {page.total ? tab === 'learners' ? <GradeTable groups={learnerPage.rows} weights={weights} assignments={assignments} onOpen={setLearner} /> : <AssessmentRecords entries={recordPage.rows} assignments={assignments} onReview={setSelected} /> : <div className="px-6 py-14 text-center"><BookOpen size={30} className="mx-auto text-blue-300" /><h3 className="mt-4 text-sm font-semibold text-slate-700">{query || gradebookFilterCount(filters) ? 'No records match these filters' : tab === 'records' && !data.tasks.length ? 'No assessments in this subject yet' : 'No learners registered in this program yet'}</h3><p className="mt-2 text-xs leading-6 text-slate-400">{query || gradebookFilterCount(filters) ? 'Adjust your search or clear the selected filters.' : tab === 'records' ? 'Learners remain visible in Learner Grades before any assessment is submitted.' : 'Learners will appear automatically when registered under this program.'}</p>{(query || gradebookFilterCount(filters)) ? <button type="button" onClick={() => location({ q: '', status: '', type: '', from: '', to: '', page: '' })} className={`${buttonClass} mt-4`}>Clear filters & search</button> : null}</div>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4"><p aria-live="polite" className="text-[11px] text-slate-400">Showing {page.start}–{page.end} of {page.total} {tab === 'learners' ? 'learners' : 'assessment records'}</p><nav aria-label="Gradebook pagination" className="flex max-w-full flex-wrap items-center gap-1"><button type="button" disabled={page.current === 1} onClick={() => location({ page: String(page.current - 1) })} aria-label="Previous page" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={15} /></button>{page.pages.map((number, index) => number === 'ellipsis' ? <span key={`gap-${index}`} className="px-1 text-slate-400">…</span> : <button key={number} type="button" onClick={() => location({ page: String(number) })} aria-label={`Page ${number}`} aria-current={number === page.current ? 'page' : undefined} className={`h-9 min-w-9 rounded-lg px-2 text-xs font-semibold ${number === page.current ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{number}</button>)}<button type="button" disabled={page.current === page.totalPages} onClick={() => location({ page: String(page.current + 1) })} aria-label="Next page" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={15} /></button></nav></div>
        </div>
      </section>
      <details className="rounded-2xl border border-slate-200 bg-white shadow-sm"><summary className="min-h-12 cursor-pointer p-5 text-sm font-semibold text-slate-700">Grading settings <span className="ml-2 text-[11px] font-normal text-slate-400">Subject preview · optional</span></summary><div className="space-y-4 border-t border-slate-100 p-4"><GradeWeightsEditor weights={weights} onChange={setWeights} />
        {!!data.tasks.length && <div className="space-y-3 px-1"><p className="text-xs leading-6 text-slate-500">Activities, quizzes, and exams start in Portfolio & assessments. Assign performance tasks and verified A&E results explicitly.</p>{data.tasks.map(task => <label key={task.assessment_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><span className="text-xs font-semibold text-slate-700">{task.title}</span><select aria-label={`Preview component for ${task.title}`} value={assignments[task.assessment_id] ?? 'portfolio'} onChange={event => setAssignments(current => ({ ...current, [task.assessment_id]: event.target.value as keyof GradeWeights | '' }))} className="max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><option value="">Unassigned</option>{GRADE_COMPONENTS.map(item => <option key={item.key} value={item.key}>{item.shortLabel}</option>)}</select></label>)}</div>}
      </div></details>
      {!!data.issues.length && <details className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><summary className="cursor-pointer font-semibold">Records needing review ({data.issues.length})</summary><ul className="mt-3 space-y-2 leading-5">{data.issues.map((issue, index) => <li key={`${issue.key}:${index}`}>{issue.message}</li>)}</ul></details>}
      <p className="px-1 text-[11px] leading-6 text-slate-400">All learners registered in this program appear here. Missing submissions are shown as —, and are never automatically scored zero. Final totals and component settings are previews for this visit; assessment score changes use the existing student results system.</p>
    </>}
    {ready && selected && <GradeReviewDialog key={selected.submission.submission_id} record={selected} user={user} onClose={() => setSelected(null)} onSaved={() => { refresh(); setNotice('Assessment score and feedback saved.'); }} />}
    {ready && learner && <Modal title={`${learner.name} · grade breakdown`} onClose={() => setLearner(null)}><p className="mb-4 text-xs leading-6 text-slate-500">{category.name} · {subject.name} · {learner.accountId || 'Account ID unavailable'}</p><div className="mb-4 rounded-xl bg-blue-50 p-4"><p className="text-xs font-semibold text-blue-800">Final grade preview</p><p className="mt-2 text-2xl font-bold text-blue-700">{(() => { const result = calculateRosterGrade(learner, weights, assignments); return result.final === null ? 'Incomplete' : formatGrade(result.final); })()}</p><ul className="mt-2 space-y-1 text-xs leading-5 text-slate-500">{calculateRosterGrade(learner, weights, assignments).reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div><div className="space-y-3">{selectedEntries.length ? selectedEntries.map(entry => <div key={entry.key} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-xs font-semibold text-slate-700">{entry.task.title}</p><SubmissionStatus status={entry.unavailable ? 'UNAVAILABLE' : entry.submission?.status || 'NO_SUBMISSION'} /></div><div className="mt-3 flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700">{entry.submission?.status === 'GRADED' ? formatGrade(entry.submission.final_score) : '—'} / {formatGrade(entry.task.max_score)}</span>{entry.submission && ['SUBMITTED', 'GRADED'].includes(entry.submission.status) && <button type="button" onClick={() => { setLearner(null); setSelected({ task: entry.task, submission: entry.submission! }); }} className="min-h-10 text-xs font-semibold text-blue-700">Review score</button>}</div></div>) : <p className="rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-500">No assessments have been assigned in this subject yet. This learner is already included in the program roster.</p>}</div></Modal>}
  </div>;
}
