'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyV289VisualFixture } = require('./helpers/v289-visual-fixtures');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const THEMES = ['dark', 'light'];
const ROUTE_VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1366, height: 768 },
];
const MATRIX_VIEWPORTS = [
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1920, height: 1080 },
];
const INTERNAL_ROUTES = new Set(['ranking', 'desempenho', 'patrimonio']);

async function createRuntime(viewport) {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const context = await browser.newContext({
      viewport,
      isMobile: viewport.width <= 430,
      hasTouch: viewport.width <= 430,
      colorScheme: 'dark',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    await page.addInitScript(() => {
      window.__V304_QA_WRITE_COUNTS__ = { localStorage: [], financialStateAtBoot: localStorage.getItem('civ5') };
      const originalSetItem = Storage.prototype.setItem;
      const originalRemoveItem = Storage.prototype.removeItem;
      const originalClear = Storage.prototype.clear;
      Storage.prototype.setItem = function (...args) {
        if (this === window.localStorage) window.__V304_QA_WRITE_COUNTS__.localStorage.push({ operation: 'setItem', key: String(args[0]) });
        return originalSetItem.apply(this, args);
      };
      Storage.prototype.removeItem = function (...args) {
        if (this === window.localStorage) window.__V304_QA_WRITE_COUNTS__.localStorage.push({ operation: 'removeItem', key: String(args[0]) });
        return originalRemoveItem.apply(this, args);
      };
      Storage.prototype.clear = function (...args) {
        if (this === window.localStorage) window.__V304_QA_WRITE_COUNTS__.localStorage.push({ operation: 'clear', key: '*' });
        return originalClear.apply(this, args);
      };
    });
    const consoleErrors = [];
    const pageErrors = [];
    const localRequestFailures = [];
    const firebaseRequests = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
      const url = new URL(request.url());
      if (/(?:firebaseio\.com|firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebaseinstallations\.googleapis\.com)$/i.test(url.hostname)) {
        firebaseRequests.push({ method: request.method(), host: url.hostname });
      }
    });
    page.on('requestfailed', request => {
      if (request.url().startsWith(new URL(harness.url).origin)) {
        localRequestFailures.push(`${request.method()} ${request.url()} (${request.failure()?.errorText || 'unknown'})`);
      }
    });
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await applyV289VisualFixture(page, 'baseline');
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    return { harness, browser, context, page, consoleErrors, pageErrors, localRequestFailures, firebaseRequests };
  } catch (error) {
    if (browser) await browser.close();
    harness.server.closeAllConnections();
    harness.server.close();
    throw error;
  }
}

async function closeRuntime(runtime) {
  await runtime.context.close();
  await runtime.browser.close();
  runtime.harness.server.closeAllConnections();
  runtime.harness.server.close();
}

async function assertSyntheticReadOnlyRuntime(runtime) {
  const state = await runtime.page.evaluate(() => ({
    localTestMode: window.__LOCAL_TEST_MODE__ === true,
    firebaseInitialized: typeof FB !== 'undefined' && Boolean(FB.app || FB.auth || FB.db),
    localStorageWriteKeys: window.__V304_QA_WRITE_COUNTS__?.localStorage ?? [],
    financialStateAtBoot: window.__V304_QA_WRITE_COUNTS__?.financialStateAtBoot ?? null,
    financialStateNow: localStorage.getItem('civ5'),
  }));
  assert.equal(state.localTestMode, true, 'route smoke must use the isolated localhost synthetic fixture');
  assert.equal(state.firebaseInitialized, false, 'synthetic route smoke must not initialize Firebase');
  assert.equal(state.financialStateNow, state.financialStateAtBoot, 'read-only route smoke changed financial localStorage state');
  const financialStorageWrites = state.localStorageWriteKeys.filter(({ key }) => key === 'civ5');
  assert.deepEqual(financialStorageWrites, [], `read-only route smoke mutated financial storage: ${JSON.stringify(financialStorageWrites)}`);
  const unexpectedStorageWrites = state.localStorageWriteKeys.filter(({ key }) => key !== 'civ5_edit_lock' && !/^v258-monitoring-baseline-v1:QA_/.test(key));
  assert.deepEqual(unexpectedStorageWrites, [], `read-only route smoke mutated unexpected storage key(s): ${JSON.stringify(unexpectedStorageWrites)}`);
  assert.deepEqual(runtime.firebaseRequests, [], `synthetic route smoke contacted Firebase: ${JSON.stringify(runtime.firebaseRequests)}`);
}

