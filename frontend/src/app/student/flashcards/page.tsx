'use client';

import { useOptionalAuth } from '@/src/context/AuthContext';
import FlashcardLibrary from '@/src/components/flashcards/FlashcardLibrary';
import StudentLoading from '@/src/components/layout/student/StudentLoading';

export default function FlashcardsPage() {
  const auth = useOptionalAuth();
  if (auth?.isLoading) return <StudentLoading label="Opening your flashcards..." />;
  const ownerId = auth?.user?.user_id;
  if (!ownerId) return <p role="alert" className="p-8 text-sm text-red-700">Your student profile is unavailable. Reload the page to open your study sets.</p>;
  return <FlashcardLibrary key={ownerId} ownerId={ownerId} />;
}
