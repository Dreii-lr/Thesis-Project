'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  GraduationCap,
  RefreshCw,
  School,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import StudentPageHeader, { studentHeaderActionClass } from '@/src/components/layout/student/StudentPageHeader';
import Modal from '@/src/components/ui/Modal';
import {
  DEFAULT_REQUIREMENTS,
  REQUIREMENTS,
  STANDARD_ALS_PROGRAMS,
  STATUS_LABELS,
  formatRequirementDate,
  groupSubmissionsByLearner,
  isSatisfied,
  type LearnerRequirementSummary,
  type OverallLearnerStatus,
  type RequirementRecord,
  type RequirementStatus,
  type ReviewerRole,
} from '@/src/lib/requirements';
import {
  getDefaultRequirements,
  getPublicRequirements,
  reviewStudentSubmissionApi,
  type RequirementItem,
} from '@/src/lib/requirements-api';
import { fetchStudentsFromApi } from '@/src/lib/students-api';
import {
  DemoNotice,
  RequirementError,
  RequirementIcon,
  StatusBadge,
  SubmissionDetails,
  buttonClass,
  fieldClass,
  primaryClass,
} from './RequirementShared';
import { useRequirements, notifyRequirementsUpdated } from './useRequirements';
import AdminRequirementsCatalog from './AdminRequirementsCatalog';

