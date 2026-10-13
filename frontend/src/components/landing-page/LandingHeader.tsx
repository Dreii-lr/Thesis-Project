"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { landingNavigation } from "@/src/data/landing-page";

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1200px] sm:w-[calc(100%-2.5rem)] lg:w-[calc(100%-4rem)] flex min-h-[74px] items-center justify-between gap-6 sm:min-h-[78px] xl:min-h-[90px]">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 text-[17px]! font-extrabold! leading-snug text-[#17265b] sm:gap-3 sm:text-[19px]! [&_img]:size-11 [&_img]:object-contain sm:[&_img]:size-[52px] [&_small]:mt-1 [&_small]:block [&_small]:text-[10px]! [&_small]:font-medium! [&_small]:text-slate-600 sm:[&_small]:text-xs!" aria-label="ALS Santa Cruz — home"><Image src="/logo.png" alt="" width={52} height={52} priority /><span>ALS Santa Cruz<small>Enrollment & Learner Portal</small></span></Link>
        <button ref={menuButtonRef} className="flex size-[46px] cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-[#17265b] xl:hidden" type="button" aria-label={menuOpen ? "Isara ang menu" : "Buksan ang menu"} aria-expanded={menuOpen} aria-controls="landing-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
        <nav id="landing-navigation" aria-label="Pangunahing navigation" className={`absolute inset-x-0 top-full flex-col items-stretch gap-1.5 border-b border-slate-200 bg-white px-4 pb-6 pt-4 shadow-lg shadow-slate-900/5 sm:px-8 xl:static xl:flex xl:flex-row xl:items-center xl:gap-[22px] xl:border-0 xl:p-0 xl:shadow-none [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center [&>a]:gap-2 [&>a]:px-3 [&>a]:py-2 [&>a]:text-base! [&>a]:font-semibold! [&>a]:text-slate-600 [&>a]:hover:text-blue-600 xl:[&>a]:p-0 xl:[&>a]:text-[13px]! ${menuOpen ? "flex" : "hidden"}`} onKeyDown={(event) => { if (event.key === "Escape") { setMenuOpen(false); menuButtonRef.current?.focus(); } }}>
          {landingNavigation.map((item) => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>)}
          <Link href="/login" className="rounded-xl bg-blue-50 !px-4 !py-2.5 !text-blue-700" onClick={() => setMenuOpen(false)}>Portal Login<ArrowUpRight size={17} aria-hidden="true" /></Link>
        </nav>
      </div>
    </header>
  );
}

