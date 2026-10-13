'use strict';

// V115 Full-app mobile + accessibility QA: boots the complete legacy app
// with synthetic fixtures, navigates all routes across mobile/desktop
// viewports, and runs axe accessibility scans (critical=0, serious=0).

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyFullAppFixture } = require('./helpers/full-app-fixtures');

const ROOT = require('node:path').resolve(__dirname, '..');
const ALL_ROUTES = ['dashboard', 'patrimonio', 'ativos', 'dividendos', 'renda-fixa', 'metas', 'settings'];
const VIEWPORTS = [
  { name: 'mobile-320', width: 320, height: 568 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1366', width: 1366, height: 768 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
];

describe('V115 Full-App Mobile + Accessibility QA', () => {
  let harness, browser;

  before(async () => {
    harness = await startLocalHttpServer(ROOT, 0, { syntheticQa: true });
    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: true,
    });
  });

  after(async () => {
    if (browser) await browser.close();
    if (harness && harness.server) harness.server.close();
  });

  test('all routes render without overflow at each viewport', async () => {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, serviceWorkers: 'block' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

      await page.goto(harness.url + '&testReadOnly=1', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof S !== 'undefined' && !!document.querySelector('.test-mode-banner'), { timeout: 15000 });
      await applyFullAppFixture(page, 'normal', 'CONFIRMED');

      for (const route of ALL_ROUTES) {
        await page.evaluate(r => go(r), route);
        await page.waitForFunction(r => S.tab === r, route, { timeout: 5000 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert.ok(overflow <= 1, `${viewport.name}/${route}: horizontal overflow ${overflow}px (must be <=1)`);
      }

      assert.equal(errors.length, 0, `${viewport.name}: must have 0 errors, got ${errors.join('; ')}`);
      await context.close();
      console.log(`  ${viewport.name}: 7/7 routes, 0 overflow, 0 errors`);
    }
  });

  test('axe accessibility: critical=0 serious=0 on all routes (390px)', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.goto(harness.url + '&testReadOnly=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof S !== 'undefined' && !!document.querySelector('.test-mode-banner'), { timeout: 15000 });
    await applyFullAppFixture(page, 'normal', 'CONFIRMED');

    // Inject axe-core
    const axePath = require.resolve('axe-core/axe.min.js');
    await page.addScriptTag({ path: axePath });

    const results = {};
    for (const route of ALL_ROUTES) {
      await page.evaluate(r => go(r), route);
      await page.waitForFunction(r => S.tab === r, route, { timeout: 5000 });
      const scan = await page.evaluate(() => {
        return new Promise(resolve => {
          axe.run(document, { resultTypes: ['violations'] }, (err, result) => {
            if (err) { resolve({ error: err.message }); return; }
            const critical = result.violations.filter(v => v.impact === 'critical');
            const serious = result.violations.filter(v => v.impact === 'serious');
            resolve({
              critical: critical.length,
              serious: serious.length,
              criticalDetails: critical.map(v => v.id),
              seriousDetails: serious.map(v => v.id),
            });
          });
        });
      });
      results[route] = scan;
      assert.equal(scan.critical, 0, `${route}: axe critical must be 0, got ${scan.critical} (${scan.criticalDetails?.join(', ')})`);
      assert.equal(scan.serious, 0, `${route}: axe serious must be 0, got ${scan.serious} (${scan.seriousDetails?.join(', ')})`);
      console.log(`  ${route}: critical=${scan.critical} serious=${scan.serious}`);
    }
    await context.close();
  });

  test('axe accessibility: critical=0 serious=0 on all routes (1366px)', async () => {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.goto(harness.url + '&testReadOnly=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof S !== 'undefined' && !!document.querySelector('.test-mode-banner'), { timeout: 15000 });
    await applyFullAppFixture(page, 'normal', 'CONFIRMED');

    const axePath = require.resolve('axe-core/axe.min.js');
    await page.addScriptTag({ path: axePath });

    for (const route of ALL_ROUTES) {
      await page.evaluate(r => go(r), route);
      await page.waitForFunction(r => S.tab === r, route, { timeout: 5000 });
      const scan = await page.evaluate(() => {
        return new Promise(resolve => {
          axe.run(document, { resultTypes: ['violations'] }, (err, result) => {
            if (err) { resolve({ critical: -1, serious: -1, error: err.message }); return; }
            resolve({
              critical: result.violations.filter(v => v.impact === 'critical').length,
              serious: result.violations.filter(v => v.impact === 'serious').length,
            });
          });
        });
      });
      assert.equal(scan.critical, 0, `${route} @1366: axe critical must be 0, got ${scan.critical}`);
      assert.equal(scan.serious, 0, `${route} @1366: axe serious must be 0, got ${scan.serious}`);
    }
    await context.close();
  });

  test('keyboard navigation: tab through interactive elements without traps', async () => {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.goto(harness.url + '&testReadOnly=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof S !== 'undefined' && !!document.querySelector('.test-mode-banner'), { timeout: 15000 });
    await applyFullAppFixture(page, 'normal', 'CONFIRMED');

    // Focus the body and tab 30 times — no keyboard traps expected
    await page.focus('body');
    const focusTrail = [];
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? (el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ')[0] : '')) : 'none';
      });
      focusTrail.push(focused);
    }
    // Verify we didn't get stuck on the same element (trap detection)
    const uniqueFocused = new Set(focusTrail);
    assert.ok(uniqueFocused.size >= 5, `keyboard navigation must reach >= 5 distinct elements, got ${uniqueFocused.size}`);
    assert.ok(!focusTrail.every(f => f === focusTrail[0]), 'keyboard must not be trapped on one element');

    // Escape must close overlays if open
    await page.keyboard.press('Escape');
    await context.close();
  });
});