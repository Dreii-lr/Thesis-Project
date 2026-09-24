export type Quiz = {
  id: string;
  title: string;
  score: number;
  totalItems: number;
  type: 'Summative' | 'Quiz';
  status: 'Needs Review' | 'Passed' | 'Failed';
  subject: string;
  date: string;
  mistakes?: number;
  mistakeDetails?: {
    questionNumber: number;
    question: string;
    studentAnswer: string;
    correctAnswer: string;
  }[];
};

export type WrittenActivity = {
  id: string;
  title: string;
  subject: string;
  date: string;
  status: 'SUBMITTED' | 'REVIEWED' | 'GRADED';
  type: 'Essay' | 'Journal' | 'Reflection';
  content?: string;
};

export type EnrollmentDocument = {
  id: string;
  type: 'af2' | 'identity' | 'id_photos' | 'form137';
  title: string;
  description: string;
  status: 'Verified' | 'Pending' | 'Missing';
  uploadDate?: string;
  size?: string;
  format?: 'PDF' | 'JPG' | 'PNG';
};

export type Student = {
  id: string;
  level: string; 

  // Personal Details
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  gender: string;
  birthDate: string;
  nationality: string;
  civilStatus: string;
  religion: string;
  placeOfBirth: string;
  lrn: string;

  // Contact Details
  street: string;
  barangay: string;
  city: string;
  province: string;
  phone: string;
  email: string;

  // Family
  motherName: string;
  fatherName: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;

  // Academic Data (New!)
  readinessScore?: number;
  quizzes?: Quiz[];
  writtenActivities?: WrittenActivity[];
  documents?: EnrollmentDocument[];
};

