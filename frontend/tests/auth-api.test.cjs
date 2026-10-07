/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner uses CommonJS. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function client(fetch) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(require.resolve('../src/lib/auth-api.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(source, { exports, fetch });
  return exports;
}

for (const role of ['teacher', 'student']) {
  test(`${role} login sends the backend enum and verifies the session`, async () => {
    const requests = [];
    const api = client(async (path, options) => {
      requests.push({ path, options });
      return { ok: true, json: async () => ({ role: role.toUpperCase(), email: 'test@example.invalid' }) };
    });
    await api.loginAndFetchUser(' test@example.invalid ', 'test-only', role);
    const payload = JSON.parse(requests[0].options.body);
    assert.equal(payload.role, role.toUpperCase());
    assert.equal(payload.email, 'test@example.invalid');
    assert.equal(requests[0].options.credentials, 'include');
    assert.equal(requests[1].path, '/api/v1/auth/me');
  });
}

test('validation failures explain the invalid field instead of blaming credentials', async () => {
  const api = client(async () => ({ ok: false, status: 422, json: async () => ({
    detail: [{ loc: ['body', 'role'], msg: 'Invalid role' }],
  }) }));
  await assert.rejects(api.loginAndFetchUser('test@example.invalid', 'test-only', 'teacher'), /role: Invalid role/);
});

test('server failures do not claim the password is wrong', async () => {
  const api = client(async () => ({ ok: false, status: 500, json: async () => { throw new Error('Not JSON'); } }));
  await assert.rejects(api.loginAndFetchUser('test@example.invalid', 'test-only', 'teacher'), /Unable to sign in/);
});
