'use strict';

/**
 * AUTH-DEMO Phase 2 — FINAL browser certification.
 * Boots the REAL app (non-testMode) on the local server, drives the four
 * account-mode states through the real render paths, audits network, runs
 * the responsive matrix (390/768/1366/1920 × light/dark) and Axe
 * (node_modules/axe-core, local). Deterministic lifecycle: spawns and kills
 * its own server; no emulator, no production contact, synthetic-only.
 *
 * Run: PLAYWRIGHT_BROWSERS_PATH=%LOCALAPPDATA%/ms-playwright npm run test:auth-demo-browser
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = Number(process.env.AUTH_DEMO_QA_PORT || 4187);
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = path.join(__dirname, '..', '.qa-state', 'auth-demo-browser');
const AXE = require.resolve('axe-core/axe.min.js');
const VIEWPORTS = [[390, 844], [768, 1024], [1366, 768], [1920, 1080]];
const DEMO_ROUTES = ['dashboard', 'ativos', 'aportes', 'renda-fixa', 'dividendos', 'rentabilidade', 'ajudar', 'metas', 'relatorios', 'irpf', 'settings'];
// Environmental SDK/network noise (CDN load, auth-domain mismatch on localhost)
// — filtered with justification; anything else counts as a fatal app error.
const ENV_NOISE = /firebase|googleapis|gstatic|Failed to load resource|net::|ERR_|unsafe-inline|Content Security/i;

let server = null;
let browser = null;
let ctx = null;
let page = null;
let firestoreRequests = 0;
let pageErrors = [];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitServerReady() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(BASE + '/', { signal: AbortSignal.timeout(1500) });
      if (res.ok) return true;
    } catch (e) { /* retry */ }
    await sleep(500);
  }
  throw new Error('local server did not become ready on ' + BASE);
}

async function freshPage(viewport) {
  if (ctx) { await ctx.close(); ctx = null; }
  ctx = await browser.newContext({ viewport: { width: viewport[0], height: viewport[1] } });
  page = await ctx.newPage();
  firestoreRequests = 0;
  pageErrors = [];
  page.on('request', (r) => {
    const u = r.url();
    if (/firestore\.googleapis|\/databases\/\(default\)|identitytoolkit.*projects\/carteira-de-investimento/.test(u)) {
      if (!/demo-|127\.0\.0\.1|localhost/.test(u)) firestoreRequests++;
    }
  });
  page.on('pageerror', (e) => pageErrors.push(String(e && e.message || e).slice(0, 300)));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(
    () => (typeof S !== 'undefined') && typeof render === 'function' && document.getElementById('root')
      && document.getElementById('root').innerHTML.length > 0,
    null, { timeout: 30000 }
  );
  return page;
}

async function bodyText() { return page.evaluate(() => document.body.innerText); }

async function overflowOk() {
  const delta = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  return delta <= 1;
}

async function runAxe(label) {
  assert.ok(fs.existsSync(AXE), 'axe-core must be installed locally (node_modules/axe-core)');
  await page.addScriptTag({ path: AXE });
  const result = await page.evaluate(() => window.axe
    ? axe.run(document, { resultTypes: ['violations'] })
    : Promise.resolve(null));
  assert.ok(result, 'axe.run returned nothing for ' + label);
  const bad = (result.violations || []).filter((v) => v.impact === 'critical' || v.impact === 'serious');
  return { critical: bad.filter((v) => v.impact === 'critical').length, serious: bad.filter((v) => v.impact === 'serious').length, all: bad };
}

async function revealDemoAsset(ticker) {
  const category = page.locator('details.accordion-category').filter({
    has: page.locator('.asset-name', { hasText: ticker }),
  });
  await category.locator(':scope > summary.accordion-header').click();
  await page.locator('.assets-table .asset-name').filter({ hasText: ticker }).waitFor({ state: 'visible' });
}

async function setTheme(theme) { await page.evaluate((t) => { try { applyTheme(t); } catch (e) { /* keep */ } }, theme); }

