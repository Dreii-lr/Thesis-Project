import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Welcome | Alternative Learning System",
  description: "Learn about ALS and access your learning portal for students and teachers.",
};

const features = [
  { icon: BookOpen, title: "Keep learning", description: "Find your learning modules and assigned activities in one place." },
  { icon: GraduationCap, title: "Follow your progress", description: "Review your results and keep track of your learning journey." },
  { icon: Users, title: "Learn with support", description: "Stay connected to your class while teachers organize lessons and monitor learning." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4">Skip to content</a>
      <header className="border-b border-slate-200 bg-white">
        <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <Link href="/landing-page" aria-label="ALS home" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Alternative Learning System logo" width={72} height={72} priority className="h-14 w-14 object-contain" />
            <span className="text-sm font-bold leading-5 text-[#17265b]">ALS Learning Portal<span className="block text-xs font-normal text-slate-500">Alternative Learning System</span></span>
          </Link>
          <div className="flex items-center gap-5 text-sm font-semibold sm:gap-8">
            <a href="#about" className="text-slate-600 hover:text-blue-600">About ALS</a>
            <Link href="/login" className="rounded-xl bg-[#2f6df6] px-5 py-3 text-white transition hover:bg-[#245de0]">Sign in</Link>
          </div>
        </nav>
      </header>

      <main id="main-content">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-14 sm:py-20 lg:grid-cols-2 lg:px-10 lg:py-24">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">A new step forward</p>
            <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-[#17265b] sm:text-5xl lg:text-6xl">Your learning journey continues here.</h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">Every learner deserves the opportunity to grow. Discover the Alternative Learning System and take your next step toward a brighter tomorrow.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2f6df6] px-6 py-4 font-semibold text-white shadow-lg shadow-blue-100 transition hover:bg-[#245de0]">Go to learning portal <ArrowRight size={18} aria-hidden="true" /></Link>
              <a href="#about" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-4 font-semibold text-slate-700 hover:bg-slate-50">Learn about ALS</a>
            </div>
            <p className="mt-5 text-sm text-slate-500">One portal for students and teachers.</p>
          </div>
          <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <div className="relative aspect-[4/3]">
              <Image src="/login-learning-scene.png" alt="Books and a laptop arranged in a learning space" fill priority sizes="(max-width: 1023px) 100vw, 50vw" className="object-cover" />
            </div>
            <div className="flex items-center gap-4 p-6">
              <span className="rounded-2xl bg-blue-50 p-3 text-blue-600"><BookOpen size={24} aria-hidden="true" /></span>
              <div><p className="font-bold text-[#17265b]">Learning opens new possibilities.</p><p className="mt-1 text-sm text-slate-500">Build knowledge. Develop skills. Move forward.</p></div>
            </div>
          </div>
        </section>

        <section id="about" aria-labelledby="about-title" className="scroll-mt-8 border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1fr_1.4fr] lg:px-10">
            <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">About the program</p><h2 id="about-title" className="mt-4 text-3xl font-extrabold tracking-tight text-[#17265b]">What is ALS?</h2></div>
            <div className="space-y-4 text-base leading-8 text-slate-600">
              <p>The Alternative Learning System (ALS) is a parallel learning system in the Philippines. It provides out-of-school youth and adults with opportunities to develop literacy and life skills and pursue pathways to complete basic education.</p>
              <p>Through flexible, community-based learning and support from ALS educators, learners can continue their education alongside their everyday responsibilities.</p>
              <a href="https://sites.google.com/deped.gov.ph/official-als-online-portal-2-0/home" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold text-blue-600 hover:underline">Explore DepEd ALS information <ArrowRight size={16} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
            </div>
          </div>
        </section>

        <section aria-labelledby="portal-title" className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <h2 id="portal-title" className="text-3xl font-extrabold tracking-tight text-[#17265b]">A space to learn and grow</h2>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">Your learning portal brings everyday classroom resources and activities together.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-7">
                <Icon size={26} className="text-blue-600" aria-hidden="true" />
                <h3 className="mt-5 text-lg font-bold text-[#17265b]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-[28px] bg-[#17265b] p-8 text-white sm:flex-row sm:items-center sm:p-10">
            <div><h2 className="text-2xl font-bold">Ready to continue learning?</h2><p className="mt-3 max-w-xl text-sm leading-7 text-blue-100">Sign in with your assigned account. Need access? Contact your ALS teacher or administrator for help.</p></div>
            <Link href="/login" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-[#17265b] hover:bg-blue-50">Sign in <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 px-6 py-7 text-center text-sm text-slate-500">Alternative Learning System · Empowering lifelong learning</footer>
    </div>
  );
}
