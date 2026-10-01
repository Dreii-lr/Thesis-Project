export type TaskType = 'Activity' | 'Exam' | 'Quiz';
export type TaskStatus = 'Active' | 'Scheduled' | 'Draft';

export interface Task {
  id: string;
  title: string;
  subject: string;
  type: TaskType;
  deadline: string;
  submissions: number;
  needsGrading?: number;
  status: TaskStatus;
}

export interface Student {
  id: string;
  name: string;
  lrn: string;
  section: string;
}

export const mockSubjects = ['All Subjects', 'CS201 - Data Structures', 'DB101 - Databases', 'ENG101 - Comm Skills'];

export const mockStudents: Student[] = [
  { id: 's1', name: 'Alvarez, Sofia M.', lrn: '109283749201', section: 'Grade 10 - Section A' },
  { id: 's2', name: 'Bautista, Marcus T.', lrn: '109283749202', section: 'Grade 10 - Section A' },
  { id: 's3', name: 'Cruz, Isabella K.', lrn: '109283749203', section: 'Grade 10 - Section A' },
  { id: 's4', name: 'Domingo, Lucas R.', lrn: '109283749204', section: 'Grade 10 - Section A' },
  { id: 's5', name: 'Enriquez, Mateo J.', lrn: '109283749205', section: 'Grade 10 - Section A' },
];

export const initialTasks: Task[] = [
  { id: '1', title: 'Week 3: Data Structures Implementation', subject: 'CS201 - Data Structures', type: 'Activity', deadline: 'Oct 5, 2026\n11:59 PM', submissions: 32, needsGrading: 8, status: 'Active' },
  { id: '2', title: 'Midterm Examination', subject: 'CS201 - Data Structures', type: 'Exam', deadline: 'Oct 10, 2026\n11:59 PM', submissions: 0, status: 'Scheduled' },
  { id: '3', title: 'Chapter 4 Database Normalization', subject: 'DB101 - Databases', type: 'Quiz', deadline: 'Oct 2, 2026\n11:59 PM', submissions: 38, status: 'Active' },
  { id: '4', title: 'Final Project Proposal', subject: 'ENG101 - Comm Skills', type: 'Activity', deadline: 'Oct 15, 2026\n11:59 PM', submissions: 5, needsGrading: 5, status: 'Active' },
  { id: '5', title: 'SQL Joins Practice', subject: 'DB101 - Databases', type: 'Quiz', deadline: 'Oct 1, 2026\n11:59 PM', submissions: 40, status: 'Active' },
  { id: '6', title: 'Graph Traversal Algorithms', subject: 'CS201 - Data Structures', type: 'Activity', deadline: 'Oct 20, 2026\n11:59 PM', submissions: 0, status: 'Draft' },
  { id: '7', title: 'Pop Quiz: ER Diagrams', subject: 'DB101 - Databases', type: 'Quiz', deadline: 'Oct 8, 2026\n11:59 PM', submissions: 0, status: 'Scheduled' },
  { id: '8', title: 'Midterm Essay Draft', subject: 'ENG101 - Comm Skills', type: 'Activity', deadline: 'Oct 12, 2026\n11:59 PM', submissions: 12, needsGrading: 2, status: 'Active' },
];