before(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  server = spawn(process.execPath, [path.join(__dirname, 'local-http-server.js'), '--port', String(PORT)], { stdio: 'ignore' });
  server.unref();
  await waitServerReady();
  const pw = require('playwright');
  browser = await pw.chromium.launch();
});

after(async () => {
  if (browser) { try { await browser.close(); } catch (e) {} }
  if (ctx) { try { await ctx.close(); } catch (e) {} }
  if (server) {
    try { server.kill(); } catch (e) {}
    try { if (process.platform === 'win32') spawn('taskkill', ['/PID', String(server.pid), '/F', '/T'], { stdio: 'ignore' }); } catch (e) {}
  }
});

// ===== P4 LOGIN_REQUIRED =====

test('P4: LOGIN_REQUIRED shows Google gate, no financial values, no stale state', async () => {
  await freshPage([1366, 768]);
  await page.waitForFunction(() => document.body.innerText.includes('Entre com Google para continuar'), null, { timeout: 25000 });
  const text = await bodyText();
  assert.ok(text.includes('Entre com Google para continuar'), 'gate copy');
  assert.ok(!text.includes('R$'), 'no financial values on login gate');
  assert.ok(!/DEMO3|Patrimônio total|Dividendos/.test(text), 'no stale portfolio content');
  assert.strictEqual(firestoreRequests, 0, 'no portfolio fetch while unauthenticated');
  await page.screenshot({ path: path.join(SHOTS, 'login-1366-dark.png') });
});

// ===== P5 AUTH_LOADING =====

test('P5: AUTH_LOADING "Verificando sua conta..." accessible, no financial UI', async () => {
  await freshPage([1366, 768]);
  await page.evaluate(() => { FB.authResolved = false; FB.access.loading = true; render(); });
  await page.waitForFunction(() => document.body.innerText.includes('Verificando sua conta...'));
  const text = await bodyText();
  assert.ok(!text.includes('R$'), 'loading shows no values');
  const hasStatus = await page.evaluate(() => !!document.querySelector('#root [role="status"], #root [aria-live]'));
  assert.ok(hasStatus, 'loading state exposes status semantics');
  assert.strictEqual(firestoreRequests, 0, 'no portfolio fetch during authorization loading');
  await page.screenshot({ path: path.join(SHOTS, 'auth-loading-1366-dark.png') });
});

// ===== P13 no real-data flash on fresh boot =====

test('P13: fresh boot never flashes portfolio before the gate (REAL_DATA_FLASH_BEFORE_AUTH=NO)', async () => {
  await freshPage([1366, 768]);
  const early = await page.evaluate(() => document.getElementById('root').innerHTML);
  assert.ok(!/DEMO3|Patrimônio|provento/i.test(early), 'root contained portfolio content before authorization: ' + early.slice(0, 120));
  await page.waitForFunction(() => document.body.innerText.includes('Entre com Google para continuar'), null, { timeout: 25000 });
});

// ===== P6/P7/P14 DEMO routes + IRPF synthetic + network audit =====

test('P6/P7: DEMO renders all 11 required routes with badge, synthetic data, synthetic IRPF, zero real portfolio requests', async () => {
  await freshPage([1366, 768]);
  await page.evaluate(() => { FB.accountMode = undefined; enterDemoMode(); });
  await page.waitForFunction(() => {
    const el = document.getElementById('auth-demo-badge');
    return el && el.innerText.includes('Modo demonstração') && el.getBoundingClientRect().width > 0;
  });
  for (const route of DEMO_ROUTES) {
    await page.evaluate((r) => { go(r); }, route);
    await sleep(250);
    const badge = await page.evaluate(() => {
      const el = document.getElementById('auth-demo-badge');
      return !!el && (el.textContent || '').includes('Modo demonstração') && el.getBoundingClientRect().width > 0;
    });
    assert.ok(badge, `badge missing on route ${route}`);
    if (route === 'ativos') await revealDemoAsset('DEMO3');
    const text = await bodyText();
    if (route === 'dashboard' || route === 'ativos') {
      assert.ok(text.includes('DEMO'), `synthetic tickers missing on ${route}`);
    }
    if (route === 'irpf') {
      assert.ok(text.includes('Dados fictícios'), 'IRPF demo must say Dados fictícios');
      assert.ok(text.includes('fictício'), 'IRPF demo must be explicitly synthetic');
      assert.ok(!text.includes('Evidências fiscais insuficientes'), 'owner IR2026 explanation leaked into demo');
      assert.ok(!text.includes('0 de 61'), 'owner real sale coverage leaked into demo');
      assert.ok(!text.includes('31/12/2025') || text.includes('fictício'), 'owner opening blockers leaked');
      await page.screenshot({ path: path.join(SHOTS, 'demo-irpf-1366-dark.png') });
    }
    const fatal = pageErrors.filter((e) => !ENV_NOISE.test(e));
    assert.deepStrictEqual(fatal, [], `fatal page errors on ${route}`);
  }
  await page.evaluate(() => { go('dashboard'); });
  await sleep(200);
  await page.screenshot({ path: path.join(SHOTS, 'demo-dashboard-1366-dark.png') });
  assert.strictEqual(firestoreRequests, 0, 'P14: DEMO made real Firestore portfolio requests');
});

