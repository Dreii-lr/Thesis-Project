export type RecordStatus = 'COMPLETED' | 'DRAFT';
export type AttendanceStatus = 'Present' | 'Absent' | 'Excused' | null;

export interface AttendanceSession {
  id: string;
  displayDate: string;
  rawDate: string;
  level: string;
  subject: string;
  presentCount: number;
  totalCount: number;
  status: RecordStatus;
}

export interface AttendanceRecord {
  status: AttendanceStatus;
  remarks: string;
}

export interface LibraryModule {
  id: string;
  filename: string;
  subject: string;
  level: string;
  uploadDate: string;
  status: 'Published' | 'Pending' | 'Uploading';
  progress?: number;
}

export const mockSessions: AttendanceSession[] = [
  { id: 's1', displayDate: 'Today, Sept 24, 2026', rawDate: '2026-09-24', level: 'Junior High School', subject: 'LS1: Communication Skills', presentCount: 5, totalCount: 5, status: 'COMPLETED' },
  { id: 's2', displayDate: 'Yesterday, Sept 23, 2026', rawDate: '2026-09-23', level: 'Junior High School', subject: 'LS1: Communication Skills', presentCount: 4, totalCount: 5, status: 'COMPLETED' },
  { id: 's3', displayDate: 'Tue, Sept 22, 2026', rawDate: '2026-09-22', level: 'Elementary', subject: 'LS2: Scientific Literacy', presentCount: 0, totalCount: 2, status: 'DRAFT' },
  { id: 's4', displayDate: 'Mon, Sept 21, 2026', rawDate: '2026-09-21', level: 'Junior High School', subject: 'LS3: Mathematical & Problem Solving', presentCount: 5, totalCount: 5, status: 'COMPLETED' },
  { id: 's5', displayDate: 'Fri, Sept 18, 2026', rawDate: '2026-09-18', level: 'Elementary', subject: 'LS1: Communication Skills', presentCount: 2, totalCount: 2, status: 'COMPLETED' },
  { id: 's6', displayDate: 'Thu, Sept 17, 2026', rawDate: '2026-09-17', level: 'Junior High School', subject: 'LS2: Scientific Literacy', presentCount: 4, totalCount: 5, status: 'COMPLETED' },
  { id: 's7', displayDate: 'Wed, Sept 16, 2026', rawDate: '2026-09-16', level: 'Elementary', subject: 'LS3: Mathematical & Problem Solving', presentCount: 2, totalCount: 2, status: 'COMPLETED' },
  { id: 's8', displayDate: 'Tue, Sept 15, 2026', rawDate: '2026-09-15', level: 'Junior High School', subject: 'LS1: Communication Skills', presentCount: 3, totalCount: 5, status: 'COMPLETED' },
  { id: 's9', displayDate: 'Mon, Sept 14, 2026', rawDate: '2026-09-14', level: 'Elementary', subject: 'LS2: Scientific Literacy', presentCount: 1, totalCount: 2, status: 'COMPLETED' },
  { id: 's10', displayDate: 'Fri, Sept 11, 2026', rawDate: '2026-09-11', level: 'Junior High School', subject: 'LS3: Mathematical & Problem Solving', presentCount: 5, totalCount: 5, status: 'COMPLETED' },
  { id: 's11', displayDate: 'Thu, Sept 10, 2026', rawDate: '2026-09-10', level: 'Elementary', subject: 'LS1: Communication Skills', presentCount: 0, totalCount: 2, status: 'DRAFT' },
  { id: 's12', displayDate: 'Wed, Sept 09, 2026', rawDate: '2026-09-09', level: 'Junior High School', subject: 'LS2: Scientific Literacy', presentCount: 5, totalCount: 5, status: 'COMPLETED' },
];


export const mockLibrary: LibraryModule[] = [
  { 
    id: 'm1', 
    filename: 'Basic Grammar Framework.pdf', 
    subject: 'LS1: Comm. Skills', 
    level: 'Junior High School', 
    uploadDate: 'Sep 20, 2026', 
    status: 'Published' 
  }
];