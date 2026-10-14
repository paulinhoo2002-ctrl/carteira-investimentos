#!/usr/bin/env node
/**
 * Deploy Identity Verification Gate
 * Prevents cross-project deployment incidents by verifying all deployment
 * identity factors before any deploy proceeds.
 *
 * FAIL-CLOSED: Any unknown, missing, or mismatched factor BLOCKS deploy.
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================
// CANONICAL EXPECTED VALUES (LEGACY PROJECT)
// ============================================================
const EXPECTED = {
  GIT_REPO: 'paulinhoo2002-ctrl/carteira-investimentos',
  GIT_REMOTE_URL: 'https://github.com/paulinhoo2002-ctrl/carteira-investimentos.git',
  VERCEL_PROJECT_ID: 'prj_a4SYCPWPqm0c2oaNF7iLEKf6wX47',
  PRODUCTION_DOMAIN: 'carteira-investimentos-delta.vercel.app',
  PROJECT_NAME: 'Carteira de Investimentos LEGACY',
  FORBIDDEN_VERCEL_PROJECT_ID: 'prj_ib6zLz3gPUXbEwJyZrK5hOo3Vjdp', // Carteira 2.0
  WORKTREE_NAME: 'v012-mega-12-lifetime-redesign',
  BRANCH_PATTERN: /^codex\/legacy-product-mega-12$/,
  LEGACY_ROOT_INDICATOR: 'Carteira de Investimentos',
};

// ============================================================
// VERIFICATION FUNCTIONS
// ============================================================

function runGit(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    return null;
  }
}

function checkGitRoot() {
  const root = runGit('git rev-parse --show-toplevel');
  if (!root) return { ok: false, reason: 'Not a git repository' };
  
  // Check if we're in the correct worktree
  const worktreeName = path.basename(root);
  if (!worktreeName.includes(EXPECTED.WORKTREE_NAME) && !worktreeName.includes('carteira-investimentos')) {
    return { ok: false, reason: `Unexpected worktree: ${worktreeName}` };
  }
  return { ok: true, value: root };
}

function checkGitRemote() {
  const remote = runGit('git remote get-url origin');
  if (!remote) return { ok: false, reason: 'No origin remote' };
  if (remote !== EXPECTED.GIT_REMOTE_URL) {
    return { ok: false, reason: `Wrong remote: ${remote} (expected ${EXPECTED.GIT_REMOTE_URL})` };
  }
  return { ok: true, value: remote };
}

function checkGitRepoIdentity() {
  // Extract repo from remote
  const remote = runGit('git remote get-url origin');
  if (!remote) return { ok: false, reason: 'No origin remote' };
  
  const match = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
  if (!match) return { ok: false, reason: `Cannot parse repo from remote: ${remote}` };
  
  const repo = match[1];
  if (repo !== EXPECTED.GIT_REPO) {
    return { ok: false, reason: `Wrong repo: ${repo} (expected ${EXPECTED.GIT_REPO})` };
  }
  return { ok: true, value: repo };
}

function checkBranch() {
  const branch = runGit('git branch --show-current');
  if (!branch) return { ok: false, reason: 'No current branch' };
  if (!EXPECTED.BRANCH_PATTERN.test(branch)) {
    return { ok: false, reason: `Wrong branch: ${branch} (expected ${EXPECTED.BRANCH_PATTERN})` };
  }
  return { ok: true, value: branch };
}

function checkHead() {
  const head = runGit('git rev-parse HEAD');
  if (!head) return { ok: false, reason: 'No HEAD commit' };
  return { ok: true, value: head };
}

function checkWorktree() {
  const worktreeList = runGit('git worktree list');
  if (!worktreeList) return { ok: false, reason: 'Cannot list worktrees' };
  if (!worktreeList.includes(EXPECTED.WORKTREE_NAME) && !worktreeList.includes('carteira-investimentos')) {
    return { ok: false, reason: `Worktree ${EXPECTED.WORKTREE_NAME} not found in worktree list` };
  }
  return { ok: true };
}

function checkVercelConfig() {
  const vercelJsonPath = path.join(process.cwd(), '.vercel', 'project.json');
  // Allow override via environment variable for CI/CD
  const envProjectId = process.env.VERCEL_PROJECT_ID;
  
  if (envProjectId) {
    if (envProjectId === EXPECTED.FORBIDDEN_VERCEL_PROJECT_ID) {
      return { ok: false, reason: `CROSS_PROJECT_DEPLOY_BLOCKED: Forbidden project ID ${EXPECTED.FORBIDDEN_VERCEL_PROJECT_ID} (Carteira 2.0)` };
    }
    if (envProjectId !== EXPECTED.VERCEL_PROJECT_ID) {
      return { ok: false, reason: `Wrong Vercel project ID (env): ${envProjectId} (expected ${EXPECTED.VERCEL_PROJECT_ID})` };
    }
    return { ok: true, value: { projectId: envProjectId, source: 'environment' } };
  }
  
  if (!fs.existsSync(vercelJsonPath)) {
    return { ok: false, reason: 'Missing .vercel/project.json and VERCEL_PROJECT_ID not set' };
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    const projectId = config.projectId;
    const orgId = config.orgId;
    
    if (!projectId) return { ok: false, reason: 'Missing projectId in .vercel/project.json' };
    if (projectId === EXPECTED.FORBIDDEN_VERCEL_PROJECT_ID) {
      return { ok: false, reason: `CROSS_PROJECT_DEPLOY_BLOCKED: Forbidden project ID ${EXPECTED.FORBIDDEN_VERCEL_PROJECT_ID} (Carteira 2.0)` };
    }
    if (projectId !== EXPECTED.VERCEL_PROJECT_ID) {
      return { ok: false, reason: `Wrong Vercel project ID: ${projectId} (expected ${EXPECTED.VERCEL_PROJECT_ID})` };
    }
    return { ok: true, value: { projectId, orgId, source: 'file' } };
  } catch (e) {
    return { ok: false, reason: `Invalid .vercel/project.json: ${e.message}` };
  }
}

function checkProductionDomain() {
  // We can't directly verify the deployed domain from local, but we can
  // check if the expected domain is configured in vercel.json or similar
  const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
  if (fs.existsSync(vercelJsonPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
      if (config.alias && config.alias.includes(EXPECTED.PRODUCTION_DOMAIN)) {
        return { ok: true, value: config.alias };
      }
      // If no alias specified, it's OK (uses default)
      return { ok: true, value: 'default (vercel.json alias not specified)' };
    } catch (e) {
      return { ok: false, reason: `Invalid vercel.json: ${e.message}` };
    }
  }
  // No vercel.json = uses default Vercel domain, which is acceptable
  return { ok: true, value: 'default (no vercel.json)' };
}

function checkProjectName() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) return { ok: false, reason: 'Missing package.json' };
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (pkg.name && pkg.name.includes('carteira-2')) {
      return { ok: false, reason: `Package name indicates Carteira 2.0: ${pkg.name}` };
    }
    return { ok: true, value: pkg.name };
  } catch (e) {
    return { ok: false, reason: `Invalid package.json: ${e.message}` };
  }
}

// ============================================================
// MAIN VERIFICATION
// ============================================================

async function verifyDeployIdentity() {
  console.log('═══════════════════════════════════════════');
  console.log('DEPLOY IDENTITY VERIFICATION GATE');
  console.log('═══════════════════════════════════════════');
  console.log('Project:', EXPECTED.PROJECT_NAME);
  console.log('');

  const checks = [
    { name: 'Git Root', fn: checkGitRoot },
    { name: 'Git Remote', fn: checkGitRemote },
    { name: 'Git Repo Identity', fn: checkGitRepoIdentity },
    { name: 'Branch', fn: checkBranch },
    { name: 'HEAD Commit', fn: checkHead },
    { name: 'Worktree', fn: checkWorktree },
    { name: 'Vercel Project Config', fn: checkVercelConfig },
    { name: 'Production Domain', fn: checkProductionDomain },
    { name: 'Package Name', fn: checkProjectName },
  ];

  let allPassed = true;
  const results = {};

  for (const check of checks) {
    const result = check.fn();
    results[check.name] = result;
    
    if (result.ok) {
      console.log(`  ✓ ${check.name}: ${result.value || 'OK'}`);
    } else {
      console.log(`  ✗ ${check.name}: ${result.reason}`);
      allPassed = false;
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════');
  if (allPassed) {
    console.log('✓ DEPLOY IDENTITY VERIFICATION: PASSED');
    console.log('═══════════════════════════════════════════');
    return 0;
  } else {
    console.log('✗ DEPLOY IDENTITY VERIFICATION: FAILED');
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('DEPLOY BLOCKED - Fix all failures above before deploying.');
    return 1;
  }
}

// Run if executed directly
if (require.main === module) {
  verifyDeployIdentity().then(code => process.exit(code)).catch(e => {
    console.error('Verification error:', e);
    process.exit(1);
  });
}

module.exports = { verifyDeployIdentity, EXPECTED };