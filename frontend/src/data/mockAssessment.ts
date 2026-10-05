export type TargetCategory = 'elementary' | 'junior_high_school' | 'basic_literacy_program';
export type AssessmentType = 'QUIZ' | 'EXAM' | 'ACTIVITY';
export type AssessmentStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'ACTIVE';
export type QuestionCategoryType = 'Multiple Choice' | 'True or False' | 'Matching Type';

export interface QuestionPayload {
  id: string;
  text: string;
  options: string[];
  correct_answer: string;
  premise: string;
  match: string;
}

export interface CategoryDataPayload {
  category_id: string;
  type: QuestionCategoryType | string;
  pool_size: number;
  required_count: number;
  points_per_item: number;
  is_expanded: boolean;
  distractors: string[];
  questions: QuestionPayload[];
}

export interface MaterialPayload {
  file_name: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number;
}

export interface AssessmentPayload {
  id?: string;
  title: string;
  description: string;
  subject_code: string;
  target_category: TargetCategory;
  assessment_type: AssessmentType;
  status: AssessmentStatus;
  start_date: string;
  end_date: string;
  grace_period_minutes: number;
  duration_minutes: number;
  max_score: number;
  is_ai_generated: boolean;
  categories_data: CategoryDataPayload[];
  materials: MaterialPayload[];

  // Optional UI Helper Fields
  subject?: string;
  type?: 'Quiz' | 'Exam' | 'Activity' | AssessmentType;
  deadline?: string;
  submissions?: number;
  assign_type?: 'all' | 'specific';
  assigned_student_ids?: string[];
}

export type Task = AssessmentPayload;

export interface Student {
  id: string;
  name: string;
  target_category: TargetCategory;
}

export const mockStudents: Student[] = [
  { id: 'stu-1', name: 'Juan Dela Cruz', target_category: 'elementary' },
  { id: 'stu-2', name: 'Maria Clara', target_category: 'elementary' },
  { id: 'stu-3', name: 'Jose Rizal', target_category: 'junior_high_school' },
  { id: 'stu-4', name: 'Andres Bonifacio', target_category: 'junior_high_school' },
  { id: 'stu-5', name: 'Gabriela Silang', target_category: 'junior_high_school' },
  { id: 'stu-6', name: 'Melchora Aquino', target_category: 'basic_literacy_program' },
  { id: 'stu-7', name: 'Apolinario Mabini', target_category: 'basic_literacy_program' },
];

export const CATEGORY_LABELS: Record<TargetCategory, string> = {
  elementary: 'Elementary',
  junior_high_school: 'Junior High School',
  basic_literacy_program: 'Basic Literacy Program',
};

