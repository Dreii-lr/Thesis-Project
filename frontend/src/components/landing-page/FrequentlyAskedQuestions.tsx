"use client";

import { useState } from "react";
import { ArrowUpRight, Minus, Plus } from "lucide-react";
import { landingFaqs } from "@/src/data/landing-page";
import SectionHeading from "./SectionHeading";

export default function FrequentlyAskedQuestions() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <section id="faq" aria-labelledby="faq-title" className="py-[60px] lg:py-[84px]">
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1200px] sm:w-[calc(100%-2.5rem)] lg:w-[calc(100%-4rem)] grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:gap-11 xl:gap-[85px] [&>div:first-child>div]:mb-5 lg:[&>div:first-child>div]:mb-9"><div><SectionHeading id="faq-title" eyebrow="06 / Nandito ang mga sagot" title="May tanong ka? Normal lang iyan." description="Narito ang mga karaniwang tanong bago magsimula. Maaari ka ring magtanong sa iyong ALS teacher." /><a href="https://www.deped.gov.ph/als-frequently-asked-questions/" className="inline-flex min-h-11 items-center gap-2 text-sm! font-semibold! text-blue-700 hover:underline" target="_blank" rel="noopener noreferrer">Karagdagang gabay mula sa DepEd<ArrowUpRight size={17} aria-hidden="true" /><span className="sr-only"> (bubukas sa bagong tab)</span></a></div><div className="border-t border-slate-300">{landingFaqs.map((item, index) => <article key={item.question} className="border-b border-slate-300 [&_h3]:text-base [&_h3]:font-semibold sm:[&_h3]:text-[17px] [&_button]:flex [&_button]:w-full [&_button]:cursor-pointer [&_button]:items-center [&_button]:justify-between [&_button]:gap-[18px] [&_button]:border-0 [&_button]:bg-transparent [&_button]:py-[23px] [&_button]:text-left [&_button]:font-semibold! [&_button]:text-[#17265b] [&_button]:hover:text-blue-700 [&_button_svg]:shrink-0 [&_button_svg]:text-blue-600 [&_p]:pb-6 [&_p]:text-base [&_p]:leading-[1.85] [&_p]:text-slate-600"><h3><button type="button" id={`faq-question-${index}`} aria-expanded={openIndex === index} aria-controls={`faq-answer-${index}`} onClick={() => setOpenIndex(openIndex === index ? null : index)}>{item.question}{openIndex === index ? <Minus size={20} aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}</button></h3><div id={`faq-answer-${index}`} aria-labelledby={`faq-question-${index}`} hidden={openIndex !== index}><p>{item.answer}</p></div></article>)}</div></div>
    </section>
  );
}
