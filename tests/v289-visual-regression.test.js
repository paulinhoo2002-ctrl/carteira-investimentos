'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyV289VisualFixture } = require('./helpers/v289-visual-fixtures');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const THEMES = ['dark', 'light'];
const ROUTE_VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 1366, height: 768 },
];
const MATRIX_VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
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
    await page.waitForFunction(() =>
      window.__LOCAL_TEST_MODE__ === true && typeof S !== 'undefined' && typeof render === 'function',
      null, { timeout: 5000 });
    assert.deepEqual(pageErrors, [], 'V289 synthetic runtime has page errors');
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

test('V328 Patrimônio abre pela navegação desktop e mobile', async () => {
  const runtime = await createRuntime({ width: 1366, height: 768 });
  try {
    await applyV289VisualFixture(runtime.page, 'baseline');
    await runtime.page.locator('.tabs-desktop').getByRole('button', { name: 'Patrimônio' }).click();
    await runtime.page.waitForFunction(() => S.tab === 'patrimonio');
    assert.equal(await runtime.page.locator('.patrimonio-premium').count(), 1);

    await runtime.page.setViewportSize({ width: 390, height: 844 });
    await runtime.page.getByRole('button', { name: 'Abrir navegação complementar' }).click();
    await runtime.page.locator('#investMenuDrawer').getByRole('button', { name: /Patrimônio/ }).click();
    await runtime.page.waitForFunction(() => S.tab === 'patrimonio');
    assert.equal(await runtime.page.locator('.patrimonio-premium').count(), 1);
    await assertSyntheticReadOnlyRuntime(runtime);
  } finally {
    await closeRuntime(runtime);
  }
});
test('V328 premium screens remain readable across the responsive viewport matrix', async () => {
  const runtime = await createRuntime({ width: 1366, height: 768 });
  const screens = [
    ['Dividendos', 'dividendos'],
    ['Dashboard', 'dashboard'],
    ['Patrimônio', 'patrimonio'],
    ['Metas', 'metas'],
    ['Rentabilidade', 'rentabilidade'],
    ['Rebalancear', 'ajudar'],
    ['Ativos', 'ativos'],
  ];
  try {
    for (const viewport of MATRIX_VIEWPORTS) {
      await runtime.page.setViewportSize(viewport);
      await applyV289VisualFixture(runtime.page, 'baseline');
      for (const theme of THEMES) {
        for (const [screen, route] of screens) {
          if (route === 'patrimonio') {
            await runtime.page.evaluate(({ theme }) => {
              applyTheme(theme);
              S.tab = 'patrimonio';
              render();
            }, { theme });
            await runtime.page.waitForFunction(() => S.tab === 'patrimonio');
          } else {
            await setThemeAndRoute(runtime.page, theme, route);
          }
          const layout = await inspectLayout(runtime.page);
          assert.ok(layout.heading || layout.rootText.length > 20, `${screen} has no visible content at ${viewport.width}px/${theme}`);
          assert.equal(layout.pageOverflow, false, `${screen} overflows at ${viewport.width}px/${theme}`);
          assert.deepEqual(layout.clipped, [], `${screen} clips a visible control at ${viewport.width}px/${theme}: ${JSON.stringify(layout.clipped)}`);
          assert.deepEqual(layout.criticalLabels, [], `${screen} has an unreadable heading at ${viewport.width}px/${theme}`);
          if (screen === 'Patrimônio') {
            assert.match(layout.rootText, /Aportes líquidos acumulados/, 'Patrimônio contribution series label missing at ' + viewport.width + 'px/' + theme);
            assert.match(layout.rootText, /Histórico patrimonial indisponível/i, 'Patrimônio history availability missing at ' + viewport.width + 'px/' + theme);
            assert.doesNotMatch(layout.rootText, /Evolução do Patrimônio|Melhor evolução estimada|Pior evolução estimada/, 'Patrimônio must not present estimates as historical valuation at ' + viewport.width + 'px/' + theme);
          }
          if (screen === 'Ativos') {
            assert.ok(layout.assetMetricLabels.length > 0, `Ativos group metrics missing at ${viewport.width}px/${theme}`);
            assert.ok(layout.assetMetricLabels.every(item => item.font >= 12), `Ativos group labels too small at ${viewport.width}px/${theme}`);
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

test('V330 daily-use visual evidence captures premium screens with synthetic data', async () => {
  const runtime = await createRuntime({ width: 1366, height: 768 });
  const screenshotDir = path.join(__dirname, '..', '.qa-state', 'v330-daily-use');
  const screenshots = [
    { route: 'ativos', width: 1366, height: 768 },
    { route: 'ativos', width: 390, height: 844 },
    { route: 'dividendos', width: 1366, height: 768 },
    { route: 'dividendos', width: 390, height: 844 },
    { route: 'dashboard', width: 1366, height: 768 },
    { route: 'patrimonio', width: 1366, height: 768 },
    { route: 'metas', width: 1366, height: 768 },
    { route: 'rentabilidade', width: 1366, height: 768 },
    { route: 'ajudar', width: 1366, height: 768 },
  ];
  try {
    await fs.mkdir(screenshotDir, { recursive: true });
    for (const item of screenshots) {
      await runtime.page.setViewportSize({ width: item.width, height: item.height });
      await applyV289VisualFixture(runtime.page, 'baseline');
      await setThemeAndRoute(runtime.page, 'dark', item.route);
      const layout = await inspectLayout(runtime.page);
      assert.equal(layout.pageOverflow, false, `${item.route} overflows at ${item.width}x${item.height}`);
      assert.deepEqual(layout.clipped, [], `${item.route} clips controls at ${item.width}x${item.height}`);
      if (item.route === 'ativos') {
        assert.ok(layout.assetMetricLabels.length > 0, `Ativos information metrics missing at ${item.width}px`);
        assert.ok(layout.assetMetricLabels.every(label => label.font >= 12), `Ativos metric label too small at ${item.width}px`);
        if (item.width > 430) {
          const headers = await runtime.page.locator('.assets-table thead th').allTextContents();
          for (const label of ['Setor', 'Quantidade', 'Preço médio', 'Preço atual / posição', 'Resultado R$', 'Rentabilidade', 'Valor total', '% carteira', 'Fonte / atualização', 'DY', 'Estimativa mensal', 'Ações']) {
            assert.ok(headers.some(header => header.trim() === label), `Ativos table is missing ${label}`);
          }
        } else {
          const card = runtime.page.locator('.asset-mobile-cards .asset-premium-card').first();
          const summary = await card.locator('summary').innerText();
          for (const label of ['Tipo', 'Valor da posição', 'Resultado R$', 'Rentabilidade', '% Carteira']) assert.ok(summary.includes(label), `Ativos mobile summary is missing ${label}`);
          await card.locator('summary').click();
          const details = await card.innerText();
          for (const label of ['Setor', 'Quantidade', 'Preço médio', 'Preço atual / posição', 'Resultado R$', 'Rentabilidade', 'Valor total', 'DY', 'Estimativa mensal', 'Fonte / atualização']) {
            assert.ok(details.includes(label), `Ativos mobile details are missing ${label}`);
          }
        }
      }
      if (item.route === 'dividendos') {
        const dividendText = layout.rootText.toLocaleLowerCase('pt-BR');
        for (const label of ['Recebido', 'Média mensal', 'Último mês', 'Projeção anual', 'Histórico mensal', 'Evolução da renda', 'Top ativos', 'Resumo por ano']) {
          assert.ok(dividendText.includes(label.toLocaleLowerCase('pt-BR')), `Dividendos overview is missing ${label}`);
        }
        const receivedKpi = await runtime.page.locator('.dividend-executive-kpi').first().innerText();
        assert.match(receivedKpi, /Recebido no ano/i, 'primary Dividendos KPI must report confirmed receipts for the current year');
        assert.match(receivedKpi, /R\$\s*19,37/, 'synthetic paid receipt in the current year must be included once');
      }
      await runtime.page.screenshot({
        path: path.join(screenshotDir, `${item.route}-${item.width}x${item.height}.png`),
        fullPage: true,
      });
    }
    assert.deepEqual(runtime.pageErrors, [], `page errors: ${runtime.pageErrors.join(' | ')}`);
    assert.deepEqual(runtime.consoleErrors, [], `console errors: ${runtime.consoleErrors.join(' | ')}`);
    assert.deepEqual(runtime.localRequestFailures, [], `local request failures: ${runtime.localRequestFailures.join(' | ')}`);
    await assertSyntheticReadOnlyRuntime(runtime);
    console.log(`V330 daily-use screenshots: ${screenshotDir}`);
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

test('V329 trust states render across premium routes on mobile and desktop', async () => {
  const runtime = await createRuntime({ width: 1366, height: 768 });
  try {
    const states = [
      { scenario: 'baseline', expected: 'Disponível; verificação não informada' },
      { scenario: 'verified', expected: 'Disponível; verificação não informada' },
      { scenario: 'partial', expected: ['Parcial', 'Desconhecida'] },
      { scenario: 'stale', expected: 'Desatualizada' },
      { scenario: 'unknown', expected: 'Desconhecida' },
    ];
    for (const state of states) {
      await applyV289VisualFixture(runtime.page, state.scenario === 'verified' ? 'baseline' : state.scenario);
      if (state.scenario === 'verified') {
        await runtime.page.evaluate(() => { S.assets[0].verified = true; render(); });
      }
      for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 768 }]) {
        await runtime.page.setViewportSize(viewport);
        for (const route of ['dashboard', 'ativos', 'dividendos', 'patrimonio', 'confiabilidade']) {
          await setThemeAndRoute(runtime.page, 'dark', route);
          const layout = await inspectLayout(runtime.page);
          assert.ok(layout.heading || layout.rootText.length > 20, `${route} rendered no content for ${state.scenario}/${viewport.width}px`);
          assert.equal(layout.pageOverflow, false, `${route} overflow for ${state.scenario}/${viewport.width}px`);
          assert.deepEqual(layout.clipped, [], `${route} clipped controls for ${state.scenario}/${viewport.width}px`);
          if (route === 'confiabilidade') {
            await runtime.page.locator('#data-trust-diagnostics > summary').click();
            const details = await runtime.page.locator('#data-trust-diagnostics').innerText();
            for (const expected of Array.isArray(state.expected) ? state.expected : [state.expected]) {
              assert.ok(details.includes(expected), 'expected trust state is missing');
            }
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

test('V329 all-unknown allocation does not render zero totals or an unsupported date', async () => {
  const runtime = await createRuntime({ width: 1366, height: 768 });
  try {
    await runtime.page.evaluate(() => {
      S.assets = [
        { id: 'synthetic-known-date', ticker: 'SYN1', type: 'Ação', qty: 2, current_price: 10, current_value: 20, currentValue: 20, quoteUpdatedAt: '2026-10-07' },
        { id: 'synthetic-missing-date', ticker: 'SYN2', type: 'Ação', qty: 2, current_price: 10, current_value: 20, currentValue: 20, quoteUpdatedAt: '' },
      ];
      render();
    });
    await setThemeAndRoute(runtime.page, 'dark', 'dashboard');
    const panel = await runtime.page.evaluate(() => {
      const element = document.createElement('div');
      element.innerHTML = dashboardAllocationIntelligencePanel();
      return element.textContent;
    });
    assert.ok(panel.includes('Data-base dos valores: não uniforme ou não informada'));
    assert.ok(!panel.includes('07/10/2026'));
    await runtime.page.evaluate(() => {
      S.assets = [{ id: 'synthetic-all-unknown', ticker: 'SYN3', type: 'Ação', qty: 2, current_price: null, current_value: null, currentValue: null, quoteUpdatedAt: '' }];
      render();
    });
    const refreshed = await runtime.page.evaluate(() => {
      const element = document.createElement('div');
      element.innerHTML = dashboardAllocationIntelligencePanel();
      return element.textContent;
    });
    assert.match(refreshed, /Patrimônio conhecido—/);
    assert.match(refreshed, /Sem classe informada—/);
    assert.doesNotMatch(refreshed, /R\$\s*0,00/);
    const compact = await runtime.page.locator('.dashboard-v3-allocation').innerText();
    assert.ok(compact.includes('Valores atuais indisponíveis.'));
    assert.ok(compact.includes('Cobertura institucional:'));
    assert.ok(compact.includes('Data-base dos valores:'));
    assert.doesNotMatch(compact, /R\$\s*0,00/);
    assert.deepEqual(runtime.pageErrors, [], `page errors: ${runtime.pageErrors.join(' | ')}`);
    assert.deepEqual(runtime.consoleErrors, [], `console errors: ${runtime.consoleErrors.join(' | ')}`);
  } finally {
    await closeRuntime(runtime);
  }
});

test('V329 hide-values mode also hides institutional identities, coverage and dates', async () => {
  const runtime = await createRuntime({ width: 1366, height: 768 });
  try {
    await runtime.page.evaluate(() => {
      S.assets = [{ id: 'synthetic-private', ticker: 'SYN4', type: 'Ação', qty: 2, current_price: 10, current_value: 20, currentValue: 20, institution: 'Custodiante Sintético', quoteUpdatedAt: '2026-10-07' }];
      S.hideValues = false;
      render();
    });
    await setThemeAndRoute(runtime.page, 'dark', 'dashboard');
    const visible = await runtime.page.locator('.dashboard-v3-allocation').innerText();
    assert.ok(visible.includes('Custodiante Sintético'));
    assert.ok(visible.includes('Cobertura institucional:'));
    await runtime.page.evaluate(() => { S.hideValues = true; render(); });
    const hidden = await runtime.page.locator('.dashboard-v3-allocation').innerText();
    assert.ok(hidden.includes('Composição oculta'));
    assert.ok(!hidden.includes('Custodiante Sintético'));
    assert.ok(!hidden.includes('Cobertura institucional:'));
    assert.ok(!hidden.includes('07/10/2026'));
    assert.ok(!hidden.includes('%'));
  } finally {
    await closeRuntime(runtime);
  }
});

test('Ativos mantém valor indisponível como desconhecido, nunca como zero', async () => {
  const runtime = await createRuntime({ width: 1366, height: 768 });
  try {
    await applyV289VisualFixture(runtime.page, 'partial');
    await setThemeAndRoute(runtime.page, 'dark', 'ativos');
    const row = runtime.page.locator('.assets-premium-shell .assets-table tr[data-id="QA_ASSET_B"]');
    const values = await row.evaluate(element => Object.fromEntries(
      [...element.closest('table').querySelectorAll('thead th')].map((header, index) => [header.textContent.trim(), element.cells[index]?.textContent.trim()])
    ));
    assert.equal(values['Preço atual / posição'], '—', 'valor atual ausente deve ficar indisponível');
    assert.equal(values['Rentabilidade'], '—', 'rentabilidade sem valor atual deve ficar indisponível');
    assert.equal(values['% carteira'], '—', 'peso sem valor atual deve ficar indisponível');
    assert.equal(values['Valor total'], '—', 'valor total sem preço deve ficar indisponível');
    const categoryMetrics = await runtime.page.locator('.assets-premium-shell details.ag[data-asset-group="FII"] .acc-metric-value').allInnerTexts();
    assert.deepEqual(categoryMetrics.slice(1), ['—', '—', '—', '—'], 'agregados da categoria incompleta não podem transformar valor ausente em perda ou peso zero');
    const rowWeights = await runtime.page.locator('.assets-premium-shell .assets-table tbody tr').evaluateAll(rows => rows.map(row => {
      const headers = [...row.closest('table').querySelectorAll('thead th')].map(header => header.textContent.trim());
      return row.cells[headers.indexOf('% carteira')]?.textContent.trim();
    }));
    assert.ok(rowWeights.length > 0 && rowWeights.every(value => value.trim() === '—'), 'pesos individuais também ficam indisponíveis quando o denominador da carteira é parcial');
    assert.match(await runtime.page.locator('.assets-coverage-note').innerText(), /parcial|indisponível/i);
    await assertSyntheticReadOnlyRuntime(runtime);
  } finally {
    await closeRuntime(runtime);
  }
});

test('Patrimônio mantém valores correntes e base aplicada indisponíveis quando a carteira é parcial', async () => {
  const runtime = await createRuntime({ width: 1366, height: 768 });
  try {
    await applyV289VisualFixture(runtime.page, 'partial');
    await runtime.page.evaluate(() => {
      S.tab = 'patrimonio';
      render();
    });
    await runtime.page.waitForFunction(() => S.tab === 'patrimonio');
    const current = await runtime.page.locator('.patrimonio-kpi-main .patrimonio-kpi-value').innerText();
    const result = await runtime.page.locator('.patrimonio-kpi').nth(1).innerText();
    assert.equal(current.trim(), '—', 'total da carteira parcial não pode parecer completo');
    assert.match(result, /indisponível|parcial|incompleta/i, 'resultado não pode ser calculado com valores correntes parciais');
    assert.equal(await runtime.page.locator('.patrimony-month-row').count(), 1, 'meses sem movimento não podem aparecer como aporte acumulado zero');
    await runtime.page.evaluate(() => {
      S.assets.forEach(asset => { asset.avg_price = null; asset.appliedValue = null; });
      render();
    });
    const applied = await runtime.page.locator('.patrimonio-kpi').nth(2).innerText();
    const percent = await runtime.page.locator('.patrimonio-kpi').nth(3).innerText();
    assert.match(applied, /indisponível|desconhecida/i, 'base aplicada ausente deve permanecer desconhecida');
    assert.match(percent, /indisponível|desconhecida/i, 'percentual sem base aplicada não pode ser exibido como zero');
    await runtime.page.evaluate(() => {
      S.assets.forEach(asset => { asset.type = 'Ação'; asset.avg_price = 0; });
      render();
    });
    const zeroBasis = await runtime.page.locator('.patrimonio-kpi').nth(3).innerText();
    assert.match(zeroBasis, /indisponível|desconhecida/i, 'percentual sem capital aplicado não pode sugerir retorno de zero');
    await assertSyntheticReadOnlyRuntime(runtime);
  } finally {
    await closeRuntime(runtime);
  }
});

test('Análise abre a tela LEGACY de Rebalancear pelo CTA contextual', async () => {
  const runtime = await createRuntime({ width: 1366, height: 768 });
  try {
    await runtime.page.evaluate(() => goInternal('analise', false));
    await runtime.page.getByRole('button', { name: 'Abrir rebalanceamento' }).click();
    await runtime.page.waitForFunction(() => S.tab === 'ajudar');
    assert.match(await runtime.page.locator('#root .wrap').innerText(), /Rebalancear|alocação atual/i);
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
