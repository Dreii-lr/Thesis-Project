import { mockStudents as roster } from './mockStudents';
export type TargetCategory = 'elementary' | 'junior' | 'basic_literacy';
export type AssessmentType = 'QUIZ' | 'EXAM' | 'ACTIVITY';
export type AssessmentStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';
export type QuestionCategoryType =
  'Multiple Choice' | 'True or False' | 'Matching Type';

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

export interface AssessmentCreatePayload {
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
}

export type AssessmentUpdatePayload = Omit<
  AssessmentCreatePayload,
  'assessment_type' | 'is_ai_generated' | 'materials'
>;

// UI metadata is stored locally, never included in a POST or PUT request body.
export interface AssessmentPayload extends AssessmentCreatePayload {
  id?: string;
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

export const mockStudents: Student[] = roster.map((s) => ({
  id: s.id,
  name: s.first_name + ' ' + s.last_name,
  target_category:
    s.user_category === 'elementary'
      ? 'elementary'
      : s.user_category === 'basic_literacy'
        ? 'basic_literacy'
        : 'junior',
}));

export const CATEGORY_LABELS: Record<TargetCategory, string> = {
  elementary: 'Elementary',
  junior: 'Junior High School',
  basic_literacy: 'Basic Literacy Program',
};

export const initialTasks: AssessmentPayload[] = [
  {
    id: 'assess_001',
    title: 'Computer Hardware & Storage Quiz',
    description:
      'Read each item carefully. Select the best letter for Multiple Choice and match the hardware components in Column A to Column B.',
    subject_code: 'ALS-LS6-DIGITAL',
    target_category: 'junior',
    assessment_type: 'QUIZ',
    status: 'ACTIVE',
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
    description:
      'Complete all sections of the periodic exam within the allotted schedule.',
    subject_code: 'ALS-LS1-COMM',
    target_category: 'elementary',
    assessment_type: 'EXAM',
    status: 'ACTIVE',
    start_date: '2026-10-10T08:00:00.000Z',
    end_date: '2026-10-10T10:00:00.000Z',
    grace_period_minutes: 10,
    duration_minutes: 120,
    max_score: 5,
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
    submissions: 0,
    assign_type: 'all',
    assigned_student_ids: [],
  },
  {
    id: 'assess_003',
    title: 'Reading & Functional Literacy Worksheet',
    description:
      'Download the attached PDF worksheet, answer the exercises, and upload your completed work before the deadline.',
    subject_code: 'ALS-BLP-101',
    target_category: 'basic_literacy',
    assessment_type: 'ACTIVITY',
    status: 'ACTIVE',
    start_date: '2026-10-05T09:42:27.185Z',
    end_date: '2026-10-08T23:59:00.000Z',
    grace_period_minutes: 0,
    duration_minutes: 0,
    max_score: 100,
    is_ai_generated: false,
    categories_data: [],
    materials: [
      {
        file_name: 'BLP_Reading_Practice.txt',
        file_url:
          'data:text/plain,Read%20the%20words%20family%2C%20home%2C%20school.%20Write%20three%20sentences.',
        file_type: 'text/plain',
        file_size_bytes: 68,
      },
    ],
    subject: 'ALS-BLP-101',
    type: 'Activity',
    deadline: 'Oct 8, 2026\n11:59 PM',
    submissions: 0,
    assign_type: 'specific',
    assigned_student_ids: ['ALS-0006'],
  },
];
initialTasks[0].submissions = 2;
initialTasks[2].submissions = 1;
initialTasks.push({
  ...initialTasks[1],
  id: 'assess_004',
  title: 'Communication Skills Practice Exam',
  start_date: '2026-10-02T01:00:00Z',
  end_date: '2026-10-02T03:00:00Z',
  deadline: 'Oct 2, 2026',
  submissions: 1,
});

// POST /api/v1/assessments/ body. Explicit fields keep UI metadata out of JSON.
export function toAssessmentCreatePayload(
  task: AssessmentCreatePayload,
): AssessmentCreatePayload {
  return {
    ...toAssessmentUpdatePayload(task),
    assessment_type: task.assessment_type,
    is_ai_generated: task.is_ai_generated,
    materials: task.materials.map((material) => ({
      file_name: material.file_name,
      file_url: material.file_url,
      file_type: material.file_type,
      file_size_bytes: material.file_size_bytes,
    })),
  };
}

// PUT /api/v1/assessments/{assessment_id} body; the ID belongs in the route.
export function toAssessmentUpdatePayload(
  task: AssessmentUpdatePayload,
): AssessmentUpdatePayload {
  return {
    title: task.title,
    description: task.description,
    subject_code: task.subject_code,
    target_category: task.target_category,
    status: task.status,
    start_date: task.start_date,
    end_date: task.end_date,
    grace_period_minutes: task.grace_period_minutes,
    duration_minutes: task.duration_minutes,
    max_score: task.max_score,
    categories_data: task.categories_data.map((category) => ({
      category_id: category.category_id,
      type: category.type,
      pool_size: category.pool_size,
      required_count: category.required_count,
      points_per_item: category.points_per_item,
      is_expanded: category.is_expanded,
      distractors: [...category.distractors],
      questions: category.questions.map((question) => ({
        id: question.id,
        text: question.text,
        options: [...question.options],
        correct_answer: question.correct_answer,
        premise: question.premise,
        match: question.match,
      })),
    })),
  };
}

export const mockAssessmentCreatePayloads = initialTasks.map(
  toAssessmentCreatePayload,
);
export const mockAssessmentUpdatePayloads = initialTasks.map(
  toAssessmentUpdatePayload,
);
