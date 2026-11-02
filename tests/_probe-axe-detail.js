'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 8791;
const BASE = `http://127.0.0.1:${PORT}`;
const AXE = require.resolve('axe-core/axe.min.js');
let server, browser, context, page;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function waitReady() {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(BASE + '/', { signal: AbortSignal.timeout(1500) })).ok) return; } catch (_) {}
    await sleep(500);
  }
  throw new Error('QA server not ready');
}

test('probe: which element fails color-contrast in REAL state', async () => {
  server = spawn(process.execPath, [path.join(__dirname, 'local-http-server.js'), '--port', String(PORT), '--synthetic-qa'], { stdio: 'ignore' });
  server.unref();
  await waitReady();
  browser = await require('playwright').chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  page = await context.newPage();
  await page.route('https://www.gstatic.com/firebasejs/10.12.5/firebase-*-compat.js', r =>
    r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof FB !== 'undefined' && typeof S !== 'undefined' && typeof render === 'function' && document.querySelector('#root'), { timeout: 8000 });

  // REAL state (igual ao auth-access-browser.test.js)
  await page.evaluate(() => {
    FB.authResolved = true;
    FB.access = { loading: false, loaded: true, allowed: true, reason: '' };
    FB.accountMode = 'REAL';
    FB.user = { uid: OWNER_FIREBASE_UID, email: OWNER_FIREBASE_EMAIL, emailVerified: true, displayName: 'Conta sintética' };
    FB.cloudLoaded = true;
    FB.cloudStateModel = CloudSyncState.resolve(CloudSyncState.begin(CloudSyncState.initial()), { exists: true, hasData: true });
    S.assets = [{ id: 'qa-synthetic-1', ticker: 'QAONLY3', type: 'Ação', qty: 1, avg_price: 10, current_price: 10 }];
    S.wallets = [{ id: 'qa-wallet', name: 'Carteira sintética', assets: S.assets, aportes: [], proventos: [] }];
    S.activeWalletId = 'qa-wallet';
    render();
  });
  await sleep(800);

  await page.addScriptTag({ path: AXE });
  const detail = await page.evaluate(() => {
    const res = window.axe.run(document, { resultTypes: ['violations'] });
    return res.then(r => r.violations
      .filter(v => ['critical', 'serious'].includes(v.impact))
      .map(v => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.slice(0, 8).map(n => ({
          target: n.target.join(' '),
          html: n.html.slice(0, 200),
          summary: n.failureSummary ? String(n.failureSummary).slice(0, 300) : ''
        }))
      })));
  });
  console.log('AXE_DETAIL=' + JSON.stringify(detail, null, 2));

  await browser.close();
  try { server.kill(); } catch (_) {}
  if (process.platform === 'win32' && server.pid) spawn('taskkill', ['/PID', String(server.pid), '/F', '/T'], { stdio: 'ignore' });
});
