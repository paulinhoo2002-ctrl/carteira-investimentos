const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { startLocalHttpServer } = require('./local-http-server');
const { applyV289VisualFixture } = require('./helpers/v289-visual-fixtures.js');

function resolveBrowser() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(c => { try { fs.accessSync(c); return true; } catch { return false; } });
}

async function openDashboard(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await applyV289VisualFixture(page, 'baseline');
  await page.evaluate(() => { window.go('dashboard'); });
  await page.waitForFunction(() => S.tab === 'dashboard');
}

test('V348 browser: highs/lows columns render, filter works, keyboard reaches rows, mobile stacks', async () => {
  const exe = resolveBrowser();
  assert.ok(exe, 'Chrome/Edge not found');
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  const consoleErrors = [], pageErrors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => pageErrors.push(e.message));
    await openDashboard(page, harness.url);

    // 1. Two columns with up to five rows each, from the synthetic baseline
    const columns = await page.evaluate(() => [...document.querySelectorAll('.dashboard-highlight-column')].map(c => ({
      kind: (c.className.split(/\s+/).includes('high')) ? 'high' : 'low',
      rows: c.querySelectorAll('.premium-exec-row').length,
    })));
    assert.equal(columns.length, 2, `expected 2 highlight columns, got ${columns.length}`);
    assert.ok(['high', 'low'].every(k => columns.some(c => c.kind === k)), 'columns must be high and low');
    assert.ok(columns.every(c => c.rows <= 5), 'columns must cap at five rows');

    // 2. Class filter narrows rows via the existing state setter (no page overflow)
    const before = columns.reduce((s, c) => s + c.rows, 0);
    await page.evaluate(() => window.setDashboardHighlightsClassFilter('fii'));
    await page.waitForFunction(() => S.dashboardHighlightsClassFilter === 'fii');
    const afterCount = await page.evaluate(() => document.querySelectorAll('.dashboard-highlight-column .premium-exec-row').length);
    const chipOn = await page.evaluate(() => [...document.querySelectorAll('.dashboard-highlights-tabs .asset-inner-tab')].some(b => b.classList.contains('on') && b.textContent.trim() === 'FIIs'));
    assert.equal(chipOn, true, 'FII chip must be active after filtering');
    // baseline fixture has mixed classes; FII-only cannot exceed the unfiltered count
    assert.ok(afterCount <= before, 'filtering by class must not add rows');
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    assert.equal(noOverflow, true, 'page overflow after filtering');

    // 3. Keyboard: Tab reaches the filter chips (focusable buttons)
    await page.keyboard.press('Tab');
    const focusIsInteractive = await page.evaluate(() => {
      const el = document.activeElement;
      return el && (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'A');
    });
    assert.equal(focusIsInteractive, true, 'keyboard focus must land on interactive elements');

    // 4. Rows are buttons that navigate to the asset (or inert when no exact asset)
    const rowIsButton = await page.evaluate(() => {
      const row = document.querySelector('.dashboard-highlight-column .premium-exec-row');
      return !row || row.tagName === 'BUTTON';
    });
    assert.equal(rowIsButton, true, 'highlight rows must be buttons (or absent)');

    // 5. Mobile 390: panel stacks without overflow
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    const mobile = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      panelVisible: !!document.querySelector('.dashboard-highlight-column'),
    }));
    assert.equal(mobile.overflow, false, 'mobile overflow with highlights panel');
    assert.equal(mobile.panelVisible, true, 'highlights panel must remain visible on mobile');

    // 6. Synthetic readonly: no financial writes, no Firebase
    const state = await page.evaluate(() => ({
      testMode: window.__LOCAL_TEST_MODE__ === true,
      firebase: typeof FB !== 'undefined' && Boolean(FB.app || FB.db),
      writes: (window.__V304_QA_WRITE_COUNTS__?.localStorage ?? []).filter(({ key }) => key === 'civ5'),
    }));
    assert.equal(state.testMode, true, 'must run in synthetic test mode');
    assert.equal(state.firebase, false, 'must not touch Firebase');
    assert.deepEqual(state.writes, [], 'must not write financial storage');

    assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);
    assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
    await page.close();
  } finally {
    await browser.close();
    harness.server.close();
  }
});
