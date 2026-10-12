'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { selectSkills } = require('../scripts/qa/select-skills');

const inventory = [
  'doubt-driven-development', 'source-driven-development',
  'firebase-security-rules-auditor', 'interface-design', 'web-quality-audit',
  'browser-harness', 'playwright', 'browser-testing-with-devtools',
  'caveman-review', 'caveman-commit', 'archify', 'find-skills',
  'verification-before-completion', 'code-review-and-quality',
  'vercel:verification', 'vercel:deployments-cicd', 'deploy-to-vercel'
];

test('representative routes select only available, minimal specialist skills', () => {
  const cases = [
    ['financial', [], ['doubt-driven-development']],
    ['firebase', [], ['firebase-security-rules-auditor']],
    ['ui', [], ['interface-design']],
    ['browser', [], ['browser-harness']],
    ['backup', [], ['doubt-driven-development']],
    ['security', [], ['firebase-security-rules-auditor']],
    ['documentation', [], ['caveman-review']],
    ['codeReview', [], ['code-review-and-quality']],
    ['vercel', [], ['vercel:verification']],
    ['release', [], ['verification-before-completion']],
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

test('unavailable skills are reported and never auto-installed or substituted', () => {
  const result = selectSkills('firebase', ['doubt-driven-development']);
  assert.deepEqual(result.selectedSkills, []);
  assert.deepEqual(result.missingRequiredSkills, ['firebase-security-rules-auditor']);
});

test('explicit optional trigger reports an unavailable requested skill', () => {
  const result = selectSkills('financial', ['doubt-driven-development'], ['officialSource']);
  assert.deepEqual(result.selectedSkills, ['doubt-driven-development']);
  assert.deepEqual(result.missingTriggeredSkills, ['source-driven-development']);
});

test('browser route chooses one available alternative and reports a gap if neither exists', () => {
  assert.deepEqual(selectSkills('browser', ['playwright']).selectedSkills, ['playwright']);
  assert.deepEqual(selectSkills('browser', []).missingRequiredSkills, ['browser-harness', 'playwright']);
});

test('process contract remains separate from skills and does not grant authorization', () => {
  const result = selectSkills('documentation', inventory);
  assert.deepEqual(result.processContract, ['Superpowers-first', 'Ponytail-full', 'Caveman']);
  assert.equal(result.modelRecommendation.codex, 'GPT-6 Luna Medium');
  assert.equal(result.modelRecommendation.effort, 'LOW');
  assert.match(result.modelRecommendation.availabilityRule, /Verify in the active runtime/);
  assert.equal(result.authorization, 'NEVER_GRANTED_BY_SELECTION');
});

test('unknown categories fail closed', () => {
  assert.throws(() => selectSkills('unknown', inventory), /Unknown task category/);
});

test('selects a namespaced Firebase skill from the active runtime inventory', () => {
  const result = selectSkills('firebase', ['firebase:firebase-security-rules-auditor']);
  assert.deepEqual(result.selectedSkills, ['firebase:firebase-security-rules-auditor']);
  assert.deepEqual(result.missingRequiredSkills, []);
});

test('selects a namespaced browser harness from the active runtime inventory', () => {
  const result = selectSkills('browser', ['browser-harness:browser-harness']);
  assert.deepEqual(result.selectedSkills, ['browser-harness:browser-harness']);
  assert.deepEqual(result.missingRequiredSkills, []);
});

test('code review and Vercel routes select available runtime skills', () => {
  assert.deepEqual(selectSkills('codeReview', ['caveman-review']).selectedSkills, ['caveman-review']);
  assert.deepEqual(selectSkills('vercel', ['deploy-to-vercel']).selectedSkills, ['deploy-to-vercel']);
});
