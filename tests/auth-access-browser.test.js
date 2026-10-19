'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const PORT = Number(process.env.AUTH_ACCESS_QA_PORT || 4187);
const BASE = `http://127.0.0.1:${PORT}`;
const AXE = require.resolve('axe-core/axe.min.js');
const VIEWPORTS = [[390, 844], [768, 1024], [1366, 768]];
const ENV_NOISE = /firebase|googleapis|gstatic|Failed to load resource|net::|ERR_|unsafe-inline|Content Security/i;
let server, browser, context, page;
let portfolioRequests = 0;
let pageErrors = [];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function waitReady() {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(BASE + '/', { signal: AbortSignal.timeout(1500) })).ok) return; } catch (_) {}
    await sleep(500);
  }
  throw new Error('local QA server did not become ready');
}
async function freshPage(viewport = [1366, 768]) {
  if (context) await context.close();
  context = await browser.newContext({ viewport: { width: viewport[0], height: viewport[1] } });
  page = await context.newPage();
  portfolioRequests = 0;
  pageErrors = [];
  page.on('request', request => {
    if (/firestore\.googleapis|\/databases\/\(default\)\/documents\/portfolios\//.test(request.url())) portfolioRequests++;
  });
  page.on('pageerror', error => pageErrors.push(String(error?.message || error).slice(0, 250)));
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  try {
    await page.waitForFunction(() => typeof FB !== 'undefined' && typeof S !== 'undefined' && typeof render === 'function' && document.querySelector('#root'), { timeout: 8000 });
  } catch (error) {
    const state = await page.evaluate(() => ({ title: document.title, marker: window.__LOCAL_QA_RUNTIME__, testMode: window.__LOCAL_TEST_MODE__, hasFB: typeof FB, hasS: typeof S, hasRender: typeof render, scripts: [...document.scripts].map(script => script.src).filter(Boolean) })).catch(() => null);
    throw new Error(`synthetic app bootstrap failed: ${JSON.stringify({ state, pageErrors })}; ${error.message}`);
  }
  return page;
}
async function setAccessState(state) {
  await page.evaluate(stateName => {
    FB.authResolved = true;
    FB.access = { loading: false, loaded: true, allowed: stateName === 'REAL', reason: '' };
    FB.accountMode = stateName;
    if (stateName !== 'REAL') FB.user = stateName === 'LOGIN_REQUIRED' ? null : { uid: 'synthetic-unauthorized', email: 'synthetic@example.invalid' };
    if (stateName === 'REAL') {
      FB.user = { uid: 'synthetic-owner', email: 'owner@example.invalid', emailVerified: true, displayName: 'Conta sintética' };
      FB.cloudLoaded = true;
      FB.cloudStateModel = CloudSyncState.resolve(CloudSyncState.begin(CloudSyncState.initial()), { exists: true, hasData: true });
      S.assets = [{ id: 'qa-synthetic-1', ticker: 'QAONLY3', type: 'Ação', qty: 1, avg_price: 10, current_price: 10 }];
      S.wallets = [{ id: 'qa-wallet', name: 'Carteira sintética', assets: S.assets, aportes: [], proventos: [] }];
      S.activeWalletId = 'qa-wallet';
    } else if (typeof clearRealStateInMemory === 'function') clearRealStateInMemory();
    render();
  }, state);
}
async function auditAxe(label) {
  await page.addScriptTag({ path: AXE });
  const result = await page.evaluate(() => axe.run(document, { resultTypes: ['violations'] }));
  const severe = result.violations.filter(item => ['critical', 'serious'].includes(item.impact));
  assert.deepEqual(severe.map(item => `${item.impact}:${item.id}`), [], `${label} Axe violations`);
}
async function assertNoOverflow(label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `${label} overflow ${overflow}px`);
}

before(async () => {
  server = spawn(process.execPath, [path.join(__dirname, 'local-http-server.js'), '--port', String(PORT), '--synthetic-qa'], { stdio: 'ignore' });
  server.unref();
  await waitReady();
  browser = await require('playwright').chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
  });
});
after(async () => {
  if (browser) await browser.close().catch(() => {});
  if (context) await context.close().catch(() => {});
  if (server) {
    try { server.kill(); } catch (_) {}
    if (process.platform === 'win32' && server.pid) spawn('taskkill', ['/PID', String(server.pid), '/F', '/T'], { stdio: 'ignore' });
  }
});

test('LOGIN and direct route access expose no portfolio data or read requests', async () => {
  await freshPage();
  await page.evaluate(() => { FB.accountMode = 'LOGIN_REQUIRED'; FB.authResolved = true; FB.access = { loading: false, loaded: false, allowed: false }; render(); });
  assert.match(await page.locator('#root').innerText(), /Entre com Google para continuar/);
  await page.evaluate(() => { go('irpf'); render(); });
  assert.match(await page.locator('#root').innerText(), /Entre com Google para continuar/);
  assert.doesNotMatch(await page.locator('#root').innerText(), /R\$|QAONLY3|Patrimônio total/);
  assert.equal(portfolioRequests, 0);
});

