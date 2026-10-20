'use client';

import { useAuth } from '@/src/context/AuthContext';
import TeacherFlashcardDashboard from '@/src/components/flashcards/TeacherFlashcardDashboard';

export default function AdminFlashcardsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm text-slate-500">
        Opening curriculum flashcards…
      </div>
    );
  }

  const adminName =
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    'ALS Admin';

  return (
    <TeacherFlashcardDashboard
      authorName={adminName}
      authorId={user?.user_id}
      authorRole="admin"
    />
  );
}
