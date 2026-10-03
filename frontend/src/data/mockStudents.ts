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

export type StudentAttendance = {
  id: string;
  date: string;
  subject: string;
  status: 'Present' | 'Absent' | 'Excused';
  remarks?: string;
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
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  suffix: string;
  user_category: 'junior' | 'senior' | 'elementary' | string;

  personal_details: {
    user_id: string;
    gender: string;
    birth_date: string;
    nationality: string;
    civil_status: string;
    religion: string;
    place_of_birth: string;
    lrn_number: string;
  };

  contact_details: {
    street_building_no: string;
    municipality: string;
    province: string;
    contact_no: string;
  };

  family_details: {
    mother_name: string;
    father_name: string;
    guardian_name: string;
    guardian_relation: string;
    contact_no: string;
  };

  // Academic & Portal Data
  readinessScore?: number;
  quizzes?: Quiz[];
  writtenActivities?: WrittenActivity[];
  documents?: EnrollmentDocument[];
  attendance?: StudentAttendance[];
};

export const formatCategoryLevel = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'junior':
      return 'Junior High School';
    case 'senior':
      return 'Senior High School';
    case 'elementary':
      return 'Elementary';
    default:
      return category || 'Junior High School';
  }
};

export const mockStudents: Student[] = [
  {
    id: 'ALS-0001',
    email: 'j.delacruz@als.edu.ph',
    first_name: 'Juan',
    middle_name: 'Reyes',
    last_name: 'Dela Cruz',
    suffix: '',
    user_category: 'junior',
    personal_details: {
      user_id: 'ALS-0001',
      gender: 'Male',
      birth_date: '2005-01-01',
      nationality: 'Filipino',
      civil_status: 'Single',
      religion: 'Catholic',
      place_of_birth: 'Sta. Cruz, Laguna',
      lrn_number: '109876543210',
    },
    contact_details: {
      street_building_no: 'Blk 4 Lot 12, Brgy. Batobal',
      municipality: 'Sta. Cruz',
      province: 'Laguna',
      contact_no: '09123456789',
    },
    family_details: {
      mother_name: 'Maria Dela Cruz',
      father_name: 'Pedro Dela Cruz',
      guardian_name: 'Pedro Dela Cruz',
      guardian_relation: 'Father',
      contact_no: '09198765432',
    },
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
          { questionNumber: 4, question: 'What is the primary mechanism that causes tectonic plates to move?', studentAnswer: 'Ocean currents', correctAnswer: 'Mantle convection' },
          { questionNumber: 7, question: 'Which layer of the Earth is entirely liquid?', studentAnswer: 'Inner core', correctAnswer: 'Outer core' },
          { questionNumber: 9, question: 'What type of plate boundary creates mountains like the Himalayas?', studentAnswer: 'Transform boundary', correctAnswer: 'Convergent boundary' },
          { questionNumber: 12, question: "What is the most abundant gas in the Earth's atmosphere?", studentAnswer: 'Oxygen', correctAnswer: 'Nitrogen' },
          { questionNumber: 14, question: 'Which rock type is formed from the cooling of magma?', studentAnswer: 'Sedimentary', correctAnswer: 'Igneous' },
          { questionNumber: 17, question: 'The process of water vapor turning into liquid water is called:', studentAnswer: 'Evaporation', correctAnswer: 'Condensation' },
          { questionNumber: 18, question: "What is the main driver of the Earth's water cycle?", studentAnswer: "The Moon's gravity", correctAnswer: "The Sun's energy" },
          { questionNumber: 20, question: 'Which human activity contributes most significantly to the enhanced greenhouse effect?', studentAnswer: 'Using aerosol sprays', correctAnswer: 'Burning fossil fuels' },
        ],
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
          { questionNumber: 3, question: 'The group of students _____ going on a field trip tomorrow.', studentAnswer: 'are', correctAnswer: 'is' },
        ],
      },
    ],
    writtenActivities: [
      { id: 'wa1', title: 'Essay: "Ang Pangarap Ko Sa Buhay"', subject: 'LS1', date: 'Sept 15, 2026', status: 'SUBMITTED', type: 'Essay', content: 'Bata pa lang ako, pangarap ko na maging isang guro. Gusto kong makatulong sa mga batang hindi nakakapag-aral dahil sa hirap ng buhay. Sa tulong ng ALS, unti-unti kong natutupad ang mga pangarap na ito. Kahit mahirap mag-trabaho sa umaga at mag-aral sa gabi, kinakaya ko para sa pamilya ko. Ang edukasyon ang tanging susi para makaahon kami sa kahirapan.' },
      { id: 'wa2', title: 'Journal: Scientific Method', subject: 'LS2', date: 'Sept 10, 2026', status: 'SUBMITTED', type: 'Journal', content: 'This is the content for the scientific method journal entry.' },
      { id: 'wa3', title: 'Reflection: Math in Daily Life', subject: 'LS3', date: 'Sept 05, 2026', status: 'REVIEWED', type: 'Reflection', content: 'This is the content for the math in daily life reflection.' },
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
        format: 'JPG',
      },
      {
        id: 'doc2',
        type: 'identity',
        title: 'Proof of identity',
        description: 'PSA Birth Certificate, baptismal certificate, barangay ID, or any government-issued ID',
        status: 'Verified',
        uploadDate: 'Aug 15, 2026',
        size: '1.2 MB',
        format: 'PDF',
      },
      {
        id: 'doc3',
        type: 'id_photos',
        title: '2x2 ID photos',
        description: '2 pieces, white background (some centers may not require immediately)',
        status: 'Pending',
        uploadDate: 'Sept 22, 2026',
        size: '0.5 MB',
        format: 'PNG',
      },
      {
        id: 'doc4',
        type: 'form137',
        title: 'Form 137 / 138',
        description: 'Only if you previously attended formal school (helps determine your starting level)',
        status: 'Missing',
      },
    ],
    attendance: [
      { id: 'att1', date: 'Sept 24, 2026', subject: 'LS1: Communication Skills', status: 'Present' },
      { id: 'att2', date: 'Sept 23, 2026', subject: 'LS1: Communication Skills', status: 'Present' },
      { id: 'att3', date: 'Sept 21, 2026', subject: 'LS3: Mathematical & Problem Solving', status: 'Present' },
      { id: 'att4', date: 'Sept 18, 2026', subject: 'LS1: Communication Skills', status: 'Absent', remarks: 'Sick leave (Medical cert provided)' },
      { id: 'att5', date: 'Sept 17, 2026', subject: 'LS2: Scientific Literacy', status: 'Present' },
      { id: 'att6', date: 'Sept 15, 2026', subject: 'LS1: Communication Skills', status: 'Excused', remarks: 'Family emergency' },
    ],
  },
  {
    id: 'ALS-0002',
    email: 'jobert.baldozino1@example.com',
    first_name: 'Jobert',
    middle_name: 'V',
    last_name: 'Baldozino',
    suffix: 'Jr.',
    user_category: 'junior',
    personal_details: {
      user_id: 'ALS-0002',
      gender: 'Male',
      birth_date: '2007-11-22',
      nationality: 'Filipino',
      civil_status: 'Single',
      religion: 'Christian',
      place_of_birth: 'Cebu City',
      lrn_number: '109876543211',
    },
    contact_details: {
      street_building_no: '456 Mabini Ave, Guadalupe',
      municipality: 'Cebu City',
      province: 'Cebu',
      contact_no: '09123456784',
    },
    family_details: {
      mother_name: 'Teresa Baldozino',
      father_name: 'Jobert Baldozino Sr.',
      guardian_name: 'Teresa Baldozino',
      guardian_relation: 'Mother',
      contact_no: '09223334444',
    },
    readinessScore: 85,
    quizzes: [],
    writtenActivities: [],
  },
  {
    id: 'ALS-0003',
    email: 'kulasasubas188@example.com',
    first_name: 'Kulas',
    middle_name: 'M',
    last_name: 'Batumbakal',
    suffix: '',
    user_category: 'junior',
    personal_details: {
      user_id: 'ALS-0003',
      gender: 'Male',
      birth_date: '2009-02-10',
      nationality: 'Filipino',
      civil_status: 'Single',
      religion: 'Catholic',
      place_of_birth: 'Davao',
      lrn_number: '109876543212',
    },
    contact_details: {
      street_building_no: '789 Bonifacio St, Poblacion',
      municipality: 'Davao City',
      province: 'Davao del Sur',
      contact_no: '09123456787',
    },
    family_details: {
      mother_name: 'Elena Batumbakal',
      father_name: 'Ricardo Batumbakal',
      guardian_name: 'Elena Batumbakal',
      guardian_relation: 'Mother',
      contact_no: '09176543210',
    },
    readinessScore: 42,
    quizzes: [],
    writtenActivities: [],
  },
];