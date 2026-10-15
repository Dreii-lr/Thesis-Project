'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, Info, ListTodo } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { getStudentAssessmentResult, listStudentTasks, startStudentAssessment, submitStudentAssessment, type StudentDelivery, type StudentTask, type SubmissionDetail } from '@/src/lib/assessments-api';
import { assessmentStartMessage, attemptDeadline, remainingSeconds, scheduledEnd } from '@/src/lib/assessment-timing';

export default function AssessmentPage() {
  const { id } = useParams<{ id: string }>();
  return <AssessmentAttempt key={id} id={id} />;
}

function AssessmentAttempt({ id }: { id: string }) {
  const { user } = useAuth();
  const [task, setTask] = useState<StudentTask | null>(null);
  const [delivery, setDelivery] = useState<StudentDelivery | null>(null);
  const [result, setResult] = useState<SubmissionDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const answersRef = useRef<Record<string, string>>({});
  const currentRef = useRef(0);
  const inFlight = useRef(false);
  const submitted = useRef(false);
  const autoSubmitted = useRef(false);
  const storageKey = `assessment:${user?.user_id || user?.email}:${id}`;
  const deadline = task && delivery ? attemptDeadline({ ...task, duration_minutes: delivery.duration_minutes }, delivery.started_at) : NaN;

  const restoreAttempt = useCallback((session: StudentDelivery) => {
    const restored: Record<string, string> = {};
    let questionIndex = 0;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (saved?.submission_id === session.submission_id && saved.answers && typeof saved.answers === 'object') {
        for (const question of session.questions) {
          if (typeof saved.answers[question.id] === 'string') restored[question.id] = saved.answers[question.id];
        }
        questionIndex = Math.max(0, session.questions.findIndex(question => question.id === saved.current_question_id));
      }
    } catch { /* Continue if browser storage is unavailable. */ }
    answersRef.current = restored;
    currentRef.current = questionIndex;
    setCurrent(questionIndex);
    setAnswers(restored);
    setDelivery(session);
  }, [storageKey]);

  const saveProgress = useCallback((updated: Record<string, string>, questionIndex: number) => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ submission_id: delivery?.submission_id, answers: updated, current_question_id: delivery?.questions[questionIndex]?.id }));
    } catch { /* Keep the attempt in memory if browser storage is unavailable. */ }
  }, [delivery, storageKey]);

  useEffect(() => {
    let active = true;
    listStudentTasks().then(async tasks => {
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
  }, [id, retry, restoreAttempt]);

  const finish = useCallback(async (automatic = false) => {
    if (!task || !delivery || inFlight.current || submitted.current) return;
    const ended = automatic || Date.now() >= deadline;
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

  const handleAnswer = useCallback((questionId: string, value: string) => {
    if (pending || expired || submitted.current) return;
    if (Date.now() >= deadline) { void finish(true); return; }
    const updated = { ...answersRef.current, [questionId]: value };
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
    const unanswered = delivery.questions.filter(question => !answersRef.current[question.id]?.trim()).length;
    if (unanswered && !window.confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return;
    void finish();
  }

  const seconds = Number.isFinite(deadline) ? remainingSeconds(deadline, now) : 0;
  const startMessage = task ? assessmentStartMessage(task, now) : null;
  const question = delivery?.questions[current];
  const answeredCount = delivery?.questions.filter(item => answers[item.id]?.trim()).length || 0;
  const dateFormat = (value: string) => new Date(value).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeFormat = (value: string | number) => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-600 focus:outline-none disabled:bg-slate-100';

  return <div className="mx-auto max-w-5xl space-y-6 px-4 py-7 sm:px-8">
    {loading && <p role="status" className="p-6 text-sm text-slate-500">Loading assessment...</p>}
    {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}{!delivery && !result && <button type="button" onClick={() => { setError(''); setLoading(true); setRetry(value => value + 1); }} className="ml-3 underline">Retry</button>}</div>}
    {!loading && task && !delivery && !result && <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 p-6 text-white sm:p-8"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-blue-100"><ListTodo size={12} />{task.assessment_type} · {task.subject_code}</span><h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">{task.title}</h1><p className="mt-2 text-xs text-blue-100/80">Review your schedule and instructions before you begin.</p></div>
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><CalendarDays size={20} className="mt-1 shrink-0 text-blue-600" /><div><p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">Scheduled day</p><p className="mt-1 text-sm font-semibold text-slate-700">{task.start_date ? dateFormat(task.start_date) : 'Not set'}</p><p className="mt-1 text-xs text-slate-500">{task.start_date ? timeFormat(task.start_date) : 'Not set'} — {Number.isFinite(scheduledEnd(task)) ? timeFormat(scheduledEnd(task)) : 'Not set'}</p></div></div>
        <div className="mt-4 grid grid-cols-3 gap-3">{[[`${task.duration_minutes ?? '—'} min`, 'Duration'], [`${task.grace_period_minutes} min`, 'Grace to start'], [`${task.max_score}`, 'Total points']].map(([value, label]) => <div key={label} className="rounded-xl border border-slate-100 p-3 text-center"><p className="text-base font-bold text-slate-800">{value}</p><p className="mt-1 text-[10px] text-slate-400">{label}</p></div>)}</div>
        {task.description && <div className="mt-6"><h2 className="text-xs font-semibold text-slate-700">Teacher instructions</h2><p className="mt-2 whitespace-pre-line text-xs leading-6 text-slate-500">{task.description}</p></div>}
        <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-500"><Info size={15} className="mt-1 shrink-0 text-blue-500" /><p><strong className="text-slate-700">Note:</strong> The Start button appears automatically at the scheduled time. Begin within the {task.grace_period_minutes}-minute grace period. Everyone finishes at the scheduled end time. Your progress is saved when you answer or move between questions. Keep this tab open for automatic submission.</p></div>
        {startMessage && <p role="status" className="mt-5 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800">{startMessage}</p>}
        {!startMessage && <button type="button" disabled={pending || !!error} onClick={() => void begin()} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{pending ? 'Starting...' : `Start ${task.assessment_type === 'EXAM' ? 'Exam' : 'Quiz'}`}<ArrowRight size={15} /></button>}
      </div>
    </section>}
    {!loading && delivery && !result && <>
      <div className="sticky top-[84px] z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <h1 className="text-xl font-bold">{delivery.title}</h1>
        <p role="timer" className={`inline-flex items-center gap-2 font-bold ${seconds < 60 ? 'text-rose-600' : 'text-blue-700'}`}><Clock3 size={18} />{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} remaining</p>
      </div>
      {expired && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Time is up. Answers are locked.{pending ? ' Submitting your answers...' : error ? ' Please retry submission.' : ''}</p>}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="space-y-4">
      <fieldset disabled={pending || expired} className="space-y-5">
        {question && <section key={question.id} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">Question {current + 1} of {delivery.questions.length}</p><span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-medium text-slate-500">{question.points_per_item} pts</span></div>
          <label htmlFor={`answer-${question.id}`} className="block text-base font-semibold leading-7 text-slate-800">{question.category_type === 'Matching Type' ? question.premise : question.text}</label>
          {question.category_type === 'Essay' ? <textarea id={`answer-${question.id}`} value={answers[question.id] || ''} onChange={event => handleAnswer(question.id, event.target.value)} rows={5} className={inputClass} />
            : question.category_type === 'Matching Type' ? <select id={`answer-${question.id}`} value={answers[question.id] || ''} onChange={event => handleAnswer(question.id, event.target.value)} className={inputClass}><option value="">Choose a match</option>{question.matching_pool?.map(option => <option key={option} value={option}>{option}</option>)}</select>
            : <div id={`answer-${question.id}`} className="space-y-2" role="group" aria-label={`Answers for question ${current + 1}`}>{(question.options || (question.category_type.startsWith('True') ? ['True', 'False'] : [])).map((option, optionIndex) => <label key={optionIndex} className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${answers[question.id] === option ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}><input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={() => handleAnswer(question.id, option)} />{option}</label>)}</div>}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5"><button type="button" disabled={current === 0} onClick={() => moveToQuestion(current - 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-500 disabled:opacity-40"><ArrowLeft size={13} /> Previous question</button><button type="button" disabled={current === delivery.questions.length - 1} onClick={() => moveToQuestion(current + 1)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">Next question <ArrowRight size={13} /></button></div>
        </section>}
        {!question && <p className="rounded-xl bg-white p-6 text-sm text-slate-500">No questions were delivered. Please contact your teacher.</p>}
      </fieldset>
      <button type="button" onClick={submit} disabled={pending} className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{pending ? 'Submitting...' : expired ? 'Retry submission' : 'Submit answers'}</button>
      </div>
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xs font-bold text-slate-700">Question navigator</h2><p className="mt-2 text-[11px] text-slate-400">{answeredCount} of {delivery.questions.length} answered</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${delivery.questions.length ? answeredCount / delivery.questions.length * 100 : 0}%` }} /></div><div className="mt-5 grid grid-cols-4 gap-2">{delivery.questions.map((item, index) => <button key={item.id} type="button" aria-label={`Go to question ${index + 1}`} aria-current={current === index ? 'step' : undefined} disabled={pending || expired} onClick={() => moveToQuestion(index)} className={`h-9 rounded-xl text-xs font-semibold disabled:opacity-50 ${current === index ? 'bg-blue-600 text-white' : answers[item.id]?.trim() ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200' : 'bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200'}`}>{index + 1}</button>)}</div><p className="mt-4 text-[10px] leading-5 text-slate-400">Blue marks your current question. Green marks an answered question. Reloading keeps your place.</p></aside>
      </div>
    </>}
    {!loading && result && task && <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <CheckCircle2 size={44} className="mx-auto text-emerald-500" /><h1 className="mt-4 text-3xl font-bold">{task.assessment_type === 'EXAM' ? 'Exam' : 'Quiz'} submitted!</h1>
      {expired && <p className="mt-2 text-sm text-slate-500">Your answers were automatically submitted when time ran out.</p>}
      <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-emerald-100 bg-emerald-50/70 p-6"><p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">{result.status === 'GRADED' ? 'Your score' : 'Objective score'}</p><p className="mt-3 text-4xl font-bold text-emerald-700">{result.status === 'GRADED' ? result.final_score : result.auto_score} / {task.max_score}</p>{result.status === 'GRADED' && task.max_score > 0 && <p className="mt-2 text-sm font-semibold text-emerald-600">{Math.round(result.final_score / task.max_score * 100)}%</p>}</div>
      <p className="mt-3 text-sm text-slate-500">{result.status === 'GRADED' ? 'Your score has been calculated.' : 'Objective questions have been scored. Essay answers are awaiting teacher review.'}</p>
    </section>}
  </div>;
}