// ===== P8 DEMO reset =====

test('P8: Restaurar demonstração resets to deterministic fixture with no Firestore calls', async () => {
  await freshPage([1366, 768]);
  await page.evaluate(() => enterDemoMode());
  await page.waitForFunction(() => document.getElementById('auth-demo-badge') && document.getElementById('auth-demo-badge').innerText.includes('Modo demonstração'));
  await page.evaluate(() => {
    S.assets.push({ id: 99, ticker: 'DEMOX', type: 'Ação', qty: 1, avg_price: 1, current_price: 1 });
    go('ativos');
  });
  await revealDemoAsset('DEMOX');
  await page.waitForFunction(() => document.body.innerText.includes('DEMOX'));
  const before = firestoreRequests;
  await page.getByRole('button', { name: 'Restaurar demonstração', exact: true }).click();
  await sleep(300);
  const count = await page.evaluate(() => S.assets.length);
  assert.strictEqual(count, 9, 'fixture default asset count');
  const stillDemo = await page.evaluate(() => S.assets.some((a) => a && a.ticker === 'DEMOX'));
  assert.ok(!stillDemo, 'DEMOX still in state after reset');
  await page.evaluate(() => go('ativos'));
  await revealDemoAsset('DEMO3');
  assert.ok(!(await bodyText()).includes('DEMOX'), 'mutation remained visible after reset');
  assert.strictEqual(firestoreRequests - before, 0, 'reset caused Firestore requests');
});

// ===== P9 DEMO persistence (honest model) =====

