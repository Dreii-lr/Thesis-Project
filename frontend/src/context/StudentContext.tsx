'use client';

import React, { createContext, useContext, useState } from 'react';
import { Student, mockStudents as initialStudents } from '@/src/data/mockStudents';

type StudentContextType = {
  students: Student[];
  addStudent: (student: Omit<Student, 'id'>) => void;
  updateStudent: (id: string, studentData: Partial<Student>) => void;
};

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const [students, setStudents] = useState<Student[]>(initialStudents);

  const addStudent = (studentData: Omit<Student, 'id'>) => {
    // Generate a simple mock ID for the prototype (e.g., ALS-0004)
    const newId = `ALS-${String(students.length + 1).padStart(4, '0')}`;
    setStudents((prev) => [...prev, { ...studentData, id: newId }]);
  };

  const updateStudent = (id: string, updatedData: Partial<Student>) => {
    setStudents((prev) => 
      prev.map((student) => (student.id === id ? { ...student, ...updatedData } : student))
    );
  };

  return (
    <StudentContext.Provider value={{ students, addStudent, updateStudent }}>
      {children}
    </StudentContext.Provider>
  );
}

export const useStudents = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudents must be used within a StudentProvider');
  }
  return context;
};