async function directRoutes(page) {
  return page.evaluate(excludedRoutes => [...new Set(
    [...content.toString().matchAll(/if\(S\.tab===['"]([^'"]+)['"]\)/g)].map(match => match[1])
  )].filter(route => !excludedRoutes.includes(route)), [...INTERNAL_ROUTES]);
}

async function setThemeAndRoute(page, theme, route) {
  await page.evaluate(({ theme, route }) => {
    applyTheme(theme);
    go(route);
  }, { theme, route });
  await page.waitForFunction(route => S.tab === route, route);
}

async function inspectLayout(page) {
  return page.evaluate(() => {
    const visible = element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };
    const root = document.querySelector('#root');
    const routeContent = document.querySelector('#root .wrap');
    const heading = [...(root?.querySelectorAll('h1') || [])].find(visible);
    const clipCandidates = routeContent?.querySelectorAll('button,a,input,select,textarea,[role="button"],.premium-metric-value') || [];
    const clipped = [...clipCandidates].filter(element => {
      if (!visible(element) || (!element.textContent.trim() && !element.getAttribute('aria-label'))) return false;
      const style = getComputedStyle(element);
      const clips = ['hidden', 'clip'].includes(style.overflowX) || ['hidden', 'clip'].includes(style.overflowY) || style.textOverflow === 'ellipsis';
      return clips && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1);
    }).map(element => ({ tag: element.tagName, text: element.textContent.trim().slice(0, 70), className: String(element.className || '').slice(0, 80) }));
    const criticalLabels = [...(routeContent?.querySelectorAll('h1,[role="heading"][aria-level="1"]') || [])]
      .filter(visible).map(element => ({ text: element.textContent.trim(), font: Number.parseFloat(getComputedStyle(element).fontSize) }))
      .filter(item => item.text && item.font < 12);
    const movementTypeLabels = [...(routeContent?.querySelectorAll('.aporte-kind') || [])]
      .filter(visible).map(element => ({ text: element.textContent.trim(), font: Number.parseFloat(getComputedStyle(element).fontSize) }));
    const assetMetricLabels = [...(routeContent?.querySelectorAll('.assets-premium-shell .ag-k') || [])]
      .filter(visible).map(element => ({ text: element.textContent.trim(), font: Number.parseFloat(getComputedStyle(element).fontSize) }));
    return {
      heading: heading?.innerText.trim() || '',
      rootText: routeContent?.innerText.trim() || '',
      pageOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth,
      clipped,
      criticalLabels,
      movementTypeLabels,
      assetMetricLabels,
      theme: document.documentElement.dataset.theme,
    };
  });
}

