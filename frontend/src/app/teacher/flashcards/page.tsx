'use client';

import { useAuth } from '@/src/context/AuthContext';
import TeacherFlashcardDashboard from '@/src/components/flashcards/TeacherFlashcardDashboard';

export default function TeacherFlashcardsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm text-slate-500">
        Opening flashcards workspace…
      </div>
    );
  }

  const teacherName =
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    'Teacher';

  return (
    <TeacherFlashcardDashboard
      authorName={teacherName}
      authorId={user?.user_id}
      authorRole="teacher"
    />
  );
}
