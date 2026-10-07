import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('assessment collection rewrites retain the backend slash before the catch-all', async () => {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(source, { exports, process: { env: { BACKEND_URL: 'http://backend.test/' } } });
  const rules = await exports.default.rewrites();
  const fallback = rules.findIndex(rule => rule.source === '/api/v1/:path*');
  for (const path of ['/api/v1/assessments', '/api/v1/assessments/']) {
    const index = rules.findIndex(rule => rule.source === path);
    assert.ok(index >= 0 && index < fallback);
    assert.equal(rules[index].destination, 'http://backend.test/api/v1/assessments/');
  }
});
