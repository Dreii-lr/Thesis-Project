'use client';

import { useState } from 'react';
import { CATEGORY_LABELS } from '@/src/data/mockAssessment';
import {
  formatTime,
  programs,
  studentName,
  subjectName,
  type Submission,
} from '@/src/data/mockTeacher';
import { useTeacher } from '@/src/context/TeacherContext';

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500';
const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40';

export default function SubmissionsPage() {
  const { tasks, submissions, setSubmissions } = useTeacher();
  const [search, setSearch] = useState('');
  const [program, setProgram] = useState('all');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<Submission | null>(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [message, setMessage] = useState('');
  const selectedTask = tasks.find((t) => t.id === selected?.assessment_id);
  const rows = submissions.flatMap((s) => {
    const task = tasks.find((t) => t.id === s.assessment_id);
    return task ? [{ submission: s, task }] : [];
  });
  const filtered = rows.filter(
    ({ submission: s, task: t }) =>
      (program === 'all' || t.target_category === program) &&
      (type === 'all' || t.assessment_type === type) &&
      (status === 'all' || s.status === status) &&
      `${studentName(s.student_id)} ${t.title} ${s.student_id}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const review = (s: Submission) => {
    setSelected(s);
    setScore(String(s.final_score));
    setFeedback(s.feedback);
    setMessage('');
  };
  const save = () => {
    if (!selected || !selectedTask) return;
    const value = Number(score);
    if (
      score.trim() === '' ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > selectedTask.max_score
    ) {
      setMessage(`Enter a score from 0 to ${selectedTask.max_score}.`);
      return;
    }
    // Manual grading is a final-score override, like the backend grading service.
    if (
      !setSubmissions(
        submissions.map((s) =>
          s.submission_id === selected.submission_id
            ? {
                ...s,
                status: 'GRADED',
                manual_score: value,
                final_score: value,
                feedback,
              }
            : s,
        ),
      )
    )
      return;
    setSelected(null);
    setMessage('Grade and feedback saved.');
  };
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {'Student submissions'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {
              'Review submitted activities, quizzes, and exams. Each submission is linked to its learner and assessment.'
            }
          </p>
        </div>
      </div>
      {message && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-800"
        >
          {message}
        </p>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          ['Total submitted', rows.length],
          [
            'Needs review',
            rows.filter((r) => r.submission.status === 'SUBMITTED').length,
          ],
          [
            'Graded',
            rows.filter((r) => r.submission.status === 'GRADED').length,
          ],
        ].map(([label, value]) => (
          <section
            key={label}
            className={
              'rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6'
            }
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-extrabold">{value}</p>
          </section>
        ))}
      </div>
      {selected && selectedTask ? (
        <section
          className={
            'rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6'
          }
        >
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <span className="inline-block rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                {selectedTask.assessment_type}
              </span>
              <h2 className="mt-3 text-xl font-bold">
                {studentName(selected.student_id)}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedTask.title} · {formatTime(selected.submitted_at)}
              </p>
            </div>
            <button
              onClick={() => {
                setSelected(null);
                setMessage('');
              }}
              className="text-sm font-semibold text-blue-600"
            >
              ← Back to submissions
            </button>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <h3 className="mb-3 font-bold">Submitted work</h3>
              {Object.entries(selected.answers_payload).map(([key, value]) => {
                const question = selectedTask.categories_data
                  .flatMap((c) => c.questions)
                  .find((q) => q.id === key);
                return (
                  <div key={key} className="mb-3 rounded-xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold">
                      {question?.text ||
                        question?.premise ||
                        'Written response'}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {value}
                    </p>
                  </div>
                );
              })}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
              className="space-y-4"
            >
              <label className="block text-sm font-semibold">
                Final score (out of {selectedTask.max_score})
                <input
                  required
                  type="number"
                  min="0"
                  max={selectedTask.max_score}
                  step="0.5"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className={`mt-2 ${fieldClass}`}
                />
              </label>
              <label className="block text-sm font-semibold">
                Feedback
                <textarea
                  rows={5}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Help your learner understand their next steps…"
                  className={`mt-2 ${fieldClass}`}
                />
              </label>
              <button className={buttonClass} type="submit">
                Save grade & feedback
              </button>
            </form>
          </div>
        </section>
      ) : (
        <section
          className={
            'rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6'
          }
        >
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <input
              aria-label="Search submissions"
              placeholder="Search learner or assessment…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={fieldClass}
            />
            <select
              aria-label="Program"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className={fieldClass}
            >
              <option value="all">All programs</option>
              {programs.map((p) => (
                <option key={p} value={p}>
                  {CATEGORY_LABELS[p]}
                </option>
              ))}
            </select>
            <select
              aria-label="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={fieldClass}
            >
              <option value="all">All types</option>
              {['ACTIVITY', 'QUIZ', 'EXAM'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select
              aria-label="Review status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={fieldClass}
            >
              <option value="all">All statuses</option>
              <option value="SUBMITTED">Needs review</option>
              <option value="GRADED">Graded</option>
            </select>
          </div>
          <div className="space-y-3">
            {filtered.map(({ submission: s, task: t }) => (
              <button
                key={s.submission_id}
                onClick={() => review(s)}
                className="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-5 text-left hover:border-blue-300 hover:bg-blue-50/30"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-600">
                    {studentName(s.student_id)
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                  <div>
                    <p className="font-bold">{studentName(s.student_id)}</p>
                    <p className="mt-1 text-sm text-slate-700">{t.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {CATEGORY_LABELS[t.target_category]} ·{' '}
                      {subjectName(t.subject_code)} ·{' '}
                      {formatTime(s.submitted_at)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-block rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                    {t.assessment_type}
                  </span>
                  <span className="text-xs text-slate-500">
                    {s.status === 'GRADED'
                      ? `${s.final_score}/${t.max_score} · Graded`
                      : 'Needs review'}
                  </span>
                  <span className="text-sm font-semibold text-blue-600">
                    Review →
                  </span>
                </div>
              </button>
            ))}
            {!filtered.length && (
              <p className="py-10 text-center text-sm text-slate-500">
                No submissions match these filters.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
