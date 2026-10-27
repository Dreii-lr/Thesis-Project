import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, dependencies = {}) {
  const exports = {};
  const source = fs.readFileSync(new URL(`../src/lib/${file}.ts`, import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText, { exports, require: name => dependencies[name] || {}, process: { env: {} } });
  return exports;
}
const api = load('document-processor-api');
const { resolveGeneratedSubject } = load('module-library', { './document-processor-api': api });
const subjects = [
  { subject_id: 'fil', name: 'Filipino', code: 'FIL' },
  { subject_id: 'eng', name: 'English', code: 'ENG' },
];
const material = strand => ({ learning_strand: strand, als_program: 'BLP' });

test('saved strand restores the exact subject without a saved generation attempt', () => {
  for (const strand of ['Filipino', 'I- Filipino', 'LS1 Filipino', 'FIL']) {
    assert.equal(resolveGeneratedSubject(material(strand), subjects)?.subject_id, 'fil');
  }
});

test('generic LS1 does not arbitrarily select English or Filipino', () => {
  assert.equal(resolveGeneratedSubject(material('LS1'), subjects), undefined);
});

test('missing, unmatched, and duplicate exact matches remain unresolved', () => {
  assert.equal(resolveGeneratedSubject(material(''), subjects), undefined);
  assert.equal(resolveGeneratedSubject(material('Unknown'), subjects), undefined);
  assert.equal(resolveGeneratedSubject(material('Filipino'), [subjects[0], { ...subjects[0], subject_id: 'other' }]), undefined);
  assert.equal(resolveGeneratedSubject(material('Filipino'), []), undefined);
});

test('unique broader strand match works without using goal or classroom text', () => {
  assert.equal(resolveGeneratedSubject(material('Communication in Filipino'), subjects)?.subject_id, 'fil');
  assert.equal(resolveGeneratedSubject({ ...material('Unknown'), main_learning_goal: 'Filipino', cls_name: 'Filipino' }, subjects), undefined);
});
