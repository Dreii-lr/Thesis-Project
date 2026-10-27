'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import type { DemoRole } from '@/src/lib/auth-api';
import { updateOwnProfile, type AccountProfile, type ProfileUpdate } from '@/src/lib/profile-api';
import { todayInPhilippines } from '@/src/lib/student-validation';
import StudentAddressFields from '@/src/components/learners/StudentAddressFields';
import ContactNumberInput from '@/src/components/learners/ContactNumberInput';
import { ManagedNote, ProfileMessage, profileButtonClass, profileInputClass, profilePrimaryClass } from './ProfileShared';

export type EditableProfileSection = 'personal' | 'contact' | 'family';

export default function ProfileEditForm({ profile, role, section, onSaved, onCancel, onDirty, onPending }: { profile: AccountProfile; role: DemoRole; section: EditableProfileSection; onSaved: (profile: AccountProfile) => void; onCancel: () => void; onDirty: () => void; onPending: (pending: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [siblings, setSiblings] = useState((profile.family_details?.siblings || []).map(sibling => ({ ...sibling, key: crypto.randomUUID() })));
  const lock = useRef(false);
  const personal = profile.personal_details;
  const contact = profile.contact_details;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) || '').trim();
    const payload: ProfileUpdate = {};
    setError('');
    if (section === 'personal') {
      if (!text('first_name') || !text('last_name')) { setError('Enter your first and last name.'); return; }
      const birthDate = text('birth_date');
      if (!birthDate && personal?.birth_date) { setError('Enter your birth date. The existing birth date cannot be cleared from this form.'); return; }
      if (birthDate && (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !Number.isFinite(Date.parse(birthDate)) || new Date(birthDate).toISOString().slice(0, 10) !== birthDate || birthDate > todayInPhilippines())) { setError('Enter a valid birth date that is not in the future.'); return; }
      payload.first_name = text('first_name'); payload.middle_name = text('middle_name'); payload.last_name = text('last_name'); payload.suffix = text('suffix');
      payload.personal_details = { gender: text('gender'), nationality: text('nationality'), civil_status: text('civil_status'), religion: text('religion'), ...(birthDate ? { birth_date: birthDate } : {}) };
    } else if (section === 'contact') {
      const codes = ['province_code', 'municipality_code', 'barangay_code'];
      if (codes.some(name => text(name)) && (!codes.every(name => /^[0-9]{9}$/.test(text(name))) || !['province', 'municipality', 'barangay'].every(name => text(name)))) { setError('Complete the province, city, and barangay selections before saving.'); return; }
      payload.contact_details = { contact_no: text('contact_no'), street_building_no: text('street_building_no'), province: text('province'), municipality: text('municipality'), barangay: text('barangay'), ...(codes.every(name => text(name)) ? Object.fromEntries(codes.map(name => [name, text(name)])) : {}) };
    } else {
      payload.family_details = {
        mother: { name: text('mother_name'), contact_no: text('mother_contact_no') }, father: { name: text('father_name'), contact_no: text('father_contact_no') }, guardian: { name: text('guardian_name'), contact_no: text('guardian_contact_no') },
        siblings: siblings.map((_, index) => ({ name: text(`sibling_name_${index}`), last_grade_level_completed: text(`sibling_grade_${index}`), occupation: text(`sibling_occupation_${index}`) })).filter(sibling => sibling.name || sibling.last_grade_level_completed || sibling.occupation),
      };
    }
    lock.current = true; setBusy(true); onPending(true);
    try { onSaved(await updateOwnProfile(profile.user_id, role, payload)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Your profile could not be saved. Your edits are still here.'); }
    finally { lock.current = false; setBusy(false); onPending(false); }
  }

  return <form onSubmit={save} onChange={onDirty} className="space-y-5">
    {error && <ProfileMessage error>{error}</ProfileMessage>}
    <fieldset disabled={busy} className="min-w-0 space-y-5">
      {section === 'personal' && <><div className="grid gap-4 sm:grid-cols-2"><TextField label="First name" name="first_name" value={profile.first_name} required autoComplete="given-name" /><TextField label="Last name" name="last_name" value={profile.last_name} required autoComplete="family-name" /><TextField label="Middle name" name="middle_name" value={profile.middle_name} autoComplete="additional-name" /><TextField label="Suffix" name="suffix" value={profile.suffix} /><TextField label="Birth date" name="birth_date" value={personal?.birth_date} type="date" max={todayInPhilippines()} autoComplete="bday" /><TextField label="Gender" name="gender" value={personal?.gender} /><TextField label="Nationality" name="nationality" value={personal?.nationality} /><TextField label="Civil status" name="civil_status" value={personal?.civil_status} /><TextField label="Religion" name="religion" value={personal?.religion} /></div><ManagedNote>Account ID, role, status, and learning-program settings are managed separately from your personal profile.</ManagedNote></>}
      {section === 'contact' && <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-600">Contact number<ContactNumberInput name="contact_no" defaultValue={contact?.contact_no || ''} autoComplete="tel-national" className={profileInputClass} /></label><TextField label="Street / building number" name="street_building_no" value={contact?.street_building_no} autoComplete="street-address" /><StudentAddressFields initial={contact || undefined} inputClass={profileInputClass} labelClass="block text-xs font-semibold text-slate-600" /></div>}
      {section === 'family' && <><div className="space-y-5">{(['mother', 'father', 'guardian'] as const).map(key => <div key={key} className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2"><TextField label={`${key[0].toUpperCase()}${key.slice(1)}'s name`} name={`${key}_name`} value={profile.family_details?.[key]?.name} /><label className="block text-xs font-semibold text-slate-600">Contact number<ContactNumberInput name={`${key}_contact_no`} defaultValue={profile.family_details?.[key]?.contact_no || ''} className={profileInputClass} /></label></div>)}</div><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-800">Siblings</h3><button type="button" className={profileButtonClass} onClick={() => { setSiblings(rows => [...rows, { key: crypto.randomUUID(), name: '', occupation: '', last_grade_level_completed: '' }]); onDirty(); }}><Plus size={14} />Add sibling</button></div>{siblings.map((sibling, index) => <div key={sibling.key} className="space-y-3 rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-500">Sibling {index + 1}</p><button type="button" aria-label={`Remove sibling ${index + 1}`} onClick={() => { setSiblings(rows => rows.filter(row => row.key !== sibling.key)); onDirty(); }} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={15} /></button></div><div className="grid gap-4 sm:grid-cols-2"><TextField label="Name" name={`sibling_name_${index}`} value={sibling.name} /><TextField label="Last grade level completed" name={`sibling_grade_${index}`} value={sibling.last_grade_level_completed} /><TextField label="Occupation" name={`sibling_occupation_${index}`} value={sibling.occupation} /></div></div>)}</>}
    </fieldset>
    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5"><button type="button" disabled={busy} onClick={onCancel} className={profileButtonClass}>Cancel</button><button type="submit" disabled={busy} className={profilePrimaryClass}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{busy ? 'Saving changes…' : 'Save changes'}</button></div>
  </form>;
}

function TextField({ label, name, value, required, type = 'text', max, autoComplete }: { label: string; name: string; value?: string | null; required?: boolean; type?: string; max?: string; autoComplete?: string }) {
  return <label className="block text-xs font-semibold text-slate-600">{label}{required && <span className="text-rose-500"> *</span>}<input name={name} type={type} defaultValue={value || ''} required={required} maxLength={150} max={max} autoComplete={autoComplete} className={profileInputClass} /></label>;
}
