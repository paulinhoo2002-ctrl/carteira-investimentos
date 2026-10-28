'use strict';
const { test } = require('node:test');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 8792;
const BASE = `http://127.0.0.1:${PORT}`;
let server, browser, page;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function waitReady() {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(BASE + '/', { signal: AbortSignal.timeout(1500) })).ok) return; } catch (_) {}
    await sleep(500);
  }
  throw new Error('QA server not ready');
}

test('probe: computed style of .chart-tab.active', async () => {
  server = spawn(process.execPath, [path.join(__dirname, 'local-http-server.js'), '--port', String(PORT), '--synthetic-qa'], { stdio: 'ignore' });
  server.unref();
  await waitReady();
  browser = await require('playwright').chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.route('https://www.gstatic.com/firebasejs/10.12.5/firebase-*-compat.js', r =>
    r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof FB !== 'undefined' && typeof S !== 'undefined' && typeof render === 'function' && document.querySelector('#root'), { timeout: 8000 });

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

  const info = await page.evaluate(() => {
    const el = document.querySelector('.chart-tab.active');
    if (!el) return { error: 'no .chart-tab.active found' };
    const cs = getComputedStyle(el);
    const sheets = [...document.styleSheets].map(s => s.href || 'inline').filter(Boolean);
    const gold = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim();
    const warning = getComputedStyle(document.documentElement).getPropertyValue('--warning').trim();
    const theme = document.documentElement.dataset.theme || '(none)';
    const bgAttr = document.documentElement.getAttribute('data-theme');
    return {
      html: el.outerHTML.slice(0, 120),
      computedBg: cs.backgroundColor,
      computedColor: cs.color,
      fontSize: cs.fontSize, fontWeight: cs.fontWeight,
      goldVar: gold, warningVar: warning,
      htmlTheme: theme, htmlThemeAttr: bgAttr,
      sheetsLoaded: sheets.length,
      premiumCssLoaded: sheets.some(s => String(s).includes('dashboard-premium'))
    };
  });
  console.log('CHART_TAB_INFO=' + JSON.stringify(info, null, 2));
  await browser.close();
  try { server.kill(); } catch (_) {}
  if (process.platform === 'win32' && server.pid) spawn('taskkill', ['/PID', String(server.pid), '/F', '/T'], { stdio: 'ignore' });
});