test('unauthorized and auth-failure states stay blocked across direct routes', async () => {
  await freshPage();
  for (const state of ['BLOCKED', 'AUTH_FAILURE']) {
    await setAccessState(state);
    const label = state === 'BLOCKED' ? /Acesso não autorizado/ : /Não foi possível validar o acesso/;
    assert.match(await page.locator('#root').innerText(), label);
    await page.evaluate(() => { go('dashboard'); render(); });
    assert.match(await page.locator('#root').innerText(), label);
    assert.doesNotMatch(await page.locator('#root').innerText(), /R\$|QAONLY3/);
    assert.equal(portfolioRequests, 0);
  }
});

test('late authorization reads from an old account cannot authorize or overwrite the new session', async () => {
  await freshPage();
  const result = await page.evaluate(async () => {
    const userA = { uid: 'synthetic-account-a', email: 'a@example.invalid', emailVerified: true };
    const userB = { uid: 'synthetic-account-b', email: 'b@example.invalid', emailVerified: true };
    let resolveAccess;
    let resolveRegistry;
    const accessRead = new Promise(resolve => { resolveAccess = resolve; });
    const registryRead = new Promise(resolve => { resolveRegistry = resolve; });
    const originalDb = FB.db;
    FB.db = { collection: name => ({ doc: id => ({ get: () => name === 'meta' && id === 'access' ? accessRead : registryRead }) }) };

    const sessionA = authSessionGuard.begin(userA);
    FB.user = userA;
    FB.access = { loaded: true, loading: false, allowed: false, reason: 'synthetic B state' };
    const pendingAccess = loadAccessControl(userA, sessionA);
    authSessionGuard.begin(userB);
    FB.user = userB;
    const stateForB = FB.access;
    resolveAccess({ exists: true, data: () => ({ allowedEmails: ['a@example.invalid'] }) });
    const accessA = await pendingAccess;

    const staleMode = await resolveAccountModeCompat(userA, true, sessionA);
    const modeSession = authSessionGuard.begin(userA);
    const pendingMode = resolveAccountModeCompat(userA, true, modeSession);
    authSessionGuard.begin(userB);
    resolveRegistry({ exists: true, data: () => ({ enabled: true, role: 'owner', blocked: false }) });
    const registryMode = await pendingMode;
    FB.db = originalDb;
    return {
      accessA,
      accessStatePreserved: FB.access === stateForB,
      staleMode,
      registryMode,
      currentUid: FB.user?.uid,
    };
  });

  assert.deepEqual(result, {
    accessA: false,
    accessStatePreserved: true,
    staleMode: 'AUTH_FAILURE',
    registryMode: 'AUTH_FAILURE',
    currentUid: 'synthetic-account-b',
  });
  assert.equal(portfolioRequests, 0, 'an obsolete authorization result must not start a private portfolio read');
});

test('authorized synthetic owner reaches REAL shell and logout clears portfolio state', async () => {
  await freshPage();
  await setAccessState('REAL');
  await page.evaluate(() => { go('ativos'); render(); });
  assert.equal(await page.evaluate(() => FB.accountMode === 'REAL' && S.assets.some(asset => asset.id === 'qa-synthetic-1')), true);
  const state = await page.evaluate(async () => {
    FB.auth = { signOut: async () => {} };
    const completion = signOutGoogle();
    const cleared = { assets: S.assets.length, wallets: S.wallets.length, aportes: S.aportes.length, proventos: S.proventos.length, rfEvents: S.rfEvents.length, package2: FB.package2, mode: FB.accountMode };
    await completion;
    return cleared;
  });
  await page.waitForFunction(() => FB.accountMode === 'LOGIN_REQUIRED');
  assert.deepEqual(state, { assets: 0, wallets: 0, aportes: 0, proventos: 0, rfEvents: 0, package2: null, mode: 'LOGIN_REQUIRED' });
  assert.match(await page.locator('#root').innerText(), /Entre com Google para continuar/);
  assert.doesNotMatch(await page.locator('#root').innerText(), /QAONLY3|Carteira sintética/);
});

test('login, unauthorized, auth failure, and synthetic owner have no critical/serious Axe or responsive overflow', async () => {
  await freshPage();
  for (const state of ['LOGIN_REQUIRED', 'BLOCKED', 'AUTH_FAILURE', 'REAL']) {
    await setAccessState(state);
    for (const [width, height] of VIEWPORTS) {
      await page.setViewportSize({ width, height });
      await assertNoOverflow(`${state}@${width}`);
    }
    await auditAxe(state);
  }
  assert.deepEqual(pageErrors.filter(error => !ENV_NOISE.test(error)), []);
  assert.equal(portfolioRequests, 0, 'state-driven browser QA must not contact portfolio endpoints');
});
