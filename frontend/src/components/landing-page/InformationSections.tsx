import { ArrowRight, CheckCircle2, FileText, HeartHandshake, ShieldCheck } from "lucide-react";
import { enrollmentDocuments, landingBenefits, landingFeatures, landingPrograms } from "@/src/data/landing-page";
import SectionHeading from "./SectionHeading";

export function AboutSystemSection() {
  return (
    <section id="about" aria-labelledby="about-title" className="py-[60px] lg:py-[84px] border-y border-slate-100 bg-white">
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1200px] sm:w-[calc(100%-2.5rem)] lg:w-[calc(100%-4rem)]">
        <div className="grid gap-7 lg:grid-cols-[0.9fr_1.2fr] lg:gap-11 xl:gap-[90px] [&>div:first-child]:mb-0">
          <SectionHeading id="about-title" eyebrow="01 / Kilalanin ang ALS" title="Isang pagkakataong magpatuloy. Isang sistemang kasama mo." />
          <div className="[&_h3]:mb-4 [&_h3]:text-xl [&_h3]:font-bold [&_p]:mb-4 [&_p]:text-base [&_p]:text-slate-600"><h3>Ano ang sistemang ito?</h3><p>Ang ALS Santa Cruz Enrollment & Learner Portal ay ang online na gabay papunta sa iyong ALS learning journey. Dito mo malalaman ang proseso ng enrollment at maa-access ang portal gamit ang account na ibinigay ng guro o administrator.</p><p>Pinagsasama ng sistema ang learning resources, mga gawain, attendance, at learner records. May sariling workspace ang mga estudyante, guro, at administrator para mas madaling maayos ang pag-aaral.</p><p className="border-l-[3px] border-[#e5bd54] py-1.5 pl-[18px] [&_strong]:text-[#17265b]"><strong>Ano ang ALS?</strong> Ang Alternative Learning System ay libreng programa ng DepEd para sa out-of-school youth at adults na gustong magpatuloy sa elementary at high school education.</p></div>
        </div>
        <div className="mt-[25px] grid gap-3 lg:mt-[35px] lg:grid-cols-3 lg:gap-5">{landingBenefits.map(({ icon: Icon, title, description }) => <article className="flex items-center gap-4 rounded-xl border border-slate-100 bg-[#f6f8fc] p-5 xl:p-[22px] [&>span]:bg-white [&_h3]:text-base [&_h3]:font-bold [&_p]:mt-1.5 [&_p]:text-sm [&_p]:text-slate-600 lg:[&_p]:text-[13px]" key={title}><span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon size={24} aria-hidden="true" /></span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div>
      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" aria-labelledby="features-title" className="py-[60px] lg:py-[84px]">
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1200px] sm:w-[calc(100%-2.5rem)] lg:w-[calc(100%-4rem)]"><SectionHeading id="features-title" eyebrow="02 / Ang iyong learner portal" title="Mas madaling magsimula. Mas madaling magpatuloy." description="Mula sa unang tanong hanggang sa araw-araw na pag-aaral, may gabay para sa iyo." />
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-[18px] max-[350px]:grid-cols-1">{landingFeatures.map(({ icon: Icon, title, description }) => <article className="rounded-2xl border border-slate-200 bg-white px-[15px] py-[18px] sm:p-[25px] lg:[&:nth-last-child(-n+2)]:col-span-2 [&_h3]:mb-3 [&_h3]:mt-[19px] [&_h3]:text-base [&_h3]:font-bold [&_h3]:leading-snug sm:[&_h3]:text-[17px] [&_p]:text-base [&_p]:text-slate-600" key={title}><span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon size={23} aria-hidden="true" /></span><h3>{title}</h3><p>{description}</p></article>)}</div>
      </div>
    </section>
  );
}

export function ProgramPathsSection() {
  return (
    <section id="programs" aria-labelledby="programs-title" className="py-[60px] lg:py-[84px] border-y border-slate-100 bg-white">
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1200px] sm:w-[calc(100%-2.5rem)] lg:w-[calc(100%-4rem)]"><SectionHeading id="programs-title" eyebrow="03 / Piliin ang iyong landas" title="Saan ka man magsimula, may susunod na hakbang." description="May programang angkop sa iyong dating pag-aaral at kakayahan. Tutulungan ka ng guro na piliin ito." />
        <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-[22px]">{landingPrograms.map(({ icon: Icon, short, title, audience, detail }, index) => <li className="relative rounded-2xl border border-slate-200 bg-white p-6 lg:px-[23px] lg:py-[26px] [&_h3]:mb-[13px] [&_h3]:mt-2 [&_h3]:text-[21px] [&_h3]:font-bold [&_h3]:leading-snug [&>p:nth-of-type(2)]:text-base [&>p:nth-of-type(2)]:text-slate-600" key={short}><div className="mb-[17px] flex items-center justify-between sm:mb-[27px]"><span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon size={24} aria-hidden="true" /></span><span className="text-[26px] font-medium text-slate-500 lg:text-slate-400">0{index + 1}</span></div><p className="text-[10px] font-bold tracking-widest text-slate-600">{short}</p><h3>{title}</h3><p>{audience}</p><details className="mt-[19px] border-t border-slate-100 pt-2.5 [&_summary]:flex [&_summary]:min-h-11 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:items-center [&_summary]:justify-between [&_summary]:gap-2.5 [&_summary]:text-sm [&_summary]:font-semibold [&_summary]:text-blue-700 [&_summary::-webkit-details-marker]:hidden [&[open]_summary_svg]:rotate-90 [&_p]:pt-[9px] [&_p]:text-base [&_p]:text-slate-600"><summary>Alamin pa<span className="sr-only"> tungkol sa {title}</span><ArrowRight size={16} aria-hidden="true" /></summary><p>{detail}</p></details>{index < landingPrograms.length - 1 && <ArrowRight className="absolute -right-[21px] top-[41px] z-10 hidden bg-white text-slate-400 lg:block" size={19} aria-hidden="true" />}</li>)}</ol>
        <p className="pt-[22px] text-sm text-slate-600">Hindi kailangang dumaan sa lahat ng antas. Ang eligibility at lokal na availability ay kukumpirmahin ng iyong ALS teacher.</p>
      </div>
    </section>
  );
}

