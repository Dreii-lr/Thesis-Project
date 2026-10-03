'use client';

import Image from 'next/image';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Trash2, UserRound } from 'lucide-react';
import { getDemoSession } from '@/src/components/auth/DemoAuthGuard';

const PROFILE_PHOTO_KEY = 'als-student-profile-photo';
const PROFILE_PHOTO_EVENT = 'als-student-profile-photo-updated';
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export default function StudentProfilePage() {
  const [identity, setIdentity] = useState('ALS Learner');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const session = getDemoSession();
    if (session?.identity) setIdentity(session.identity);
    setProfilePhoto(localStorage.getItem(PROFILE_PHOTO_KEY));
  }, []);

  const initials = identity
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AL';

  const notifyPhotoChanged = () => {
    window.dispatchEvent(new Event(PROFILE_PHOTO_EVENT));
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage('');

    if (!file.type.startsWith('image/')) {
      setMessage('Please choose an image file.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setMessage('Please choose an image smaller than 2 MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) return;

      try {
        localStorage.setItem(PROFILE_PHOTO_KEY, result);
        setProfilePhoto(result);
        setMessage('Profile picture updated.');
        notifyPhotoChanged();
      } catch {
        setMessage('The image could not be saved. Try a smaller file.');
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const removePhoto = () => {
    localStorage.removeItem(PROFILE_PHOTO_KEY);
    setProfilePhoto(null);
    setMessage('Profile picture removed.');
    notifyPhotoChanged();
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Student account</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">My Profile</h1>
        <p className="mt-2 text-sm text-slate-500">Update your student profile picture.</p>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="h-28 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 sm:h-36" />

        <div className="px-5 pb-8 sm:px-8">
          <div className="-mt-14 flex flex-col gap-6 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[26px] border-4 border-white bg-slate-100 shadow-lg sm:h-32 sm:w-32">
                {profilePhoto ? (
                  <Image
                    src={profilePhoto}
                    alt="Student profile picture"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 text-3xl font-extrabold text-white">
                    {initials}
                  </div>
                )}

                <div className="pointer-events-none absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-blue-600 shadow-sm">
                  <Camera size={16} />
                </div>
              </div>

              <div className="pb-1">
                <h2 className="max-w-lg break-words text-xl font-extrabold text-slate-900 sm:text-2xl">{identity}</h2>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <UserRound size={15} />
                  Student
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 max-w-2xl rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
            <h3 className="text-sm font-bold text-slate-900">Profile picture</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Choose a JPG, PNG, or other image file up to 2 MB. This demo saves the picture only in this browser.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <ImagePlus size={17} />
                {profilePhoto ? 'Change picture' : 'Upload picture'}
              </button>

              {profilePhoto && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={17} />
                  Remove picture
                </button>
              )}
            </div>

            {message && (
              <p className={`mt-4 text-sm font-medium ${message.includes('updated') || message.includes('removed') ? 'text-emerald-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
