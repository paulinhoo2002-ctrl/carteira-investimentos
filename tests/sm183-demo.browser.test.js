'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const ROOT = path.join(__dirname, '..');
const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
];
const CHROME = process.env.CHROME_PATH || CHROME_CANDIDATES.find(candidate => fs.existsSync(candidate));

test('SM183 demo usa fixture e persist�ncia local isolada, sem inicializar Firebase', { skip: !CHROME && 'Chrome/Chromium indispon�vel' }, async t => {
  const harness = await startLocalHttpServer(ROOT, 0, { syntheticQa: true, demo: true });
  let browser;
  try {
    try {
      const response = await fetch(harness.url);
      assert.equal(response.status, 200);
    } catch (error) {
      if (['EACCES', 'EPERM', 'ECONNREFUSED'].includes(error?.cause?.code || error?.code)) {
        t.skip(`loopback HTTP bloqueado pela infraestrutura (${error?.cause?.code || error?.code})`);
        return;
      }
      throw error;
    }
    browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const firebaseRequests = [];
    const pageErrors = [];
    page.on('request', request => {
      if (/firebaseio\.com|firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebaseinstallations\.googleapis\.com|gstatic\.com\/firebase/i.test(request.url())) firebaseRequests.push(request.url());
    });
    page.on('pageerror', error => pageErrors.push(error.message));
    const localOrigin = new URL(harness.url).origin;
    await page.route('**/*', route => new URL(route.request().url()).origin === localOrigin ? route.continue() : route.abort());
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LOCAL_DEMO_ADAPTER__?.enabled === true && window.__LOCAL_TEST_MODE__ === true && Array.isArray(S.assets) && typeof save === 'function');

    const initial = await page.evaluate(() => ({
      demo: window.__LOCAL_DEMO_ADAPTER__?.enabled === true,
      firebase: { app: FB.app, auth: FB.auth, db: FB.db, user: FB.user },
      fixture: { assets: S.assets.length, aportes: S.aportes.length, proventos: S.proventos.length, rfEvents: S.rfEvents.length },
      localStorageKeys: Object.keys(localStorage),
      civ5: localStorage.getItem('civ5'),
      banner: document.querySelector('.test-mode-banner')?.innerText || '',
      viewportHasHorizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert.equal(initial.demo, true);
    assert.deepEqual(initial.firebase, { app: null, auth: null, db: null, user: null });
    assert.ok(initial.fixture.assets > 0 && initial.fixture.aportes > 0 && initial.fixture.proventos > 0 && initial.fixture.rfEvents > 0);
    assert.deepEqual(initial.localStorageKeys.filter(key => key === 'civ5'), []);
    assert.match(initial.banner, /DEMO LOCAL/);
    assert.equal(initial.viewportHasHorizontalOverflow, false);

    const mutation = await page.evaluate(() => {
      S.aportes.push({ id: 'sm183-demo-aporte', date: '2026-11-15', ticker: 'DEMO1', name: 'Ativo sint�tico', type: 'A��o', asset_type: 'A��o', qty: 2, price: 10, operation: 'compra' });
      const saved = save();
      const snapshot = JSON.parse(localStorage.getItem('carteira_demo_local_v1'));
      return { saved, snapshotVersion: snapshot?.version, storedTicker: snapshot?.wallet?.aportes?.find(item => item.id === 'sm183-demo-aporte')?.ticker, civ5: localStorage.getItem('civ5') };
    });
    assert.equal(mutation.saved, true);
    assert.equal(mutation.snapshotVersion, 1);
    assert.equal(mutation.storedTicker, 'DEMO1');
    assert.equal(mutation.civ5, null, 'demo must never read/write the production financial storage key');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LOCAL_DEMO_ADAPTER__?.enabled === true && Array.isArray(S.aportes));
    assert.equal(await page.evaluate(() => S.aportes.some(item => item.id === 'sm183-demo-aporte')), true, 'synthetic data should survive a local reload');
    await page.evaluate(() => restoreLocalTestData());
    assert.equal(await page.evaluate(() => S.aportes.some(item => item.id === 'sm183-demo-aporte')), false, 'restore action should reset the demo fixture');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('carteira_demo_local_v1')).wallet.aportes.some(item => item.id === 'sm183-demo-aporte')), false);
    assert.deepEqual(firebaseRequests, [], `DEMO requested Firebase resources: ${firebaseRequests.join(', ')}`);
    assert.deepEqual(pageErrors, []);
  } finally {
    await browser?.close();
    harness.server.closeAllConnections?.();
    await new Promise(resolve => harness.server.close(resolve));
  }
});

