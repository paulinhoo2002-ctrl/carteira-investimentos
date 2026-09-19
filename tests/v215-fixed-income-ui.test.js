'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server.js');

function browserPath() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(candidate => { try { fs.accessSync(candidate); return true; } catch { return false; } });
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 900 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) {
  test(`V215 Renda Fixa trust controls remain usable at ${viewport.width}px`, async () => {
    const executablePath = browserPath();
    assert.ok(executablePath, 'Chrome/Edge não encontrado');
    const harness = await startLocalHttpServer(require('node:path').join(__dirname, '..'));
    const browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({ viewport, isMobile: viewport.width <= 430, hasTouch: viewport.width <= 430 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    try {
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => go('renda-fixa'));
      await page.getByLabel('Buscar título de renda fixa').fill('CDI');
      await page.waitForTimeout(180);
      await page.getByLabel('Filtrar status do valuation').selectOption('UNAVAILABLE');
      await page.getByLabel('Ordenar posições de renda fixa').selectOption('value-desc');
      const snapshot = await page.evaluate(() => ({
        controls: document.querySelectorAll('.premium-rf-controls input, .premium-rf-controls select').length,
        trustBar: !!document.querySelector('.premium-rf-trust-bar'),
        unavailableCopy: document.body.textContent.includes('Indisponível'),
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        headings: [...document.querySelectorAll('h1,h2')].filter(node => node.offsetParent).map(node => node.textContent.trim()),
      }));
      assert.equal(snapshot.controls, 3);
      assert.equal(snapshot.trustBar, true);
      assert.equal(snapshot.unavailableCopy, true);
      assert.equal(snapshot.overflow, false);
      assert.ok(snapshot.headings.includes('Renda Fixa'));
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
      await browser.close();
      harness.server.close();
    }
  });
}
