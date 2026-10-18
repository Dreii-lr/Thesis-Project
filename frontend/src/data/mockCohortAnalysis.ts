/**
 * mockCohortAnalysis.ts
 *
 * Structured mock data for Assessment Analysis & AI Diagnostic Struggle Reports.
 * Strictly conforms to backend schemas in backend/src/app/features/assessments/analysis/schemas.py:
 * - AssessmentCohortAnalysisResponse
 * - StrugglingTopicSchema
 * - RecommendedLessonSchema
 * - StudentCohortBreakdownSchema
 * - CohortOverviewSchema
 */

export interface StudentCohortBreakdown {
  account_id: string;
  student_name: string;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  personal_struggling_topics: string[];
}

export interface StrugglingTopic {
  topic_name: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  error_rate_percent: number;
  description: string;
  misconception: string;
  affected_question_ids: string[];
  struggling_students: string[];
}

export interface RecommendedLesson {
  lesson_id: string;
  material_id?: string | null;
  module_title: string;
  lesson_title: string;
  main_topic: string;
  relevance_reason: string;
  similarity_score?: number;
}

export interface CohortOverview {
  total_students: number;
  class_average: number;
  passing_rate: number;
  performance_summary: string;
}

export interface AssessmentCohortAnalysisResponse {
  status: 'SUCCESS' | 'NO_TOPIC_FOUND';
  topic_found: boolean;
  message?: string | null;
  assessment_id: string;
  assessment_title: string;
  subject_code: string;
  target_category?: string | null;
  cohort_overview: CohortOverview;
  struggling_topics: StrugglingTopic[];
  recommended_lessons: RecommendedLesson[];
  student_breakdowns: StudentCohortBreakdown[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MockQuestionDistribution {
  answer: string;
  count: number;
  correct: boolean;
}

export interface MockQuestionResponse {
  account_id: string;
  student_name: string;
  answer: string;
  is_correct: boolean;
}

export interface MockQuestionItem {
  id: string;
  number: number;
  prompt: string;
  type: 'Multiple Choice' | 'Matching Type' | 'True or False' | 'Essay';
  expected: string;
  correct: number;
  incorrect: number;
  skipped: number;
  correct_rate: number;
  error_rate: number;
  distribution: MockQuestionDistribution[];
  responses: MockQuestionResponse[];
}

export interface MockAnalyzableAssessment {
  id: string;
  title: string;
  subject_code: string;
  subject_name: string;
  target_category: 'ELEMENTARY' | 'SECONDARY' | 'BLP';
  category_label: string;
  assessment_type: 'QUIZ' | 'EXAM' | 'TEST';
  status: 'COMPLETED';
  max_score: number;
  questions_count: number;
  questions: MockQuestionItem[];
  analysis: AssessmentCohortAnalysisResponse;
}

export const MOCK_ANALYZABLE_ASSESSMENTS: MockAnalyzableAssessment[] = [
  {
    id: 'assess_001',
    title: 'Computer Hardware & Storage Devices Quiz',
    subject_code: 'ALS-LS6-DIGITAL',
    subject_name: 'LS6: Digital Literacy',
    target_category: 'SECONDARY',
    category_label: 'Junior High School (Secondary)',
    assessment_type: 'QUIZ',
    status: 'COMPLETED',
    max_score: 10,
    questions_count: 5,
    questions: [
      {
        id: 'q_001',
        number: 1,
        prompt: 'Which computer component is considered the brain of the computer and executes instructions?',
        type: 'Multiple Choice',
        expected: 'B) Central Processing Unit (CPU)',
        correct: 18,
        incorrect: 2,
        skipped: 0,
        correct_rate: 90,
        error_rate: 10,
        distribution: [
          { answer: 'A) Hard Disk Drive', count: 1, correct: false },
          { answer: 'B) Central Processing Unit (CPU)', count: 18, correct: true },
          { answer: 'C) Power Supply Unit', count: 1, correct: false },
          { answer: 'D) Monitor Display', count: 0, correct: false },
        ],
        responses: [
          { account_id: 'ALS-2026-0001', student_name: 'Juan Dela Cruz', answer: 'B) Central Processing Unit (CPU)', is_correct: true },
          { account_id: 'ALS-2026-0002', student_name: 'Maria Clara Santos', answer: 'B) Central Processing Unit (CPU)', is_correct: true },
          { account_id: 'ALS-2026-0003', student_name: 'Crisostomo Ibarra', answer: 'B) Central Processing Unit (CPU)', is_correct: true },
          { account_id: 'ALS-2026-0004', student_name: 'Basilio Gomez', answer: 'A) Hard Disk Drive', is_correct: false },
          { account_id: 'ALS-2026-0005', student_name: 'Sisa Dimagiba', answer: 'B) Central Processing Unit (CPU)', is_correct: true },
        ],
      },
      {
        id: 'q_002',
        number: 2,
        prompt: 'Which memory type is volatile and loses its stored contents when the computer power is turned off?',
        type: 'Multiple Choice',
        expected: 'A) Random Access Memory (RAM)',
        correct: 6,
        incorrect: 14,
        skipped: 0,
        correct_rate: 30,
        error_rate: 70,
        distribution: [
          { answer: 'A) Random Access Memory (RAM)', count: 6, correct: true },
          { answer: 'B) Solid State Drive (SSD)', count: 11, correct: false },
          { answer: 'C) Read-Only Memory (ROM)', count: 3, correct: false },
          { answer: 'D) Flash Drive USB', count: 0, correct: false },
        ],
        responses: [
          { account_id: 'ALS-2026-0001', student_name: 'Juan Dela Cruz', answer: 'B) Solid State Drive (SSD)', is_correct: false },
          { account_id: 'ALS-2026-0002', student_name: 'Maria Clara Santos', answer: 'A) Random Access Memory (RAM)', is_correct: true },
          { account_id: 'ALS-2026-0003', student_name: 'Crisostomo Ibarra', answer: 'B) Solid State Drive (SSD)', is_correct: false },
          { account_id: 'ALS-2026-0004', student_name: 'Basilio Gomez', answer: 'B) Solid State Drive (SSD)', is_correct: false },
          { account_id: 'ALS-2026-0005', student_name: 'Sisa Dimagiba', answer: 'C) Read-Only Memory (ROM)', is_correct: false },
        ],
      },
      {
        id: 'q_003',
        number: 3,
        prompt: 'Match the primary function: "Long-term permanent storage of OS, applications, and learner files."',
        type: 'Multiple Choice',
        expected: 'C) Solid State Drive (SSD) / HDD',
        correct: 9,
        incorrect: 11,
        skipped: 0,
        correct_rate: 45,
        error_rate: 55,
        distribution: [
          { answer: 'A) Random Access Memory (RAM)', count: 8, correct: false },
          { answer: 'B) Cache Memory', count: 3, correct: false },
          { answer: 'C) Solid State Drive (SSD) / HDD', count: 9, correct: true },
          { answer: 'D) BIOS Chip', count: 0, correct: false },
        ],
        responses: [
          { account_id: 'ALS-2026-0001', student_name: 'Juan Dela Cruz', answer: 'A) Random Access Memory (RAM)', is_correct: false },
          { account_id: 'ALS-2026-0002', student_name: 'Maria Clara Santos', answer: 'C) Solid State Drive (SSD) / HDD', is_correct: true },
          { account_id: 'ALS-2026-0003', student_name: 'Crisostomo Ibarra', answer: 'C) Solid State Drive (SSD) / HDD', is_correct: true },
          { account_id: 'ALS-2026-0004', student_name: 'Basilio Gomez', answer: 'A) Random Access Memory (RAM)', is_correct: false },
          { account_id: 'ALS-2026-0005', student_name: 'Sisa Dimagiba', answer: 'A) Random Access Memory (RAM)', is_correct: false },
        ],
      },
      {
        id: 'q_004',
        number: 4,
        prompt: 'Which of the following is considered an input peripheral device?',
        type: 'Multiple Choice',
        expected: 'A) Keyboard and Mouse',
        correct: 19,
        incorrect: 1,
        skipped: 0,
        correct_rate: 95,
        error_rate: 5,
        distribution: [
          { answer: 'A) Keyboard and Mouse', count: 19, correct: true },
          { answer: 'B) Inkjet Printer', count: 1, correct: false },
          { answer: 'C) Stereo Speakers', count: 0, correct: false },
          { answer: 'D) Projector', count: 0, correct: false },
        ],
        responses: [
          { account_id: 'ALS-2026-0001', student_name: 'Juan Dela Cruz', answer: 'A) Keyboard and Mouse', is_correct: true },
          { account_id: 'ALS-2026-0002', student_name: 'Maria Clara Santos', answer: 'A) Keyboard and Mouse', is_correct: true },
          { account_id: 'ALS-2026-0003', student_name: 'Crisostomo Ibarra', answer: 'A) Keyboard and Mouse', is_correct: true },
          { account_id: 'ALS-2026-0004', student_name: 'Basilio Gomez', answer: 'A) Keyboard and Mouse', is_correct: true },
          { account_id: 'ALS-2026-0005', student_name: 'Sisa Dimagiba', answer: 'A) Keyboard and Mouse', is_correct: true },
        ],
      },
      {
        id: 'q_005',
        number: 5,
        prompt: 'True or False: Increasing RAM capacity permanently increases the amount of photos and videos you can save on your computer.',
        type: 'True or False',
        expected: 'False',
        correct: 7,
        incorrect: 13,
        skipped: 0,
        correct_rate: 35,
        error_rate: 65,
        distribution: [
          { answer: 'True', count: 13, correct: false },
          { answer: 'False', count: 7, correct: true },
        ],
        responses: [
          { account_id: 'ALS-2026-0001', student_name: 'Juan Dela Cruz', answer: 'True', is_correct: false },
          { account_id: 'ALS-2026-0002', student_name: 'Maria Clara Santos', answer: 'False', is_correct: true },
          { account_id: 'ALS-2026-0003', student_name: 'Crisostomo Ibarra', answer: 'False', is_correct: true },
          { account_id: 'ALS-2026-0004', student_name: 'Basilio Gomez', answer: 'True', is_correct: false },
          { account_id: 'ALS-2026-0005', student_name: 'Sisa Dimagiba', answer: 'True', is_correct: false },
        ],
      },
    ],
    analysis: {
      status: 'SUCCESS',
      topic_found: true,
      assessment_id: 'assess_001',
      assessment_title: 'Computer Hardware & Storage Devices Quiz',
      subject_code: 'ALS-LS6-DIGITAL',
      target_category: 'SECONDARY',
      cohort_overview: {
        total_students: 20,
        class_average: 6.1,
        passing_rate: 60.0,
        performance_summary:
          'Out of 20 enrolled Junior High School learners, 12 learners passed while 8 demonstrated critical difficulty distinguishing volatile primary memory (RAM) from non-volatile persistent storage (SSD/HDD). High scores were recorded on peripheral identification (95%), but 70% of the cohort misclassified RAM as permanent storage.',
      },
      struggling_topics: [
        {
          topic_name: 'Distinguishing Volatile Memory (RAM) vs. Persistent Storage (SSD/HDD)',
          severity: 'HIGH',
          error_rate_percent: 70.0,
          description:
            'Learners confuse temporary working memory used while running software with non-volatile disk drives used to save documents long-term.',
          misconception:
            'Learners associate the general word "Memory" with long-term storage capacity, believing that purchasing higher RAM expands phone/computer file saving space.',
          affected_question_ids: ['q_002', 'q_003', 'q_005'],
          struggling_students: [
            'Juan Dela Cruz',
            'Basilio Gomez',
            'Sisa Dimagiba',
            'Elias Salome',
            'Tarsilo Alasas',
            'Lucas Tinong',
            'Victoria Valenzuela',
            'Sinang Bernardo',
          ],
        },
        {
          topic_name: 'Storage Unit Functionality and Long-Term Retention',
          severity: 'MEDIUM',
          error_rate_percent: 55.0,
          description:
            'Understanding why files disappear if not saved to disk before power loss or system reboot.',
          misconception:
            'Learners believed that active applications automatically save directly onto RAM as permanent files without requiring a secondary storage write command.',
          affected_question_ids: ['q_003', 'q_005'],
          struggling_students: [
            'Juan Dela Cruz',
            'Basilio Gomez',
            'Sisa Dimagiba',
            'Tarsilo Alasas',
            'Lucas Tinong',
          ],
        },
      ],
      recommended_lessons: [
        {
          lesson_id: 'les-ls6-04',
          material_id: 'mat-comp-hard-01',
          module_title: 'Learning Strand 6: Digital Literacy Module 2',
          lesson_title: 'Aralin 2: Pangunahing Bahagi ng Kompyuter at mga Uri ng Memorya (RAM vs ROM vs Storage)',
          main_topic: 'Computer Hardware and Memory Hierarchy',
          relevance_reason:
            'Directly clarifies the distinction between temporary working memory (RAM) and permanent storage devices (SSD, HDD, USB) with visual real-life analogies.',
          similarity_score: 0.92,
        },
        {
          lesson_id: 'les-ls6-08',
          material_id: 'mat-comp-hard-02',
          module_title: 'Learning Strand 6: Digital Literacy Module 4',
          lesson_title: 'Aralin 4: Ligtas na Pag-iimbak at Pag-save ng mga File sa Local at Cloud Storage',
          main_topic: 'File Management and Storage Safety',
          relevance_reason:
            'Provides hands-on drills teaching learners why saving to persistent drive prevents data loss during unexpected device power cutoff.',
          similarity_score: 0.81,
        },
      ],
      student_breakdowns: [
        {
          account_id: 'ALS-2026-0001',
          student_name: 'Juan Dela Cruz',
          score: 4.0,
          max_score: 10.0,
          percentage: 40.0,
          passed: false,
          personal_struggling_topics: [
            'Distinguishing Volatile Memory (RAM) vs. Persistent Storage (SSD/HDD)',
            'Storage Unit Functionality and Long-Term Retention',
          ],
        },
        {
          account_id: 'ALS-2026-0002',
          student_name: 'Maria Clara Santos',
          score: 10.0,
          max_score: 10.0,
          percentage: 100.0,
          passed: true,
          personal_struggling_topics: [],
        },
        {
          account_id: 'ALS-2026-0003',
          student_name: 'Crisostomo Ibarra',
          score: 8.0,
          max_score: 10.0,
          percentage: 80.0,
          passed: true,
          personal_struggling_topics: [],
        },
        {
          account_id: 'ALS-2026-0004',
          student_name: 'Basilio Gomez',
          score: 4.0,
          max_score: 10.0,
          percentage: 40.0,
          passed: false,
          personal_struggling_topics: [
            'Distinguishing Volatile Memory (RAM) vs. Persistent Storage (SSD/HDD)',
            'Storage Unit Functionality and Long-Term Retention',
          ],
        },
        {
          account_id: 'ALS-2026-0005',
          student_name: 'Sisa Dimagiba',
          score: 4.0,
          max_score: 10.0,
          percentage: 40.0,
          passed: false,
          personal_struggling_topics: [
            'Distinguishing Volatile Memory (RAM) vs. Persistent Storage (SSD/HDD)',
            'Storage Unit Functionality and Long-Term Retention',
          ],
        },
        {
          account_id: 'ALS-2026-0006',
          student_name: 'Elias Salome',
          score: 6.0,
          max_score: 10.0,
          percentage: 60.0,
          passed: true,
          personal_struggling_topics: [
            'Distinguishing Volatile Memory (RAM) vs. Persistent Storage (SSD/HDD)',
          ],
        },
      ],
      created_at: '2026-10-18T02:15:00Z',
      updated_at: '2026-10-18T02:15:00Z',
    },
  },
  {
    id: 'assess_elem_01',
    title: 'Pagsusulit sa Patinig at Katinig ng Wikang Filipino',
    subject_code: 'ALS-LS1-COMM',
    subject_name: 'LS1: Communication Skills (Filipino)',
    target_category: 'ELEMENTARY',
    category_label: 'Elementary',
    assessment_type: 'QUIZ',
    status: 'COMPLETED',
    max_score: 15,
    questions_count: 5,
    questions: [
      {
        id: 'q_elem_001',
        number: 1,
        prompt: 'Alin sa mga sumusunod ang tamang baybay ng salita gamit ang wastong patinig sa gitna: "b_t_k" (batak)?',
        type: 'Multiple Choice',
        expected: 'A) a',
        correct: 14,
        incorrect: 2,
        skipped: 0,
        correct_rate: 87.5,
        error_rate: 12.5,
        distribution: [
          { answer: 'A) a', count: 14, correct: true },
          { answer: 'B) e', count: 1, correct: false },
          { answer: 'C) o', count: 1, correct: false },
        ],
        responses: [
          { account_id: 'ALS-2026-0101', student_name: 'Kiko Matsing', answer: 'A) a', is_correct: true },
          { account_id: 'ALS-2026-0102', student_name: 'Pagong Pagaspas', answer: 'A) a', is_correct: true },
          { account_id: 'ALS-2026-0103', student_name: 'Nene Marikit', answer: 'B) e', is_correct: false },
        ],
      },
      {
        id: 'q_elem_002',
        number: 2,
        prompt: 'Ano ang tamang patinig para sa salitang "p_l_t" na nangangahulugang sapilitan?',
        type: 'Multiple Choice',
        expected: 'C) i',
        correct: 5,
        incorrect: 11,
        skipped: 0,
        correct_rate: 31.25,
        error_rate: 68.75,
        distribution: [
          { answer: 'A) e', count: 9, correct: false },
          { answer: 'B) u', count: 2, correct: false },
          { answer: 'C) i', count: 5, correct: true },
        ],
        responses: [
          { account_id: 'ALS-2026-0101', student_name: 'Kiko Matsing', answer: 'A) e', is_correct: false },
          { account_id: 'ALS-2026-0102', student_name: 'Pagong Pagaspas', answer: 'C) i', is_correct: true },
          { account_id: 'ALS-2026-0103', student_name: 'Nene Marikit', answer: 'A) e', is_correct: false },
        ],
      },
      {
        id: 'q_elem_003',
        number: 3,
        prompt: 'Alin ang pares ng salita na nagpapakita ng kaibahan sa kahulugan dahil sa patinig na /e/ at /i/?',
        type: 'Multiple Choice',
        expected: 'B) mesa at misa',
        correct: 6,
        incorrect: 10,
        skipped: 0,
        correct_rate: 37.5,
        error_rate: 62.5,
        distribution: [
          { answer: 'A) tasa at pasa', count: 3, correct: false },
          { answer: 'B) mesa at misa', count: 6, correct: true },
          { answer: 'C) bata at baso', count: 7, correct: false },
        ],
        responses: [
          { account_id: 'ALS-2026-0101', student_name: 'Kiko Matsing', answer: 'C) bata at baso', is_correct: false },
          { account_id: 'ALS-2026-0102', student_name: 'Pagong Pagaspas', answer: 'B) mesa at misa', is_correct: true },
          { account_id: 'ALS-2026-0103', student_name: 'Nene Marikit', answer: 'A) tasa at pasa', is_correct: false },
        ],
      },
      {
        id: 'q_elem_004',
        number: 4,
        prompt: 'Tukuyin ang wastong pantig sa salitang "ak-lat": ano ang anyo ng unang pantig?',
        type: 'Multiple Choice',
        expected: 'B) PK (Patinig-Katinig)',
        correct: 7,
        incorrect: 9,
        skipped: 0,
        correct_rate: 43.75,
        error_rate: 56.25,
        distribution: [
          { answer: 'A) P (Patinig lamang)', count: 6, correct: false },
          { answer: 'B) PK (Patinig-Katinig)', count: 7, correct: true },
          { answer: 'C) KPK (Katinig-Patinig-Katinig)', count: 3, correct: false },
        ],
        responses: [
          { account_id: 'ALS-2026-0101', student_name: 'Kiko Matsing', answer: 'A) P (Patinig lamang)', is_correct: false },
          { account_id: 'ALS-2026-0102', student_name: 'Pagong Pagaspas', answer: 'B) PK (Patinig-Katinig)', is_correct: true },
          { account_id: 'ALS-2026-0103', student_name: 'Nene Marikit', answer: 'A) P (Patinig lamang)', is_correct: false },
        ],
      },
      {
        id: 'q_elem_005',
        number: 5,
        prompt: 'Ilang patinig mayroon sa alpabetong Filipino?',
        type: 'Multiple Choice',
        expected: 'A) 5 (A, E, I, O, U)',
        correct: 16,
        incorrect: 0,
        skipped: 0,
        correct_rate: 100,
        error_rate: 0,
        distribution: [
          { answer: 'A) 5 (A, E, I, O, U)', count: 16, correct: true },
          { answer: 'B) 7', count: 0, correct: false },
          { answer: 'C) 21', count: 0, correct: false },
        ],
        responses: [
          { account_id: 'ALS-2026-0101', student_name: 'Kiko Matsing', answer: 'A) 5 (A, E, I, O, U)', is_correct: true },
          { account_id: 'ALS-2026-0102', student_name: 'Pagong Pagaspas', answer: 'A) 5 (A, E, I, O, U)', is_correct: true },
          { account_id: 'ALS-2026-0103', student_name: 'Nene Marikit', answer: 'A) 5 (A, E, I, O, U)', is_correct: true },
        ],
      },
    ],
    analysis: {
      status: 'SUCCESS',
      topic_found: true,
      assessment_id: 'assess_elem_01',
      assessment_title: 'Pagsusulit sa Patinig at Katinig ng Wikang Filipino',
      subject_code: 'ALS-LS1-COMM',
      target_category: 'ELEMENTARY',
      cohort_overview: {
        total_students: 16,
        class_average: 9.2,
        passing_rate: 56.25,
        performance_summary:
          '16 Elementary ALS learners completed this diagnostic test. 9 out of 16 passed, but severe phonemic confusion was observed between the short Tagalog /e/ and /i/ vowel sounds in conversational contexts. 68.75% of learners missed item 2 by choosing "e" instead of "i". Basic vowel identification is mastered (100%), but minimal pair discrimination needs immediate remediation.',
      },
      struggling_topics: [
        {
          topic_name: 'Pagtukoy at Pagkilala sa mga Tunog ng Patinig /e/ at /i/',
          severity: 'HIGH',
          error_rate_percent: 68.75,
          description:
            'Hirap ang mga mag-aaral sa pagkilala ng tamang patinig sa pagitan ng tunog /e/ at /i/ sa gitnang pantig ng mga salita.',
          misconception:
            'Dahil sa nakasanayang diyalekto kung saan madalas nagpapalitan ang tunog ng /e/ at /i/, ipinapalagay ng mag-aaral na pareho lamang ang kanilang gamit sa pormal na pagbaybay.',
          affected_question_ids: ['q_elem_002', 'q_elem_003'],
          struggling_students: [
            'Kiko Matsing',
            'Nene Marikit',
            'Pedro Balagtas',
            'Carding Batungbakal',
            'Gorio Dimasupil',
            'Juana Dela Cruz',
            'Lito Lapid',
          ],
        },
        {
          topic_name: 'Pagkilala sa Anyo ng Pantig (P, KP, PK, KPK)',
          severity: 'MEDIUM',
          error_rate_percent: 56.25,
          description:
            'Paghahati at pagtukoy sa tamang anyo ng pantig sa loob ng salitang may magkatabing katinig.',
          misconception:
            'Hindi isinasama ng mag-aaral ang katinig na kasama ng patinig sa paghahati ng unang pantig (hal. inaakalang "a" lamang ang unang pantig ng "ak-lat").',
          affected_question_ids: ['q_elem_004'],
          struggling_students: [
            'Kiko Matsing',
            'Nene Marikit',
            'Carding Batungbakal',
            'Gorio Dimasupil',
          ],
        },
      ],
      recommended_lessons: [
        {
          lesson_id: 'les-fil-elem-01',
          material_id: 'mat-elem-fil-01',
          module_title: 'ALS Elementary Filipino Modyul 1: Pagbaybay at Pagbasa',
          lesson_title: 'Aralin 1: Ang mga Tunog ng Patinig (A, E, I, O, U) at Wastong Pagbigkas ng mga Pares-Minimal',
          main_topic: 'Ponolohiya at Pares-Minimal',
          relevance_reason:
            'Tumututok sa tamang pagbigkas at pag-iiba ng kahulugan ng salita kapag pinapalitan ang /e/ at /i/ (tulad ng mesa at misa).',
          similarity_score: 0.94,
        },
        {
          lesson_id: 'les-fil-elem-03',
          material_id: 'mat-elem-fil-02',
          module_title: 'ALS Elementary Filipino Modyul 2: Pagpapantig ng Salita',
          lesson_title: 'Aralin 3: Ang mga Anyo ng Pantig sa Wikang Pambansa',
          main_topic: 'Kayarian ng Pantig',
          relevance_reason:
            'Naglalaman ng pagsasanay sa paghahati at pagtukoy ng kayarian ng pantig (P, KP, PK, KPK) para sa mga nagsisimulang magbasa.',
          similarity_score: 0.88,
        },
      ],
      student_breakdowns: [
        {
          account_id: 'ALS-2026-0101',
          student_name: 'Kiko Matsing',
          score: 6.0,
          max_score: 15.0,
          percentage: 40.0,
          passed: false,
          personal_struggling_topics: [
            'Pagtukoy at Pagkilala sa mga Tunog ng Patinig /e/ at /i/',
            'Pagkilala sa Anyo ng Pantig (P, KP, PK, KPK)',
          ],
        },
        {
          account_id: 'ALS-2026-0102',
          student_name: 'Pagong Pagaspas',
          score: 15.0,
          max_score: 15.0,
          percentage: 100.0,
          passed: true,
          personal_struggling_topics: [],
        },
        {
          account_id: 'ALS-2026-0103',
          student_name: 'Nene Marikit',
          score: 6.0,
          max_score: 15.0,
          percentage: 40.0,
          passed: false,
          personal_struggling_topics: [
            'Pagtukoy at Pagkilala sa mga Tunog ng Patinig /e/ at /i/',
            'Pagkilala sa Anyo ng Pantig (P, KP, PK, KPK)',
          ],
        },
        {
          account_id: 'ALS-2026-0104',
          student_name: 'Pedro Balagtas',
          score: 9.0,
          max_score: 15.0,
          percentage: 60.0,
          passed: true,
          personal_struggling_topics: [
            'Pagtukoy at Pagkilala sa mga Tunog ng Patinig /e/ at /i/',
          ],
        },
      ],
      created_at: '2026-10-18T05:00:00Z',
      updated_at: '2026-10-18T05:00:00Z',
    },
  },
  {
    id: 'assess_blp_01',
    title: 'Panimulang Pagtatasa sa Pagbasa at Pagsulat (BLP)',
    subject_code: 'ALS-BLP-101',
    subject_name: 'Foundational Literacy (Basic Literacy Program)',
    target_category: 'BLP',
    category_label: 'Basic Literacy Program (BLP)',
    assessment_type: 'QUIZ',
    status: 'COMPLETED',
    max_score: 10,
    questions_count: 3,
    questions: [
      {
        id: 'q_blp_001',
        number: 1,
        prompt: 'Alin ang titik na kumakatawan sa unang tunog ng salitang "Araw"?',
        type: 'Multiple Choice',
        expected: 'A) A',
        correct: 10,
        incorrect: 2,
        skipped: 0,
        correct_rate: 83.3,
        error_rate: 16.7,
        distribution: [
          { answer: 'A) A', count: 10, correct: true },
          { answer: 'B) B', count: 2, correct: false },
        ],
        responses: [
          { account_id: 'ALS-BLP-001', student_name: 'Mang Kanor', answer: 'A) A', is_correct: true },
          { account_id: 'ALS-BLP-002', student_name: 'Aling Bebang', answer: 'A) A', is_correct: true },
        ],
      },
      {
        id: 'q_blp_002',
        number: 2,
        prompt: 'Pagsamahin ang mga tunog /m/ at /a/. Anong pantig ang mabubuo?',
        type: 'Multiple Choice',
        expected: 'B) ma',
        correct: 6,
        incorrect: 6,
        skipped: 0,
        correct_rate: 50.0,
        error_rate: 50.0,
        distribution: [
          { answer: 'A) am', count: 6, correct: false },
          { answer: 'B) ma', count: 6, correct: true },
        ],
        responses: [
          { account_id: 'ALS-BLP-001', student_name: 'Mang Kanor', answer: 'B) ma', is_correct: true },
          { account_id: 'ALS-BLP-002', student_name: 'Aling Bebang', answer: 'A) am', is_correct: false },
        ],
      },
      {
        id: 'q_blp_003',
        number: 3,
        prompt: 'Basahin ang salita: "MAMA". Ilang pantig mayroon ito?',
        type: 'Multiple Choice',
        expected: 'A) 2 (ma-ma)',
        correct: 7,
        incorrect: 5,
        skipped: 0,
        correct_rate: 58.3,
        error_rate: 41.7,
        distribution: [
          { answer: 'A) 2 (ma-ma)', count: 7, correct: true },
          { answer: 'B) 4', count: 5, correct: false },
        ],
        responses: [
          { account_id: 'ALS-BLP-001', student_name: 'Mang Kanor', answer: 'A) 2 (ma-ma)', is_correct: true },
          { account_id: 'ALS-BLP-002', student_name: 'Aling Bebang', answer: 'B) 4', is_correct: false },
        ],
      },
    ],
    analysis: {
      status: 'SUCCESS',
      topic_found: true,
      assessment_id: 'assess_blp_01',
      assessment_title: 'Panimulang Pagtatasa sa Pagbasa at Pagsulat (BLP)',
      subject_code: 'ALS-BLP-101',
      target_category: 'BLP',
      cohort_overview: {
        total_students: 12,
        class_average: 6.2,
        passing_rate: 58.3,
        performance_summary:
          '12 adult learners in the Basic Literacy Program were evaluated. Recognition of individual isolated letter sounds is solid (83%), but blending consonant-vowel combinations (/m/ + /a/ -> "ma") led to inversion errors ("am") in 50% of the cohort.',
      },
      struggling_topics: [
        {
          topic_name: 'Pagbuo at Pagbasa ng Pantig (Pagsasama ng Tunog ng Katinig at Patinig)',
          severity: 'HIGH',
          error_rate_percent: 50.0,
          description:
            'Pagkakaroon ng baligtad na direksyon sa pagbasa ng pantig mula kaliwa pakanan (pagbasa ng /m/ + /a/ bilang "am" sa halip na "ma").',
          misconception:
            'Nahihirapan sa pagkakasunod-sunod ng kaliwa-pakanan na pagbasa ng dalawang magkatabing tunog.',
          affected_question_ids: ['q_blp_002'],
          struggling_students: [
            'Aling Bebang',
            'Tatay Berting',
            'Nanay Loleng',
            'Aling Tessie',
            'Mang Carding',
            'Aling Juana',
          ],
        },
      ],
      recommended_lessons: [
        {
          lesson_id: 'les-blp-01',
          material_id: 'mat-blp-01',
          module_title: 'ALS BLP Modyul 1: Ang mga Tunog ng Ating Titik',
          lesson_title: 'Aralin 2: Pagsasama ng Tunog /M/ at /A/ para Makabuo ng Pantig na MA',
          main_topic: 'Panimulang Pagbasa at Pagbuo ng Pantig',
          relevance_reason:
            'Naglalaman ng visual na pagturo ng daloy ng pagbasa mula kaliwa pakanan gamit ang daliri at tunog ng mga titik.',
          similarity_score: 0.95,
        },
      ],
      student_breakdowns: [
        {
          account_id: 'ALS-BLP-001',
          student_name: 'Mang Kanor',
          score: 10.0,
          max_score: 10.0,
          percentage: 100.0,
          passed: true,
          personal_struggling_topics: [],
        },
        {
          account_id: 'ALS-BLP-002',
          student_name: 'Aling Bebang',
          score: 3.3,
          max_score: 10.0,
          percentage: 33.3,
          passed: false,
          personal_struggling_topics: [
            'Pagbuo at Pagbasa ng Pantig (Pagsasama ng Tunog ng Katinig at Patinig)',
          ],
        },
      ],
      created_at: '2026-10-18T06:30:00Z',
      updated_at: '2026-10-18T06:30:00Z',
    },
  },
  {
    id: 'assess_exam_sec_01',
    title: 'First Quarter Periodical Examination in Science & Technology',
    subject_code: 'ALS-LS2-SCI',
    subject_name: 'LS2: Scientific Literacy & Critical Thinking',
    target_category: 'SECONDARY',
    category_label: 'Junior High School (Secondary)',
    assessment_type: 'EXAM',
    status: 'COMPLETED',
    max_score: 40,
    questions_count: 5,
    questions: [
      {
        id: 'q_exam_001',
        number: 1,
        prompt: 'According to the 10% Ecological Rule of Energy Transfer, if primary producers (plants) produce 10,000 kcal of energy, approximately how much energy is available to secondary consumers (carnivores feeding on herbivores)?',
        type: 'Multiple Choice',
        expected: 'B) 100 kcal',
        correct: 6,
        incorrect: 18,
        skipped: 0,
        correct_rate: 25.0,
        error_rate: 75.0,
        distribution: [
          { answer: 'A) 1,000 kcal', count: 12, correct: false },
          { answer: 'B) 100 kcal', count: 6, correct: true },
          { answer: 'C) 10 kcal', count: 4, correct: false },
          { answer: 'D) 10,000 kcal', count: 2, correct: false },
        ],
        responses: [
          { account_id: 'ALS-2026-0001', student_name: 'Juan Dela Cruz', answer: 'A) 1,000 kcal', is_correct: false },
          { account_id: 'ALS-2026-0002', student_name: 'Maria Clara Santos', answer: 'B) 100 kcal', is_correct: true },
          { account_id: 'ALS-2026-0003', student_name: 'Crisostomo Ibarra', answer: 'B) 100 kcal', is_correct: true },
          { account_id: 'ALS-2026-0004', student_name: 'Basilio Gomez', answer: 'A) 1,000 kcal', is_correct: false },
          { account_id: 'ALS-2026-0005', student_name: 'Sisa Dimagiba', answer: 'A) 1,000 kcal', is_correct: false },
        ],
      },
      {
        id: 'q_exam_002',
        number: 2,
        prompt: 'Which organelle in plant cells is the primary site of photosynthesis, converting sunlight into chemical glucose?',
        type: 'Multiple Choice',
        expected: 'C) Chloroplast',
        correct: 19,
        incorrect: 5,
        skipped: 0,
        correct_rate: 79.2,
        error_rate: 20.8,
        distribution: [
          { answer: 'A) Mitochondria', count: 4, correct: false },
          { answer: 'B) Ribosome', count: 1, correct: false },
          { answer: 'C) Chloroplast', count: 19, correct: true },
          { answer: 'D) Endoplasmic Reticulum', count: 0, correct: false },
        ],
        responses: [
          { account_id: 'ALS-2026-0001', student_name: 'Juan Dela Cruz', answer: 'C) Chloroplast', is_correct: true },
          { account_id: 'ALS-2026-0002', student_name: 'Maria Clara Santos', answer: 'C) Chloroplast', is_correct: true },
          { account_id: 'ALS-2026-0003', student_name: 'Crisostomo Ibarra', answer: 'C) Chloroplast', is_correct: true },
          { account_id: 'ALS-2026-0004', student_name: 'Basilio Gomez', answer: 'A) Mitochondria', is_correct: false },
          { account_id: 'ALS-2026-0005', student_name: 'Sisa Dimagiba', answer: 'C) Chloroplast', is_correct: true },
        ],
      },
      {
        id: 'q_exam_003',
        number: 3,
        prompt: 'In human digestion, which fluid produced by the liver and stored in the gallbladder emulsifies fats into smaller droplets for lipase breakdown?',
        type: 'Multiple Choice',
        expected: 'A) Bile',
        correct: 8,
        incorrect: 16,
        skipped: 0,
        correct_rate: 33.3,
        error_rate: 66.7,
        distribution: [
          { answer: 'A) Bile', count: 8, correct: true },
          { answer: 'B) Hydrochloric Acid', count: 9, correct: false },
          { answer: 'C) Salivary Amylase', count: 5, correct: false },
          { answer: 'D) Insulin', count: 2, correct: false },
        ],
        responses: [
          { account_id: 'ALS-2026-0001', student_name: 'Juan Dela Cruz', answer: 'B) Hydrochloric Acid', is_correct: false },
          { account_id: 'ALS-2026-0002', student_name: 'Maria Clara Santos', answer: 'A) Bile', is_correct: true },
          { account_id: 'ALS-2026-0003', student_name: 'Crisostomo Ibarra', answer: 'A) Bile', is_correct: true },
          { account_id: 'ALS-2026-0004', student_name: 'Basilio Gomez', answer: 'B) Hydrochloric Acid', is_correct: false },
          { account_id: 'ALS-2026-0005', student_name: 'Sisa Dimagiba', answer: 'C) Salivary Amylase', is_correct: false },
        ],
      },
      {
        id: 'q_exam_004',
        number: 4,
        prompt: 'What primary role do decomposers like bacteria and fungi fulfill within an ecosystem?',
        type: 'Multiple Choice',
        expected: 'B) Breaking down dead organic matter to recycle essential nutrients back into soil',
        correct: 21,
        incorrect: 3,
        skipped: 0,
        correct_rate: 87.5,
        error_rate: 12.5,
        distribution: [
          { answer: 'A) Producing direct solar energy for herbivores', count: 2, correct: false },
          { answer: 'B) Breaking down dead organic matter to recycle essential nutrients back into soil', count: 21, correct: true },
          { answer: 'C) Controlling apex predator populations', count: 1, correct: false },
        ],
        responses: [
          { account_id: 'ALS-2026-0001', student_name: 'Juan Dela Cruz', answer: 'B) Breaking down dead organic matter to recycle essential nutrients back into soil', is_correct: true },
          { account_id: 'ALS-2026-0002', student_name: 'Maria Clara Santos', answer: 'B) Breaking down dead organic matter to recycle essential nutrients back into soil', is_correct: true },
        ],
      },
      {
        id: 'q_exam_005',
        number: 5,
        prompt: 'True or False: Cellular respiration takes place exclusively in animal cells, whereas plants only undergo photosynthesis and never respire.',
        type: 'True or False',
        expected: 'False',
        correct: 9,
        incorrect: 15,
        skipped: 0,
        correct_rate: 37.5,
        error_rate: 62.5,
        distribution: [
          { answer: 'True', count: 15, correct: false },
          { answer: 'False', count: 9, correct: true },
        ],
        responses: [
          { account_id: 'ALS-2026-0001', student_name: 'Juan Dela Cruz', answer: 'True', is_correct: false },
          { account_id: 'ALS-2026-0002', student_name: 'Maria Clara Santos', answer: 'False', is_correct: true },
          { account_id: 'ALS-2026-0003', student_name: 'Crisostomo Ibarra', answer: 'False', is_correct: true },
          { account_id: 'ALS-2026-0004', student_name: 'Basilio Gomez', answer: 'True', is_correct: false },
          { account_id: 'ALS-2026-0005', student_name: 'Sisa Dimagiba', answer: 'True', is_correct: false },
        ],
      },
    ],
    analysis: {
      status: 'SUCCESS',
      topic_found: true,
      assessment_id: 'assess_exam_sec_01',
      assessment_title: 'First Quarter Periodical Examination in Science & Technology',
      subject_code: 'ALS-LS2-SCI',
      target_category: 'SECONDARY',
      cohort_overview: {
        total_students: 24,
        class_average: 24.8,
        passing_rate: 62.5,
        performance_summary:
          '24 Junior High School learners completed the comprehensive 1st Quarter Periodical Examination in LS2 Science. Overall passing rate reached 62.5% (15 passed out of 24). Major conceptual struggle patterns emerged in multi-tier trophic energy pyramids (75% error rate on 10% rule step calculations) and the dual metabolic pathways of plants (62.5% believing plants never respire). Digestive fluid mechanics also require remediation.',
      },
      struggling_topics: [
        {
          topic_name: 'Ecological Energy Flow and the 10% Trophic Transfer Rule',
          severity: 'HIGH',
          error_rate_percent: 75.0,
          description:
            'Calculating progressive energy loss across successive trophic tiers (producers -> primary consumers -> secondary consumers).',
          misconception:
            'Learners incorrectly assumed secondary consumers receive 10% of the original producer base directly (1,000 kcal), rather than 10% of the intermediate primary consumer tier (100 kcal).',
          affected_question_ids: ['q_exam_001'],
          struggling_students: [
            'Juan Dela Cruz',
            'Basilio Gomez',
            'Sisa Dimagiba',
            'Elias Salome',
            'Tarsilo Alasas',
            'Lucas Tinong',
            'Victoria Valenzuela',
            'Sinang Bernardo',
          ],
        },
        {
          topic_name: 'Digestive Enzymes, Bile Function, and Organ Responsibilities',
          severity: 'HIGH',
          error_rate_percent: 66.7,
          description:
            'Distinguishing the role of liver-produced bile in lipid emulsification from gastric acid chemical digestion.',
          misconception:
            'Learners associated all digestive breakdown with hydrochloric acid (HCl), failing to recognize bile as an emulsifying agent that enables lipase action.',
          affected_question_ids: ['q_exam_003'],
          struggling_students: [
            'Juan Dela Cruz',
            'Basilio Gomez',
            'Sisa Dimagiba',
            'Tarsilo Alasas',
            'Lucas Tinong',
          ],
        },
        {
          topic_name: 'Plant Cellular Respiration vs. Photosynthesis',
          severity: 'MEDIUM',
          error_rate_percent: 62.5,
          description:
            'Understanding that plants respire day and night using mitochondria to produce ATP from glucose.',
          misconception:
            'Common myth that plants only perform photosynthesis while animal cells exclusively carry out respiration.',
          affected_question_ids: ['q_exam_005'],
          struggling_students: [
            'Juan Dela Cruz',
            'Basilio Gomez',
            'Sisa Dimagiba',
            'Elias Salome',
          ],
        },
      ],
      recommended_lessons: [
        {
          lesson_id: 'les-ls2-sci-03',
          material_id: 'mat-ls2-eco-01',
          module_title: 'Learning Strand 2: Scientific Literacy Module 3',
          lesson_title: 'Aralin 3: Daloy ng Enerhiya sa Ecosystem at ang Trophic Pyramid',
          main_topic: 'Ecosystem Dynamics & Energy Conservation',
          relevance_reason:
            'Includes step-by-step mathematical models demonstrating the 10-percent trophic rule with local Philippine wildlife food chains.',
          similarity_score: 0.94,
        },
        {
          lesson_id: 'les-ls2-sci-07',
          material_id: 'mat-ls2-bio-02',
          module_title: 'Learning Strand 2: Scientific Literacy Module 7',
          lesson_title: 'Aralin 2: Ang Sistema ng Pagtunaw ng Pagkain sa Katawan ng Tao',
          main_topic: 'Human Anatomy and Digestive Biochemistry',
          relevance_reason:
            'Clarifies the specific role of the liver, gallbladder, and pancreas in producing bile and digestive enzymes.',
          similarity_score: 0.89,
        },
      ],
      student_breakdowns: [
        {
          account_id: 'ALS-2026-0001',
          student_name: 'Juan Dela Cruz',
          score: 16.0,
          max_score: 40.0,
          percentage: 40.0,
          passed: false,
          personal_struggling_topics: [
            'Ecological Energy Flow and the 10% Trophic Transfer Rule',
            'Digestive Enzymes, Bile Function, and Organ Responsibilities',
            'Plant Cellular Respiration vs. Photosynthesis',
          ],
        },
        {
          account_id: 'ALS-2026-0002',
          student_name: 'Maria Clara Santos',
          score: 40.0,
          max_score: 40.0,
          percentage: 100.0,
          passed: true,
          personal_struggling_topics: [],
        },
        {
          account_id: 'ALS-2026-0003',
          student_name: 'Crisostomo Ibarra',
          score: 36.0,
          max_score: 40.0,
          percentage: 90.0,
          passed: true,
          personal_struggling_topics: [],
        },
        {
          account_id: 'ALS-2026-0004',
          student_name: 'Basilio Gomez',
          score: 20.0,
          max_score: 40.0,
          percentage: 50.0,
          passed: true,
          personal_struggling_topics: [
            'Ecological Energy Flow and the 10% Trophic Transfer Rule',
            'Digestive Enzymes, Bile Function, and Organ Responsibilities',
            'Plant Cellular Respiration vs. Photosynthesis',
          ],
        },
        {
          account_id: 'ALS-2026-0005',
          student_name: 'Sisa Dimagiba',
          score: 16.0,
          max_score: 40.0,
          percentage: 40.0,
          passed: false,
          personal_struggling_topics: [
            'Ecological Energy Flow and the 10% Trophic Transfer Rule',
            'Digestive Enzymes, Bile Function, and Organ Responsibilities',
            'Plant Cellular Respiration vs. Photosynthesis',
          ],
        },
        {
          account_id: 'ALS-2026-0006',
          student_name: 'Elias Salome',
          score: 28.0,
          max_score: 40.0,
          percentage: 70.0,
          passed: true,
          personal_struggling_topics: [
            'Ecological Energy Flow and the 10% Trophic Transfer Rule',
            'Plant Cellular Respiration vs. Photosynthesis',
          ],
        },
      ],
      created_at: '2026-10-18T07:15:00Z',
      updated_at: '2026-10-18T07:15:00Z',
    },
  },
  {
    id: 'assess_test_sec_01',
    title: 'Diagnostic Pre-Test on Basic Numeracy & Algebra',
    subject_code: 'ALS-LS3-MATH',
    subject_name: 'LS3: Mathematical & Problem Solving Skills',
    target_category: 'SECONDARY',
    category_label: 'Junior High School (Secondary)',
    assessment_type: 'TEST',
    status: 'COMPLETED',
    max_score: 20,
    questions_count: 3,
    questions: [
      {
        id: 'q_test_001',
        number: 1,
        prompt: 'Solve for x: 2x + 6 = 18',
        type: 'Multiple Choice',
        expected: 'B) x = 6',
        correct: 8,
        incorrect: 12,
        skipped: 0,
        correct_rate: 40.0,
        error_rate: 60.0,
        distribution: [
          { answer: 'A) x = 12', count: 7, correct: false },
          { answer: 'B) x = 6', count: 8, correct: true },
          { answer: 'C) x = 8', count: 4, correct: false },
          { answer: 'D) x = 3', count: 1, correct: false },
        ],
        responses: [
          { account_id: 'ALS-2026-0001', student_name: 'Juan Dela Cruz', answer: 'A) x = 12', is_correct: false },
          { account_id: 'ALS-2026-0002', student_name: 'Maria Clara Santos', answer: 'B) x = 6', is_correct: true },
          { account_id: 'ALS-2026-0003', student_name: 'Crisostomo Ibarra', answer: 'B) x = 6', is_correct: true },
          { account_id: 'ALS-2026-0004', student_name: 'Basilio Gomez', answer: 'A) x = 12', is_correct: false },
          { account_id: 'ALS-2026-0005', student_name: 'Sisa Dimagiba', answer: 'C) x = 8', is_correct: false },
        ],
      },
      {
        id: 'q_test_002',
        number: 2,
        prompt: 'What is 25% of 240?',
        type: 'Multiple Choice',
        expected: 'A) 60',
        correct: 14,
        incorrect: 6,
        skipped: 0,
        correct_rate: 70.0,
        error_rate: 30.0,
        distribution: [
          { answer: 'A) 60', count: 14, correct: true },
          { answer: 'B) 48', count: 3, correct: false },
          { answer: 'C) 80', count: 2, correct: false },
          { answer: 'D) 120', count: 1, correct: false },
        ],
        responses: [
          { account_id: 'ALS-2026-0001', student_name: 'Juan Dela Cruz', answer: 'A) 60', is_correct: true },
          { account_id: 'ALS-2026-0002', student_name: 'Maria Clara Santos', answer: 'A) 60', is_correct: true },
          { account_id: 'ALS-2026-0003', student_name: 'Crisostomo Ibarra', answer: 'A) 60', is_correct: true },
          { account_id: 'ALS-2026-0004', student_name: 'Basilio Gomez', answer: 'B) 48', is_correct: false },
        ],
      },
      {
        id: 'q_test_003',
        number: 3,
        prompt: 'If a recipe calls for 3 cups of flour for every 2 cups of sugar, how many cups of flour are needed for 6 cups of sugar?',
        type: 'Multiple Choice',
        expected: 'C) 9 cups',
        correct: 11,
        incorrect: 9,
        skipped: 0,
        correct_rate: 55.0,
        error_rate: 45.0,
        distribution: [
          { answer: 'A) 6 cups', count: 3, correct: false },
          { answer: 'B) 8 cups', count: 5, correct: false },
          { answer: 'C) 9 cups', count: 11, correct: true },
          { answer: 'D) 12 cups', count: 1, correct: false },
        ],
        responses: [
          { account_id: 'ALS-2026-0001', student_name: 'Juan Dela Cruz', answer: 'B) 8 cups', is_correct: false },
          { account_id: 'ALS-2026-0002', student_name: 'Maria Clara Santos', answer: 'C) 9 cups', is_correct: true },
          { account_id: 'ALS-2026-0003', student_name: 'Crisostomo Ibarra', answer: 'C) 9 cups', is_correct: true },
          { account_id: 'ALS-2026-0004', student_name: 'Basilio Gomez', answer: 'B) 8 cups', is_correct: false },
        ],
      },
    ],
    analysis: {
      status: 'SUCCESS',
      topic_found: true,
      assessment_id: 'assess_test_sec_01',
      assessment_title: 'Diagnostic Pre-Test on Basic Numeracy & Algebra',
      subject_code: 'ALS-LS3-MATH',
      target_category: 'SECONDARY',
      cohort_overview: {
        total_students: 20,
        class_average: 11.0,
        passing_rate: 55.0,
        performance_summary:
          '20 learners took this diagnostic pre-test. 11 passed and 9 demonstrated difficulty with inverse operations in basic algebra. 60% missed Question 1 by stopping after subtracting the constant term rather than dividing by the variable coefficient.',
      },
      struggling_topics: [
        {
          topic_name: 'Inverse Operations and Single-Variable Algebraic Equations',
          severity: 'HIGH',
          error_rate_percent: 60.0,
          description:
            'Performing inverse operations step-by-step (subtraction then division) to isolate the variable x.',
          misconception:
            'Learners stopped after subtracting 6 (getting 2x = 12) and assumed 12 was the final answer for x without dividing by coefficient 2.',
          affected_question_ids: ['q_test_001'],
          struggling_students: [
            'Juan Dela Cruz',
            'Basilio Gomez',
            'Sisa Dimagiba',
            'Elias Salome',
            'Tarsilo Alasas',
            'Lucas Tinong',
          ],
        },
        {
          topic_name: 'Direct Proportion and Ratio Scaling',
          severity: 'MEDIUM',
          error_rate_percent: 45.0,
          description: 'Setting up cross-multiplication for equivalent ratios in practical word problems.',
          misconception: 'Adding the difference rather than multiplying by the scaling factor.',
          affected_question_ids: ['q_test_003'],
          struggling_students: ['Juan Dela Cruz', 'Basilio Gomez', 'Sisa Dimagiba'],
        },
      ],
      recommended_lessons: [
        {
          lesson_id: 'les-ls3-math-02',
          material_id: 'mat-math-alg-01',
          module_title: 'Learning Strand 3: Mathematical Skills Module 2',
          lesson_title: 'Aralin 2: Pagsagot sa mga Simple Algebraic Equations Gamit ang Inverse Operations',
          main_topic: 'Linear Equations and Variable Isolation',
          relevance_reason: 'Provides step-by-step balance scale exercises to reinforce dividing by coefficients.',
          similarity_score: 0.93,
        },
      ],
      student_breakdowns: [
        {
          account_id: 'ALS-2026-0001',
          student_name: 'Juan Dela Cruz',
          score: 6.7,
          max_score: 20.0,
          percentage: 33.3,
          passed: false,
          personal_struggling_topics: [
            'Inverse Operations and Single-Variable Algebraic Equations',
            'Direct Proportion and Ratio Scaling',
          ],
        },
        {
          account_id: 'ALS-2026-0002',
          student_name: 'Maria Clara Santos',
          score: 20.0,
          max_score: 20.0,
          percentage: 100.0,
          passed: true,
          personal_struggling_topics: [],
        },
      ],
      created_at: '2026-10-18T08:00:00Z',
      updated_at: '2026-10-18T08:00:00Z',
    },
  },
];

/**
 * Raw task representation including activities to demonstrate that
 * Activities are strictly filtered out and excluded from cohort analysis.
 */
export interface RawAssessmentItem {
  id: string;
  title: string;
  subject_code: string;
  target_category: 'ELEMENTARY' | 'SECONDARY' | 'BLP';
  assessment_type: 'QUIZ' | 'EXAM' | 'TEST' | 'ACTIVITY';
  status: 'COMPLETED' | 'ACTIVE' | 'DRAFT';
}

export const MOCK_RAW_TASKS_CONTAINING_ACTIVITIES: RawAssessmentItem[] = [
  { id: 'assess_001', title: 'Computer Hardware & Storage Devices Quiz', subject_code: 'ALS-LS6-DIGITAL', target_category: 'SECONDARY', assessment_type: 'QUIZ', status: 'COMPLETED' },
  { id: 'assess_exam_sec_01', title: 'First Quarter Periodical Examination in Science & Technology', subject_code: 'ALS-LS2-SCI', target_category: 'SECONDARY', assessment_type: 'EXAM', status: 'COMPLETED' },
  { id: 'assess_test_sec_01', title: 'Diagnostic Pre-Test on Basic Numeracy & Algebra', subject_code: 'ALS-LS3-MATH', target_category: 'SECONDARY', assessment_type: 'TEST', status: 'COMPLETED' },
  { id: 'act_sec_01', title: 'Laboratory Performance Task: Dissecting an Optical Mouse', subject_code: 'ALS-LS6-DIGITAL', target_category: 'SECONDARY', assessment_type: 'ACTIVITY', status: 'COMPLETED' },
  { id: 'assess_elem_01', title: 'Pagsusulit sa Patinig at Katinig ng Wikang Filipino', subject_code: 'ALS-LS1-COMM', target_category: 'ELEMENTARY', assessment_type: 'QUIZ', status: 'COMPLETED' },
  { id: 'act_elem_01', title: 'Worksheet Activity: Pagsulat ng Sariling Maikling Talata', subject_code: 'ALS-LS1-COMM', target_category: 'ELEMENTARY', assessment_type: 'ACTIVITY', status: 'COMPLETED' },
  { id: 'assess_blp_01', title: 'Panimulang Pagtatasa sa Pagbasa at Pagsulat (BLP)', subject_code: 'ALS-BLP-101', target_category: 'BLP', assessment_type: 'QUIZ', status: 'COMPLETED' },
  { id: 'act_blp_01', title: 'Tracing Activity: Pagsulat ng Titik A hanggang Z gamit ang Lapis', subject_code: 'ALS-BLP-101', target_category: 'BLP', assessment_type: 'ACTIVITY', status: 'COMPLETED' },
];

/**
 * Filter function strictly excluding ACTIVITY types and only allowing QUIZ, EXAM, TEST.
 */
export function filterAnalyzableAssessments<T extends { assessment_type: string }>(items: T[]): T[] {
  return items.filter(
    (item) => ['QUIZ', 'EXAM', 'TEST'].includes(item.assessment_type) && item.assessment_type !== 'ACTIVITY'
  );
}

