import { ArrowDown, BadgeCheck, MapPin, Sparkles } from "lucide-react";
import LearningIllustration from "./LearningIllustration";
import PortalActions from "./PortalActions";

export default function HeroSection() {
  return (
    <section className="overflow-hidden bg-[#f6f8fc] bg-[radial-gradient(ellipse_at_80%_10%,#edf2ff_0,transparent_65%)]" aria-labelledby="hero-title">
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1200px] sm:w-[calc(100%-2.5rem)] lg:w-[calc(100%-4rem)] grid items-center gap-10 pb-9 pt-8 sm:pb-9 sm:pt-11 lg:grid-cols-[1.15fr_1fr] lg:gap-6 lg:pb-14 lg:pt-[70px] xl:gap-[42px]">
        <div className="max-w-[620px] max-sm:[&>div:last-of-type]:flex-col max-sm:[&>div:last-of-type]:items-stretch max-sm:[&>div:last-of-type>a]:w-full max-sm:[&>div:last-of-type>a]:text-[15px]!">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[10px] font-semibold text-[#315597] sm:text-xs max-[350px]:text-[9px]"><MapPin size={15} aria-hidden="true" />Santa Cruz, Laguna · Para sa ating komunidad</p>
          <h1 id="hero-title" className="mt-5 text-[clamp(29px,8.4vw,38px)] font-extrabold leading-[1.18] tracking-[-0.047em] sm:mt-6 sm:text-[clamp(36px,6vw,47px)] lg:text-[clamp(34px,4.2vw,54px)]">Mga taga-Santa Cruz,<br />hindi huli ang lahat<br />para magtapos.<br /><span className="text-[#2f6df6]">Mag-aral sa ALS!</span></h1>
          <p className="mt-5 max-w-[520px] text-base leading-[1.85] text-slate-600 lg:mt-[23px]">May trabaho? May pamilya? May pagkakataon ka pa ring magpatuloy. Flexible na pag-aaral para sa out-of-school youth at adults sa Brgy. Bubukal at mga kalapit na barangay.</p>
          <div className="mb-5 mt-6 flex w-fit items-center gap-2.5 rounded-xl border border-[#eed694] bg-[#fff2cf] px-3.5 py-2.5 text-[#704213] [&_span]:text-[10px] [&_span]:font-semibold [&_span]:tracking-wide sm:[&_span]:text-xs [&_strong]:ml-2 [&_strong]:text-xs [&_strong]:text-[#55320e] sm:[&_strong]:ml-3 sm:[&_strong]:text-sm max-[350px]:[&_strong]:ml-0 max-[350px]:[&_strong]:block"><BadgeCheck size={22} aria-hidden="true" /><span>100% FREE BY LAW <strong>WALANG BAYAD</strong></span></div>
          <PortalActions />
          <p className="mt-3 text-[11px] text-slate-500 sm:text-xs">Register Now · Portal login para sa estudyante at guro</p>
        </div>
        <div className="relative mx-auto w-full max-w-[520px] pt-[22px] [&>svg]:block [&>svg]:h-auto [&>svg]:w-full">
          <div className="absolute left-[5%] top-0 inline-flex -rotate-3 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-lg shadow-slate-900/5 sm:left-[9%] sm:px-4 sm:py-2.5 sm:text-[13px] [&_svg]:text-amber-600"><Sparkles size={18} aria-hidden="true" />Bagong simula. Bagong pag-asa.</div>
          <LearningIllustration />
          <div className="relative mx-auto -mt-[9px] flex w-[95%] items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-[13px] shadow-xl shadow-slate-900/5 sm:w-[88%] sm:gap-3 sm:px-5 sm:py-[17px] [&_strong]:block [&_strong]:text-[13px] sm:[&_strong]:text-[15px] [&>div>span]:mt-1 [&>div>span]:block [&>div>span]:text-[10px] [&>div>span]:text-slate-600 sm:[&>div>span]:text-xs"><span className="flex rounded-xl bg-blue-50 p-[9px] text-blue-600 sm:p-[11px]"><BadgeCheck size={24} aria-hidden="true" /></span><div><strong>Kasama mo sa bawat hakbang.</strong><span>May guro. May komunidad. May pagkakataon.</span></div></div>
        </div>
      </div>
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1200px] sm:w-[calc(100%-2.5rem)] lg:w-[calc(100%-4rem)] flex flex-col items-start justify-between gap-0 border-t border-slate-200 py-3.5 text-xs text-slate-600 sm:flex-row sm:items-center sm:gap-5 sm:py-5 lg:text-[13px] [&_a]:flex [&_a]:min-h-11 [&_a]:items-center [&_a]:gap-2 [&_a]:font-semibold! [&_a]:text-[#17265b]"><p>Ang susunod mong kabanata, dito nagsisimula.</p><a href="#about">Kilalanin ang ALS<ArrowDown size={16} aria-hidden="true" /></a></div>
    </section>
  );
}
