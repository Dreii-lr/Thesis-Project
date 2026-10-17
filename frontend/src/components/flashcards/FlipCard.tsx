'use client';

import { BookOpen, RotateCw, Sparkles } from 'lucide-react';
import type { StudyCard } from '@/src/data/mockStudentFlashcards';

const faceClasses = 'absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-3xl border px-8 py-12 shadow-[0_8px_28px_-16px_rgb(15_23_42_/_20%)] backface-hidden max-sm:px-5 max-sm:py-11';
const contentClasses = 'flex max-h-full w-full flex-col items-center overflow-y-auto overscroll-contain';

export default function FlipCard({ card, flipped, onFlip, preview = false }: {
  card: StudyCard;
  flipped: boolean;
  onFlip: () => void;
  preview?: boolean;
}) {
  const term = card.term || 'Your term goes here';
  const definition = card.definition || 'Add a definition to see it on the back of your card.';
  return <div className="translate-y-0 opacity-100 perspective-[1400px] transition-[opacity,translate] duration-[240ms] ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none">
    <button type="button" className="group relative block h-[clamp(300px,36vh,370px)] w-full cursor-pointer rounded-3xl bg-transparent text-center [-webkit-tap-highlight-color:transparent] focus-visible:outline-[3px] focus-visible:outline-offset-[5px] focus-visible:outline-blue-400 max-sm:h-[330px]" data-flipped={flipped} aria-label={`${preview ? 'Preview ' : ''}${flipped ? `Definition: ${definition} ${card.example ? `Example: ${card.example}` : ''}` : `Term: ${term}.`} Flip card`} aria-pressed={flipped} onClick={onFlip}>
      <span className="absolute inset-0 transform-3d transition-transform duration-[580ms] ease-[cubic-bezier(0.22,0.7,0.2,1)] group-data-[flipped=true]:rotate-y-180 motion-reduce:transition-none">
        <span className={`${faceClasses} border-slate-200 bg-white`} aria-hidden={flipped}>
          <span className="absolute left-5 top-5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Term</span>
          <span className={contentClasses}>
            <span className="mb-5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-500"><BookOpen size={20} strokeWidth={1.5} /></span>
            <span className="max-w-[95%] shrink-0 text-[clamp(1.7rem,3vw,2.5rem)] leading-[1.3] font-[650] tracking-[-0.035em] wrap-anywhere text-slate-900">{term}</span>
          </span>
          <span className="absolute bottom-5 left-0 right-0 inline-flex items-center justify-center gap-1.5 text-[11px] text-slate-400"><RotateCw size={12} /> Click anywhere to reveal</span>
        </span>
        <span className={`${faceClasses} rotate-y-180 border-blue-200 bg-[linear-gradient(145deg,#eff6ff,#f8faff_65%,#eef2ff)]`} aria-hidden={!flipped}>
          <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-500"><Sparkles size={11} /> Definition</span>
          <span className={contentClasses}>
            <span className="max-w-[34rem] shrink-0 text-[clamp(1.05rem,1.7vw,1.4rem)] leading-[1.65] font-[550] wrap-anywhere text-slate-800 max-sm:text-[1.05rem]">{definition}</span>
            {card.example && <span className="mt-5 max-w-md shrink-0 text-xs leading-6 text-blue-700/80">{card.example}</span>}
          </span>
          <span className="absolute bottom-5 left-0 right-0 inline-flex items-center justify-center gap-1.5 text-[11px] text-blue-400"><RotateCw size={12} /> Click to return to the term</span>
        </span>
      </span>
    </button>
  </div>;
}
