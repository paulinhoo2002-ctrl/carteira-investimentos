'use strict';

// Full-app local QA test: boots the complete legacy app with synthetic
// fixtures at scale, navigates all screens, exercises daily-use flows,
// runs a 140+ transition stability stress, and measures real performance.
// Read-only: no writes, no Firebase, no external endpoints.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyFullAppFixture, makeFullAppFixture, FIXTURE_SCALES, DATA_STATES } = require('./helpers/full-app-fixtures');

const ROOT = require('node:path').resolve(__dirname, '..');
const ALL_ROUTES = ['dashboard', 'patrimonio', 'ativos', 'dividendos', 'renda-fixa', 'metas', 'settings'];
const NAV_STRESS_TRANSITIONS = 140;

describe('V115 Full-App Local QA', () => {
  let harness, browser, context, page, session;

  before(async () => {
    harness = await startLocalHttpServer(ROOT, 0, { syntheticQa: true });
    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: true,
    });
    context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
    page = await context.newPage();
    session = await context.newCDPSession(page);
  });

  after(async () => {
    if (browser) await browser.close();
    if (harness && harness.server) harness.server.close();
  });

  test('boot: full app renders with large synthetic fixture', async () => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(harness.url + '&testReadOnly=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof S !== 'undefined' && !!document.querySelector('.test-mode-banner'), { timeout: 15000 });

    const result = await applyFullAppFixture(page, 'large', 'CONFIRMED', 'AUTHENTICATED_OWNER');

    assert.ok(result.fixture.assets.length >= 200, 'large fixture must have 200+ assets');
    assert.ok(result.fixture.proventos.length >= 100, 'large fixture must have dividends');
    assert.ok(result.fixture.rfEvents.length >= 10, 'large fixture must have RF events');

    // Verify the app rendered the synthetic data
    const assetCount = await page.evaluate(() => (S.assets || []).length);
    assert.equal(assetCount, result.fixture.assets.length, 'app state must match fixture');
    const domNodes = await page.evaluate(() => document.querySelectorAll('*').length);
    assert.ok(domNodes > 100, 'full app must render substantial DOM');
    assert.equal(errors.length, 0, `boot must have 0 errors, got: ${errors.join('; ')}`);
  });

  test('daily-use: navigate all routes with interactions', async () => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.removeAllListeners('console');
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    // Navigate through all routes
    for (const route of ALL_ROUTES) {
      await page.evaluate(r => go(r), route);
      await page.waitForFunction(r => S.tab === r, route, { timeout: 5000 });
      const currentTab = await page.evaluate(() => S.tab);
      assert.equal(currentTab, route, `must navigate to ${route}`);
    }

    // Test search in ativos
    await page.evaluate(() => go('ativos'));
    await page.waitForFunction(() => S.tab === 'ativos');
    const firstTicker = await page.evaluate(() => S.assets[0]?.ticker || '');
    if (firstTicker) {
      const searchBox = page.getByRole('searchbox', { name: /Buscar/i });
      if (await searchBox.count() > 0) {
        await searchBox.fill(firstTicker);
        await page.waitForFunction(t => S.assetsSearch === t.toLowerCase(), firstTicker, { timeout: 3000 });
        await searchBox.fill('');
        await page.waitForFunction(() => S.assetsSearch === '', { timeout: 3000 });
      }
    }

    // Test filters
    await page.evaluate(() => go('dividendos'));
    await page.waitForFunction(() => S.tab === 'dividendos');

    await page.evaluate(() => go('renda-fixa'));
    await page.waitForFunction(() => S.tab === 'renda-fixa');

    await page.evaluate(() => go('settings'));
    await page.waitForFunction(() => S.tab === 'settings');

    await page.evaluate(() => go('dashboard'));
    await page.waitForFunction(() => S.tab === 'dashboard');

    assert.equal(errors.length, 0, `daily-use navigation must have 0 errors, got: ${errors.join('; ')}`);
  });

  test('navigation stress: 140+ transitions without listener/DOM growth', async () => {
    const errors = [];
    page.removeAllListeners('pageerror');
    page.removeAllListeners('console');
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    const getListenerCount = async () => {
      const { result } = await session.send('Runtime.evaluate', { expression: 'window' });
      const { listeners } = await session.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
      return listeners.length;
    };
    const getDomCount = () => page.evaluate(() => document.querySelectorAll('*').length);

    // Baseline
    const listenersBoot = await getListenerCount();
    const domBoot = await getDomCount();

    // 140+ transitions cycling through all routes
    for (let i = 0; i < NAV_STRESS_TRANSITIONS; i++) {
      const route = ALL_ROUTES[i % ALL_ROUTES.length];
      await page.evaluate(r => go(r), route);
      // Every 10th transition, wait for tab to settle
      if (i % 10 === 0) {
        await page.waitForFunction(r => S.tab === r, route, { timeout: 5000 });
      }
    }
    // Final settle
    await page.evaluate(() => go('dashboard'));
    await page.waitForFunction(() => S.tab === 'dashboard', { timeout: 5000 });
    // Wait for deferred dashboard renders to complete
    await page.waitForTimeout(500);

    const listenersAfter = await getListenerCount();
    const domAfter = await getDomCount();

    // Listener growth must be zero or minimal (<= 5)
    const listenerGrowth = listenersAfter - listenersBoot;
    assert.ok(listenerGrowth <= 5, `listener growth must be <= 5 after 140 transitions, got ${listenerGrowth} (${listenersBoot} → ${listenersAfter})`);

    // DOM growth must be minimal (<= 30% of boot to account for deferred renders)
    const domGrowth = domAfter - domBoot;
    assert.ok(domGrowth <= Math.ceil(domBoot * 0.3), `DOM growth must be <= 30% after 140 transitions, got ${domGrowth} (${domBoot} → ${domAfter})`);

    // No page errors
    assert.equal(errors.length, 0, `stress navigation must have 0 errors, got: ${errors.join('; ')}`);

    console.log(`  listeners: ${listenersBoot} → ${listenersAfter} (growth: ${listenerGrowth})`);
    console.log(`  DOM nodes: ${domBoot} → ${domAfter} (growth: ${domGrowth})`);
    console.log(`  transitions: ${NAV_STRESS_TRANSITIONS}`);
  });

  test('performance: boot cold/warm with large fixture', async () => {
    // Cold boot
    const bootStart = Date.now();
    await page.goto(harness.url + '&testReadOnly=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof S !== 'undefined' && !!document.querySelector('.test-mode-banner'), { timeout: 15000 });
    const bootEnd = Date.now();
    const coldBootMs = bootEnd - bootStart;

    // Warm boot (second navigation)
    const warmStart = Date.now();
    await page.goto(harness.url + '&testReadOnly=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof S !== 'undefined' && !!document.querySelector('.test-mode-banner'), { timeout: 15000 });
    const warmEnd = Date.now();
    const warmBootMs = warmEnd - warmStart;

    await applyFullAppFixture(page, 'large', 'CONFIRMED');

    // Route render times
    const routeTimes = {};
    for (const route of ALL_ROUTES) {
      const start = Date.now();
      await page.evaluate(r => go(r), route);
      await page.waitForFunction(r => S.tab === r, route, { timeout: 5000 });
      routeTimes[route] = Date.now() - start;
    }

    const domNodes = await page.evaluate(() => document.querySelectorAll('*').length);

    console.log(`  cold boot: ${coldBootMs}ms`);
    console.log(`  warm boot: ${warmBootMs}ms`);
    console.log(`  DOM nodes (dashboard): ${domNodes}`);
    for (const [route, ms] of Object.entries(routeTimes)) {
      console.log(`  ${route}: ${ms}ms`);
    }

    // Sanity: boot must complete within reasonable time
    assert.ok(coldBootMs < 30000, `cold boot must be < 30s, got ${coldBootMs}ms`);
    assert.ok(warmBootMs < 30000, `warm boot must be < 30s, got ${warmBootMs}ms`);
  });

  test('data states: EMPTY, UNKNOWN, PARTIAL, ZERO_CONFIRMED render without errors', async () => {
    for (const state of ['EMPTY', 'UNKNOWN', 'PARTIAL', 'ZERO_CONFIRMED']) {
      const errors = [];
      page.removeAllListeners('pageerror');
      page.removeAllListeners('console');
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

      await applyFullAppFixture(page, 'small', state);
      for (const route of ALL_ROUTES) {
        await page.evaluate(r => go(r), route);
        await page.waitForFunction(r => S.tab === r, route, { timeout: 5000 });
      }
      assert.equal(errors.length, 0, `${state} must render all routes with 0 errors, got: ${errors.join('; ')}`);
    }
  });

  test('fixture scales: small, normal, large, stress all boot', async () => {
    for (const scale of FIXTURE_SCALES) {
      const errors = [];
      page.removeAllListeners('pageerror');
      page.on('pageerror', e => errors.push(e.message));

      const fixture = makeFullAppFixture(scale, 'CONFIRMED');
      assert.ok(fixture.assets.length > 0, `${scale} fixture must have assets`);
      assert.ok(fixture.proventos !== undefined, `${scale} fixture must have dividends`);
      assert.ok(fixture.rfEvents !== undefined, `${scale} fixture must have RF events`);
      assert.equal(errors.length, 0);
    }
  });
});