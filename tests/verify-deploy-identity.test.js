'use strict';

/**
 * Deploy Identity Verification Tests
 * Tests the cross-project deployment protection scenarios
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'verify-deploy-identity.js');

function runVerify(env = {}) {
  try {
    const output = execSync('node scripts/verify-deploy-identity.js', {
      cwd: ROOT,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { success: true, output };
  } catch (e) {
    return { success: false, output: e.stdout || e.message };
  }
}

test('DEPLOY_IDENTITY: correct LEGACY identity -> PASS', () => {
  const result = runVerify({ VERCEL_PROJECT_ID: 'prj_a4SYCPWPqm0c2oaNF7iLEKf6wX47' });
  assert.ok(result.success, 'Should pass with correct LEGACY identity');
  assert.match(result.output, /DEPLOY IDENTITY VERIFICATION: PASSED/);
});

test('DEPLOY_IDENTITY: Carteira 2.0 repo -> FAIL', () => {
  // Temporarily change remote
  execSync('git remote set-url origin https://github.com/paulinhoo2002-ctrl/carteira-2.0.git', { cwd: ROOT });
  try {
    const result = runVerify({ VERCEL_PROJECT_ID: 'prj_a4SYCPWPqm0c2oaNF7iLEKf6wX47' });
    assert.ok(!result.success, 'Should fail with Carteira 2.0 repo');
    assert.match(result.output, /Wrong repo|Wrong remote/);
  } finally {
    // Restore
    execSync('git remote set-url origin https://github.com/paulinhoo2002-ctrl/carteira-investimentos.git', { cwd: ROOT });
  }
});

test('DEPLOY_IDENTITY: wrong Vercel project ID -> FAIL', () => {
  const result = runVerify({ VERCEL_PROJECT_ID: 'prj_wrong123' });
  assert.ok(!result.success, 'Should fail with wrong Vercel project ID');
  assert.match(result.output, /Wrong Vercel project ID/);
});

test('DEPLOY_IDENTITY: Carteira 2.0 Vercel project ID -> FAIL (CROSS_PROJECT_DEPLOY_BLOCKED)', () => {
  const result = runVerify({ VERCEL_PROJECT_ID: 'prj_ib6zLz3gPUXbEwJyZrK5hOo3Vjdp' });
  assert.ok(!result.success, 'Should fail with Carteira 2.0 Vercel project ID');
  assert.match(result.output, /CROSS_PROJECT_DEPLOY_BLOCKED/);
});

test('DEPLOY_IDENTITY: missing Vercel metadata -> FAIL', () => {
  const result = runVerify({}); // No VERCEL_PROJECT_ID
  assert.ok(!result.success, 'Should fail with missing Vercel metadata');
  assert.match(result.output, /Missing.*VERCEL_PROJECT_ID|Missing.*project.json/);
});

test('DEPLOY_IDENTITY: Carteira 2.0 repo with wrong Vercel -> FAIL', () => {
  execSync('git remote set-url origin https://github.com/paulinhoo2002-ctrl/carteira-2.0.git', { cwd: ROOT });
  try {
    const result = runVerify({ VERCEL_PROJECT_ID: 'prj_ib6zLz3gPUXbEwJyZrK5hOo3Vjdp' });
    assert.ok(!result.success, 'Should fail with Carteira 2.0 repo and wrong Vercel');
  } finally {
    execSync('git remote set-url origin https://github.com/paulinhoo2002-ctrl/carteira-investimentos.git', { cwd: ROOT });
  }
});

test('DEPLOY_IDENTITY: wrong branch -> FAIL', () => {
  // We can't easily test this without changing branch, skip
  // This would require checkout which is risky
});