export const mockStudents: Student[] = [
  { 
    id: 'ALS-0001', 
    level: 'Junior High School',
    firstName: 'Juan',
    middleName: 'Reyes',
    lastName: 'Dela Cruz',
    suffix: '',
    gender: 'Male',
    birthDate: '2005-01-01',
    nationality: 'Filipino',
    civilStatus: 'Single',
    religion: 'Catholic',
    placeOfBirth: 'Sta. Cruz, Laguna',
    lrn: '109876543210',
    street: 'Blk 4 Lot 12',
    barangay: 'Brgy. Batobal',
    city: 'Sta. Cruz',
    province: 'Laguna',
    email: 'j.delacruz@als.edu.ph', 
    phone: '09123456789',
    motherName: 'Maria Dela Cruz',
    fatherName: 'Pedro Dela Cruz',
    guardianName: 'Pedro Dela Cruz',
    guardianRelation: 'Father',
    guardianPhone: '09198765432',
    readinessScore: 68,
    quizzes: [
      { 
        id: 'q1', 
        title: 'Module 4: Earth Systems', 
        score: 12, 
        totalItems: 20, 
        type: 'Summative', 
        status: 'Needs Review', 
        subject: 'Science', 
        date: 'Sept. 3, 2026', 
        mistakes: 8,
        mistakeDetails: [
          { questionNumber: 4, question: "What is the primary mechanism that causes tectonic plates to move?", studentAnswer: "Ocean currents", correctAnswer: "Mantle convection" },
          { questionNumber: 7, question: "Which layer of the Earth is entirely liquid?", studentAnswer: "Inner core", correctAnswer: "Outer core" },
          { questionNumber: 9, question: "What type of plate boundary creates mountains like the Himalayas?", studentAnswer: "Transform boundary", correctAnswer: "Convergent boundary" },
          { questionNumber: 12, question: "What is the most abundant gas in the Earth's atmosphere?", studentAnswer: "Oxygen", correctAnswer: "Nitrogen" },
          { questionNumber: 14, question: "Which rock type is formed from the cooling of magma?", studentAnswer: "Sedimentary", correctAnswer: "Igneous" },
          { questionNumber: 17, question: "The process of water vapor turning into liquid water is called:", studentAnswer: "Evaporation", correctAnswer: "Condensation" },
          { questionNumber: 18, question: "What is the main driver of the Earth's water cycle?", studentAnswer: "The Moon's gravity", correctAnswer: "The Sun's energy" },
          { questionNumber: 20, question: "Which human activity contributes most significantly to the enhanced greenhouse effect?", studentAnswer: "Using aerosol sprays", correctAnswer: "Burning fossil fuels" }
        ]
      },
      { 
        id: 'q2', 
        title: 'Module 3: Subject-Verb Agreement', 
        score: 9, 
        totalItems: 10, 
        type: 'Quiz', 
        status: 'Passed', 
        subject: 'English', 
        date: 'Sept. 1, 2026',
        mistakes: 1,
        mistakeDetails: [
          { questionNumber: 3, question: "The group of students _____ going on a field trip tomorrow.", studentAnswer: "are", correctAnswer: "is" }
        ]
      },
    ],
    writtenActivities: [
      { id: 'wa1', title: 'Essay: "Ang Pangarap Ko Sa Buhay"', subject: 'LS1', date: 'Sept 15, 2026', status: 'SUBMITTED', type: 'Essay', content: "Bata pa lang ako, pangarap ko na maging isang guro. Gusto kong makatulong sa mga batang hindi nakakapag-aral dahil sa hirap ng buhay. Sa tulong ng ALS, unti-unti kong natutupad ang mga pangarap na ito. Kahit mahirap mag-trabaho sa umaga at mag-aral sa gabi, kinakaya ko para sa pamilya ko. Ang edukasyon ang tanging susi para makaahon kami sa kahirapan." },
      { id: 'wa2', title: 'Journal: Scientific Method', subject: 'LS2', date: 'Sept 10, 2026', status: 'SUBMITTED', type: 'Journal', content: "This is the content for the scientific method journal entry." },
      { id: 'wa3', title: 'Reflection: Math in Daily Life', subject: 'LS3', date: 'Sept 05, 2026', status: 'REVIEWED', type: 'Reflection', content: "This is the content for the math in daily life reflection." }
    ],
    documents: [
      {
        id: 'doc1',
        type: 'af2',
        title: 'ALS Learner Registration Form (AF2)',
        description: 'Provided by the ALS Implementer at the learning center',
        status: 'Verified',
        uploadDate: 'Aug 15, 2026',
        size: '2.4 MB',
        format: 'JPG'
      },
      {
        id: 'doc2',
        type: 'identity',
        title: 'Proof of identity',
        description: "PSA Birth Certificate, baptismal certificate, barangay ID, or any government-issued ID",
        status: 'Verified',
        uploadDate: 'Aug 15, 2026',
        size: '1.2 MB',
        format: 'PDF'
      },
      {
        id: 'doc3',
        type: 'id_photos',
        title: '2x2 ID photos',
        description: '2 pieces, white background (some centers may not require immediately)',
        status: 'Pending',
        uploadDate: 'Sept 22, 2026',
        size: '0.5 MB',
        format: 'PNG'
      },
      {
        id: 'doc4',
        type: 'form137',
        title: 'Form 137 / 138',
        description: 'Only if you previously attended formal school (helps determine your starting level)',
        status: 'Missing'
      }
    ]
  },
  { 
    id: 'ALS-0002', 
    level: 'Junior High School',
    firstName: 'Jobert',
    middleName: 'V',
    lastName: 'Baldozino',
    suffix: 'Jr.',
    gender: 'Male',
    birthDate: '2007-11-22',
    nationality: 'Filipino',
    civilStatus: 'Single',
    religion: 'Christian',
    placeOfBirth: 'Cebu City',
    lrn: '109876543211',
    street: '456 Mabini Ave',
    barangay: 'Guadalupe',
    city: 'Cebu City',
    province: 'Cebu',
    email: 'jobert.baldozino1@example.com', 
    phone: '09123456784',
    motherName: 'Teresa Baldozino',
    fatherName: 'Jobert Baldozino Sr.',
    guardianName: 'Teresa Baldozino',
    guardianRelation: 'Mother',
    guardianPhone: '09223334444',
    readinessScore: 85,
    quizzes: [],
    writtenActivities: []
  },
  { 
    id: 'ALS-0003', 
    level: 'Junior High School',
    firstName: 'Kulas',
    middleName: 'M',
    lastName: 'Batumbakal',
    suffix: '',
    gender: 'Male',
    birthDate: '2009-02-10',
    nationality: 'Filipino',
    civilStatus: 'Single',
    religion: 'Catholic',
    placeOfBirth: 'Davao',
    lrn: '109876543212',
    street: '789 Bonifacio St',
    barangay: 'Poblacion',
    city: 'Davao City',
    province: 'Davao del Sur',
    email: 'kulasasubas188@example.com', 
    phone: '09123456787',
    motherName: 'Elena Batumbakal',
    fatherName: 'Ricardo Batumbakal',
    guardianName: 'Elena Batumbakal',
    guardianRelation: 'Mother',
    guardianPhone: '09176543210',
    readinessScore: 42,
    quizzes: [],
    writtenActivities: []
  },
];