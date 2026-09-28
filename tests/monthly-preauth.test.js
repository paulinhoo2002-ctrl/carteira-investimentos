'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const tool = path.join(root, 'scripts', 'qa', 'monthly-preauth.js');
const executionContract = path.join(root, 'scripts', 'qa', 'monthly-execution-contract.js');
// Synthetic contract values only; these are not portfolio data or source hashes.
const valid = ['--month', '2099-01', '--plan-fp', 'a'.repeat(64), '--baseline-fp', 'b'.repeat(64), '--target-fp', 'c'.repeat(64)];

function run(args) {
  return JSON.parse(execFileSync(process.execPath, [tool, ...args], { cwd: root, encoding: 'utf8' }));
}

test('generic preauth remains read-only and never claims portfolio readiness', () => {
  const result = run(valid);
  assert.equal(result.readOnly, true);
  assert.equal(result.realWrite, false);
  assert.equal(result.cloudWrite, false);
  assert.equal(result.portfolioSpecificDataEmbedded, false);
  assert.equal(result.portfolioSpecificAnalysis, 'UNAVAILABLE');
  assert.equal(result.manifestReady, false);
});

test('invalid month or fingerprint bindings fail closed', () => {
  assert.throws(() => run(['--month', '2099-13', ...valid.slice(2)]), /MONTH_REQUIRED_YYYY-MM/);
  for (const [index, value] of [[3, 'bad'], [5, 'bad'], [7, 'bad']]) {
    assert.throws(() => run(valid.toSpliced(index, 1, value)), /MONTHLY_PREAUTH_BLOCKED/);
  }
});

test('real mutation flags are rejected', () => {
  for (const flag of ['--real', '--write', '--execute']) {
    assert.throws(() => run([...valid, flag]), /REAL_WRITE_NOT_SUPPORTED/);
  }
});

test('shadow option fails closed when no validated runner exists', () => {
  assert.throws(() => run([...valid, '--shadow']), /SHADOW_RUNNER_UNAVAILABLE/);
});

test('execution contract stays validation-only and single-use', () => {
  const args = ['--head', 'f'.repeat(40), '--manifest-hash', 'a'.repeat(64), '--source-hash', 'b'.repeat(64), '--plan-fp', 'c'.repeat(64), '--baseline-fp', 'd'.repeat(64), '--target-fp', 'e'.repeat(64)];
  const result = JSON.parse(execFileSync(process.execPath, [executionContract, ...args], { cwd: root, encoding: 'utf8' }));
  assert.equal(result.status, 'VALIDATION_ONLY_DO_NOT_EXECUTE');
  assert.equal(result.singleUse, true);
  assert.equal(result.retryAllowed, false);
  assert.equal(result.realWrite, false);
  assert.throws(() => execFileSync(process.execPath, [executionContract, ...args, '--real'], { cwd: root, encoding: 'utf8', stdio: 'pipe' }), /MONTHLY_EXECUTION_BLOCKED/);
});
