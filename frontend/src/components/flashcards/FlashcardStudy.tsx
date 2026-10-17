'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronLeft,
  ChevronRight, Keyboard, Layers3, List, Maximize2, Minimize2,
  RotateCcw, RotateCw, Shuffle, Star, Trophy,
} from 'lucide-react';
import type { StudyDeck } from '@/src/data/mockStudentFlashcards';
import { shuffleFlashcards, type FlashcardSession, type StudyAction, type StudyScope } from '@/src/lib/flashcard-study';
import FlipCard from './FlipCard';

interface FlashcardStudyProps {
  deck: StudyDeck;
  session: FlashcardSession;
  onAction: (action: StudyAction) => void;
  focused: boolean;
  onToggleFocus: () => void;
}

const iconButton = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-30';

export default function FlashcardStudy({ deck, session, onAction, focused, onToggleFocus }: FlashcardStudyProps) {
  const [view, setView] = useState<'cards' | 'terms'>('cards');
  const card = deck.cards.find(item => item.id === session.order[session.position]);
  const reviewed = session.order.filter(id => session.ratings[id]).length;
  const known = session.order.filter(id => session.ratings[id] === 'known').length;
  const learning = session.order.filter(id => session.ratings[id] === 'learning').length;
  const remaining = session.order.filter(id => session.ratings[id] !== 'known');
  const progress = session.order.length ? reviewed / session.order.length * 100 : 0;

  useEffect(() => {
    if (view !== 'cards' || session.completed || !session.order.length) return;
    const handleKey = (event: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, a, [contenteditable="true"]')) return;
      if (event.code === 'Space' && !target?.closest('button')) {
        event.preventDefault();
        onAction({ type: 'flip' });
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        onAction({ type: 'move', direction: event.key === 'ArrowRight' ? 1 : -1 });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onAction, view, session.completed, session.order.length]);

  const startRound = (scope: StudyScope, ids: string[], reset = false) => {
    onAction({ type: 'round', scope, ids, reset });
    setView('cards');
  };

  return (
    <section className="min-w-0">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-100"><BookOpen size={11} />{deck.subject}</span>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{deck.title}</h2>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">{deck.cards.length} cards <span className="mx-1 text-slate-300">·</span> {deck.author}</p>
        </div>
        <button type="button" className={`${iconButton} border border-slate-200 bg-white`} onClick={onToggleFocus} aria-label={focused ? 'Exit focus view' : 'Focus study area'} title={focused ? 'Exit focus view' : 'Focus study area'}>{focused ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_24px_-18px_rgba(15,23,42,0.18)] sm:p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Study view" className="inline-flex rounded-xl bg-slate-100/80 p-1">
            <button type="button" aria-pressed={view === 'cards'} onClick={() => setView('cards')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${view === 'cards' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><Layers3 size={14} /> Flashcards</button>
            <button type="button" aria-pressed={view === 'terms'} onClick={() => setView('terms')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${view === 'terms' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><List size={14} /> Terms</button>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Study starred cards" title="Study starred cards" disabled={!session.starred.length} onClick={() => startRound('starred', deck.cards.filter(item => session.starred.includes(item.id)).map(item => item.id))} className="mr-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-slate-500 transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-35"><Star size={14} className={session.starred.length ? 'fill-amber-400 text-amber-500' : ''} />{session.starred.length}</button>
            <button type="button" aria-label="Shuffle cards" aria-pressed={session.shuffled} title={session.shuffled ? 'Restore original order' : 'Shuffle cards'} disabled={!session.order.length || view === 'terms'} onClick={() => onAction({ type: 'shuffle', ids: session.shuffled ? deck.cards.filter(item => session.order.includes(item.id)).map(item => item.id) : shuffleFlashcards(session.order), shuffled: !session.shuffled })} className={`${iconButton} ${session.shuffled ? 'bg-blue-50 text-blue-700' : ''}`}><Shuffle size={16} /></button>
            <button type="button" aria-label="Restart study set" title="Restart study set" onClick={() => startRound('all', deck.cards.map(item => item.id), true)} className={iconButton}><RotateCcw size={16} /></button>
          </div>
        </div>

        {view === 'terms' ? (
          <div>
            <div className="mb-4 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-800">Terms in this set</h3><span className="text-xs text-slate-400">{deck.cards.length} terms</span></div>
            <div className="max-h-[540px] divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-100">
              {deck.cards.map((item, index) => <div key={item.id} className="flex items-start gap-3 p-4">
                <span className="mt-0.5 text-[11px] tabular-nums text-slate-300">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{item.term}</p><p className="mt-1.5 text-xs leading-6 text-slate-500">{item.definition}</p></div>
                <button type="button" aria-label={`${session.starred.includes(item.id) ? 'Unstar' : 'Star'} ${item.term}`} aria-pressed={session.starred.includes(item.id)} onClick={() => onAction({ type: 'star', id: item.id })} className={iconButton}><Star size={16} className={session.starred.includes(item.id) ? 'fill-amber-400 text-amber-500' : ''} /></button>
              </div>)}
            </div>
          </div>
        ) : session.completed ? (
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/70 to-white px-5 py-9 text-center sm:px-8">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100"><Trophy size={30} strokeWidth={1.5} /></span>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Round complete</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">A little more confident.</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">You marked {reviewed} of {session.order.length} cards in this round.</p>
            <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-2">
              {[{ label: 'Got it', count: known, color: 'text-emerald-700' }, { label: 'Learning', count: learning, color: 'text-amber-600' }, { label: 'Unmarked', count: session.order.length - reviewed, color: 'text-slate-500' }].map(item => <div key={item.label} className="rounded-xl border border-slate-100 bg-white p-3"><p className={`text-2xl font-bold ${item.color}`}>{item.count}</p><p className="mt-1 text-[10px] text-slate-500">{item.label}</p></div>)}
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {remaining.length > 0 && <button type="button" onClick={() => startRound('review', remaining)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white hover:bg-blue-700">Review {remaining.length} remaining <ArrowRight size={14} /></button>}
              <button type="button" onClick={() => startRound('all', deck.cards.map(item => item.id), true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600"><RotateCcw size={14} /> Study again</button>
            </div>
          </div>
        ) : !card ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-16 text-center"><Star className="mx-auto text-amber-400" size={28} /><h3 className="mt-4 font-semibold text-slate-800">No starred cards in this round</h3><p className="mt-2 text-sm text-slate-500">Star the terms you want to spend more time with.</p><button type="button" onClick={() => startRound('all', deck.cards.map(item => item.id))} className="mt-5 text-sm font-semibold text-blue-600">Study all cards <ArrowRight size={14} className="ml-1 inline" /></button></div>
        ) : (
          <>
            {session.scope !== 'all' && <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"><span>{session.scope === 'starred' ? 'Studying starred cards' : 'Reviewing cards that need practice'}</span><button type="button" onClick={() => startRound('all', deck.cards.map(item => item.id))} className="shrink-0 font-semibold underline">Show all</button></div>}
            <div className="relative">
              <FlipCard key={card.id} card={card} flipped={session.flipped} onFlip={() => onAction({ type: 'flip' })} />
              <button type="button" aria-label={`${session.starred.includes(card.id) ? 'Unstar' : 'Star'} ${card.term}`} aria-pressed={session.starred.includes(card.id)} onClick={() => onAction({ type: 'star', id: card.id })} title="Save for extra practice" className={`${iconButton} absolute right-3 top-3 z-10 bg-white/75`}><Star size={17} className={session.starred.includes(card.id) ? 'fill-amber-400 text-amber-500' : ''} /></button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button type="button" className={`${iconButton} border border-slate-200`} aria-label="Previous card" disabled={session.position === 0} onClick={() => onAction({ type: 'move', direction: -1 })}><ChevronLeft size={19} /></button>
              <div className="flex items-center gap-4"><button type="button" onClick={() => onAction({ type: 'flip' })} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600"><RotateCw size={14} /> Flip</button><span className="h-4 w-px bg-slate-200" /><span aria-live="polite" className="text-xs font-semibold tabular-nums text-slate-700">{session.position + 1} <span className="font-normal text-slate-400">/ {session.order.length}</span></span></div>
              <button type="button" className={`${iconButton} border border-slate-200`} aria-label={session.position === session.order.length - 1 ? 'Finish round' : 'Next card'} onClick={() => onAction({ type: 'move', direction: 1 })}><ChevronRight size={19} /></button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
              <button type="button" onClick={() => onAction({ type: 'rate', rating: 'learning' })} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"><RotateCcw size={14} /> Still learning</button>
              <button type="button" onClick={() => onAction({ type: 'rate', rating: 'known' })} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"><Check size={15} /> Got it</button>
            </div>
          </>
        )}

        {view === 'cards' && <div className="mt-5"><div className="mb-2 flex items-center justify-between text-[11px]"><span className="text-slate-400">Round progress</span><span className="font-medium text-slate-600">{reviewed} of {session.order.length} marked</span></div><div role="progressbar" aria-label="Cards marked this round" aria-valuemin={0} aria-valuemax={session.order.length || 1} aria-valuenow={reviewed} className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div></div>}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-slate-400"><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={12} /> Self-paced practice · no grades</span>{view === 'cards' && !session.completed && <span className="hidden items-center gap-1.5 sm:inline-flex"><Keyboard size={12} /><kbd className="font-sans">Space</kbd> flip <span className="mx-1">·</span><ArrowLeft size={11} /><ArrowRight size={11} /> navigate</span>}</div>
    </section>
  );
}
