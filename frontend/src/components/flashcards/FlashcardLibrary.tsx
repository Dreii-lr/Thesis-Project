'use client';

import { useCallback, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronRight, FlaskConical, Layers3, Pencil, Plus, Search, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { useStudentSubjects } from '@/src/context/StudentSubjectsContext';
import { mockStudentFlashcards, type StudyDeck } from '@/src/data/mockStudentFlashcards';
import { createFlashcardSession, flashcardStudyReducer, type FlashcardSession, type StudyAction } from '@/src/lib/flashcard-study';
import type { FlashcardSetInput, PersonalStudyDeck } from '@/src/lib/personal-flashcards';
import Modal from '@/src/components/ui/Modal';
import FlashcardSetEditor from './FlashcardSetEditor';
import FlashcardStudy from './FlashcardStudy';
import { usePersonalFlashcards } from './usePersonalFlashcards';

export default function FlashcardLibrary({ ownerId }: { ownerId: string }) {
  const library = usePersonalFlashcards(ownerId);
  const subjects = useStudentSubjects();
  const [collection, setCollection] = useState<'personal' | 'examples'>('personal');
  const [search, setSearch] = useState('');
  const [studyingId, setStudyingId] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [editor, setEditor] = useState<{ existing?: PersonalStudyDeck } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PersonalStudyDeck | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [notice, setNotice] = useState('');
  const [sessions, setSessions] = useState<Record<string, FlashcardSession>>({});
  const decks: StudyDeck[] = [...library.sets, ...mockStudentFlashcards];
  const active = decks.find(deck => deck.id === studyingId);
  const personal = library.sets.find(deck => deck.id === studyingId);
  const sessionKey = personal ? `${personal.id}:${personal.updatedAt}` : studyingId || '';
  const source = collection === 'personal' ? library.sets : mockStudentFlashcards;
  const visible = source.filter(deck => `${deck.title} ${deck.subject}`.toLowerCase().includes(search.toLowerCase().trim()));
  const studyChoices = personal ? library.sets : mockStudentFlashcards;

  const onAction = useCallback((action: StudyAction) => {
    if (!active) return;
    setSessions(previous => ({ ...previous, [sessionKey]: flashcardStudyReducer(previous[sessionKey] || createFlashcardSession(active.cards), action) }));
  }, [active, sessionKey]);
  const startStudy = (deck: StudyDeck) => { setStudyingId(deck.id); setFocused(false); setNotice(''); };
  const openEditor = (existing?: PersonalStudyDeck) => { setEditor({ existing }); setNotice(''); };
  const save = (input: FlashcardSetInput) => {
    const saved = library.save(input);
    setSessions(previous => ({ ...previous, [`${saved.id}:${saved.updatedAt}`]: createFlashcardSession(saved.cards) }));
    setStudyingId(saved.id);
    setCollection('personal');
    setSearch('');
    setEditor(null);
    setNotice(input.id ? 'Your changes are saved in this browser.' : 'Your study set is ready. Try flipping your first card.');
  };
  const remove = () => {
    if (!pendingDelete) return;
    try {
      library.remove(pendingDelete.id);
      if (studyingId === pendingDelete.id) setStudyingId(null);
      setPendingDelete(null);
      setNotice('Study set deleted from this browser.');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'The study set could not be deleted.');
    }
  };

  return <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600"><Layers3 size={13} /> Your study space</p><h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">My flashcards</h1><p className="mt-1.5 text-xs leading-6 text-slate-500 sm:text-sm">Create your own study sets. Make the ideas stick, one card at a time.</p></div>
      <button type="button" disabled={library.loading || !!library.error} onClick={() => openEditor()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white shadow-sm shadow-blue-600/15 transition hover:bg-blue-700 disabled:opacity-40"><Plus size={16} /> Create study set</button>
    </div>
    {library.error && <div role="alert" className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700"><p>{library.error}</p><button type="button" onClick={library.reload} className="mt-1 font-semibold underline">Try again</button></div>}
    {notice && <p role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs leading-6 text-emerald-800"><CheckCircle2 size={15} className="mt-1 shrink-0" />{notice}</p>}

    {active ? <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => { setStudyingId(null); setFocused(false); setNotice(''); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600"><ArrowLeft size={15} /> Back to my library</button>{personal ? <div className="flex gap-2"><button type="button" onClick={() => openEditor(personal)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><Pencil size={13} /> Edit set</button><button type="button" aria-label="Delete this study set" onClick={() => { setPendingDelete(personal); setDeleteError(''); }} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button></div> : <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-700"><FlaskConical size={12} /> Example study set</span>}</div>
      <div className={focused ? 'mb-5' : 'mb-5 xl:hidden'}><label htmlFor="personal-study-set" className="mb-2 block text-[11px] font-semibold text-slate-500">Choose a study set</label><select id="personal-study-set" value={active.id} onChange={event => setStudyingId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 sm:max-w-sm">{studyChoices.map(deck => <option key={deck.id} value={deck.id}>{deck.title}</option>)}</select></div>
      <div className={`grid items-start gap-6 ${focused ? 'mx-auto max-w-4xl' : 'xl:grid-cols-[minmax(0,1fr)_240px]'}`}>
        <FlashcardStudy key={`${active.id}:${personal?.updatedAt || 'example'}`} deck={active} session={sessions[sessionKey] || createFlashcardSession(active.cards)} onAction={onAction} focused={focused} onToggleFocus={() => setFocused(value => !value)} />
        {!focused && <aside className="hidden space-y-4 xl:block"><div className="rounded-2xl border border-slate-200 bg-white p-3"><h2 className="mb-3 px-1 text-sm font-bold text-slate-800">{personal ? 'My study sets' : 'Example sets'}</h2><div className="space-y-2">{studyChoices.map(deck => <button type="button" key={deck.id} onClick={() => startStudy(deck)} aria-pressed={active.id === deck.id} className={`w-full rounded-xl border p-3 text-left ${active.id === deck.id ? 'border-blue-100 bg-blue-50 text-blue-900' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}><p className="text-xs font-semibold leading-5">{deck.title}</p><p className="mt-1 text-[10px] text-slate-400">{deck.cards.length} cards · {deck.subject}</p></button>)}</div></div><div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><ShieldCheck size={19} className="mb-3 text-blue-600" /><h3 className="text-xs font-bold text-blue-900">Your own practice space</h3><p className="mt-2 text-[11px] leading-6 text-blue-800/70">Your personal sets are saved in this browser for your account. Practice results do not affect your grades.</p></div></aside>}
      </div>
    </> : <>
      <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <div role="group" aria-label="Flashcard collection" className="inline-flex rounded-xl bg-slate-100 p-1"><button type="button" aria-pressed={collection === 'personal'} onClick={() => { setCollection('personal'); setSearch(''); }} className={`rounded-lg px-3 py-2 text-xs font-semibold ${collection === 'personal' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>My study sets <span className="ml-1 text-[10px] opacity-60">{library.loading ? '…' : library.sets.length}</span></button><button type="button" aria-pressed={collection === 'examples'} onClick={() => { setCollection('examples'); setSearch(''); }} className={`rounded-lg px-3 py-2 text-xs font-semibold ${collection === 'examples' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Examples <span className="ml-1 text-[10px] opacity-60">{mockStudentFlashcards.length}</span></button></div>
        <label className="relative w-full sm:w-64"><span className="sr-only">Search my flashcards</span><Search size={14} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search title or subject…" className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-blue-100" /></label>
      </section>
      {library.loading && collection === 'personal' ? <p role="status" className="p-12 text-center text-sm text-slate-500">Opening your study sets…</p> : !source.length && collection === 'personal' && !library.error ? <section className="relative grid items-center gap-8 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr]">
        <div><span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100"><Sparkles size={23} /></span><h2 className="max-w-md text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">A study set that thinks like you.</h2><p className="mt-3 max-w-md text-sm leading-7 text-slate-500">Turn tricky terms, class notes, and everyday ideas into cards you can flip through whenever you need a little practice.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => openEditor()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white hover:bg-blue-700"><Plus size={15} /> Create my first set</button><button type="button" onClick={() => setCollection('examples')} className="inline-flex items-center gap-1.5 px-2 py-3 text-xs font-semibold text-slate-500 hover:text-blue-600">Explore an example <ArrowRight size={14} /></button></div></div>
        <div aria-hidden="true" className="relative mx-auto hidden w-full max-w-xs px-3 py-8 sm:block"><div className="absolute inset-x-5 inset-y-10 rotate-[-8deg] rounded-3xl border border-blue-100 bg-blue-100/70" /><div className="relative rotate-[4deg] rounded-3xl border border-blue-100 bg-white px-6 py-10 text-center shadow-[0_12px_40px_-20px_rgba(37,99,235,0.3)]"><p className="mb-6 text-[9px] font-bold uppercase tracking-[0.2em] text-blue-400">One idea at a time</p><BookOpen size={30} className="mx-auto mb-5 text-blue-500" strokeWidth={1.4} /><p className="text-xl font-bold tracking-tight text-slate-800">Made by you.<br />Remembered by you.</p><p className="mt-6 text-[10px] text-slate-400">Your first card is waiting.</p></div></div>
      </section> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(deck => {
        const own = library.sets.find(item => item.id === deck.id);
        return <article key={deck.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"><div className="mb-5 flex items-center justify-between gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Layers3 size={20} /></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${own ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-700'}`}>{own ? 'Personal set' : 'Example'}</span></div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{deck.subject}</p><h2 className="mt-2 break-words text-lg font-bold leading-6 tracking-tight text-slate-900">{deck.title}</h2><p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-500">{deck.description || 'A collection of ideas to practise at your own pace.'}</p><p className="mb-5 mt-3 text-[11px] text-slate-400">{deck.cards.length} cards · {own ? 'Created by you' : 'Example study set'}</p><div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => startStudy(deck)} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600">Study set <ChevronRight size={14} /></button>{own && <div className="flex gap-1"><button type="button" aria-label={`Edit ${deck.title}`} onClick={() => openEditor(own)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil size={14} /></button><button type="button" aria-label={`Delete ${deck.title}`} onClick={() => { setPendingDelete(own); setDeleteError(''); }} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button></div>}</div></article>;
      })}{!visible.length && !library.error && <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-500">No study sets match your search.<button type="button" onClick={() => setSearch('')} className="ml-2 font-semibold text-blue-600">Clear search</button></div>}</div>}
      <p className="mt-6 flex items-start gap-2 text-[11px] leading-6 text-slate-400"><ShieldCheck size={14} className="mt-1 shrink-0" />Personal sets are saved in this browser for your account. Examples are separate and do not change your subjects or grades.</p>
    </>}
    {editor && <FlashcardSetEditor existing={editor.existing} subjects={subjects.subjects} subjectsLoading={subjects.loading} subjectsError={subjects.error} onRetrySubjects={subjects.reload} onSave={save} onClose={() => setEditor(null)} />}
    {pendingDelete && <Modal title="Delete this study set?" onClose={() => setPendingDelete(null)}><p className="text-sm leading-7 text-slate-500">This removes <strong className="font-semibold text-slate-800">{pendingDelete.title}</strong> and its {pendingDelete.cards.length} cards from your library in this browser. This action cannot be undone.</p>{deleteError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{deleteError}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setPendingDelete(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">Keep set</button><button type="button" onClick={remove} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700"><Trash2 size={14} /> Delete set</button></div></Modal>}
  </div>;
}
