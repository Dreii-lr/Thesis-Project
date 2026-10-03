'use client';

import { useState } from 'react';
import AttendanceRecordsList from '@/src/components/layout/teacher/attendance/AttendanceRecordsList';
import TakeAttendanceView from '@/src/components/layout/teacher/attendance/TakeAttendanceView';
import NewRecordModal from '@/src/components/ui/teacher/attendance/NewRecordModal';

export default function AttendancePage() {
  // Navigation State
  const [currentView, setCurrentView] = useState<'list' | 'take_attendance'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Data to pass to the Take Attendance View
  const [activeSession, setActiveSession] = useState<{ date: string; level: string; subject: string } | null>(null);

  // Opens the Take Attendance screen with the provided configuration
  const startSession = (date: string, level: string, subject: string) => {
    setActiveSession({ date, level, subject });
    setIsModalOpen(false);
    setCurrentView('take_attendance');
  };

  return (
    <>
      {currentView === 'list' && (
        <AttendanceRecordsList 
          onNewRecord={() => setIsModalOpen(true)}
          onViewRecord={(date, level, subject) => startSession(date, level, subject)}
        />
      )}

      {currentView === 'take_attendance' && activeSession && (
        <TakeAttendanceView 
          date={activeSession.date}
          level={activeSession.level}
          subject={activeSession.subject}
          onBack={() => setCurrentView('list')}
        />
      )}

      {/* Global Modals */}
      <NewRecordModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStartRecording={startSession}
      />
    </>
  );
}