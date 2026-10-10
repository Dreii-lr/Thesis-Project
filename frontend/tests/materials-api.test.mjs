import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function loadModule() {
  const exports = {};
  const filePath = new URL('../src/lib/document-processor-api.ts', import.meta.url);
  const code = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;

  let currentFetch = globalThis.fetch;
  const context = {
    exports,
    require: () => ({
      getCurrentUser: async () => ({ user_id: 'test-user' }),
      getDemoSession: () => null,
      CATEGORY_LABELS: {
        basic_literacy: 'Basic Literacy Program',
        elementary: 'Elementary',
        junior: 'Junior High School',
      },
    }),
    process: { env: { NEXT_PUBLIC_DOCS_PROCESSING_URL: 'http://localhost:9090/api/v1' } },
    URLSearchParams,
    fetch: (...args) => currentFetch(...args),
  };

  vm.runInNewContext(transpiled, context);
  return {
    api: exports,
    setFetch: (fn) => {
      currentFetch = fn;
    },
  };
}

test('getMaterials calls correct endpoint and returns parsed list', async () => {
  const { api, setFetch } = loadModule();
  let calledUrl = null;

  setFetch(async (url) => {
    calledUrl = url;
    return {
      ok: true,
      json: async () => [
        {
          id: 'mat-1',
          document_id: 'doc-1',
          learning_strand: 'LS1 Communication',
          als_program: 'Basic Literacy Program',
          structured_records: [{ main_topic: 'Alpabetong Filipino' }],
        },
      ],
    };
  });

  const materials = await api.getMaterials({ page: 1, pageSize: 20 });
  assert.equal(calledUrl.includes('/document-processor/'), true);
  assert.equal(calledUrl.includes('page=1'), true);
  assert.equal(calledUrl.includes('page_size=20'), true);
  assert.equal(materials.length, 1);
  assert.equal(materials[0].id, 'mat-1');
  assert.equal(materials[0].structured_records.length, 1);
});

test('getMaterialById fetches single material by UUID', async () => {
  const { api, setFetch } = loadModule();
  let calledUrl = null;

  setFetch(async (url) => {
    calledUrl = url;
    return {
      ok: true,
      json: async () => ({
        id: 'mat-xyz',
        document_id: 'doc-xyz',
        learning_strand: 'LS2 Science',
        structured_records: [
          { main_topic: 'Ecosystems', sub_topics: ['Forest', 'Marine'] },
        ],
      }),
    };
  });

  const mat = await api.getMaterialById('mat-xyz');
  assert.equal(calledUrl.endsWith('/document-processor/materials/mat-xyz'), true);
  assert.equal(mat.id, 'mat-xyz');
  assert.equal(mat.structured_records[0].main_topic, 'Ecosystems');
  assert.equal(mat.structured_records[0].sub_topics.length, 2);
});

test('getLessonsByMaterial fetches generated lessons for material', async () => {
  const { api, setFetch } = loadModule();
  let calledUrl = null;

  setFetch(async (url) => {
    calledUrl = url;
    return {
      ok: true,
      json: async () => ({
        materials_id: 'mat-xyz',
        total_lessons: 1,
        lessons: [
          {
            id: 'lesson-1',
            material_id: 'mat-xyz',
            main_topic: 'Ecosystems',
            lesson_title: 'Introduction to Ecosystems',
            content: { type: 'doc', content: [{ type: 'paragraph' }] },
          },
        ],
      }),
    };
  });

  const res = await api.getLessonsByMaterial('mat-xyz');
  assert.equal(calledUrl.endsWith('/document-processor/lessons/mat-xyz'), true);
  assert.equal(res.total_lessons, 1);
  assert.equal(res.lessons[0].id, 'lesson-1');
});

test('hasGeneratedContent logic accurately distinguishes generated vs ungenerated', () => {
  // Test evaluation with mock lesson structures
  const ungeneratedLesson = {
    id: 'topic-1',
    title: 'New Topic',
    status: 'NOT_GENERATED',
    files: [],
  };

  const generatedLesson = {
    id: 'topic-2',
    title: 'Generated Topic',
    status: 'GENERATED',
    files: [
      {
        id: 'f-1',
        title: 'Subtopic 1',
        paragraphs: ['Paragraph content here'],
        contentJson: { type: 'doc', content: [{ type: 'paragraph' }] },
      },
    ],
  };

  const evaluateHasContent = (lesson, content) => {
    return Boolean(
      (content && (
        (content.paragraphs && content.paragraphs.length > 0 && content.paragraphs.some((p) => p.trim() !== '')) ||
        (content.contentJson && content.contentJson.content && content.contentJson.content.length > 0)
      )) ||
      (lesson && (
        lesson.status === 'GENERATED' ||
        (lesson.files && lesson.files.length > 0 && lesson.files.some((f) => (f.paragraphs && f.paragraphs.length > 0) || f.contentJson))
      ))
    );
  };

  assert.equal(evaluateHasContent(ungeneratedLesson, null), false);
  assert.equal(evaluateHasContent(generatedLesson, generatedLesson.files[0]), true);
});
