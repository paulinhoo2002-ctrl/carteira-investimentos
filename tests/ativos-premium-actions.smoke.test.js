const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { startLocalHttpServer: startServer } = require('./local-http-server.js');
const { applyV289VisualFixture } = require('./helpers/v289-visual-fixtures');

function resolveBrowser() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(candidate => {
    try { fs.accessSync(candidate); return true; } catch { return false; }
  });
}

const viewports = [
  { width: 390, height: 844, label: '390x844' },
  { width: 430, height: 932, label: '430x932' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1920, height: 1080, label: '1920x1080' },
];

for (const viewport of viewports) {
  test(`Ativos Premium Actions - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge nao encontrado para o smoke Playwright');
    const harness = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath, headless: true });
    const errors = [];
    const requestFailures = [];
    try {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.width <= 430,
        isMobile: viewport.width <= 430,
      });
      const page = await context.newPage();
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
      page.on('requestfailed', request => requestFailures.push(`${request.url()} (${request.failure()?.errorText || 'unknown'})`));
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => go('ativos'));
      await page.waitForSelector('.ag', { state: 'visible', timeout: 5000 });
      const firstGroup = page.locator('.ag').first();
      if (!(await firstGroup.evaluate(element => element.open))) await firstGroup.locator(':scope > summary').click();
      if (viewport.width <= 640) {
        // Slim UI: categorias colapsadas por padrão — abrir grupos usados pelo teste.
        const rfGroup = page.locator('.ag[data-asset-group="Renda Fixa"]');
        if (!(await rfGroup.evaluate(element => element.open))) await rfGroup.locator(':scope > summary').click();
        await page.locator('.ag[data-asset-group="Ação"] .asset-mobile-cards details.asset-premium-card').first().locator(':scope > summary').click();
      }
      // Slim UI: ações ficam atrás do menu ⋯ — abrir o menu da primeira linha antes do snapshot.
      await page.locator('.ag[open] .asset-action-trigger:visible').first().click();
      await page.waitForTimeout(150);

      const snapshot = await page.evaluate(() => {
        const visible = element => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
        };
        const rows = [...document.querySelectorAll('.ag-table tbody tr, .ag[data-asset-group="Ação"] .asset-mobile-cards details.asset-premium-card')].filter(visible);
        const rfRows = [...document.querySelectorAll('.ag[data-asset-group="Renda Fixa"] .rf-category-row')].filter(visible);
        const actions = [...document.querySelectorAll('.asset-actions button, .asset-action-menu-panel.open button')].filter(visible).map(button => ({
          text: button.textContent.trim(),
          width: button.getBoundingClientRect().width,
          height: button.getBoundingClientRect().height,
        }));
        const categoryIcons = [...document.querySelectorAll('.assets-premium-shell .acc-icon')].filter(visible);
        const desktopTable = document.querySelector('.assets-table-wrap');
        const categoryMetrics = [...document.querySelectorAll('.assets-premium-shell details.ag[open] .acc-metric-value')].filter(visible);
        return {
          normalRows: rows.length,
          rfRows: rfRows.length,
          normalIdentity: rows[0]?.textContent.trim() || '',
          normalId: rows[0]?.dataset.id || '',
          rfIdentity: rfRows[0]?.textContent.trim() || '',
          rfId: rfRows[0]?.dataset.id || '',
          hasDetail: actions.some(action => action.text === 'Detalhes'),
          hasEdit: actions.some(action => action.text.includes('Editar')),
          hasMove: actions.some(action => action.text === 'Movimentar' || action.text === 'Comprar'),
          hasRedeem: actions.some(action => action.text === 'Resgatar' || action.text === 'Vender'),
          actions,
          categoryIconsVisible: categoryIcons.length,
          visibleCategoryMetricCount: categoryMetrics.length,
          desktopTableVisible: Boolean(desktopTable && visible(desktopTable)),
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      });
      assert.ok(snapshot.normalRows > 0, `ativos variaveis nao visiveis em ${viewport.label}`);
      assert.ok(snapshot.rfRows > 0, `ativos RF nao visiveis em ${viewport.label}`);
      assert.ok(snapshot.normalIdentity.length > 0 && snapshot.rfIdentity.length > 0, `identidade do ativo ausente em ${viewport.label}`);
      assert.equal(snapshot.hasDetail, true, `Detalhes ausente em ${viewport.label}`);
      assert.equal(snapshot.hasEdit, true, `Editar ausente em ${viewport.label}`);
      assert.equal(snapshot.hasMove, true, `acao de compra/movimentar ausente em ${viewport.label}`);
      assert.equal(snapshot.hasRedeem, true, `acao de venda/resgatar ausente em ${viewport.label}`);
      assert.equal(snapshot.overflow, false, `overflow horizontal em ${viewport.label}`);
      assert.ok(snapshot.categoryIconsVisible > 0, `icone SVG de categoria ausente em ${viewport.label}`);
      assert.ok(snapshot.visibleCategoryMetricCount >= (viewport.width <= 430 ? 4 : 5), `métricas do grupo ausentes em ${viewport.label}`);
      if (viewport.width > 640) assert.equal(snapshot.desktopTableVisible, true, `tabela principal ausente em ${viewport.label}`);
      for (const action of snapshot.actions) assert.ok(action.width >= 44 && action.height >= 44, `acao menor que 44px: ${action.text} (${action.width}x${action.height}) em ${viewport.label}`);

      const beforeData = { normal: snapshot.normalIdentity, rf: snapshot.rfIdentity };
      const afterData = await page.evaluate(({ isMobile, normalId, rfId }) => {
        const selectors = isMobile
          ? { normal: '.ag[data-asset-group="Ação"] .asset-mobile-cards details.asset-premium-card', rf: '.ag[data-asset-group="Renda Fixa"] .rf-category-row' }
          : { normal: '.ag-table tbody tr', rf: '.ag[data-asset-group="Renda Fixa"] .rf-category-row' };
        const textFor = (selector, id) => [...document.querySelectorAll(selector)]
          .find(element => element.dataset.id === id)?.textContent.trim() || '';
        return { normal: textFor(selectors.normal, normalId), rf: textFor(selectors.rf, rfId) };
      }, { isMobile: viewport.width <= 640, normalId: snapshot.normalId, rfId: snapshot.rfId });
      assert.deepEqual(afterData, beforeData, `dados do ativo mudaram ao abrir/fechar menu em ${viewport.label}`);
      await context.close();
    } finally {
      await browser.close();
      harness.server.close();
    }
    assert.deepEqual(errors, [], `telemetria console/pageerror em ${viewport.label}: ${errors.join(' | ')}`);
    assert.deepEqual(requestFailures, [], `requestfailed em ${viewport.label}: ${requestFailures.join(' | ')}`);
  });
}

test('Novo Ativo abre a compra e cancelar não altera a carteira nem persiste dados', async () => {
  const executablePath = resolveBrowser();
  assert.ok(executablePath, 'Chrome/Edge nao encontrado para o smoke Playwright');
  const harness = await startServer(path.join(__dirname, '..'));
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.__financialWrites = [];
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        if (this === localStorage) window.__financialWrites.push(method);
        return original.apply(this, args);
      };
    }
  });
  try {
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LOCAL_TEST_MODE__ === true && typeof S !== 'undefined' && typeof go === 'function');
    await applyV289VisualFixture(page, 'baseline');
    await page.evaluate(() => go('ativos'));
    const before = await page.evaluate(() => ({
      assets: structuredClone(S.assets),
      aportes: structuredClone(S.aportes),
      proventos: structuredClone(S.proventos),
      writes: window.__financialWrites.length,
    }));
    await page.getByRole('button', { name: /novo ativo/i }).click();
    await page.getByRole('dialog', { name: /nova movimentação/i }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    const after = await page.evaluate(() => ({
      assets: structuredClone(S.assets),
      aportes: structuredClone(S.aportes),
      proventos: structuredClone(S.proventos),
      writes: window.__financialWrites.length,
    }));
    assert.deepEqual({ assets: after.assets, aportes: after.aportes, proventos: after.proventos }, {
      assets: before.assets, aportes: before.aportes, proventos: before.proventos,
    });
    assert.equal(after.writes, before.writes, 'opening/canceling must not persist financial state');
    assert.deepEqual(pageErrors, []);
  } finally {
    await context.close();
    await browser.close();
    harness.server.closeAllConnections();
    harness.server.close();
  }
});
