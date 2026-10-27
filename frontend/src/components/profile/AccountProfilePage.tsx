'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpRight, Camera, Check, ContactRound, Copy, GraduationCap, Loader2, MapPin, Pencil, RefreshCw, ShieldCheck, Trash2, UserRound, UsersRound } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import type { DemoRole } from '@/src/lib/auth-api';
import { getOwnProfile, PROFILE_ROLES, profileName, type AccountProfile } from '@/src/lib/profile-api';
import { formatCategoryLevel } from '@/src/lib/students-api';
import StudentPageHeader, { studentHeaderActionClass } from '@/src/components/layout/student/StudentPageHeader';
import Modal from '@/src/components/ui/Modal';
import ProfileAvatar from './ProfileAvatar';
import ProfileEditForm, { type EditableProfileSection } from './ProfileEditForm';
import ProfilePhotoEditor from './ProfilePhotoEditor';
import ProfileSecurity from './ProfileSecurity';
import { ManagedNote, ProfileFields, ProfileMessage, profileButtonClass, profileDate, profilePrimaryClass } from './ProfileShared';

type ProfileSection = 'overview' | EditableProfileSection | 'security';
const SECTIONS = [
  { id: 'overview', title: 'Overview', icon: UserRound },
  { id: 'personal', title: 'Personal information', icon: ContactRound },
  { id: 'contact', title: 'Contact details', icon: MapPin },
  { id: 'family', title: 'Family & guardian', icon: UsersRound },
  { id: 'security', title: 'Account & Security', icon: ShieldCheck },
] as const;

export default function AccountProfilePage({ role }: { role: DemoRole }) {
  const auth = useAuth();
  const params = useSearchParams();
  const userId = auth.user?.user_id;
  if (!userId || auth.role !== role) return <div className="p-6"><ProfileMessage error>Your profile is unavailable. Refresh your session to continue.</ProfileMessage></div>;
  return <ProfileWorkspace key={`${userId}:${role}:${params.get('section') || 'overview'}`} userId={userId} role={role} requestedSection={params.get('section') || 'overview'} />;
}