export default function StaffRequirements({ role }: { role: ReviewerRole }) {
  const params = useSearchParams();
  const requestedLearner = params.get('learner') || '';

  const { records, loading: recordsLoading, error: recordsError, reload: reloadRecords } = useRequirements(role);
  const [catalog, setCatalog] = useState<RequirementItem[]>(DEFAULT_REQUIREMENTS);
  const [enrolledStudents, setEnrolledStudents] = useState<
    Array<{ id: string; name: string; program: string; accountId?: string }>
  >([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Program selection: strictly ONE program at a time (NO "All programs")
  const [activeProgram, setActiveProgram] = useState<string>('SECONDARY');
  const [statusFilter, setStatusFilter] = useState<'all' | 'review' | 'action' | 'complete'>('all');
  const [search, setSearch] = useState(requestedLearner);
  const [tab, setTab] = useState<'catalog' | 'queue' | 'guide'>(role === 'admin' ? 'catalog' : 'queue');
  const [selectedRecord, setSelectedRecord] = useState<RequirementRecord | null>(null);
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState('');

  // 1. Fetch requirements catalog
  useEffect(() => {
    let active = true;
    getDefaultRequirements()
      .then(data => {
        if (active && data && data.length > 0) {
          setCatalog(data);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // 2. Fetch enrolled students from API
  const loadStudents = async () => {
    setStudentsLoading(true);
    try {
      const data = await fetchStudentsFromApi(0, 100);
      if (Array.isArray(data)) {
        setEnrolledStudents(
          data.map(s => ({
            id: String(s.id || s.personal_details?.user_id || ''),
            name: s.full_name || [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Learner',
            program: String(s.user_category || 'SECONDARY').toUpperCase(),
            accountId: s.account_id || s.personal_details?.lrn_number || '',
          }))
        );
      }
    } catch {
      // Gracefully fall back to submissions-derived learners
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const refreshAll = async () => {
    await Promise.all([reloadRecords(), loadStudents()]);
  };

  const isBusy = recordsLoading || studentsLoading;

  // 3. Group submissions by learner against the catalog & enrolled roster
  const allLearners = useMemo(() => {
    return groupSubmissionsByLearner(records, catalog, enrolledStudents);
  }, [records, catalog, enrolledStudents]);

  // 4. Derive available programs list strictly without "All programs"
  const programOptions = useMemo(() => {
    const detected = new Set(STANDARD_ALS_PROGRAMS.map(p => p.id));
    const extraPrograms: Array<{ id: string; label: string; shortLabel: string }> = [];

    for (const l of allLearners) {
      const p = l.program ? l.program.toUpperCase() : 'SECONDARY';
      if (!detected.has(p as 'BLP' | 'ELEMENTARY' | 'SECONDARY')) {
        detected.add(p as 'BLP' | 'ELEMENTARY' | 'SECONDARY');
        extraPrograms.push({ id: p, label: p, shortLabel: p });
      }
    }
    return [...STANDARD_ALS_PROGRAMS, ...extraPrograms];
  }, [allLearners]);

  // Ensure activeProgram is valid
  useEffect(() => {
    if (programOptions.length > 0 && !programOptions.some(p => p.id === activeProgram)) {
      setActiveProgram(programOptions[0].id);
    }
  }, [programOptions, activeProgram]);

  // 5. Learners strictly belonging to the currently active program
  const currentProgramLearners = useMemo(() => {
    return allLearners.filter(l => l.program === activeProgram);
  }, [allLearners, activeProgram]);

  // Program-level counts
  const programStats = useMemo(() => {
    const total = currentProgramLearners.length;
    const review = currentProgramLearners.filter(l => l.overallStatus === 'review').length;
    const action = currentProgramLearners.filter(l => l.overallStatus === 'correction' || l.overallStatus === 'missing').length;
    const complete = currentProgramLearners.filter(l => l.overallStatus === 'complete').length;
    return { total, review, action, complete };
  }, [currentProgramLearners]);

  // 6. Filter by status & search within the active program
  const visibleLearners = useMemo(() => {
    return currentProgramLearners.filter(l => {
      // Status filter
      if (statusFilter === 'review' && l.overallStatus !== 'review') return false;
      if (statusFilter === 'action' && l.overallStatus !== 'correction' && l.overallStatus !== 'missing') return false;
      if (statusFilter === 'complete' && l.overallStatus !== 'complete') return false;

      // Search query
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const matchesName = l.studentName.toLowerCase().includes(query);
        const matchesId = l.accountId.toLowerCase().includes(query);
        const matchesDoc = Object.values(l.submissions).some(s =>
          (s.versions[0]?.fileName || '').toLowerCase().includes(query)
        );
        if (!matchesName && !matchesId && !matchesDoc) return false;
      }
      return true;
    });
  }, [currentProgramLearners, statusFilter, search]);

  const toggleExpand = (studentId: string) => {
    setExpandedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedStudentIds(new Set(visibleLearners.map(l => l.studentId)));
  };

  const collapseAll = () => {
    setExpandedStudentIds(new Set());
  };

  const tabItems = role === 'admin'
    ? [
        { id: 'catalog' as const, label: 'Requirements Catalog' },
        { id: 'queue' as const, label: `Learner Roster (${currentProgramLearners.length})` },
        { id: 'guide' as const, label: 'Acceptance Guide' },
      ]
    : [
        { id: 'queue' as const, label: `Learner Roster (${currentProgramLearners.length})` },
        { id: 'guide' as const, label: 'Acceptance Guide' },
      ];

  const currentProgramMeta = programOptions.find(p => p.id === activeProgram) || {
    id: activeProgram,
    label: activeProgram,
    shortLabel: activeProgram,
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <StudentPageHeader
        eyebrow={role === 'admin' ? 'Learner Management · Master Catalog & Verification' : 'Learner Management · Document Support'}
        title={role === 'admin' ? 'Requirements & Verification' : 'Student Requirements'}
        description={
          role === 'admin'
            ? 'Manage master requirements catalog and keep learner records moving. Review outcomes and record verification decisions.'
            : 'Track learner requirements by program. Inspect submitted documents, assist with exceptions, and record verification reviews.'
        }
        actions={
          <button
            type="button"
            className={studentHeaderActionClass}
            onClick={refreshAll}
            disabled={isBusy}
          >
            <RefreshCw size={15} className={isBusy ? 'animate-spin' : ''} />
            <span className="ml-2">Refresh Roster</span>
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-blue-100">
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} />
            PostgreSQL Single Source of Truth
          </span>
          <span className="flex items-center gap-2">
            <Users size={16} />
            Students Partitioned Strictly by Program
          </span>
        </div>
      </StudentPageHeader>

      <DemoNotice />

      {/* Main Tabs (Catalog vs Queue vs Guide) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
          {tabItems.map(item => (
            <button
              key={item.id}
              type="button"
              aria-pressed={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                tab === item.id ? 'bg-blue-50 text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'catalog' && role === 'admin' ? (
        <AdminRequirementsCatalog />
      ) : tab === 'guide' ? (
        <AcceptanceGuide role={role} />
      ) : (
        <div className="space-y-6">
          {notice && (
            <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 shadow-xs">
              <Check size={16} className="text-emerald-600 shrink-0" />
              <span>{notice}</span>
              <button
                type="button"
                className="ml-auto rounded-lg px-2 py-1 text-emerald-700 hover:bg-emerald-100 font-semibold"
                onClick={() => setNotice('')}
              >
                Dismiss
              </button>
            </div>
          )}

          {recordsError && <RequirementError message={recordsError} />}

          {/* Program Segmented Switcher (NO "All Programs" Option) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Learning Program</h2>
                <p className="text-xs text-slate-500">Select an ALS program to inspect its enrolled learners. Students are strictly partitioned without mixing.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {programOptions.map(prog => {
                const count = allLearners.filter(l => l.program === prog.id).length;
                const reviewCount = allLearners.filter(l => l.program === prog.id && l.overallStatus === 'review').length;
                const isActive = activeProgram === prog.id;

                const Icon = prog.id === 'BLP' ? GraduationCap : prog.id === 'ELEMENTARY' ? BookOpen : School;

                return (
                  <button
                    key={prog.id}
                    type="button"
                    onClick={() => {
                      setActiveProgram(prog.id);
                      setStatusFilter('all');
                    }}
                    className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                        isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Icon size={20} />
                      </span>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${isActive ? 'text-blue-900' : 'text-slate-800'}`}>
                          {prog.label}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {count} {count === 1 ? 'Learner' : 'Learners'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {reviewCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800" title={`${reviewCount} need review`}>
                          <Clock size={11} />
                          {reviewCount}
                        </span>
                      )}
                      <span className={`size-2 rounded-full ${isActive ? 'bg-blue-600' : 'bg-transparent'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Program Health & Metric Chips */}
          <section className="grid gap-3 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded-2xl border p-4 text-left transition ${
                statusFilter === 'all'
                  ? 'border-blue-400 bg-blue-50/40 ring-2 ring-blue-400/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-[11px] font-medium text-slate-500">Total in {currentProgramMeta.shortLabel}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{isBusy ? '—' : programStats.total}</p>
              <p className="mt-1 text-[10px] text-slate-400">Enrolled learners in this track</p>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('review')}
              className={`rounded-2xl border p-4 text-left transition ${
                statusFilter === 'review'
                  ? 'border-amber-400 bg-amber-50/50 ring-2 ring-amber-400/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-amber-800">Awaiting Teacher Review</p>
                {programStats.review > 0 && <span className="size-2 rounded-full bg-amber-500" />}
              </div>
              <p className="mt-1 text-2xl font-bold text-amber-900">{isBusy ? '—' : programStats.review}</p>
              <p className="mt-1 text-[10px] text-amber-700/80">Submitted documents needing action</p>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('action')}
              className={`rounded-2xl border p-4 text-left transition ${
                statusFilter === 'action'
                  ? 'border-rose-400 bg-rose-50/50 ring-2 ring-rose-400/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-[11px] font-medium text-rose-800">Action Needed</p>
              <p className="mt-1 text-2xl font-bold text-rose-900">{isBusy ? '—' : programStats.action}</p>
              <p className="mt-1 text-[10px] text-rose-700/80">Corrections requested or missing files</p>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('complete')}
              className={`rounded-2xl border p-4 text-left transition ${
                statusFilter === 'complete'
                  ? 'border-emerald-400 bg-emerald-50/50 ring-2 ring-emerald-400/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-[11px] font-medium text-emerald-800">Fully Verified</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">{isBusy ? '—' : programStats.complete}</p>
              <p className="mt-1 text-[10px] text-emerald-700/80">All requirements satisfied</p>
            </button>
          </section>

          {/* Student Roster Section (Students First) */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-6">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">
                  {currentProgramMeta.label} Roster
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Showing {visibleLearners.length} of {currentProgramLearners.length} learners
                  {statusFilter !== 'all' ? ` (filtered by ${statusFilter})` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={expandAll}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="grid gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={`Search ${currentProgramMeta.shortLabel} learners by name, LRN, or file…`}
                  className={`${fieldClass} !mt-0 pl-9`}
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all', 'review', 'action', 'complete'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStatusFilter(f)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      statusFilter === f
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'review' ? 'Awaiting Review' : f === 'action' ? 'Action Needed' : 'Verified'}
                  </button>
                ))}
              </div>
            </div>

            {/* Students List */}
            {isBusy ? (
              <div className="p-16 text-center text-xs text-slate-400">
                <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-blue-500" />
                Loading {currentProgramMeta.shortLabel} learner records…
              </div>
            ) : visibleLearners.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <span className="rounded-2xl bg-slate-100 p-4 text-slate-400">
                  <FileCheck2 size={32} strokeWidth={1.5} />
                </span>
                <h4 className="mt-4 text-sm font-semibold text-slate-800">
                  {search ? 'No matching learners found' : `No learners enrolled in ${currentProgramMeta.label}`}
                </h4>
                <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-400">
                  {search
                    ? 'Try clearing the search query or changing the status filter.'
                    : 'Learners enrolled under this track in the database will appear here automatically.'}
                </p>
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('all');
                    }}
                    className={`${buttonClass} mt-4`}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleLearners.map(learner => {
                  const isExpanded = expandedStudentIds.has(learner.studentId);
                  const initials = learner.studentName
                    .split(' ')
                    .map(n => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'L';

                  const percentage = Math.round((learner.satisfiedCount / (learner.totalRequired || 1)) * 100);

                  return (
                    <article key={learner.studentId} className="transition bg-white hover:bg-slate-50/30">
                      {/* Learner Card Header Row */}
                      <div
                        className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 cursor-pointer select-none"
                        onClick={() => toggleExpand(learner.studentId)}
                      >
                        {/* Student Name & Identifiers */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1 basis-64">
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100/70 text-blue-700 font-bold text-sm">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-semibold text-slate-900 truncate">
                                {learner.studentName}
                              </h4>
                              {learner.accountId && (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600">
                                  {learner.accountId}
                                </span>
                              )}
                              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                {currentProgramMeta.shortLabel}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {learner.latestUpdate
                                ? `Last submission ${formatRequirementDate(learner.latestUpdate)}`
                                : 'No submissions yet'}
                            </p>
                          </div>
                        </div>

                        {/* Progress Meter & Status Pill */}
                        <div className="flex items-center gap-4 ml-auto">
                          <div className="hidden sm:flex flex-col items-end">
                            <span className="text-xs font-semibold text-slate-700">
                              {learner.satisfiedCount} / {learner.totalRequired} Verified
                            </span>
                            <div className="w-28 h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1.5">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  percentage === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                                }`}
                                style={{ width: `${Math.min(100, percentage)}%` }}
                              />
                            </div>
                          </div>

                          <LearnerStatusBadge
                            status={learner.overallStatus}
                            waitingCount={learner.waitingCount}
                          />

                          <button
                            type="button"
                            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                            aria-label={isExpanded ? 'Collapse requirements' : 'Expand requirements'}
                          >
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Mini Requirement Pills Strip (Always visible for quick glance) */}
                      <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3.5 sm:px-5">
                        {catalog.map(item => {
                          const reqCode = (item.id || item.code || '').toLowerCase();
                          const sub = learner.submissions[reqCode];
                          return (
                            <MiniRequirementPill
                              key={item.id}
                              title={item.title}
                              submission={sub}
                            />
                          );
                        })}
                      </div>

                      {/* Expanded Checklist & Dossier Section */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Requirements Checklist for {learner.studentName}
                            </h5>
                            <span className="text-xs text-slate-400">
                              {learner.satisfiedCount} of {catalog.length} requirements satisfied
                            </span>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {catalog.map(item => {
                              const reqCode = (item.id || item.code || '').toLowerCase();
                              const sub = learner.submissions[reqCode];
                              const isGood = sub && isSatisfied(sub.status);
                              const isUnderReview = sub && sub.status === 'review';
                              const isCorrection = sub && sub.status === 'correction';

                              const latestVersion = sub?.versions[0];

                              return (
                                <div
                                  key={item.id}
                                  className={`rounded-2xl border p-4 transition bg-white flex flex-col justify-between ${
                                    isGood
                                      ? 'border-emerald-200 shadow-xs'
                                      : isUnderReview
                                      ? 'border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
                                      : isCorrection
                                      ? 'border-rose-200'
                                      : 'border-slate-200/90'
                                  }`}
                                >
                                  <div>
                                    {/* Item Header */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                                          isGood
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : isUnderReview
                                            ? 'bg-amber-50 text-amber-600'
                                            : isCorrection
                                            ? 'bg-rose-50 text-rose-600'
                                            : 'bg-slate-100 text-slate-500'
                                        }`}>
                                          <RequirementIcon id={item.id} size={16} />
                                        </span>
                                        <div>
                                          <p className="text-xs font-semibold text-slate-900 leading-tight">
                                            {item.title}
                                          </p>
                                          <p className="text-[10px] text-slate-400 line-clamp-1">
                                            {item.description}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="mt-3">
                                      <StatusBadge status={sub?.status} />
                                    </div>

                                    {/* Submitted Document Details */}
                                    {sub && latestVersion ? (
                                      <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-600">
                                        <p className="font-semibold text-slate-800 truncate" title={latestVersion.fileName}>
                                          📄 {latestVersion.fileName}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                          Submitted on {formatRequirementDate(sub.updatedAt)}
                                        </p>
                                        {latestVersion.fileUrl && (
                                          <div className="flex items-center gap-3 pt-1">
                                            <a
                                              href={latestVersion.fileUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                              <ExternalLink size={12} />
                                              Preview Document
                                            </a>
                                            <a
                                              href={latestVersion.fileUrl.includes('?') ? `${latestVersion.fileUrl}&download=true` : `${latestVersion.fileUrl}?download=true`}
                                              download={latestVersion.fileName}
                                              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:underline"
                                            >
                                              Download
                                            </a>
                                          </div>
                                        )}
                                        {sub.note && (
                                          <p className="text-[10px] text-slate-500 border-t border-slate-200/60 pt-1.5 mt-1 line-clamp-2">
                                            <span className="font-semibold">Note:</span> {sub.note}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="mt-3 rounded-xl bg-slate-50/80 p-2.5 text-[11px] text-slate-400 text-center">
                                        No document uploaded yet
                                      </div>
                                    )}
                                  </div>

                                  {/* Review Action Button */}
                                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                                    {sub ? (
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation();
                                          setSelectedRecord(sub);
                                        }}
                                        className={`${
                                          isUnderReview
                                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                            : buttonClass
                                        } !min-h-8 px-3 py-1.5 text-[11px] font-semibold rounded-lg`}
                                      >
                                        {role === 'admin'
                                          ? 'Review & Decide'
                                          : isUnderReview
                                          ? 'Review Document'
                                          : 'Update Decision'}
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">
                                        Awaiting Student
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Review Dialog */}
      {selectedRecord && (
        <ReviewDialog
          key={`${selectedRecord.id}:${selectedRecord.updatedAt}`}
          record={selectedRecord}
          role={role}
          onClose={() => setSelectedRecord(null)}
          onSaved={() => {
            setSelectedRecord(null);
            setNotice('Review decision saved successfully. The submission status has been updated in the database.');
          }}
        />
      )}
    </div>
  );
}

function LearnerStatusBadge({
  status,
  waitingCount,
}: {
  status: OverallLearnerStatus;
  waitingCount: number;
}) {
  if (status === 'complete') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
        <CheckCircle2 size={13} className="text-emerald-600" />
        Complete
      </span>
    );
  }
  if (status === 'review') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
        <Clock size={13} className="text-amber-600" />
        {waitingCount} Awaiting Review
      </span>
    );
  }
  if (status === 'correction') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800">
        <AlertCircle size={13} className="text-rose-600" />
        Correction Needed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
      <FileText size={13} className="text-slate-400" />
      Missing Docs
    </span>
  );
}

function MiniRequirementPill({
  title,
  submission,
}: {
  title: string;
  submission?: RequirementRecord;
}) {
  const isGood = submission && isSatisfied(submission.status);
  const isReview = submission && submission.status === 'review';
  const isCorrection = submission && submission.status === 'correction';

  const shortTitle = title.split('(')[0].trim();

  let colorClass = 'border-slate-200 bg-slate-50 text-slate-500';
  let symbol = '○';

  if (isGood) {
    colorClass = 'border-emerald-200 bg-emerald-50 text-emerald-700 font-medium';
    symbol = '✓';
  } else if (isReview) {
    colorClass = 'border-amber-300 bg-amber-50 text-amber-800 font-semibold';
    symbol = '⏳';
  } else if (isCorrection) {
    colorClass = 'border-rose-200 bg-rose-50 text-rose-700 font-medium';
    symbol = '!';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] ${colorClass}`}
      title={`${title}: ${submission ? STATUS_LABELS[submission.status] || submission.status : 'Not submitted'}`}
    >
      <span className="font-mono text-[9px]">{symbol}</span>
      <span className="truncate max-w-[130px]">{shortTitle}</span>
    </span>
  );
}

function ReviewDialog({
  record,
  role,
  onClose,
  onSaved,
}: {
  record: RequirementRecord;
  role: ReviewerRole;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Determine initial decision based on existing record.status and files
  const getInitialDecision = (status: RequirementStatus): 'verify' | 'exempt' | 'correct' | 'review' => {
    if (status === 'verified' || status === 'auto_verified') return 'verify';
    if (status === 'exempted') return 'exempt';
    if (status === 'correction') return 'correct';
    return record.versions[0]?.fileName ? 'verify' : 'review';
  };

  const [note, setNote] = useState(record.note || '');
  const [decision, setDecision] = useState<'verify' | 'exempt' | 'correct' | 'review'>(
    getInitialDecision(record.status)
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);

  const isExistingReview = Boolean(record.status && record.status !== 'review');

  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const backendStatus =
        decision === 'verify'
          ? 'verified'
          : decision === 'exempt'
          ? 'exempted'
          : decision === 'correct'
          ? 'correction'
          : 'review';

      const trimmedNote = note.trim();
      const feedback =
        trimmedNote ||
        (decision === 'verify'
          ? 'Document verified and accepted.'
          : decision === 'exempt'
          ? 'Exemption granted.'
          : decision === 'correct'
          ? 'Please review requirement guidelines and upload a corrected document.'
          : 'Document is under review.');

      await reviewStudentSubmissionApi(record.id, {
        status: backendStatus,
        teacher_feedback: feedback,
      });
      notifyRequirementsUpdated();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This decision could not be saved.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal title={`${record.learnerName} · Requirement Review`} onClose={onClose} pending={busy}>
      <div className="space-y-5">
        <p className="break-all text-xs text-slate-400">
          {record.email} · {record.program}
          {record.sample ? ' · Illustrative sample' : ''}
        </p>

        <SubmissionDetails record={record} />

        <div className="space-y-4 border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              {role === 'admin' ? 'Admin Decision' : 'Teacher Review & Decision'}
            </h3>
            {record.status && (
              <span className="text-[11px] text-slate-400 font-medium">
                Current: <span className="font-semibold text-slate-700">{STATUS_LABELS[record.status] || record.status}</span>
              </span>
            )}
          </div>
          <p className="text-xs leading-5 text-slate-500">
            {role === 'admin'
              ? 'Approve, verify, or request adjustments on the student submission.'
              : 'Review submitted documents, mark as verified, request corrections, or route for administrative oversight.'}
          </p>

          <label className="block text-xs font-semibold text-slate-600">
            Next action
            <select
              disabled={busy}
              className={fieldClass}
              value={decision}
              onChange={event => setDecision(event.target.value as typeof decision)}
            >
              <option value="verify">
                Verify document
              </option>
              <option value="correct">
                Request correction / reopen for correction
              </option>
              <option value="review">
                Keep under review {role === 'teacher' ? '/ Forward to admin' : ''}
              </option>
              <option value="exempt">
                Approve exemption
              </option>
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-600">
            Reason or feedback{' '}
            <span className="font-normal text-slate-400">
              ({decision === 'correct' ? 'recommended' : 'optional'} · visible to student)
            </span>
            <textarea
              disabled={busy}
              className={fieldClass}
              rows={3}
              value={note}
              maxLength={1000}
              onChange={event => setNote(event.target.value)}
              placeholder={
                decision === 'correct'
                  ? 'Explain what needs correction (e.g., blurry image, missing signatures, incomplete details)...'
                  : 'Explain the decision or notes for the learner (optional)...'
              }
            />
          </label>

          {error && <RequirementError message={error} />}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={busy} className={buttonClass}>
              Close
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className={primaryClass}
            >
              {busy ? 'Saving…' : isExistingReview ? 'Update decision' : 'Save decision'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function AcceptanceGuide({ role }: { role: ReviewerRole }) {
  const [items, setItems] = useState<RequirementItem[]>(DEFAULT_REQUIREMENTS);

  useEffect(() => {
    let active = true;
    getPublicRequirements()
      .then(res => {
        if (active && res && res.length > 0) {
          setItems(res);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-3">
      {items.map(item => (
        <section key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="inline-flex rounded-xl bg-blue-50 p-3 text-blue-600">
            <RequirementIcon id={item.id} />
          </span>
          <h2 className="mt-4 text-sm font-semibold text-slate-800">{item.title}</h2>
          <p className="mt-2 text-xs leading-6 text-slate-500">{item.description}</p>
          <ul className="mt-4 space-y-2">
            {item.types.map(type => (
              <li key={type} className="flex gap-2 text-xs leading-5 text-slate-600">
                <Check size={13} className="mt-1 shrink-0 text-blue-600" />
                {type}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-500">{item.guidance}</p>
          <p className="mt-3 text-[11px] leading-6 text-slate-400">
            {role === 'admin'
              ? 'This live catalog reflects master requirements configured by administrators.'
              : 'Uncertain details go to review. Only admins can approve manual verification or school-record exemptions.'}
          </p>
        </section>
      ))}
    </div>
  );
}

export function LearnerRequirementsSummary({ email, role }: { email: string; role: ReviewerRole }) {
  const { records, loading, error } = useRequirements(role);
  const [catalog, setCatalog] = useState<RequirementItem[]>([]);

  useEffect(() => {
    let active = true;
    getDefaultRequirements()
      .then(res => {
        if (active && res && res.length > 0) {
          setCatalog(res);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const own = email ? records.filter(record => record.email.trim().toLowerCase() === email.trim().toLowerCase()) : [];
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Enrollment requirements</h2>
          <p className="mt-1 text-xs text-slate-400">
            {loading ? 'Loading…' : `${own.filter(record => isSatisfied(record.status)).length} of ${catalog.length} verified`}
          </p>
        </div>
        <Link href={`/${role}/requirements?learner=${encodeURIComponent(email)}`} className={buttonClass}>
          Open requirements
          <ArrowRight size={13} />
        </Link>
      </div>
      <DemoNotice />
      {error ? (
        <RequirementError message={error} />
      ) : !loading && (
        <div className="space-y-2">
          {catalog.map(item => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <RequirementIcon id={item.id} size={17} />
                {item.title}
              </span>
              <StatusBadge status={own.find(record => record.requirementId === item.id)?.status} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
