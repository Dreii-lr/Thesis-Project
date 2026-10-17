'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Eye, Layers3, Plus, Save, Trash2, X } from 'lucide-react';
import type { StudyCard } from '@/src/data/mockStudentFlashcards';
import type { SubjectRecord } from '@/src/lib/subjects-api';
import { createFlashcardId, validateFlashcardSet, type FlashcardSetInput, type PersonalStudyDeck } from '@/src/lib/personal-flashcards';
import FlipCard from './FlipCard';

interface EditorProps {
  existing?: PersonalStudyDeck;
  subjects: SubjectRecord[];
  subjectsLoading: boolean;
  subjectsError: string | null;
  onRetrySubjects: () => void;
  onSave: (input: FlashcardSetInput) => void;
  onClose: () => void;
}

const inputClass = 'mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const blankCard = (): StudyCard => ({ id: createFlashcardId(), term: '', definition: '', example: '' });

export default function FlashcardSetEditor({ existing, subjects, subjectsLoading, subjectsError, onRetrySubjects, onSave, onClose }: EditorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [title, setTitle] = useState(existing?.title || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [subjectId, setSubjectId] = useState(existing?.subjectId || '');
  const [cards, setCards] = useState<StudyCard[]>(() => existing ? structuredClone(existing.cards) : [blankCard(), blankCard()]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const card = cards.find(item => item.id === previewId) || cards[0];
  const ready = cards.filter(item => item.term.trim() && item.definition.trim()).length;
  const subject = subjects.find(item => item.subject_id === subjectId);
  const subjectName = subject?.name || (subjectId === existing?.subjectId ? existing?.subject : '') || 'Personal study';
  const initial = useRef(JSON.stringify({ title: existing?.title || '', description: existing?.description || '', subjectId: existing?.subjectId || '', cards: existing?.cards || cards }));
  const dirty = JSON.stringify({ title, description, subjectId, cards }) !== initial.current;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  const close = () => {
    if (saving || (dirty && !window.confirm('Discard the unsaved changes to this study set?'))) return;
    onClose();
  };
  const updateCard = (id: string, changes: Partial<StudyCard>) => {
    setCards(previous => previous.map(item => item.id === id ? { ...item, ...changes } : item));
    setError('');
  };
  const previewCard = (id: string, back = false) => { setPreviewId(id); setFlipped(back); };
  const reorderCard = (index: number, direction: -1 | 1) => {
    setCards(previous => {
      const reordered = [...previous];
      [reordered[index], reordered[index + direction]] = [reordered[index + direction], reordered[index]];
      return reordered;
    });
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    const input = { id: existing?.id, title, description, subjectId, subject: subjectName, cards };
    try {
      validateFlashcardSet(input);
      setSaving(true);
      onSave(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This study set could not be saved. Please try again.');
      setSaving(false);
    }
  };

  return <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close(); }} className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%_-_1.5rem)] max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm">
    <form onSubmit={submit}>
      <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Layers3 size={20} /></span><div><h2 id={titleId} className="text-base font-bold">{existing ? 'Edit your study set' : 'Create a study set'}</h2><p className="mt-1 text-[11px] text-slate-500">Your ideas. Your cards. Your own pace.</p></div></div>
        <button type="button" disabled={saving} onClick={close} aria-label="Close study set editor" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-40"><X size={19} /></button>
      </div>
      <div className="grid items-start gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">01 / Set details</p>
            <label className="block text-xs font-semibold text-slate-600">Study set title<input autoFocus required maxLength={100} value={title} onChange={event => { setTitle(event.target.value); setError(''); }} placeholder="e.g. Fractions I want to remember" className={inputClass} /></label>
            <label className="mt-4 block text-xs font-semibold text-slate-600">Subject <span className="font-normal text-slate-400">(optional)</span><select value={subjectId} onChange={event => setSubjectId(event.target.value)} className={inputClass}><option value="">Personal study</option>{existing?.subjectId && !subjects.some(item => item.subject_id === existing.subjectId) && <option value={existing.subjectId}>{existing.subject}</option>}{subjects.map(item => <option key={item.subject_id} value={item.subject_id}>{item.name}</option>)}</select></label>
            {subjectsLoading && <p role="status" className="mt-2 text-[11px] text-slate-400">Loading your subjects. You can still start with Personal study.</p>}
            {subjectsError && <p className="mt-2 text-[11px] leading-5 text-amber-700">Your subjects could not be loaded. Personal study is still available. <button type="button" onClick={onRetrySubjects} className="font-semibold underline">Retry subjects</button></p>}
            <label className="mt-4 block text-xs font-semibold text-slate-600">Description <span className="font-normal text-slate-400">(optional)</span><textarea rows={2} maxLength={300} value={description} onChange={event => setDescription(event.target.value)} placeholder="What would you like to practise?" className={`${inputClass} resize-y`} /></label>
          </section>
          <div className="flex items-center justify-between px-1"><h3 className="text-sm font-bold text-slate-800">02 / Your cards</h3><span className="text-xs text-slate-400">{ready} of {cards.length} ready</span></div>
          {cards.map((item, index) => <section key={item.id} className={`rounded-2xl border bg-white p-4 sm:p-5 ${card.id === item.id ? 'border-blue-200 ring-1 ring-blue-50' : 'border-slate-200'}`}>
            <div className="mb-4 flex items-center justify-between"><span className="text-xs font-bold text-slate-400">CARD {String(index + 1).padStart(2, '0')}</span><div className="flex gap-1">
              <button type="button" aria-label={`Preview card ${index + 1}`} onClick={() => previewCard(item.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Eye size={14} /></button>
              <button type="button" disabled={index === 0} aria-label={`Move card ${index + 1} up`} onClick={() => reorderCard(index, -1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 disabled:opacity-20"><ArrowUp size={14} /></button>
              <button type="button" disabled={index === cards.length - 1} aria-label={`Move card ${index + 1} down`} onClick={() => reorderCard(index, 1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 disabled:opacity-20"><ArrowDown size={14} /></button>
              <button type="button" disabled={cards.length <= 2} aria-label={`Remove card ${index + 1}`} onClick={() => { setCards(previous => previous.filter(entry => entry.id !== item.id)); setError(''); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-20"><Trash2 size={14} /></button>
            </div></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">Term {index + 1}<textarea required maxLength={160} rows={3} value={item.term} onFocus={() => previewCard(item.id)} onChange={event => updateCard(item.id, { term: event.target.value })} placeholder="A term or question" className={`${inputClass} resize-y`} /></label>
              <label className="text-xs font-semibold text-slate-600">Definition {index + 1}<textarea required maxLength={2000} rows={3} value={item.definition} onFocus={() => previewCard(item.id, true)} onChange={event => updateCard(item.id, { definition: event.target.value })} placeholder="The meaning or answer" className={`${inputClass} resize-y`} /></label>
            </div>
            <label className="mt-4 block text-xs font-semibold text-slate-600">Example {index + 1} <span className="font-normal text-slate-400">(optional)</span><input maxLength={500} value={item.example} onFocus={() => previewCard(item.id, true)} onChange={event => updateCard(item.id, { example: event.target.value })} placeholder="Add an example that helps you remember" className={inputClass} /></label>
          </section>)}
          <button type="button" disabled={cards.length >= 100} onClick={() => { const added = blankCard(); setCards(previous => [...previous, added]); previewCard(added.id); }} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 px-4 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40"><Plus size={17} /> Add another card</button>
        </div>
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
          <div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Live preview</p><span className="text-[11px] text-slate-400">Card {cards.indexOf(card) + 1}</span></div>
          <FlipCard key={card.id} card={card} flipped={flipped} onFlip={() => setFlipped(value => !value)} preview />
          <p className="px-1 text-xs leading-6 text-slate-500">Keep each card focused on one idea. Add a familiar example to make it easier to remember.</p>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-[11px] leading-6 text-blue-800"><CheckCircle2 size={14} className="mr-1 inline" /> Your sets are saved for your account in this browser. They are private practice, without grades.</div>
        </aside>
      </div>
      <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
        {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] text-slate-400">At least two cards, with a term and definition.</p><div className="flex gap-2"><button type="button" disabled={saving} onClick={close} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Save size={14} />{saving ? 'Saving…' : existing ? 'Save changes' : 'Create study set'}</button></div></div>
      </div>
    </form>
  </dialog>;
}
