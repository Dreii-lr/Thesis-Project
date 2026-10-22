'use client';

import Image from 'next/image';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

import { useOptionalAuth } from '@/src/context/AuthContext';
import {
  uploadProfilePictureApi,
  deleteProfilePictureApi,
} from '@/src/lib/auth-api';

const PROFILE_PHOTO_KEY = 'als-student-profile-photo';
const PROFILE_PHOTO_EVENT = 'als-student-profile-photo-updated';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB (matching backend validation)

export default function StudentProfilePage() {
  const auth = useOptionalAuth();
  const user = auth?.user;

  const identity = user
    ? user.full_name ||
      [user.first_name, user.last_name].filter(Boolean).join(' ').trim() ||
      user.email ||
      String(user.user_id || 'ALS Learner')
    : 'ALS Learner';

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // If user has a cloud photo, prefer it; otherwise check localStorage
    if (user?.profile_url?.public_url) {
      setProfilePhoto(user.profile_url.public_url);
    } else {
      setProfilePhoto(localStorage.getItem(PROFILE_PHOTO_KEY));
    }
  }, [user?.profile_url?.public_url]);

  const initials = identity
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AL';

  const notifyPhotoChanged = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(PROFILE_PHOTO_EVENT));
    }
  };

  const currentPhoto = user?.profile_url?.public_url || profilePhoto;

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage('');

    if (!file.type.startsWith('image/')) {
      setMessage('Please choose an image file (JPG, PNG, or WebP).');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setMessage('Please choose an image smaller than 5 MB.');
      event.target.value = '';
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedUser = await uploadProfilePictureApi(file);
      const newUrl = updatedUser.profile_url?.public_url;
      if (newUrl) {
        setProfilePhoto(newUrl);
        try {
          localStorage.setItem(PROFILE_PHOTO_KEY, newUrl);
        } catch {
          /* ignore storage error */
        }
      }
      if (auth?.refreshUser) {
        await auth.refreshUser();
      }
      setMessage('Profile picture updated successfully.');
      notifyPhotoChanged();
    } catch (err: unknown) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'Unable to upload profile picture. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
      event.target.value = '';
    }
  };

  const removePhoto = async () => {
    setIsSubmitting(true);
    setMessage('');

    try {
      await deleteProfilePictureApi();
      setProfilePhoto(null);
      try {
        localStorage.removeItem(PROFILE_PHOTO_KEY);
      } catch {
        /* ignore storage error */
      }
      if (auth?.refreshUser) {
        await auth.refreshUser();
      }
      setMessage('Profile picture removed.');
      notifyPhotoChanged();
    } catch (err: unknown) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'Unable to remove profile picture. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Student account</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-2xl">My Profile</h1>
        <p className="mt-2 text-sm text-slate-500">Update your student profile picture.</p>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="px-6 pb-8 sm:px-8">
          <div className="pt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {currentPhoto ? (
                  <Image
                    src={currentPhoto}
                    alt="Student profile picture"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-blue-50 text-2xl font-semibold text-blue-700">
                    {initials}
                  </div>
                )}

              </div>

              <div className="pb-1">
                <h2 className="max-w-lg break-words text-lg font-semibold text-slate-900 sm:text-2xl">{identity}</h2>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">

                  Student
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 max-w-2xl border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-slate-900"><label htmlFor="student-profile-photo">Profile picture</label></h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Choose a JPG, PNG, or WebP image file up to 5 MB. Your picture will be saved to your account.
            </p>

            <input
              id="student-profile-photo"
              aria-label="Profile picture"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handlePhotoChange}
              disabled={isSubmitting}
              className="hidden"
            />

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>

                    Uploading...
                  </>
                ) : (
                  <>

                    {currentPhoto ? 'Change picture' : 'Upload picture'}
                  </>
                )}
              </button>

              {currentPhoto && (
                <button
                  type="button"
                  onClick={removePhoto}
                  disabled={isSubmitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                >

                  Remove picture
                </button>
              )}
            </div>

            {message && (
              <p className={`mt-4 text-sm font-medium ${message.includes('success') || message.includes('removed') || message.includes('updated') ? 'text-emerald-700' : 'text-red-600'}`}>
                {message}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
