'use client';

import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getUserCategory, type UserCategoryDetails } from '@/src/lib/user-categories-api';
import { programSubjects } from '@/src/lib/student-subjects';
import { useApiData } from '@/src/lib/use-api-data';
import type { SubjectRecord } from '@/src/lib/subjects-api';

interface StudentSubjectsContextType {
  program: UserCategoryDetails | null;
  subjects: SubjectRecord[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const StudentSubjectsContext = createContext<StudentSubjectsContextType | null>(null);

export function StudentSubjectsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const programCode = typeof user?.user_category === 'string' ? user.user_category.trim() : '';
  return <SubjectsProvider key={`${user?.user_id || user?.email}:${programCode}`} programCode={programCode}>{children}</SubjectsProvider>;
}

function SubjectsProvider({ children, programCode }: { children: ReactNode; programCode: string }) {
  const load = useCallback(() => {
    if (!programCode) return Promise.reject(new Error('Your account has no learning program assigned. Please contact your teacher.'));
    return getUserCategory(programCode).then(program => {
      if (program.category_id !== programCode && program.code.trim().toUpperCase() !== programCode.toUpperCase()) {
        throw new Error('The learning program does not match your account. Please refresh your session.');
      }
      return program;
    });
  }, [programCode]);
  const program = useApiData(load);
  return <StudentSubjectsContext.Provider value={{ program: program.data, subjects: program.data ? programSubjects(program.data) : [], loading: program.loading, error: program.error, reload: program.reload }}>
    {children}
  </StudentSubjectsContext.Provider>;
}

export function useStudentSubjects() {
  const context = useContext(StudentSubjectsContext);
  if (!context) throw new Error('useStudentSubjects must be used within StudentSubjectsProvider');
  return context;
}