export const initialTasks: AssessmentPayload[] = [
  {
    id: 'assess_001',
    title: 'Computer Hardware & Storage Quiz',
    description:
      'Read each item carefully. Select the best letter for Multiple Choice and match the hardware components in Column A to Column B.',
    subject_code: 'ALS-LS6-DIGITAL',
    target_category: 'junior_high_school',
    assessment_type: 'QUIZ',
    status: 'PENDING',
    start_date: '2026-10-06T08:00:00.000Z',
    end_date: '2026-10-06T10:00:00.000Z',
    grace_period_minutes: 15,
    duration_minutes: 60,
    max_score: 10,
    is_ai_generated: false,
    categories_data: [
      {
        category_id: 'cat_mc_01',
        type: 'Multiple Choice',
        pool_size: 2,
        required_count: 2,
        points_per_item: 2,
        is_expanded: true,
        distractors: [],
        questions: [
          {
            id: 'q_mc_1',
            text: 'Which computer component is considered the brain of the computer?',
            options: [
              'Hard Disk Drive',
              'Central Processing Unit (CPU)',
              'Power Supply Unit',
              'Monitor',
            ],
            correct_answer: 'B',
            premise: '',
            match: '',
          },
          {
            id: 'q_mc_2',
            text: 'Which of the following is an example of an input device?',
            options: ['Keyboard', 'Printer', 'Speaker', 'Projector'],
            correct_answer: 'A',
            premise: '',
            match: '',
          },
        ],
      },
      {
        category_id: 'cat_mt_01',
        type: 'Matching Type',
        pool_size: 3,
        required_count: 3,
        points_per_item: 2,
        is_expanded: true,
        distractors: ['Motherboard', 'Power Supply Unit'],
        questions: [
          {
            id: 'q_mt_1',
            text: '',
            options: [],
            correct_answer: '',
            premise: 'Primary Storage',
            match: 'RAM (Random Access Memory)',
          },
          {
            id: 'q_mt_2',
            text: '',
            options: [],
            correct_answer: '',
            premise: 'Central Processing Unit',
            match: 'CPU (Central Processing Unit)',
          },
          {
            id: 'q_mt_3',
            text: '',
            options: [],
            correct_answer: '',
            premise: 'Permanent Data Storage',
            match: 'SSD (Solid State Drive)',
          },
        ],
      },
    ],
    materials: [],
    subject: 'ALS-LS6-DIGITAL',
    type: 'Quiz',
    deadline: 'Oct 6, 8:00 AM to\nOct 6, 10:00 AM',
    submissions: 0,
    assign_type: 'all',
    assigned_student_ids: [],
  },
  {
    id: 'assess_002',
    title: 'First Quarter Periodic Examination',
    description: 'Complete all sections of the periodic exam within the allotted schedule.',
    subject_code: 'ALS-LS1-COMM',
    target_category: 'elementary',
    assessment_type: 'EXAM',
    status: 'PUBLISHED',
    start_date: '2026-10-10T08:00:00.000Z',
    end_date: '2026-10-10T10:00:00.000Z',
    grace_period_minutes: 10,
    duration_minutes: 120,
    max_score: 15,
    is_ai_generated: false,
    categories_data: [
      {
        category_id: 'cat_tf_02',
        type: 'True or False',
        pool_size: 1,
        required_count: 1,
        points_per_item: 5,
        is_expanded: true,
        distractors: [],
        questions: [
          {
            id: 'q_tf_201',
            text: 'A verb is a word that describes an action, state, or occurrence.',
            options: ['True', 'False'],
            correct_answer: 'True',
            premise: '',
            match: '',
          },
        ],
      },
    ],
    materials: [],
    subject: 'ALS-LS1-COMM',
    type: 'Exam',
    deadline: 'Oct 10, 8:00 AM to\nOct 10, 10:00 AM',
    submissions: 12,
    assign_type: 'all',
    assigned_student_ids: ['stu-1', 'stu-2'],
  },
  {
    id: 'assess_003',
    title: 'Reading & Functional Literacy Worksheet',
    description:
      'Download the attached PDF worksheet, answer the exercises, and upload your completed work before the deadline.',
    subject_code: 'ALS-BLP-101',
    target_category: 'basic_literacy_program',
    assessment_type: 'ACTIVITY',
    status: 'DRAFT',
    start_date: '2026-10-05T09:42:27.185Z',
    end_date: '2026-10-08T23:59:00.000Z',
    grace_period_minutes: 0,
    duration_minutes: 0,
    max_score: 100,
    is_ai_generated: false,
    categories_data: [],
    materials: [
      {
        file_name: 'BLP_Reading_Comprehension_Module_1.pdf',
        file_url: 'https://storage.example.com/als/materials/BLP_Reading_Comprehension_Module_1.pdf',
        file_type: 'application/pdf',
        file_size_bytes: 1458200,
      },
    ],
    subject: 'ALS-BLP-101',
    type: 'Activity',
    deadline: 'Oct 8, 2026\n11:59 PM',
    submissions: 0,
    assign_type: 'specific',
    assigned_student_ids: ['stu-6'],
  },
];