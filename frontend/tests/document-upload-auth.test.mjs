import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('upload uses the cookie proxy and does not retry a rejected session', async () => {
  const exports = {};
  const requests = [];
  const code = ts.transpileModule(fs.readFileSync(new URL('../src/lib/document-processor-api.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, {
    exports, process: { env: {} }, AbortController, FormData, setTimeout, clearTimeout,
    require: () => ({ getCurrentUser: async () => ({ user_id: 'teacher' }) }),
    fetch: async (url, init) => {
      requests.push({ url, init });
      return { ok: false, status: 401, json: async () => ({ message: 'Sign in again.' }) };
    },
  });
  const file = new Blob(['test']);
  file.name = 'ILA.DOCX';
  await assert.rejects(exports.parseModuleDocument(file, { userId: 'teacher' }), error => error.status === 401);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/api/v1/document-processor/parser');
  assert.equal(requests[0].init.credentials, 'include');
});