test('V289 final route matrix renders every route in both themes at 390 and 1366', async () => {
  const runtime = await createRuntime({ width: 1366, height: 768 });
  try {
    const routes = await directRoutes(runtime.page);
    assert.ok(routes.length >= 15, `route dispatch inventory unexpectedly small (${routes.length})`);
    for (const viewport of ROUTE_VIEWPORTS) {
      await runtime.page.setViewportSize(viewport);
      for (const theme of THEMES) {
        for (const route of routes) {
          await setThemeAndRoute(runtime.page, theme, route);
          const layout = await inspectLayout(runtime.page);
          assert.equal(layout.theme, theme, `${route} did not retain ${theme} theme`);
          assert.ok(layout.heading || layout.rootText.length > 20, `${route} rendered no visible route content at ${viewport.width}px/${theme}`);
          assert.equal(layout.pageOverflow, false, `${route} horizontal page overflow at ${viewport.width}px/${theme}`);
          assert.deepEqual(layout.clipped, [], `${route} contains internally clipped control at ${viewport.width}px/${theme}: ${JSON.stringify(layout.clipped)}`);
          assert.deepEqual(layout.criticalLabels, [], `${route} has an essential heading below 12px at ${viewport.width}px/${theme}`);
          if (route === 'aportes') {
            assert.ok(layout.movementTypeLabels.length > 0, `Aportes synthetic movement labels missing at ${viewport.width}px/${theme}`);
            assert.ok(layout.movementTypeLabels.every(item => item.font >= 12), `Aportes movement type labels below 12px at ${viewport.width}px/${theme}: ${JSON.stringify(layout.movementTypeLabels)}`);
          }
          if (route === 'ativos') {
            assert.ok(layout.assetMetricLabels.length > 0, `Ativos synthetic metric labels missing at ${viewport.width}px/${theme}`);
            assert.ok(layout.assetMetricLabels.every(item => item.font >= 12), `Ativos metric labels below 12px at ${viewport.width}px/${theme}: ${JSON.stringify(layout.assetMetricLabels)}`);
          }
        }
      }
    }
    assert.deepEqual(runtime.pageErrors, [], `page errors: ${runtime.pageErrors.join(' | ')}`);
    assert.deepEqual(runtime.consoleErrors, [], `console errors: ${runtime.consoleErrors.join(' | ')}`);
    assert.deepEqual(runtime.localRequestFailures, [], `local request failures: ${runtime.localRequestFailures.join(' | ')}`);
    await assertSyntheticReadOnlyRuntime(runtime);
  } finally {
    await closeRuntime(runtime);
  }
});

test('V289 representative Dashboard, Ativos and Confiabilidade matrix covers remaining widths', async () => {
  const runtime = await createRuntime({ width: 1366, height: 768 });
  try {
    for (const viewport of MATRIX_VIEWPORTS) {
      await runtime.page.setViewportSize(viewport);
      const scenario = viewport.width === 430 ? 'long-label-large-value' : viewport.width === 768 ? 'partial' : viewport.width === 1440 ? 'stale' : 'baseline';
      await applyV289VisualFixture(runtime.page, scenario);
      for (const theme of THEMES) {
        for (const route of ['dashboard', 'ativos', 'confiabilidade']) {
          await setThemeAndRoute(runtime.page, theme, route);
          const layout = await inspectLayout(runtime.page);
          assert.equal(layout.theme, theme, `${route} did not retain ${theme} theme at ${viewport.width}px`);
          assert.ok(layout.heading || layout.rootText.length > 20, `${route} rendered no content at ${viewport.width}px/${theme}`);
          assert.equal(layout.pageOverflow, false, `${route} horizontal page overflow at ${viewport.width}px/${theme}`);
          assert.deepEqual(layout.clipped, [], `${route} contains internally clipped content at ${viewport.width}px/${theme}: ${JSON.stringify(layout.clipped)}`);
          assert.deepEqual(layout.criticalLabels, [], `${route} has an essential heading below 12px at ${viewport.width}px/${theme}`);
          if (route === 'ativos') {
            assert.ok(layout.assetMetricLabels.length > 0, `Ativos synthetic metric labels missing at ${viewport.width}px/${theme}`);
            assert.ok(layout.assetMetricLabels.every(item => item.font >= 12), `Ativos metric labels below 12px at ${viewport.width}px/${theme}: ${JSON.stringify(layout.assetMetricLabels)}`);
          }
        }
      }
    }
    assert.deepEqual(runtime.pageErrors, [], `page errors: ${runtime.pageErrors.join(' | ')}`);
    assert.deepEqual(runtime.consoleErrors, [], `console errors: ${runtime.consoleErrors.join(' | ')}`);
    assert.deepEqual(runtime.localRequestFailures, [], `local request failures: ${runtime.localRequestFailures.join(' | ')}`);
    await assertSyntheticReadOnlyRuntime(runtime);
  } finally {
    await closeRuntime(runtime);
  }
});