export function EnrollmentGuideSection() {
  return (
    <section id="enrollment" aria-labelledby="enrollment-title" className="py-[60px] lg:py-[84px] bg-[#edf2fb]">
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1200px] sm:w-[calc(100%-2.5rem)] lg:w-[calc(100%-4rem)]"><SectionHeading id="enrollment-title" eyebrow="04 / Gabay sa pag-enroll" title="Tatlong hakbang para sa bagong simula." description="Hindi mo kailangang gawin ito mag-isa. Narito ang simpleng gabay para makapaghanda." />
        <div className="grid items-start gap-7 lg:grid-cols-[1.2fr_0.85fr] lg:gap-11 xl:gap-[90px]"><ol className="m-0 list-none p-0 [&>li]:relative [&>li]:flex [&>li]:gap-[15px] sm:[&>li]:gap-[22px] [&>li]:pb-[29px] lg:[&>li]:pb-[34px] [&>li:last-child]:pb-0 [&>li:not(:last-child)]:after:absolute [&>li:not(:last-child)]:after:bottom-[9px] [&>li:not(:last-child)]:after:left-[23px] [&>li:not(:last-child)]:after:top-[50px] [&>li:not(:last-child)]:after:w-px [&>li:not(:last-child)]:after:bg-blue-200 [&>li:not(:last-child)]:after:content-[''] [&_h3]:mb-2.5 [&_h3]:mt-1.5 [&_h3]:text-lg [&_h3]:font-bold sm:[&_h3]:text-xl [&_p]:text-base [&_p]:text-slate-600 [&_a]:mt-[23px]">
          <li><span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white text-lg font-bold text-blue-700">1</span><div><h3>Alamin ang angkop na programa</h3><p>Walang upper age limit para sa adult learners. Ibahagi sa guro ang iyong edad at dating pag-aaral. Maaari ring kumpirmahin ng guro o barangay ang iyong tirahan.</p></div></li>
          <li><span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white text-lg font-bold text-blue-700">2</span><div><h3>Ihanda ang iyong requirements</h3><p>Gamitin ang checklist sa tabi. Kung may kulang na dokumento, magtanong muna sa guro para malaman ang maaaring gawin.</p></div></li>
          <li><span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white text-lg font-bold text-blue-700">3</span><div><h3>Isumite sa iyong mobile teacher</h3><p>Dalhin ang requirements sa guro o learning center. Para sa digital copies, itanong sa guro ang opisyal na paraan ng pagpapasa.</p><a className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-transparent bg-[#2f6df6] px-5 py-[13px] text-sm! font-semibold! text-white shadow-lg shadow-blue-100 transition-colors hover:bg-[#245cda] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none" href="#directory">Mag-enroll Ngayon<ArrowRight size={18} aria-hidden="true" /></a></div></li>
        </ol><aside className="max-w-[600px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-[30px] [&_h3]:mt-[17px] [&_h3]:text-[23px] [&_h3]:font-bold [&>p]:mt-1.5 [&>p]:text-base [&>p]:text-slate-600 [&_ul]:my-[22px] [&_ul]:list-none [&_ul]:p-0 [&_li]:flex [&_li]:gap-3 [&_li]:border-b [&_li]:border-slate-100 [&_li]:py-[13px] [&_li]:text-base [&_li_svg]:mt-1.5 [&_li_svg]:shrink-0 [&_li_svg]:text-green-700" aria-labelledby="documents-title"><span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><FileText size={25} aria-hidden="true" /></span><h3 id="documents-title">Ang iyong checklist</h3><p>Ihanda ang mga sumusunod:</p><ul>{enrollmentDocuments.map((document) => <li key={document}><CheckCircle2 size={20} aria-hidden="true" /><span>{document}</span></li>)}</ul><div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-amber-900 [&_svg]:mt-1 [&_svg]:shrink-0 [&_p]:text-sm"><HeartHandshake size={22} aria-hidden="true" /><p>May kulang? Okay lang magtanong. Kumpirmahin sa guro ang kumpletong requirements para sa iyo.</p></div></aside></div>
        <div className="mt-9 flex items-start gap-2.5 border-t border-slate-200 pt-[23px] text-sm text-slate-600 [&_svg]:mt-1 [&_svg]:shrink-0"><ShieldCheck size={19} aria-hidden="true" /><p>Ang page na ito ay gabay sa enrollment. Wala pang direktang application form o document upload dito; ang iyong guro ang tutulong sa pagpapasa.</p></div>
      </div>
    </section>
  );
}

