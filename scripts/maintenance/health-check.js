'use strict';

// V588–V591: read-only health-check for the Carteira LEGACY deployment.
// Checks (all READ-ONLY, no credentials, no financial content):
//   1. App availability (production URL, HTTP status)
//   2. Deployed version marker (__APP_BUILD_ID__ in served HTML)
//   3. GitHub CI status for origin/main (via gh, optional)
//   4. Local checkout sanity (main SHA vs origin/main)
// Emits machine-readable JSON + human summary; exit 0 = healthy, 2 = degraded, 1 = check error.
//
// Usage: node scripts/maintenance/health-check.js [--json] [--url URL] [--expected-sha SHA]
// Suggested cadence: daily (cron) — see docs/ai/V588_V600_MAINTENANCE.md

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_URL = 'https://carteira-investimentos-delta.vercel.app';

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    const body = await res.text();
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

function extractBuildId(html) {
  const m = html.match(/__APP_BUILD_ID__\s*=\s*'([^']+)'/);
  return m ? m[1] : null;
}

function git(args) {
  try {
    return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

async function main() {
  const asJson = process.argv.includes('--json');
  const urlArg = process.argv.find(a => a.startsWith('--url='));
  const targetUrl = urlArg ? urlArg.slice(6) : DEFAULT_URL;
  const report = { timestamp: new Date().toISOString(), target: targetUrl, checks: [] };
  let degraded = false;

  function check(name, state, detail) {
    report.checks.push({ name, state, detail });
    if (state !== 'OK') degraded = true;
  }

  // 1+2. Availability + version marker.
  try {
    const { status, body } = await fetchWithTimeout(targetUrl, 15000);
    if (status !== 200) {
      check('availability', 'FAIL', `HTTP ${status}`);
    } else {
      const buildId = extractBuildId(body);
      check('availability', 'OK', `HTTP 200, ${body.length} bytes`);
      check('version-marker', buildId ? 'OK' : 'WARN', buildId ? `__APP_BUILD_ID__=${buildId}` : 'no __APP_BUILD_ID__ in served HTML');
    }
  } catch (error) {
    check('availability', 'FAIL', error.message);
  }

  // 3. CI on origin/main (best-effort, requires gh auth; read-only).
  try {
    const out = execFileSync('gh', ['run', 'list', '--branch', 'main', '--limit', '1'], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 20000 });
    const first = (out.split(/\r?\n/)[0] || '').trim();
    let conclusion;
    if (first.startsWith('completed\tsuccess\t')) conclusion = 'SUCCESS';
    else if (first.startsWith('completed\tfailure\t')) conclusion = 'FAILURE';
    else if (first.startsWith('in_progress')) conclusion = 'PENDING';
    else conclusion = 'UNKNOWN';
    check('ci-main', conclusion === 'SUCCESS' ? 'OK' : conclusion === 'FAILURE' ? 'FAIL' : 'WARN', `${conclusion}: ${first.slice(0, 120)}`);
  } catch (error) {
    check('ci-main', 'WARN', `gh unavailable: ${String(error.message).slice(0, 80)}`);
  }

  // 4. Local checkout sanity (HEAD of this worktree vs origin/main).
  const localHead = git(['rev-parse', 'HEAD']);
  const originMain = git(['rev-parse', 'origin/main']);
  const mergeBase = localHead && originMain ? git(['merge-base', localHead, originMain]) : null;
  if (!localHead || !originMain) check('git-sync', 'WARN', 'git unavailable');
  else if (localHead === originMain) check('git-sync', 'OK', `head matches origin/main (${localHead.slice(0, 10)})`);
  else if (mergeBase === originMain) check('git-sync', 'OK', `head=${localHead.slice(0, 10)} is origin/main + work (base ${originMain.slice(0, 10)})`);
  else check('git-sync', 'WARN', `head=${localHead.slice(0, 10)} origin/main=${originMain.slice(0, 10)} diverged`);

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const c of report.checks) console.log(`[${c.state}] ${c.name}: ${c.detail}`);
    // V616 alert levels: CRITICAL = app down (availability FAIL); DEGRADED = any other non-OK.
    const availability = report.checks.find(c => c.name === 'availability');
    const critical = availability && availability.state === 'FAIL';
    console.log(critical ? 'HEALTH: CRITICAL (application unavailable)' : degraded ? 'HEALTH: DEGRADED' : 'HEALTH: OK');
  }
  process.exitCode = degraded ? 2 : 0;
}

main().catch(error => { console.error(String(error)); process.exitCode = 1; });