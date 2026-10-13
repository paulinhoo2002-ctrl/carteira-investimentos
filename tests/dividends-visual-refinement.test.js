#!/usr/bin/env node
// Dividend visual refinement tests - updated for lazy render architecture

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyFullAppFixture } = require('./helpers/full-app-fixtures');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

async function runVisualTests() {
  const harness = await startLocalHttpServer(ROOT, 0, { syntheticQa: true });
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
  const page = await context.newPage();

  await page.goto(harness.url + '&testReadOnly=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof S !== 'undefined' && !!document.querySelector('.test-mode-banner'));
  await applyFullAppFixture(page, 'large', 'CONFIRMED');
  await page.evaluate(() => go('dividendos'));
  await page.waitForFunction(() => S.tab === 'dividendos', { timeout: 5000 });

  // Test: overview view contains dividend-primary-grid
  const overviewHasPrimaryGrid = await page.evaluate(() => document.body.innerHTML.includes('dividend-primary-grid'));
  assert.ok(overviewHasPrimaryGrid, 'overview view must contain dividend-primary-grid');

  // Test: overview view contains dividend-history-heading
  const overviewHasHistoryHeading = await page.evaluate(() => document.body.innerHTML.includes('dividend-history-heading'));
  assert.ok(overviewHasHistoryHeading, 'overview view must contain dividend-history-heading');

  // Test: overview view contains dividendExecutiveKpis (rendered)
  const overviewHasExecKpis = await page.evaluate(() => document.body.innerHTML.includes('dividend-executive-kpi') || document.body.innerHTML.includes('div-exec-kpis'));
  assert.ok(overviewHasExecKpis, 'overview view must contain executive KPIs');

  // Test: all views render without error
  const views = ['overview', 'received', 'asset', 'monthly', 'timeline', 'review'];
  for (const view of views) {
    await page.evaluate(v => { S.dividendViewMode = v; go('dividendos'); }, view);
    await page.waitForFunction(v => S.tab === 'dividendos' && S.dividendViewMode === v, view, { timeout: 3000 });
    const hasContent = await page.evaluate(() => document.body.innerHTML.length > 1000);
    assert.ok(hasContent, `${view} view must render content`);
  }

  // Test: no console errors during view switches
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  
  for (let i = 0; i < 20; i++) {
    const view = views[i % views.length];
    await page.evaluate(v => { S.dividendViewMode = v; go('dividendos'); }, view);
    await page.waitForFunction(v => S.tab === 'dividendos' && S.dividendViewMode === v, view, { timeout: 3000 });
  }
  assert.equal(errors.length, 0, `No console errors during view switches, got: ${errors.join('; ')}`);

  console.log('All dividend visual refinement tests passed!');
  await browser.close();
  harness.server.close();
}

runVisualTests().catch(e => { console.error(e.message); process.exit(1); });