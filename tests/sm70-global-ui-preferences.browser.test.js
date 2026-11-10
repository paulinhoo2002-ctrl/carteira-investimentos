'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const AXE_SOURCE = require('axe-core').source;
const { startLocalHttpServer } = require('./local-http-server');
const { applyV289VisualFixture } = require('./helpers/v289-visual-fixtures');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const INTERNAL_ROUTES = new Set(['ranking', 'desempenho', 'patrimonio']);

async function createRuntime(viewport = { width: 1366, height: 768 }) {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport, isMobile: viewport.width <= 430, hasTouch: viewport.width <= 430 });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.__SM70_FINANCIAL_STATE_AT_BOOT__ = localStorage.getItem('civ5');
    window.__SM70_FIREBASE_REQUESTS__ = [];
  });
  page.on('request', request => {
    if (/firestore|firebaseio|identitytoolkit|securetoken|firebaseinstallations/i.test(request.url())) {
      page.evaluate(url => window.__SM70_FIREBASE_REQUESTS__?.push(url), request.url()).catch(() => {});
    }
  });
  try {
    await page.goto(`${harness.url}&testReadOnly=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LOCAL_TEST_MODE__ === true && typeof S !== 'undefined' && typeof content === 'function');
    await applyV289VisualFixture(page, 'baseline');
    return { harness, browser, context, page, pageErrors };
  } catch (error) {
    await context.close();
    await browser.close();
    harness.server.closeAllConnections();
    harness.server.close();
    throw error;
  }
}

async function assertNoSeriousAxe(page, label) {
  const results = await page.evaluate(async () => window.axe.run(document));
  const serious = results.violations.filter(violation => ['critical', 'serious'].includes(violation.impact));
  assert.deepEqual(serious.map(violation => ({ id: violation.id, impact: violation.impact })), [], label);
}

async function closeRuntime(runtime) {
  await runtime.context.close();
  await runtime.browser.close();
  runtime.harness.server.closeAllConnections();
  await new Promise(resolve => runtime.harness.server.close(resolve));
}

test('SM70 density and sidebar preferences persist without touching financial state', async () => {
  const runtime = await createRuntime();
  try {
    const { page } = runtime;
    assert.equal(await page.locator('html').getAttribute('data-ui-density'), 'compact');
    const desktopNav = page.locator('.tabs-desktop');
    assert.ok(await desktopNav.evaluate(element => element.getBoundingClientRect().width) >= 200);
    await page.evaluate(() => go('settings'));
    const compact = page.getByRole('button', { name: 'Compacto', exact: true });
    const comfortable = page.getByRole('button', { name: 'Confortável', exact: true });
    await compact.waitFor();
    await page.addScriptTag({ content: AXE_SOURCE });
    await assertNoSeriousAxe(page, 'Settings expanded accessibility');
    assert.equal(await compact.getAttribute('aria-pressed'), 'true');
    await comfortable.click();
    assert.equal(await page.locator('html').getAttribute('data-ui-density'), 'comfortable');
    assert.equal(await comfortable.getAttribute('aria-pressed'), 'true');

    const collapse = page.getByRole('button', { name: 'Recolher menu lateral' });
    await collapse.focus();
    await collapse.press('Enter');
    assert.equal(await page.locator('html').getAttribute('data-sidebar-collapsed'), 'true');
    assert.equal(await page.locator('.tabs-desktop .sidebar-collapse-toggle').getAttribute('aria-expanded'), 'false');
    assert.ok(await desktopNav.evaluate(element => element.getBoundingClientRect().width) <= 80);
    assert.equal(await page.locator('.shell-main').evaluate(element => getComputedStyle(element).marginLeft), '72px');
    assert.equal(await page.locator('.sidebar-collapse-toggle [data-sidebar-toggle-label]').evaluate(element => getComputedStyle(element).display), 'none');
    assert.equal(await page.locator('.sidebar-collapse-toggle').evaluate(element => getComputedStyle(element).outlineStyle), 'solid');
    await assertNoSeriousAxe(page, 'Settings collapsed accessibility');
    assert.ok(await page.getByRole('button', { name: 'Ativos' }).isVisible());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LOCAL_TEST_MODE__ === true && typeof S !== 'undefined');
    assert.equal(await page.locator('html').getAttribute('data-ui-density'), 'comfortable');
    assert.equal(await page.locator('html').getAttribute('data-sidebar-collapsed'), 'true');
    assert.equal(await page.getByRole('button', { name: 'Expandir menu lateral' }).getAttribute('aria-expanded'), 'false');
    assert.ok(await page.locator('.tabs-desktop').evaluate(element => element.getBoundingClientRect().width) <= 80);

    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.tabs-desktop')).display), 'none');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const state = await page.evaluate(() => ({
      before: window.__SM70_FINANCIAL_STATE_AT_BOOT__,
      after: localStorage.getItem('civ5'),
      firebase: window.__SM70_FIREBASE_REQUESTS__ || [],
      density: localStorage.getItem('ci_ui_density'),
      sidebar: localStorage.getItem('ci_sidebar_collapsed'),
    }));
    assert.equal(state.before, state.after);
    assert.deepEqual(state.firebase, []);
    assert.equal(state.density, 'comfortable');
    assert.equal(state.sidebar, 'true');
    assert.deepEqual(runtime.pageErrors, []);
  } finally {
    await closeRuntime(runtime);
  }
});

test('SM70 both density modes keep all routes usable at five requested viewports', async () => {
  const runtime = await createRuntime();
  try {
    const { page } = runtime;
    const routes = await page.evaluate(excluded => [...new Set(
      [...content.toString().matchAll(/if\(S\.tab===['"]([^'"]+)['"]\)/g)].map(match => match[1]),
    )].filter(route => !excluded.includes(route)), [...INTERNAL_ROUTES]);
    assert.ok(routes.length >= 15);
    for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 2560, height: 1440 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      for (const density of ['compact', 'comfortable']) {
        await page.evaluate(value => { document.documentElement.dataset.uiDensity = value; }, density);
        for (const theme of ['light', 'dark']) {
          await page.evaluate(value => applyTheme(value), theme);
          for (const route of routes) {
            await page.evaluate(value => go(value), route);
            await page.waitForFunction(value => S.tab === value, route);
            const layout = await page.evaluate(() => ({
              overflow: document.documentElement.scrollWidth > innerWidth,
              text: document.querySelector('#root .wrap')?.innerText.trim() || '',
              heading: [...document.querySelectorAll('#root .wrap h1')].some(node => {
                const rect = node.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
              }),
            }));
            assert.equal(layout.overflow, false, `${route} overflow at ${viewport.width}/${density}/${theme}`);
            assert.ok(layout.heading || layout.text.length > 20, `${route} empty at ${viewport.width}/${density}/${theme}`);
          }
        }
      }
    }
    assert.deepEqual(runtime.pageErrors, []);
    const state = await page.evaluate(() => ({ before: window.__SM70_FINANCIAL_STATE_AT_BOOT__, after: localStorage.getItem('civ5') }));
    assert.equal(state.before, state.after);
  } finally {
    await closeRuntime(runtime);
  }
});