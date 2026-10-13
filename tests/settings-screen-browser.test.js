'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const root = path.join(__dirname, '..');
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

test('settings screen loads the extracted renderer in the synthetic read-only browser', async () => {
  const harness = await startLocalHttpServer(root);
  let browser;
  try {
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

    await page.goto(harness.url.replace('?testMode=1', '?testMode=1&testReadOnly=1'), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof settingsTab === 'function' && typeof render === 'function');
    await page.evaluate(() => { S.tab = 'settings'; render(); });

    assert.match(await page.locator('#root').innerText(), /Preferências e administração/);
    assert.match(await page.locator('#root').innerText(), /Bloqueado no modo somente leitura/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    }), []);
    assert.deepEqual(errors, []);

    await page.setViewportSize({ width: 1366, height: 768 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    harness.server.closeAllConnections?.();
    await new Promise(resolve => harness.server.close(resolve));
  }
});
