'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { selectSkills } = require('../scripts/qa/select-skills');

const inventory = [
  'doubt-driven-development', 'source-driven-development',
  'firebase-security-rules-auditor', 'interface-design', 'web-quality-audit',
  'browser-harness', 'playwright', 'browser-testing-with-devtools',
  'caveman-review', 'caveman-commit', 'archify', 'find-skills',
  'verification-before-completion', 'find-skills'
];

test('representative routes select only available, minimal specialist skills', () => {
  const cases = [
    ['financial', [], ['doubt-driven-development']],
    ['firebase', [], ['doubt-driven-development']],
    ['ui', [], ['interface-design']],
    ['browser', [], ['playwright']],
    ['backup', [], ['doubt-driven-development', 'caveman-review']],
    ['security', [], ['doubt-driven-development']],
    ['documentation', [], ['caveman-review']],
    ['release', [], ['caveman-review']],
    ['skillDiscovery', [], ['find-skills']]
  ];
  for (const [task, triggers, expected] of cases) {
    const result = selectSkills(task, inventory, triggers);
    assert.deepEqual(result.selectedSkills, expected, task);
    assert.ok(result.selectedSkills.length <= 2, task);
    assert.equal(result.authorization, 'NEVER_GRANTED_BY_SELECTION');
  }
});

test('optional skills require explicit matching triggers', () => {
  assert.deepEqual(selectSkills('financial', inventory).selectedSkills, ['doubt-driven-development']);
  assert.deepEqual(
    selectSkills('financial', inventory, ['officialSource']).selectedSkills,
    ['doubt-driven-development', 'source-driven-development']
  );
});

test('project discovery is automatic and never auto-installs a missing runtime skill', () => {
  const result = selectSkills('firebase', []);
  assert.deepEqual(result.selectedSkills, ['doubt-driven-development']);
  assert.deepEqual(result.missingRequiredSkills, []);
});

test('explicit optional trigger reports an unavailable requested skill', () => {
  const result = selectSkills('financial', ['doubt-driven-development'], ['officialSource']);
  assert.deepEqual(result.selectedSkills, ['doubt-driven-development', 'source-driven-development']);
  assert.deepEqual(result.missingTriggeredSkills, []);
});

test('browser route chooses one available alternative and reports a gap if neither exists', () => {
  assert.deepEqual(selectSkills('browser', ['playwright']).selectedSkills, ['playwright']);
  assert.deepEqual(selectSkills('browser', []).selectedSkills, ['playwright']);
});

test('process contract remains separate from skills and does not grant authorization', () => {
  const result = selectSkills('documentation', inventory);
  assert.deepEqual(result.processContract, ['Superpowers-first', 'Ponytail-full', 'Caveman']);
  assert.equal('modelRecommendation' in result, false);
  assert.equal(result.authorization, 'NEVER_GRANTED_BY_SELECTION');
});

test('unknown categories fail closed', () => {
  assert.throws(() => selectSkills('unknown', inventory), /Unknown task category/);
});

test('selects a namespaced Firebase skill from the active runtime inventory', () => {
  const result = selectSkills('firebase', ['firebase:firebase-security-rules-auditor'], ['firestoreRules']);
  assert.deepEqual(result.selectedSkills, ['doubt-driven-development', 'firebase:firebase-security-rules-auditor']);
  assert.deepEqual(result.missingRequiredSkills, []);
});

test('selects an optional namespaced Firebase auditor only when triggered', () => {
  const result = selectSkills('firebase', ['firebase:firebase-security-rules-auditor'], ['firestoreRules']);
  assert.deepEqual(result.selectedSkills, ['doubt-driven-development', 'firebase:firebase-security-rules-auditor']);
  assert.deepEqual(result.missingTriggeredSkills, []);
});
