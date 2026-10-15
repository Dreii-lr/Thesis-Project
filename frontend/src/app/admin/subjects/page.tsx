'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { createSubject, deleteSubject, listSubjects, updateSubject, type SubjectRecord } from '@/src/lib/subjects-api';
import { listUserCategories, type UserCategoryRecord } from '@/src/lib/user-categories-api';
import { useApiData } from '@/src/lib/use-api-data';
import ApiState from '@/src/components/ui/ApiState';
import Modal from '@/src/components/ui/Modal';

const inputClass = 'mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';

export default function SubjectsPage() {
  const subjects = useApiData(listSubjects);
  const categories = useApiData(listUserCategories);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<SubjectRecord | 'new' | null>(null);
  const [deleting, setDeleting] = useState<SubjectRecord | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const mutation = useRef(false);
  const filtered = (subjects.data || []).filter(subject =>
    [subject.code, subject.name, subject.description].join(' ').toLowerCase().includes(search.trim().toLowerCase()) &&
    (!category || subject.category_id === category) && (!status || subject.is_active === (status === 'active')));

  const removeSubject = async () => {
    if (!deleting || mutation.current) return;
    mutation.current = true;
    setPending(true);
    setError('');
    try {
      await deleteSubject(deleting.subject_id);
      setDeleting(null);
      setSuccess('Subject deleted successfully.');
      subjects.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete the subject.');
    } finally {
      mutation.current = false;
      setPending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Subjects</h1><p className="mt-1 text-sm text-slate-500">Manage subjects within your learning programs.</p></div>
        <div className="flex gap-3"><button type="button" onClick={subjects.reload} disabled={subjects.loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm disabled:opacity-50"><RefreshCw size={15} /> Refresh</button><button type="button" disabled={categories.loading || !!categories.error || !categories.data?.length} onClick={() => { setSuccess(''); setEditing('new'); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Plus size={16} /> Add Subject</button></div>
      </div>
      <ApiState loading={categories.loading} error={categories.error} onRetry={categories.reload} />
      {!categories.loading && !categories.error && !categories.data?.length && <p className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">No learning programs are available. <Link href="/admin/user-categories" className="font-semibold underline">Create a learning program</Link> before adding a subject.</p>}
      {success && <p role="status" className="mb-4 rounded-xl bg-green-50 p-4 text-sm text-green-700">{success}</p>}
      <ApiState loading={subjects.loading} error={subjects.error} onRetry={subjects.reload} />
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <input aria-label="Search subjects" placeholder="Search name or description" value={search} onChange={event => setSearch(event.target.value)} className={`${inputClass} !mt-0 min-w-0 flex-1`} />
          <select aria-label="Filter subjects by program" value={category} onChange={event => setCategory(event.target.value)} disabled={categories.loading || !!categories.error} className={`${inputClass} !mt-0 sm:w-auto`}><option value="">All learning programs</option>{categories.data?.map(program => <option key={program.category_id} value={program.category_id}>{program.name}</option>)}</select>
          <select aria-label="Filter subjects by status" value={status} onChange={event => setStatus(event.target.value)} className={`${inputClass} !mt-0 sm:w-auto`}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Subject', 'Learning program', 'Status', 'Actions'].map(label => <th key={label} scope="col" className="px-5 py-3">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!subjects.loading && !subjects.error && filtered.map(subject => <tr key={subject.subject_id} className="hover:bg-blue-50/40">
              <td className="max-w-sm px-5 py-4"><p className="font-medium">{subject.name}</p><p className="mt-1 text-xs text-slate-500">{subject.description || 'No description'}</p></td><td className="px-5 py-4 text-slate-600">{categories.data?.find(program => program.category_id === subject.category_id)?.name || subject.category_name || subject.category_id}</td><td className="px-5 py-4"><span className={`rounded px-2 py-1 text-xs font-semibold ${subject.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{subject.is_active ? 'Active' : 'Inactive'}</span></td>
              <td className="px-5 py-4"><div className="flex gap-2"><button type="button" disabled={!categories.data?.length || !!categories.error} aria-label={`Edit ${subject.name}`} onClick={() => { setSuccess(''); setEditing(subject); }} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 disabled:opacity-50"><Pencil size={16} /></button><button type="button" aria-label={`Delete ${subject.name}`} onClick={() => { setSuccess(''); setError(''); setDeleting(subject); }} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button></div></td>
            </tr>)}
            {!subjects.loading && !subjects.error && !filtered.length && <tr><td colSpan={4} className="p-10 text-center text-slate-500">No subjects match your search or filters.</td></tr>}
          </tbody>
        </table></div>
      </div>
      {editing && categories.data && <SubjectForm key={editing === 'new' ? 'new' : editing.subject_id} subject={editing === 'new' ? null : editing} categories={categories.data} onClose={() => setEditing(null)} onSaved={() => { setSuccess(editing === 'new' ? 'Subject created successfully.' : 'Subject updated successfully.'); setEditing(null); subjects.reload(); }} />}
      {deleting && <Modal title="Delete subject?" onClose={() => setDeleting(null)} pending={pending}>
        <p className="text-sm leading-6 text-slate-600">Delete {deleting.name}? This action cannot be undone.</p>
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setDeleting(null)} disabled={pending} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancel</button><button type="button" onClick={() => void removeSubject()} disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending && <Loader2 size={16} className="animate-spin" />}{pending ? 'Deleting...' : 'Delete subject'}</button></div>
      </Modal>}
    </div>
  );
}

function SubjectForm({ subject, categories, onClose, onSaved }: { subject: SubjectRecord | null; categories: UserCategoryRecord[]; onClose: () => void; onSaved: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const mutation = useRef(false);
  const submitSubject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.current) return;
    const form = new FormData(event.currentTarget);
    const payload = { category_id: String(form.get('category_id') || ''), name: String(form.get('name') || '').trim(), description: String(form.get('description') || '').trim(), is_active: form.get('is_active') === 'on' };
    if (!payload.name || !categories.some(category => category.category_id === payload.category_id)) {
      setError('Choose a learning program and enter a subject name.');
      return;
    }
    mutation.current = true;
    setPending(true);
    setError('');
    try {
      if (subject) await updateSubject(subject.subject_id, payload);
      else await createSubject(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save the subject.');
    } finally {
      mutation.current = false;
      setPending(false);
    }
  };

  return <Modal title={subject ? 'Edit Subject' : 'Add Subject'} onClose={onClose} pending={pending}>
    <form onSubmit={submitSubject}>
      <fieldset disabled={pending} className="space-y-4">
        <div><label htmlFor="subject-category" className="text-sm font-semibold">Learning program</label><select id="subject-category" name="category_id" defaultValue={subject?.category_id || ''} required className={inputClass}><option value="" disabled>Choose a program</option>{categories.map(category => <option key={category.category_id} value={category.category_id}>{category.name}</option>)}</select></div>
        <div><label htmlFor="subject-name" className="text-sm font-semibold">Name</label><input id="subject-name" name="name" required defaultValue={subject?.name || ''} className={inputClass} /></div>
        <div><label htmlFor="subject-description" className="text-sm font-semibold">Description</label><textarea id="subject-description" name="description" rows={3} defaultValue={subject?.description || ''} className={inputClass} /></div>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="is_active" defaultChecked={subject?.is_active ?? true} className="accent-blue-600" /> Active subject</label>
      </fieldset>
      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={pending} onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancel</button><button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{pending && <Loader2 size={16} className="animate-spin" />}{pending ? 'Saving...' : 'Save Subject'}</button></div>
    </form>
  </Modal>;
}
