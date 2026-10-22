'use client';

import StudentLoading from '@/src/components/layout/student/StudentLoading';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import { useAuth } from '@/src/context/AuthContext';
import { useStudentSubjects } from '@/src/context/StudentSubjectsContext';
import Modal from '@/src/components/ui/Modal';
import SubmissionRequestButton from '@/src/components/notifications/SubmissionRequestButton';
import { subjectHref, subjectTasks } from '@/src/lib/student-subjects';
import { getStudentAssessmentResult, listStudentTasks, startStudentAssessment, submitStudentAssessment, type StudentDelivery, type StudentQuestion, type StudentTask, type SubmissionDetail } from '@/src/lib/assessments-api';
import { assessmentStartMessage, attemptDeadline, remainingSeconds, scheduledEnd } from '@/src/lib/assessment-timing';

function questionOptions(question: StudentQuestion) {
  return question.options?.length ? question.options : question.category_type.startsWith('True') ? ['True', 'False'] : [];
}

export default function AssessmentPage() {
  const { id } = useParams<{ id: string }>();
  return <AssessmentAttempt key={id} id={id} />;
}

function AssessmentAttempt({ id }: { id: string }) {
  const { user } = useAuth();
  const { subjects, program } = useStudentSubjects();
  const [task, setTask] = useState<StudentTask | null>(null);
  const [delivery, setDelivery] = useState<StudentDelivery | null>(null);
  const [result, setResult] = useState<SubmissionDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const answersRef = useRef<Record<string, string>>({});
  const selectedOptionsRef = useRef<Record<string, number>>({});
  const currentRef = useRef(0);
  const inFlight = useRef(false);
  const submitted = useRef(false);
  const autoSubmitted = useRef(false);
  const storageKey = `assessment:${user?.user_id || user?.email}:${id}`;
  const deadline = task && delivery ? attemptDeadline({ ...task, duration_minutes: delivery.duration_minutes }, delivery.started_at) : NaN;

  const restoreAttempt = useCallback((session: StudentDelivery) => {
    const restored: Record<string, string> = {};
    const restoredOptions: Record<string, number> = {};
    let questionIndex = 0;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (saved?.submission_id === session.submission_id && saved.answers && typeof saved.answers === 'object') {
        for (const question of session.questions) {
          const answer = saved.answers[question.id];
          if (typeof answer !== 'string') continue;
          restored[question.id] = answer;
          const options = questionOptions(question);
          const savedIndex = saved.selected_options?.[question.id];
          const index = Number.isInteger(savedIndex) && savedIndex >= 0 && options[savedIndex] === answer
            ? savedIndex : options.indexOf(answer);
          if (index >= 0) restoredOptions[question.id] = index;
        }
        questionIndex = Math.max(0, session.questions.findIndex(question => question.id === saved.current_question_id));
      }
    } catch { /* Continue if browser storage is unavailable. */ }
    answersRef.current = restored;
    selectedOptionsRef.current = restoredOptions;
    currentRef.current = questionIndex;
    setCurrent(questionIndex);
    setAnswers(restored);
    setSelectedOptions(restoredOptions);
    setDelivery(session);
  }, [storageKey]);

  const saveProgress = useCallback((updated: Record<string, string>, questionIndex: number) => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ submission_id: delivery?.submission_id, answers: updated, selected_options: selectedOptionsRef.current, current_question_id: delivery?.questions[questionIndex]?.id }));
    } catch { /* Keep the attempt in memory if browser storage is unavailable. */ }
  }, [delivery, storageKey]);

  useEffect(() => {
    let active = true;
    listStudentTasks(user).then(async tasks => {
      const assigned = tasks.find(item => item.assessment_id === id && item.assessment_type !== 'ACTIVITY');
      if (!assigned) throw new Error('This quiz or exam is not assigned to you.');
      if (!active) return;
      setTask(assigned);
      if (assigned.submission_status === 'SUBMITTED' || assigned.submission_status === 'GRADED') {
        const saved = await getStudentAssessmentResult(id);
        if (active) { submitted.current = true; setResult(saved); }
      } else if (assigned.submission_status === 'IN_PROGRESS') {
        const session = await startStudentAssessment(id);
        if (active) restoreAttempt(session);
      }
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Unable to load the assessment.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, retry, restoreAttempt, user]);

  const finish = useCallback(async (automatic = false) => {
    if (!task || !delivery || inFlight.current || submitted.current) return;
    const ended = automatic || Date.now() >= deadline;
    if (!ended && !delivery.questions.every(question => answersRef.current[question.id]?.trim())) return;
    setConfirmSubmit(false);
    if (ended) setExpired(true);
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      const saved = await submitStudentAssessment(id, {
        answers: delivery.questions.map(question => ({ question_id: question.id, student_answer: answersRef.current[question.id] || '' })),
        time_spent_seconds: Math.max(0, Math.floor((Math.min(Date.now(), deadline) - Date.parse(delivery.started_at)) / 1000)),
      });
      submitted.current = true;
      setResult(saved);
      try { sessionStorage.removeItem(storageKey); } catch { /* The submission is already saved. */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit. Your answers are kept here; please retry.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, [task, delivery, deadline, id, storageKey]);

  useEffect(() => {
    const tick = () => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (delivery && Number.isFinite(deadline) && currentTime >= deadline && !submitted.current) {
        setExpired(true);
        if (!autoSubmitted.current && !inFlight.current) {
          autoSubmitted.current = true;
          void finish(true);
        }
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    const reconnect = () => { if (delivery && Date.now() >= deadline && !submitted.current) void finish(true); };
    window.addEventListener('online', reconnect);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('online', reconnect);
    };
  }, [delivery, deadline, finish]);

  async function begin() {
    if (!task || inFlight.current) return;
    const message = assessmentStartMessage(task);
    if (message) { setError(message); return; }
    inFlight.current = true;
    setPending(true);
    setError('');
    try { restoreAttempt(await startStudentAssessment(id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to start the assessment.'); }
    finally { inFlight.current = false; setPending(false); }
  }

  const handleAnswer = useCallback((questionId: string, value: string, optionIndex?: number) => {
    if (pending || expired || submitted.current) return;
    if (Date.now() >= deadline) { void finish(true); return; }
    const updated = { ...answersRef.current, [questionId]: value };
    if (optionIndex !== undefined) {
      const updatedOptions = { ...selectedOptionsRef.current, [questionId]: optionIndex };
      selectedOptionsRef.current = updatedOptions;
      setSelectedOptions(updatedOptions);
    }
    answersRef.current = updated;
    setAnswers(updated);
    saveProgress(updated, currentRef.current);
  }, [pending, expired, deadline, finish, saveProgress]);

  const moveToQuestion = useCallback((index: number) => {
    if (!delivery || pending || expired || index < 0 || index >= delivery.questions.length) return;
    if (Date.now() >= deadline) { void finish(true); return; }
    currentRef.current = index;
    setCurrent(index);
    saveProgress(answersRef.current, index);
  }, [delivery, pending, expired, deadline, finish, saveProgress]);

  function submit() {
    if (!delivery || pending) return;
    if (expired || Date.now() >= deadline) { void finish(true); return; }
    if (delivery.questions.length && delivery.questions.every(question => answersRef.current[question.id]?.trim())) setConfirmSubmit(true);
  }

  const seconds = Number.isFinite(deadline) ? remainingSeconds(deadline, now) : 0;
  const startMessage = task ? assessmentStartMessage(task, now) : null;
  const question = delivery?.questions[current];
  const answeredCount = delivery?.questions.filter(item => answers[item.id]?.trim()).length || 0;
  const allAnswered = !!delivery?.questions.length && answeredCount === delivery.questions.length;
  const subject = task ? subjects.find(item => subjectTasks([task], item).length) : undefined;
  const returnHref = subject ? subjectHref(subject.subject_id) : '/student/subjects';
  const dateFormat = (value: string) => new Date(value).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeFormat = (value: string | number) => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-600 focus:outline-none disabled:bg-slate-100';

  return <div className="min-h-[calc(100dvh-72px)] pb-6">
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white ">
      <div className="flex min-h-18 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <Link href={returnHref} aria-label="Return to subject" className="inline-flex h-10 shrink-0 items-center justify-center px-3 rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600">Back</Link>
          <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{task?.assessment_type || 'Assessment'} <span className="text-slate-500">/ {subject?.name || task?.subject_code || 'Student portal'}</span></p><h1 className="mt-1 truncate text-sm font-semibold text-slate-800 sm:text-sm">{delivery?.title || task?.title || 'Assessment workspace'}</h1></div>
        </div>
        {delivery && !result ? <div role="timer" aria-label="Time remaining" className={`shrink-0 rounded-xl border px-3 py-2 sm:px-6 ${seconds < 60 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-blue-100 bg-blue-50/70 text-blue-800'}`}><p className="flex items-center gap-2 font-mono text-lg font-semibold tabular-nums sm:text-lg">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</p><p className="mt-0.5 text-center text-xs font-semibold uppercase tracking-wide">Time remaining</p></div> : <span className="hidden items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 sm:inline-flex">{program?.name || 'Student assessment'}</span>}
      </div>
    </header>
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pt-6 sm:px-6">
    {loading && <StudentLoading label="Loading assessment..." />}
    {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}{!delivery && !result && <button type="button" onClick={() => { setError(''); setLoading(true); setRetry(value => value + 1); }} className="ml-3 underline">Retry</button>}</div>}
    {!loading && task && !delivery && !result && <section className="grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
      <div className="relative flex flex-col justify-start overflow-hidden bg-white border border-slate-200    p-6 text-slate-900 sm:p-8">

        <div className="relative"><span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">{task.assessment_type} · {subject?.name || task.subject_code}</span><p className="mt-8 text-xs font-semibold uppercase tracking-wide text-slate-600">Assessment overview</p><h2 className="mt-4 break-words text-2xl font-semibold leading-tight tracking-tight sm:text-2xl">{task.title}</h2><p className="mt-4 max-w-md text-sm leading-7 text-slate-600">Take a moment to review the schedule. You can move between questions and check your answers before submitting.</p></div>
        <div className="relative mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6"><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">Teacher instructions</h3><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{task.description || 'Read each question carefully and choose your best answer. Review all items before submitting.'}</p></div>
      </div>
      <div className="flex flex-col justify-center p-6">
        <p className="mb-6 text-lg font-semibold tracking-tight text-slate-800">Your assessment at a glance</p>
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Scheduled day</p><p className="mt-1 text-sm font-semibold text-slate-700">{task.start_date ? dateFormat(task.start_date) : 'Not set'}</p><p className="mt-1 text-xs text-slate-500">{task.start_date ? timeFormat(task.start_date) : 'Not set'} — {Number.isFinite(scheduledEnd(task)) ? timeFormat(scheduledEnd(task)) : 'Not set'}</p></div></div>
        <div className="mt-4 grid grid-cols-3 gap-3">{[[`${task.duration_minutes ?? '—'} min`, 'Duration'], [`${task.grace_period_minutes} min`, 'Grace to start'], [`${task.max_score}`, 'Total points']].map(([value, label]) => <div key={label} className="rounded-xl border border-slate-100 p-3 text-center"><p className="text-sm font-semibold text-slate-800">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>)}</div>
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-500"><p><strong className="text-slate-700">Note:</strong> Start within the {task.grace_period_minutes}-minute grace period. Leaving does not pause the timer. Return in this tab to continue with your saved answers and place. If time runs out while you are away, your saved answers are submitted when you return.</p></div>
        {startMessage && <p role="status" className="mt-6 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800">{startMessage}</p>}
        {(task.status === 'COMPLETED' || (Number.isFinite(scheduledEnd(task)) && now >= scheduledEnd(task))) && <div className="mt-4"><SubmissionRequestButton assessmentId={task.assessment_id} assessmentTitle={task.title} subject={subject?.name || task.subject_code} /></div>}
        {!startMessage && <button type="button" disabled={pending || !!error} onClick={() => void begin()} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{pending ? 'Starting...' : `Start ${task.assessment_type === 'EXAM' ? 'Exam' : 'Quiz'}`}</button>}
      </div>
    </section>}
    {!loading && delivery && !result && <>
      {expired && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Time is up. Answers are locked.{pending ? ' Submitting your answers...' : error ? ' Please retry submission.' : ''}</p>}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_260px] 2xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
      <fieldset disabled={pending || expired} className="space-y-6">
        {question && <section key={question.id} className="flex min-h-[calc(100dvh-220px)] min-w-0 flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Question {current + 1} of {delivery.questions.length}</p><span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">{question.points_per_item} pts</span></div>
          <label htmlFor={`answer-${question.id}`} className="block whitespace-pre-line text-lg font-semibold leading-8 text-slate-800 sm:text-lg">{question.category_type === 'Matching Type' ? question.premise : question.text}</label>
          {question.image_url && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 p-2 sm:p-3 flex items-center justify-center max-h-96">
              <img
                src={question.image_url}
                alt={`Question ${current + 1} illustration`}
                className="max-h-80 max-w-full rounded-xl object-contain shadow-sm"
                loading="eager"
              />
            </div>
          )}
          {question.category_type === 'Essay' ? <textarea id={`answer-${question.id}`} value={answers[question.id] || ''} onChange={event => handleAnswer(question.id, event.target.value)} rows={5} className={inputClass} />
            : question.category_type === 'Matching Type' ? <select id={`answer-${question.id}`} value={answers[question.id] || ''} onChange={event => handleAnswer(question.id, event.target.value)} className={inputClass}><option value="">Choose a match</option>{question.matching_pool?.map(option => <option key={option} value={option}>{option}</option>)}</select>
            : <div id={`answer-${question.id}`} className="space-y-3" role="radiogroup" aria-label={`Answers for question ${current + 1}`}>
              {questionOptions(question).map((option, optionIndex) => {
                const selected = selectedOptions[question.id] === optionIndex;
                const optionId = `option-${id}-${question.id}-${optionIndex}`;
                return <label key={optionId} htmlFor={optionId} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 text-sm transition-colors duration-150 ${selected ? 'border-blue-300 bg-blue-50/60 text-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/60'}`}>
                  <input id={optionId} type="radio" name={`assessment-${id}-${question.id}`} value={option} checked={selected} onChange={() => handleAnswer(question.id, option, optionIndex)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500" />
                  <span className={`shrink-0 text-xs leading-5 ${selected ? 'text-blue-600' : 'text-slate-500'}`}>{String.fromCharCode(65 + optionIndex)}.</span>
                  <span className="min-w-0 whitespace-pre-line break-words leading-5">{option}</span>
                </label>;
              })}
            </div>}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6"><button type="button" disabled={current === 0} onClick={() => moveToQuestion(current - 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-40"> Previous</button><p className={`hidden items-center gap-2 text-xs sm:inline-flex ${answers[question.id]?.trim() ? 'text-emerald-700' : 'text-slate-500'}`}>{answers[question.id]?.trim() ? <>Answer saved</> : 'You can return to this item later'}</p><button type="button" disabled={current === delivery.questions.length - 1} onClick={() => moveToQuestion(current + 1)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40">{answers[question.id]?.trim() ? 'Next' : 'Skip for now'} </button></div>
        </section>}
        {!question && <p className="rounded-xl bg-white p-6 text-sm text-slate-500">No questions were delivered. Please contact your teacher.</p>}
      </fieldset>
      </div>
      <aside className="space-y-4 xl:sticky xl:top-24">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-slate-800">Your progress</h2></div>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-800">{answeredCount}<span className="ml-1 text-sm font-medium text-slate-500">/ {delivery.questions.length}</span></p>
          <p className="mt-1 text-xs text-slate-500">questions answered</p>
          <div role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={delivery.questions.length} aria-valuenow={answeredCount} className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><progress aria-label="Progress" max={100} value={delivery.questions.length ? answeredCount / delivery.questions.length * 100 : 0} className="block h-full w-full appearance-none overflow-hidden rounded-full border-0 bg-slate-100 [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600" /></div>
          <div className="mt-6 grid grid-cols-5 gap-3" aria-label="Question navigator">{delivery.questions.map((item, index) => {
            const answered = !!answers[item.id]?.trim();
            return <button key={item.id} type="button" aria-label={`Go to question ${index + 1}, ${answered ? 'answered' : 'unanswered'}`} aria-current={current === index ? 'step' : undefined} disabled={pending || expired} onClick={() => moveToQuestion(index)} className={`h-10 rounded-xl border text-xs font-semibold transition disabled:opacity-50 ${answered ? 'border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'} ${current === index ? 'outline-2 outline-offset-2 outline-blue-600' : ''}`}>{index + 1}</button>;
          })}</div>
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded bg-emerald-400" />Answered</span><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded bg-slate-300" />Unanswered / skipped</span><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded border-2 border-blue-600" />Current</span></div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Select any number to review or change your answer. You can return here after leaving; your answers and place are saved in this tab. The timer keeps running while you are away.</p>
        </section>
        <section className={`rounded-xl border p-6 ${allAnswered ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
          <p className={`text-xs font-semibold ${allAnswered ? 'text-emerald-800' : 'text-slate-600'}`}>{expired ? 'Your time has ended' : allAnswered ? 'All questions answered' : `${delivery.questions.length - answeredCount} question(s) left`}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{expired ? 'Your answers are locked. Submit them again if the connection was interrupted.' : allAnswered ? 'Take one last look. You can still change your answers before submitting.' : 'Answer every item to unlock submission. You can review questions in any order.'}</p>
          {(allAnswered || expired) && <button type="button" onClick={submit} disabled={pending} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">{pending ? 'Submitting...' : expired ? 'Retry submission' : 'Submit answers'}</button>}
        </section>
      </aside>
      </div>
    </>}
    {!loading && result && task && <section className="flex min-h-[calc(100dvh-220px)] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <h2 className="mt-4 text-2xl font-semibold">{task.assessment_type === 'EXAM' ? 'Exam' : 'Quiz'} submitted</h2>
      {expired && <p className="mt-2 text-sm text-slate-500">Your answers were automatically submitted when time ran out.</p>}
      <div className="mx-auto mt-6 max-w-sm rounded-xl border border-emerald-100 bg-emerald-50/70 p-6"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{result.status === 'GRADED' ? 'Your score' : 'Objective score'}</p><p className="mt-3 text-2xl font-semibold text-emerald-700">{result.status === 'GRADED' ? result.final_score : result.auto_score} / {task.max_score}</p>{result.status === 'GRADED' && task.max_score > 0 && <p className="mt-2 text-sm font-semibold text-emerald-700">{Math.round(result.final_score / task.max_score * 100)}%</p>}</div>
      <p className="mt-3 text-sm text-slate-500">{result.status === 'GRADED' ? 'Your score has been calculated.' : 'Objective questions have been scored. Essay answers are awaiting teacher review.'}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/student/results" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-semibold text-white hover:bg-blue-700">View My Results </Link><Link href={returnHref} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-6 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">Return to subject</Link></div>
    </section>}
    </div>
    {confirmSubmit && !expired && !result && <Modal title="Ready to submit?" onClose={() => setConfirmSubmit(false)} pending={pending}>
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4"><div><p className="text-sm font-semibold text-emerald-800">All {delivery?.questions.length} questions answered</p><p className="mt-1 text-xs text-emerald-700">{delivery?.title}</p></div></div>
      <p className="text-sm leading-6 text-slate-500">Have you finished checking your answers? After you submit, you cannot change them. Your score will appear once your submission is saved.</p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row"><button type="button" onClick={() => setConfirmSubmit(false)} disabled={pending} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Review answers</button><button type="button" onClick={() => void finish()} disabled={pending} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Yes, submit answers</button></div>
    </Modal>}
  </div>;
}
