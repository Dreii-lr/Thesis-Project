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
    fetch: globalThis.fetch,
  };

  vm.runInNewContext(transpiled, context);
  return exports;
}

test('matchDocumentToProgram correctly isolates programs based on als_program and storage_key', () => {
  const api = loadModule();

  const elemDoc = {
    id: '1',
    filename: 'Science-Lesson-Module.pdf',
    als_program: 'Elementary',
    storage_key: 'ELEMENTARY/Science-Lesson-Module.pdf',
    status: 'COMPLETED',
  };

  const blpDoc = {
    id: '2',
    filename: 'ILA-and-RLP-Filipino-BLP.docx.pdf',
    als_program: 'Basic Literacy Program',
    storage_key: 'BLP/ILA-and-RLP-Filipino-BLP.docx.pdf',
    status: 'COMPLETED',
  };

  const juniorDoc = {
    id: '3',
    filename: 'Math-Algebra-Junior.pdf',
    als_program: 'Junior High School',
    storage_key: 'SECONDARY/Math-Algebra-Junior.pdf',
    status: 'COMPLETED',
  };

  // Elementary verification
  assert.equal(api.matchDocumentToProgram(elemDoc, 'elementary'), true);
  assert.equal(api.matchDocumentToProgram(elemDoc, 'basic_literacy'), false);
  assert.equal(api.matchDocumentToProgram(elemDoc, 'junior'), false);

  // BLP verification
  assert.equal(api.matchDocumentToProgram(blpDoc, 'basic_literacy'), true);
  assert.equal(api.matchDocumentToProgram(blpDoc, 'elementary'), false);
  assert.equal(api.matchDocumentToProgram(blpDoc, 'junior'), false);

  // Junior verification
  assert.equal(api.matchDocumentToProgram(juniorDoc, 'junior'), true);
  assert.equal(api.matchDocumentToProgram(juniorDoc, 'elementary'), false);
  assert.equal(api.matchDocumentToProgram(juniorDoc, 'basic_literacy'), false);
});

test('getModuleDocuments constructs correct query URL with program filter', async () => {
  const api = loadModule();
  let requestedUrl = null;

  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, page_size: 10, total_pages: 1 }),
    };
  };

  await api.getModuleDocuments({ program: 'elementary' });
  assert.equal(requestedUrl.includes('program=elementary'), true);
  assert.equal(requestedUrl.startsWith('http://localhost:9090/api/v1/document-processor/documents/'), true);
});

test('toWorkspaceModule works without requiring manual fallbackSubject', () => {
  const api = loadModule();

  const parsedData = {
    document_id: 'doc-123',
    materials_id: 'mat-123',
    filename: 'Reading-Skills.pdf',
    learning_strand: 'LS1 Communication',
    als_program: 'Elementary',
    records: [{ main_topic: 'Reading comprehension' }],
  };

  const module = api.toWorkspaceModule(parsedData, 'elementary');
  assert.equal(module.target_category, 'elementary');
  assert.equal(module.subject_code, 'ALS-LS1-COMM');
  assert.equal(module.filename, 'Reading-Skills.pdf');
  assert.equal(module.records.length, 1);
});
