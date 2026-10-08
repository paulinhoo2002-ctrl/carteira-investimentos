'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const root = path.join(__dirname, '..');
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

test('strict read-only synthetic browser rejects programmatic writes and cloud hydration', async () => {
  const harness = await startLocalHttpServer(root);
  let browser;
  try {
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const firebaseRequests = [];
    page.on('request', request => {
      if (/firebaseio\.com|firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebaseinstallations\.googleapis\.com/i.test(request.url())) {
        firebaseRequests.push(request.url());
      }
    });
    await page.addInitScript(() => {
      window.__QA_FINANCIAL_WRITES__ = [];
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (this === localStorage) window.__QA_FINANCIAL_WRITES__.push(String(key));
        return originalSetItem.call(this, key, value);
      };
    });
    await page.goto(harness.url.replace('?testMode=1', '?testMode=1&testReadOnly=1'), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LOCAL_TEST_MODE__ === true && window.__LOCAL_TEST_READ_ONLY__ === true);

    assert.match(await page.locator('.test-mode-banner').innerText(), /TESTE LOCAL · SOMENTE LEITURA/);
    assert.match(await page.locator('.test-mode-readonly-status').innerText(), /Necessita revisão antes da confirmação/);

    const before = await page.evaluate(() => JSON.stringify({ assets: S.assets, movements: S.aportes, income: S.proventos }));
    const attempts = await page.evaluate(async () => {
      const edit = canEditFromThisTab('tentativa de QA');
      const saved = save();
      const reset = await resetPortfolio();
      const hydration = await applyCloudData({ assets: [] });
      restoreLocalTestData();
      return {
        edit,
        saved,
        reset,
        hydration,
        after: JSON.stringify({ assets: S.assets, movements: S.aportes, income: S.proventos }),
        financialStorage: localStorage.getItem('civ5'),
        writes: window.__QA_FINANCIAL_WRITES__,
      };
    });

    assert.equal(attempts.edit, false);
    assert.equal(attempts.saved, false);
    assert.equal(attempts.reset, undefined);
    assert.equal(attempts.hydration, false);
    assert.equal(attempts.after, before, 'read-only attempts changed synthetic financial state');
    assert.equal(attempts.financialStorage, null);
    assert.deepEqual(attempts.writes, []);
    assert.deepEqual(firebaseRequests, []);

    await page.setViewportSize({ width: 1366, height: 768 });
    assert.equal(await page.locator('.test-mode-banner').isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally {
    await browser?.close();
    harness.server.closeAllConnections?.();
    await new Promise(resolve => harness.server.close(resolve));
  }
});