test('V289 final route matrix keeps Dashboard first-fold, mobile order and navigation tasks', async () => {
  const runtime = await createRuntime({ width: 1366, height: 768 });
  try {
    await setThemeAndRoute(runtime.page, 'dark', 'dashboard');
    const desktop = await runtime.page.evaluate(() => {
      const selectors = ['.dashboard-executive-kpis', '.dashboard-evolution-card', '.dashboard-v3-allocation'];
      return Object.fromEntries(selectors.map(selector => [selector, document.querySelector(selector)?.getBoundingClientRect().bottom ?? null]));
    });
    for (const [selector, bottom] of Object.entries(desktop)) assert.ok(bottom !== null && bottom <= 768, `${selector} is below the 1366x768 first fold (${bottom})`);

    await runtime.page.setViewportSize({ width: 390, height: 844 });
    await applyV289VisualFixture(runtime.page, 'baseline');
    await setThemeAndRoute(runtime.page, 'dark', 'dashboard');
    const mobile = await runtime.page.evaluate(() => {
      const selectors = ['.dashboard-page-heading', '.dashboard-executive-kpis .premium-metric:nth-child(1)', '.dashboard-executive-kpis .premium-metric:nth-child(2)', '.dashboard-executive-kpis .premium-metric:nth-child(3)', '.dashboard-evolution-card', '.dashboard-v3-allocation'];
      return { positions: selectors.map(selector => document.querySelector(selector)?.getBoundingClientRect().top), tables: document.querySelectorAll('.premium-dashboard table').length };
    });
    assert.ok(mobile.positions.every(Number.isFinite), `mobile Dashboard essentials missing: ${mobile.positions}`);
    assert.ok(mobile.positions.every((top, index) => index === 0 || top >= mobile.positions[index - 1]), `mobile Dashboard order changed: ${mobile.positions}`);
    assert.equal(mobile.tables, 0, 'mobile Dashboard must not use a wide table');

    const navigation = await runtime.page.evaluate(() => {
      document.querySelector('#investBottomNav > button:last-child')?.click();
      const drawer = document.querySelector('#investMenuDrawer');
      return { opened:drawer?.getAttribute('aria-hidden') === 'false', destinations:[...(drawer?.querySelectorAll('.sheet-grid button') || [])].map(button => button.innerText.trim()) };
    });
    assert.equal(navigation.opened, true, 'Mais should open its real drawer');
    assert.ok(navigation.destinations.length > 0, 'Mais should expose labeled routes');
    await runtime.page.keyboard.press('Escape');
    assert.equal(await runtime.page.locator('#investMenuDrawer').getAttribute('aria-hidden'), 'true', 'Escape should close the real Mais drawer');

    await runtime.page.evaluate(() => go('confiabilidade'));
    assert.equal(await runtime.page.evaluate(() => document.documentElement.dataset.theme), 'dark', 'theme should survive route rendering');
    await assertSyntheticReadOnlyRuntime(runtime);
  } finally {
    await closeRuntime(runtime);
  }
});

test('V289 changed routes pass axe in dark/light and respect reduced motion', async () => {
  const runtime = await createRuntime({ width: 1366, height: 768 });
  try {
    for (const theme of THEMES) {
      for (const route of await directRoutes(runtime.page)) {
        await setThemeAndRoute(runtime.page, theme, route);
        const result = await runtime.page.evaluate(async () => axe.run('#root .wrap', {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        }));
        assert.deepEqual(result.violations.map(item => ({ id:item.id, nodes:item.nodes.map(node => ({ target:node.target, failureSummary:node.failureSummary })) })), [], `${route}/${theme} axe violations`);
      }
    }
    await runtime.page.emulateMedia({ reducedMotion: 'reduce' });
    await setThemeAndRoute(runtime.page, 'dark', 'dashboard');
    const motion = await runtime.page.evaluate(() => [...document.querySelectorAll('.premium-metric, .dashboard-evolution-card')]
      .map(element => getComputedStyle(element).transitionDuration)
      .filter(value => (value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000) > 0.01));
    assert.deepEqual(motion, [], `reduced motion still animates Dashboard surfaces: ${motion}`);
    assert.deepEqual(runtime.pageErrors, [], `page errors: ${runtime.pageErrors.join(' | ')}`);
    assert.deepEqual(runtime.consoleErrors, [], `console errors: ${runtime.consoleErrors.join(' | ')}`);
    assert.deepEqual(runtime.localRequestFailures, [], `local request failures: ${runtime.localRequestFailures.join(' | ')}`);
    await assertSyntheticReadOnlyRuntime(runtime);
  } finally {
    await closeRuntime(runtime);
  }
});