function ProfileWorkspace({ userId, role, requestedSection }: { userId: string; role: DemoRole; requestedSection: string }) {
  const auth = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<EditableProfileSection | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [photo, setPhoto] = useState<'upload' | 'remove' | null>(null);
  const [copied, setCopied] = useState(false);
  const [selection, setSelection] = useState({ requested: requestedSection, value: requestedSection });
  const [leave, setLeave] = useState<{ section?: ProfileSection; href?: string; refresh?: boolean; cancel?: boolean } | null>(null);
  const requestVersion = useRef(0);
  const dirtyRef = useRef(false);
  const pendingRef = useRef(false);
  const sections = SECTIONS.filter(section => role === 'student' || section.id !== 'family');
  const selected = selection.requested === requestedSection ? selection.value : requestedSection;
  const section = sections.find(item => item.id === selected) || sections[0];

  const updateUser = auth.updateUser;
  const loadProfile = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true); setError('');
    try {
      const result = await getOwnProfile(userId, role);
      if (version !== requestVersion.current) return;
      setProfile(result); updateUser(result);
    } catch (err) { if (version === requestVersion.current) setError(err instanceof Error ? err.message : 'Your profile could not be loaded.'); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, [userId, role, updateUser]);

  useEffect(() => {
    let active = true;
    const requests = requestVersion;
    void Promise.resolve().then(() => { if (active) return loadProfile(); });
    return () => { active = false; requests.current++; };
  }, [loadProfile]);

  useEffect(() => {
    if (!dirty && !pending) return;
    const warn = (event: BeforeUnloadEvent) => { if (dirtyRef.current || pendingRef.current) event.preventDefault(); };
    const navigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      if (anchor.href === window.location.href) return;
      event.preventDefault(); event.stopPropagation();
      if (!pending) setLeave({ href: anchor.href });
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', navigation, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', navigation, true); };
  }, [dirty, pending]);

  function markDirty() { dirtyRef.current = true; setDirty(true); }
  function updatePending(value: boolean) { pendingRef.current = value; setPending(value); }
  function clearEdits() { dirtyRef.current = false; setDirty(false); setEditing(null); }
  function navigate(next: { section?: ProfileSection; href?: string; refresh?: boolean; cancel?: boolean }) {
    if (pending) return;
    if (dirty) { setLeave(next); return; }
    proceed(next);
  }
  function proceed(next: { section?: ProfileSection; href?: string; refresh?: boolean; cancel?: boolean }) {
    clearEdits(); setLeave(null); setNotice('');
    if (next.section) setSelection({ requested: requestedSection, value: next.section });
    if (next.href) router.push(next.href);
    if (next.refresh) void loadProfile();
  }
  function saved(result: AccountProfile) {
    setProfile(result); updateUser(result); clearEdits();
    setNotice('Your changes are saved to your account.');
  }
  async function copyId() {
    try { await navigator.clipboard.writeText(profile?.account_id || ''); setCopied(true); }
    catch { setNotice('Your account ID is shown below your name. Select the text to copy it.'); }
  }

  const personal = profile?.personal_details;
  const contact = profile?.contact_details;
  const family = profile?.family_details;
  const name = profileName(profile || auth.user);
  const roleLabel = PROFILE_ROLES[role];
  const address = [contact?.street_building_no, contact?.barangay, contact?.municipality, contact?.province].filter(Boolean).join(', ');

  return <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <StudentPageHeader eyebrow={`${roleLabel} account · Profile & preferences`} title="My Profile" description="Your information, organized in one place. Keep your personal details up to date and manage how you appear across the portal." actions={<button type="button" disabled={loading || pending || Boolean(photo)} onClick={() => navigate({ refresh: true })} className={studentHeaderActionClass}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /><span className="ml-2">Refresh profile</span></button>}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-blue-100"><span className="flex items-center gap-2"><ShieldCheck size={16} />Connected to your account</span><span>Your role and access settings stay managed by the system.</span></div>
    </StudentPageHeader>
    {notice && <ProfileMessage>{notice}<button type="button" className="ml-3 font-semibold underline underline-offset-2" onClick={() => setNotice('')}>Dismiss</button></ProfileMessage>}
    {error && <ProfileMessage error>{error}<button type="button" onClick={() => navigate({ refresh: true })} className="ml-3 font-semibold underline underline-offset-2">Try again</button></ProfileMessage>}
    {!profile ? <div role="status" className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-16 text-sm text-slate-400">{loading ? <><Loader2 size={18} className="animate-spin" />Loading your profile…</> : 'Your profile could not be loaded. Use Try again above.'}</div> : <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-4"><section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white"><div className="h-20 border-b border-blue-100 bg-gradient-to-br from-blue-100 via-blue-50 to-white" /><div className="px-5 pb-5"><div className="-mt-12 flex items-end justify-between gap-2"><ProfileAvatar user={profile} large /><span className="mb-1 inline-flex rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">{roleLabel}</span></div><h2 className="mt-5 break-words text-xl font-semibold leading-7 tracking-tight text-slate-900">{name}</h2><div className="mt-2 flex items-start gap-1"><p className="min-w-0 flex-1 break-all text-xs leading-6 text-slate-400">{profile.account_id || 'Account ID not provided'}</p>{profile.account_id && <button type="button" onClick={copyId} aria-label="Copy account ID" className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-blue-600">{copied ? <Check size={14} /> : <Copy size={14} />}</button>}</div><div className="mt-4 flex flex-wrap gap-2">{profile.status && <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-semibold ${profile.status === 'ACTIVE' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}><span className={`size-1.5 rounded-full ${profile.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />{profile.status.charAt(0) + profile.status.slice(1).toLowerCase()}</span>}{role === 'student' && profile.user_category && <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500">{formatCategoryLevel(profile.user_category)}</span>}</div><div className="mt-5 space-y-2 border-t border-slate-100 pt-4"><button type="button" disabled={Boolean(editing) || dirty || pending || loading} onClick={() => setPhoto('upload')} className={`${profileButtonClass} w-full`}><Camera size={15} />{profile.profile_url?.public_url ? 'Change picture' : 'Upload picture'}</button>{profile.profile_url?.public_url && <button type="button" disabled={Boolean(editing) || dirty || pending || loading} onClick={() => setPhoto('remove')} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"><Trash2 size={14} />Remove picture</button>}<p className="text-center text-[10px] leading-5 text-slate-400">JPG, PNG, or WebP · up to 5 MB</p></div></div></section>
      <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-5"><ShieldCheck size={21} className="text-blue-600" /><h3 className="mt-3 text-xs font-semibold text-slate-800">Your account, your information</h3><p className="mt-2 text-xs leading-6 text-slate-500">Review each section before saving. Your profile picture and name also appear in the account menu.</p>{role === 'student' && <Link href="/student/requirements" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-600">View my requirements<ArrowUpRight size={13} /></Link>}</section></aside>
      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white"><div className="overflow-x-auto border-b border-slate-100 px-4 pt-3"><nav aria-label="Profile sections" className="flex min-w-max gap-1">{sections.map(item => <button key={item.id} type="button" aria-current={section.id === item.id ? 'page' : undefined} disabled={pending} onClick={() => navigate({ section: item.id })} className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-[11px] font-semibold transition ${section.id === item.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-700'} disabled:opacity-50`}><item.icon size={14} />{item.title}</button>)}</nav></div>
      <div className="p-5 sm:p-7"><div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">{roleLabel} profile</p><h2 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">{section.title}</h2><p className="mt-2 text-xs leading-6 text-slate-400">{section.id === 'overview' ? 'A summary of the information saved to your account.' : section.id === 'security' ? 'Manage your sign-in information and account security.' : editing ? 'Update this section, then save your changes.' : 'Review the details saved in this section.'}</p></div>{['personal', 'contact', 'family'].includes(section.id) && !editing && <button type="button" disabled={loading || pending} className={profileButtonClass} onClick={() => { setEditing(section.id as EditableProfileSection); setNotice(''); }}><Pencil size={14} />Edit details</button>}</div>
      {editing ? <ProfileEditForm key={`${profile.updated_at}:${editing}`} profile={profile} role={role} section={editing} onSaved={saved} onCancel={() => navigate({ cancel: true })} onDirty={markDirty} onPending={updatePending} /> : section.id === 'overview' ? <div className="space-y-6"><div className="grid gap-3 sm:grid-cols-2"><SummaryCard icon={UserRound} title="Account" value={profile.account_id || roleLabel} detail={`${roleLabel}${profile.status ? ` · ${profile.status.toLowerCase()}` : ''}`} /><SummaryCard icon={role === 'student' ? GraduationCap : ContactRound} title={role === 'student' ? 'Learning program' : 'Contact number'} value={role === 'student' ? formatCategoryLevel(profile.user_category || '') || 'Not provided' : contact?.contact_no || 'Not provided'} detail={role === 'student' ? personal?.learning_modalities === 'FTF' ? 'Face-to-face learning' : personal?.learning_modalities === 'BLENDED' ? 'Blended learning' : 'Learning modality not provided' : 'Saved contact information'} /></div><ProfileFields fields={[["Full name", name], ['Account email', profile.email], ['Birth date', profileDate(personal?.birth_date)], ['Contact number', contact?.contact_no], ['Address', address], ['Account created', profileDate(profile.created_at)]]} /><ManagedNote>Account ID, role, and account status are shown for reference. Administrative changes belong in the account-management screens.</ManagedNote></div> : section.id === 'personal' ? <div className="space-y-6"><ProfileFields fields={[["First name", profile.first_name], ['Last name', profile.last_name], ['Middle name', profile.middle_name], ['Suffix', profile.suffix], ['Birth date', profileDate(personal?.birth_date)], ['Gender', personal?.gender], ['Nationality', personal?.nationality], ['Civil status', personal?.civil_status], ['Religion', personal?.religion]]} />{role === 'student' && <div className="space-y-4 border-t border-slate-100 pt-5"><h3 className="text-sm font-semibold text-slate-800">Learner information</h3><ProfileFields fields={[["Learner Reference Number (LRN)", personal?.lrn_number], ['Learning program', profile.user_category ? formatCategoryLevel(profile.user_category) : ''], ['Learning modality', personal?.learning_modalities === 'FTF' ? 'Face-to-face' : personal?.learning_modalities === 'BLENDED' ? 'Blended' : '']]} /><ManagedNote>For changes to your LRN or enrollment settings, please contact your teacher or administrator.</ManagedNote></div>}</div> : section.id === 'contact' ? <div className="space-y-6"><ProfileFields fields={[["Contact number", contact?.contact_no], ['Street / building number', contact?.street_building_no], ['Province', contact?.province], ['Municipality / city', contact?.municipality], ['Barangay', contact?.barangay], ['Account email', profile.email]]} /><ManagedNote>Your sign-in email is shown for reference. Email changes are handled separately from this profile.</ManagedNote></div> : section.id === 'family' ? <div className="space-y-6">{(['mother', 'father', 'guardian'] as const).map(key => <section key={key} className="rounded-xl border border-slate-200 p-4"><h3 className="mb-4 text-xs font-semibold capitalize text-slate-800">{key}</h3><ProfileFields fields={[["Name", family?.[key]?.name], ['Contact number', family?.[key]?.contact_no]]} /></section>)}<section><h3 className="mb-4 text-sm font-semibold text-slate-800">Siblings</h3>{family?.siblings?.length ? <div className="space-y-3">{family.siblings.map((sibling, index) => <div key={index} className="rounded-xl border border-slate-200 p-4"><ProfileFields fields={[["Name", sibling.name], ['Last grade level completed', sibling.last_grade_level_completed], ['Occupation', sibling.occupation]]} /></div>)}</div> : <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-400">No sibling information has been provided.</p>}</section></div> : <ProfileSecurity profile={profile} role={role} onDirty={markDirty} onPending={updatePending} onComplete={() => { clearEdits(); updatePending(false); }} />}
      </div></section>
    </div>}
    {photo && profile && <ProfilePhotoEditor profile={profile} role={role} remove={photo === 'remove'} onClose={() => setPhoto(null)} onSaved={result => { saved(result); setPhoto(null); }} />}
    {leave && <Modal title="Discard unsaved changes?" onClose={() => setLeave(null)}><p className="text-sm leading-7 text-slate-500">Your changes have not been saved. Stay here to finish editing, or discard them to continue.</p><div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" className={profileButtonClass} onClick={() => setLeave(null)}>Keep editing</button><button type="button" className={profilePrimaryClass} onClick={() => proceed(leave)}>Discard changes</button></div></Modal>}
  </div>;
}

function SummaryCard({ icon: Icon, title, value, detail }: { icon: typeof UserRound; title: string; value: string; detail: string }) {
  return <div className="min-w-0 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white p-4"><span className="inline-flex rounded-lg bg-white p-2 text-blue-600 ring-1 ring-blue-100"><Icon size={17} /></span><p className="mt-3 text-[10px] font-medium text-slate-400">{title}</p><p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p><p className="mt-1 text-[11px] leading-5 text-slate-400">{detail}</p></div>;
}