test('P9: demo session is not auto-restored after reload (memory/session model, honest)', async () => {
  await freshPage([1366, 768]);
  await page.evaluate(() => enterDemoMode());
  await page.evaluate(() => {
    S.assets.push({ id: 98, ticker: 'DEMOY', type: 'Ação', qty: 1, avg_price: 1, current_price: 1 });
    render();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => (typeof S !== 'undefined') && typeof render === 'function' && document.getElementById('root') && document.getElementById('root').innerHTML.length > 0,
    null, { timeout: 30000 }
  );
  await sleep(400);
  const text = await bodyText();
  assert.ok(!text.includes('DEMOY') || !text.includes('Modo demonstração'), 'demo mutation/auto-session persisted across reload (must be explicit)');
});

// ===== P10 BLOCKED =====

test('P10: BLOCKED renders dedicated screen, no demo fallback, no values, no portfolio fetch', async () => {
  await freshPage([1366, 768]);
  await page.evaluate(() => {
    FB.accountMode = 'BLOCKED';
    FB.authResolved = true;
    FB.access = { loading: false, loaded: true, allowed: false, reason: '' };
    render();
  });
  await page.waitForFunction(() => document.body.innerText.includes('Acesso indisponível'));
  const text = await bodyText();
  assert.ok(!text.includes('R$'), 'blocked screen shows values');
  assert.ok(!text.includes('Modo demonstração'), 'blocked fell back into demo');
  assert.ok(!text.includes('DEMO3'), 'blocked screen shows portfolio data');
  assert.strictEqual(firestoreRequests, 0);
  await page.screenshot({ path: path.join(SHOTS, 'blocked-1366-dark.png') });
});

// ===== P18 responsive matrix =====

test('P18: responsive 390/768/1366/1920 × light/dark — GLOBAL_OVERFLOW=0 on all auth states', async () => {
  await freshPage([1366, 768]);
  const states = {
    LOGIN: async () => { await page.waitForFunction(() => document.body.innerText.includes('Entre com Google para continuar'), null, { timeout: 25000 }); },
    AUTH_LOADING: async () => { await page.evaluate(() => { FB.authResolved = false; FB.access.loading = true; render(); }); },
    DEMO_DASHBOARD: async () => { await page.evaluate(() => { FB.accountMode = undefined; enterDemoMode(); }); await sleep(250); },
    DEMO_IRPF: async () => { await page.evaluate(() => { go('irpf'); }); await sleep(250); },
    BLOCKED: async () => { await page.evaluate(() => { FB.accountMode = 'BLOCKED'; FB.authResolved = true; FB.access = { loading: false, loaded: true, allowed: false, reason: '' }; render(); }); },
  };
  const failures = [];
  for (const [stateName, drive] of Object.entries(states)) {
    await drive();
    for (const [w, h] of VIEWPORTS) {
      await page.setViewportSize({ width: w, height: h });
      await sleep(180);
      for (const theme of ['dark', 'light']) {
        await setTheme(theme);
        await sleep(120);
        if (!(await overflowOk())) failures.push(`${stateName}@${w}x${h}:${theme}`);
      }
    }
    await setTheme('dark');
  }
  assert.deepStrictEqual(failures, [], 'overflow failures: ' + failures.join(', '));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { FB.accountMode = undefined; enterDemoMode(); });
  await sleep(250);
  await page.screenshot({ path: path.join(SHOTS, 'demo-dashboard-390-dark.png') });
});

// ===== P19 Axe matrix =====

test('P19: Axe critical=0 serious=0 on LOGIN/AUTH_LOADING/DEMO dashboard/DEMO IRPF/BLOCKED × light/dark', async () => {
  await freshPage([1366, 768]);
  const worst = { critical: 0, serious: 0, where: '' };
  const states = {
    LOGIN: async () => { await page.waitForFunction(() => document.body.innerText.includes('Entre com Google para continuar'), null, { timeout: 25000 }); },
    AUTH_LOADING: async () => { await page.evaluate(() => { FB.authResolved = false; FB.access.loading = true; render(); }); },
    DEMO_DASHBOARD: async () => { await page.evaluate(() => { FB.accountMode = undefined; enterDemoMode(); }); await sleep(250); },
    DEMO_IRPF: async () => { await page.evaluate(() => { go('irpf'); }); await sleep(250); },
    BLOCKED: async () => { await page.evaluate(() => { FB.accountMode = 'BLOCKED'; FB.authResolved = true; FB.access = { loading: false, loaded: true, allowed: false, reason: '' }; render(); }); },
  };
  for (const [stateName, drive] of Object.entries(states)) {
    for (const theme of ['dark', 'light']) {
      await drive();
      await setTheme(theme);
      await sleep(150);
      const res = await runAxe(`${stateName}:${theme}`);
      const total = res.critical + res.serious;
      if (total > worst.critical + worst.serious) { worst.critical = res.critical; worst.serious = res.serious; worst.where = `${stateName}:${theme}`; }
      assert.ok(res.critical === 0, `axe critical on ${stateName}:${theme}: ` + res.all.map((v) => v.id + ':' + v.impact).slice(0, 5).join(','));
      assert.ok(res.serious === 0, `axe serious on ${stateName}:${theme}: ` + res.all.filter((v) => v.impact === 'serious').map((v) => `${v.id}:${v.nodes.map((n) => `${n.target.join(' ')} ${n.failureSummary}`).join('; ')}`).slice(0, 5).join(' | '));
    }
  }
  assert.strictEqual(worst.critical, 0, 'axe critical: ' + worst.where);
});
