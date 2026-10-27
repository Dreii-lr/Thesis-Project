'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { UserRead } from '@/src/lib/auth-api';
import { profileInitials, profileName } from '@/src/lib/profile-api';

export default function ProfileAvatar({ user, large = false, preview }: { user: UserRead | null; large?: boolean; preview?: string }) {
  const [failedUrl, setFailedUrl] = useState('');
  const saved = user?.profile_url?.public_url;
  const photo = preview || (typeof saved === 'string' && /^https?:\/\//i.test(saved) ? saved : '');
  return <span className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 font-semibold text-blue-700 ${large ? 'size-24 text-3xl ring-4 ring-white' : 'size-10 text-xs'}`}>
    {photo && photo !== failedUrl ? <Image src={photo} alt={`${profileName(user)} profile picture`} fill sizes={large ? '96px' : '40px'} unoptimized className="object-cover" onError={() => setFailedUrl(photo)} /> : <span aria-hidden="true">{profileInitials(user)}</span>}
  </span>;
}
