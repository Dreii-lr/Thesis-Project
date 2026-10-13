'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock3, Flag, CheckCircle2, ClipboardList } from 'lucide-react';
import { demoQuizzes } from '@/src/data/studentAssessmentDemo';

type Phase = 'intro' | 'taking' | 'results';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const quiz = demoQuizzes.find((q) => q.id === params.id);
  
  const [phase, setPhase] = useState<Phase>('intro');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [flags, setFlags] = useState<number[]>([]);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [review, setReview] = useState(false);

  useEffect(() => {
    if (phase !== 'taking' || seconds === null) return;

    if (seconds <= 0) {
      setPhase('results');
      return;
    }

    const timer = window.setInterval(
      () => setSeconds((v) => (v === null ? null : Math.max(0, v - 1))),
      1000
    );
    
    return () => window.clearInterval(timer);
  }, [phase, seconds]);

  if (!quiz) {
    return (
      <div className="p-8">
        <p>Quiz not found.</p>
        <Link href="/student/activities" className="text-blue-600">
          Return to Activities
        </Link>
      </div>
    );
  }

  const count = Object.keys(answers).length;
  const score = quiz.questions.filter((q, i) => answers[i] === q.correct).length;
  const pct = Math.round((score / quiz.questions.length) * 100);
  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;

  const start = () => {
    setAnswers({});
    setCurrent(0);
    setFlags([]);
    setSeconds(quiz.minutes * 60);
    setReview(false);
    setPhase('taking');
  };

  const submit = () => {
    if (
      count < quiz.questions.length &&
      !window.confirm(`You have ${quiz.questions.length - count} unanswered question(s). Submit anyway?`)
    ) {
      return;
    }
    setPhase('results');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-8">
      <Link href="/student/activities" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600">
        <ArrowLeft size={16} /> Activities
      </Link>

      {phase === 'intro' ? (
        <div className="mx-auto mt-7 max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ClipboardList size={26} />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-wider text-blue-600">
            {quiz.subject}
          </p>
          <h1 className="mt-2 text-3xl font-bold">{quiz.title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">{quiz.description}</p>
          
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              [String(quiz.questions.length), 'Questions'],
              [`${quiz.minutes} minutes`, 'Time limit'],
              [String(quiz.attempts), 'Allowed attempts']
            ].map(([v, k]) => (
              <div key={k} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xl font-bold">{v}</p>
                <p className="text-xs text-slate-500">{k}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            <strong>Instructions:</strong> Answer one question at a time. You can revisit questions, flag them for review, and submit before the timer ends. Your answers are kept in this page while you work. Results are for demo purposes only.
          </div>

          <button onClick={start} className="mt-7 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700">
            Begin Quiz <ArrowRight className="ml-1 inline" size={17} />
          </button>
        </div>
      ) : phase === 'taking' ? (
        <>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                {quiz.subject}
              </p>
              <h1 className="mt-1 text-2xl font-bold">{quiz.title}</h1>
            </div>
            <div className={`rounded-xl px-4 py-3 font-bold ${seconds !== null && seconds < 60 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'}`}>
              <Clock3 size={18} className="mr-2 inline" />
              {fmt(seconds ?? 0)} remaining
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${(count / quiz.questions.length) * 100}%` }} />
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {count} of {quiz.questions.length} answered
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_275px]">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-600">
                  Question {current + 1} of {quiz.questions.length}
                </span>
                <button 
                  onClick={() => setFlags((f) => f.includes(current) ? f.filter((x) => x !== current) : [...f, current])} 
                  className={`inline-flex items-center gap-2 text-xs font-semibold ${flags.includes(current) ? 'text-amber-600' : 'text-slate-500'}`}
                >
                  <Flag size={16} />
                  {flags.includes(current) ? 'Flagged' : 'Flag for review'}
                </button>
              </div>

              <h2 className="mt-6 text-xl font-bold leading-relaxed">
                {quiz.questions[current].prompt}
              </h2>

              <div className="mt-7 space-y-3">
                {quiz.questions[current].options.map((opt, i) => (
                  <button 
                    key={i} 
                    onClick={() => setAnswers((a) => ({ ...a, [current]: i }))} 
                    className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${answers[current] === i ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 hover:border-blue-300'}`}
                  >
                    <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${answers[current] === i ? 'border-[5px] border-blue-600' : 'border-slate-300'}`} />
                    {opt}
                  </button>
                ))}
              </div>

              <div className="mt-8 flex justify-between gap-3 border-t border-slate-100 pt-5">
                <button disabled={current === 0} onClick={() => setCurrent((i) => i - 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-40">
                  Previous
                </button>
                <button disabled={current === quiz.questions.length - 1} onClick={() => setCurrent((i) => i + 1)} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">
                  Next <ArrowRight className="ml-1 inline" size={15} />
                </button>
              </div>
            </section>

            <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold">Question navigator</h3>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {quiz.questions.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setCurrent(i)} 
                    className={`relative aspect-square rounded-full border text-xs font-bold ${current === i ? 'border-blue-600 bg-blue-600 text-white' : answers[i] !== undefined ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}
                  >
                    {i + 1}
                    {flags.includes(i) && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500" />}
                  </button>
                ))}
              </div>
              <p className="mt-5 text-xs leading-5 text-slate-500">
                Blue: current · Green: answered · Orange dot: flagged
              </p>
              <button onClick={submit} className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">
                Submit quiz
              </button>
            </aside>
          </div>
        </>
      ) : (
        <div className="mx-auto mt-7 max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10">
          <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
          <h1 className="mt-4 text-3xl font-extrabold">Quiz submitted!</h1>
          <p className="mt-2 text-sm text-slate-500">{quiz.title} · Demo result</p>
          
          <div className="mt-7 rounded-2xl bg-slate-50 p-7">
            <p className="text-5xl font-extrabold text-blue-600">{pct}%</p>
            <p className="mt-2 font-semibold">{score} / {quiz.questions.length} correct</p>
            <p className="mt-2 text-sm text-slate-500">
              {pct >= 70 ? 'Great work! Keep learning.' : 'Review the explanations and try again when ready.'}
            </p>
          </div>

          <button onClick={() => setReview((x) => !x)} className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white">
            {review ? 'Hide answer review' : 'Review answers'}
          </button>

          {review && (
            <div className="mt-5 space-y-3 text-left">
              {quiz.questions.map((q, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-bold">{i + 1}. {q.prompt}</p>
                  <p className={`mt-2 text-sm ${answers[i] === q.correct ? 'text-emerald-700' : 'text-rose-600'}`}>
                    Your answer: {answers[i] === undefined ? 'Not answered' : q.options[answers[i]]}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">Correct: {q.options[q.correct]}</p>
                  <p className="mt-2 text-xs text-slate-500">{q.explanation}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button onClick={start} className="rounded-xl border border-blue-200 py-3 font-semibold text-blue-600">
              Try again
            </button>
            <button onClick={() => router.push('/student/flashcards')} className="rounded-xl border border-slate-200 py-3 font-semibold">
              Review flashcards
            </button>
          </div>
        </div>
      )}
    </div>
  );
}