import Link from 'next/link';
import { ArrowRight, ClipboardList, Clock3, BookOpen, Layers3 } from 'lucide-react';
import { demoQuizzes } from '@/src/data/studentAssessmentDemo';

export default function ActivitiesPage() {
  return <div className="mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-6 lg:px-8">
    <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-7 text-white shadow-sm">
      <p className="text-sm font-semibold text-blue-100">STUDENT ACTIVITIES</p>
      <h1 className="mt-2 text-3xl font-extrabold">Teacher-generated activities</h1>
      <p className="mt-2 max-w-2xl text-sm text-blue-100">Take assigned quizzes and review learning materials shared by your teachers.</p>
    </div>
    <div className="mt-7 flex items-center justify-between"><div><h2 className="text-xl font-bold">Available quizzes</h2><p className="mt-1 text-sm text-slate-500">Select a quiz to read the instructions before you begin.</p></div><Link href="/student/flashcards" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600"><Layers3 size={16}/> Flashcards</Link></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{demoQuizzes.map(q=><article key={q.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><BookOpen size={22}/></span><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">QUIZ</span></div><p className="mt-4 text-xs font-bold uppercase tracking-wider text-blue-600">{q.subject}</p><h3 className="mt-1 text-lg font-bold">{q.title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{q.description}</p><div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500"><span className="flex items-center gap-1"><ClipboardList size={14}/>{q.questions.length} questions</span><span className="flex items-center gap-1"><Clock3 size={14}/>{q.minutes} min</span><span>{q.attempts} attempts</span></div><Link href={`/student/activities/quiz/${q.id}`} className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">View quiz <ArrowRight size={16}/></Link></article>)}</div>
  </div>;
}
