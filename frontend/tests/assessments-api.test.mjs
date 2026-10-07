import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function client(handler) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL('../src/lib/assessments-api.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { exports, require: () => ({ authenticatedFetch: handler }) });
  return exports;
}
const response = resources => ({ ok: true, json: async () => ({ data: { resources } }) });
const activity = { assessment_id: 'server-id', title: 'Activity', description: '', subject_code: 'LS1', target_category: null, assessment_type: 'ACTIVITY', status: 'DRAFT', start_date: null, end_date: null, grace_period_minutes: 5, duration_minutes: null, max_score: 100, is_ai_generated: false, categories_data: [], materials: [], submissions_count: 3 };

test('create sends backend fields, category values, and collection slash', async () => {
  let sent;
  const api = client(async (path, init) => { sent = { path, init }; return response(activity); });
  await api.createAssessment({ ...activity, target_category: 'SECONDARY' });
  assert.equal(sent.path, '/assessments/');
  assert.equal(sent.init.method, 'POST');
  const body = JSON.parse(sent.init.body);
  assert.equal(body.target_category, 'SECONDARY');
  assert.equal(body.max_score, 100);
  assert.equal('assessment_id' in body, false);
  assert.equal('submissions_count' in body, false);
});

test('activity edits preserve score by omitting the question bank and read-only fields', async () => {
  let sent;
  const api = client(async (path, init) => { sent = JSON.parse(init.body); return response(activity); });
  await api.updateAssessment('server-id', api.toAssessmentUpdatePayload(activity));
  assert.equal(sent.max_score, 100);
  for (const field of ['categories_data', 'materials', 'assessment_type', 'assessment_id', 'is_ai_generated']) assert.equal(field in sent, false);
  assert.equal(sent.target_category, null);
});

test('quiz updates include question pools', () => {
  const api = client(() => {});
  const categories = [{ category_id: 'mc', questions: [{ id: 'q1', correct_answer: 'B' }] }];
  assert.equal(api.toAssessmentUpdatePayload({ ...activity, assessment_type: 'QUIZ', categories_data: categories }).categories_data, categories);
});

test('list paginates and hydrates row-only responses with real detail counts', async () => {
  const paths = [];
  const api = client(async path => {
    paths.push(path);
    if (path.includes('offset=0')) return response(Array.from({ length: 100 }, (_, i) => ({ assessment_id: String(i) })));
    if (path.includes('offset=100')) return response([{ assessment_id: '100' }]);
    return response({ ...activity, assessment_id: path.split('/').pop() });
  });
  const tasks = await api.listAssessments();
  assert.equal(tasks.length, 101);
  assert.equal(tasks[100].assessment_id, '100');
  assert.equal(tasks[0].submissions_count, 3);
  assert.equal(paths.includes('/assessments/teacher/my-tasks?offset=100&limit=100'), true);
});

test('validation and failed requests reject instead of reporting a successful save', async () => {
  const api = client(async () => ({ ok: false, status: 422, json: async () => ({ detail: [{ loc: ['body', 'target_category'], msg: 'Invalid category' }] }) }));
  await assert.rejects(api.createAssessment(activity), /target_category: Invalid category/);
  const failed = client(async () => { throw new Error('Network unavailable'); });
  await assert.rejects(failed.getAssessment('id'), /Network unavailable/);
});
