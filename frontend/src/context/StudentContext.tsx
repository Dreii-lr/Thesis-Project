'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import {
  createStudentInApi,
  fetchStudentsFromApi,
  updateStudentInApi,
  type Student,
  type StudentCreatePayload,
  type StudentUpdatePayload,
} from '@/src/lib/students-api';

interface StudentContextType {
  students: Student[];
  isLoading: boolean;
  error: string | null;
  refreshStudents: () => Promise<void>;
  addStudent: (studentData: StudentCreatePayload) => Promise<Student>;
  updateStudent: (
    id: string,
    updatedData: StudentUpdatePayload
  ) => Promise<Student>;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const requestVersion = useRef(0);

  const refreshStudents = useCallback(async () => {
    const version = ++requestVersion.current;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchStudentsFromApi();
      if (version === requestVersion.current) setStudents(data);
    } catch (err: unknown) {
      if (version !== requestVersion.current) return;
      setStudents([]);
      setError(
        err instanceof Error ? err.message : 'Failed to load students from API.'
      );
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) return refreshStudents(); });
    return () => { active = false; requestVersion.current += 1; };
  }, [refreshStudents]);

  const addStudent = async (
    studentData: StudentCreatePayload
  ): Promise<Student> => {
    const created = await createStudentInApi(studentData);
    setStudents((prev) => [created, ...prev]);
    return created;
  };

  const updateStudent = async (
    id: string,
    updatedData: StudentUpdatePayload
  ): Promise<Student> => {
    const updated = await updateStudentInApi(id, updatedData);
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id || s.personal_details.user_id === id ? updated : s
      )
    );
    return updated;
  };

  return (
    <StudentContext.Provider
      value={{
        students,
        isLoading,
        error,
        refreshStudents,
        addStudent,
        updateStudent,
      }}
    >
      {children}
    </StudentContext.Provider>
  );
}

export function useStudents() {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudents must be used within a StudentProvider');
  }
  return context;
}