'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import Modal from '@/src/components/ui/Modal';
import { deleteProfilePictureApi, uploadProfilePictureApi, type DemoRole } from '@/src/lib/auth-api';
import { assertProfileSession, getOwnProfile, validateProfilePhoto, type AccountProfile } from '@/src/lib/profile-api';
import ProfileAvatar from './ProfileAvatar';
import { ProfileMessage, profileButtonClass, profilePrimaryClass } from './ProfileShared';

export default function ProfilePhotoEditor({ profile, role, remove = false, onClose, onSaved }: { profile: AccountProfile; role: DemoRole; remove?: boolean; onClose: () => void; onSaved: (profile: AccountProfile) => void }) {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const objectUrl = useRef('');
  const lock = useRef(false);
  useEffect(() => {
    const current = objectUrl;
    return () => { if (current.current) URL.revokeObjectURL(current.current); };
  }, []);
  function choose(selected?: File) {
    if (!selected) return;
    const issue = validateProfilePhoto(selected);
    setError(issue || '');
    if (issue) return;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(selected);
    setFile(selected); setPreview(objectUrl.current); setSent(false);
  }
  async function save() {
    if (lock.current || (!remove && !file)) return;
    lock.current = true; setBusy(true); setError('');
    let requestSent = sent;
    try {
      await assertProfileSession(profile.user_id, role);
      if (!requestSent) {
        if (remove) await deleteProfilePictureApi();
        else await uploadProfilePictureApi(file!);
        requestSent = true; setSent(true);
      }
      const saved = await getOwnProfile(profile.user_id, role);
      if (remove ? Boolean(saved.profile_url?.public_url) : !saved.profile_url?.public_url || saved.profile_url.public_url === profile.profile_url?.public_url) throw new Error('The saved picture has not been confirmed yet. Check again before sending another request.');
      onSaved(saved);
    } catch (err) { setError(`${err instanceof Error ? err.message : 'The picture could not be updated.'}${requestSent ? ' The request was accepted; use Check saved picture to confirm its result.' : ''}`); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Modal title={remove ? 'Remove profile picture?' : 'Update profile picture'} pending={busy} onClose={onClose}><div className="space-y-5"><div className="flex flex-col items-center rounded-2xl border border-blue-100 bg-blue-50/40 p-6"><ProfileAvatar user={profile} preview={preview} large /><p className="mt-4 text-center text-xs leading-6 text-slate-500">{remove ? 'Your initials will appear in your profile and account menu.' : file ? file.name : 'Choose a clear picture for your account.'}</p></div>{!remove && <><input ref={input} type="file" aria-label="Choose profile picture" accept="image/jpeg,image/png,image/webp" disabled={busy || sent} className="sr-only" onChange={event => { choose(event.target.files?.[0]); event.target.value = ''; }} /><button type="button" disabled={busy || sent} className={`${profileButtonClass} w-full`} onClick={() => input.current?.click()}><ImagePlus size={16} />{file ? 'Choose another image' : 'Choose image'}</button><p className="text-xs leading-6 text-slate-400">JPG, PNG, or WebP · up to 5 MB. Your picture is saved to your account after confirmation.</p></>}{error && <ProfileMessage error>{error}</ProfileMessage>}<div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className={profileButtonClass} onClick={onClose} disabled={busy}>Cancel</button><button type="button" onClick={save} disabled={busy || (!remove && !file)} className={remove ? `${profileButtonClass} border-rose-200 text-rose-700 hover:bg-rose-50` : profilePrimaryClass}>{busy ? <Loader2 size={15} className="animate-spin" /> : remove ? <Trash2 size={15} /> : <ImagePlus size={15} />}{busy ? 'Saving picture…' : sent ? 'Check saved picture' : remove ? 'Remove picture' : 'Save picture'}</button></div></div></Modal>;
}
