const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const hostUrl = process.env.MODERN_HOST_URL;
const browserTest = hostUrl ? test : test.skip;

function resolveBrowserExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate));
}

browserTest('modern host smoke navigation', async () => {
  const executablePath = resolveBrowserExecutable();
  assert.ok(executablePath, 'Chrome or Edge executable not found for host smoke test');

  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({
    executablePath,
    headless: true,
  });

  try {
    await runViewportScenario(browser, { width: 1366, height: 768 }, async (page) => {
      await assertPageReady(page);
      await page.locator('.sidebar__item').nth(1).click();
      await assert.equal(await page.locator('h2#page-assets').textContent(), 'Ativos');
      await assert.equal(await page.locator('[aria-current="page"] .sidebar__item-label').textContent(), 'Ativos');

      await page.locator('.sidebar__item').nth(5).click();
      await assertReportsPreview(page);
      await assert.equal(await page.locator('[aria-current="page"] .sidebar__item-label').textContent(), 'Relatorios');
    });

    await runViewportScenario(browser, { width: 390, height: 844 }, async (page) => {
      await assertPageReady(page);
      const menuButton = page.locator('.modern-menu-button');

      await menuButton.focus();
      const menuFocusOutline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
      assert.notEqual(menuFocusOutline, 'none', 'Menu button focus is not visible');

      await menuButton.press('Enter');
      await assert.equal(await menuButton.getAttribute('aria-expanded'), 'true');

      const sidebar = page.locator('#modern-sidebar');
      await assert.equal(await sidebar.getAttribute('data-open'), 'true');

      await menuButton.press('Escape');
      await assert.equal(await menuButton.getAttribute('aria-expanded'), 'false');

      await menuButton.press('Enter');
      await assert.equal(await menuButton.getAttribute('aria-expanded'), 'true');
      await page.locator('#modern-sidebar .sidebar__item').nth(1).press('Enter');
      await assert.equal(await page.locator('h2#page-assets').textContent(), 'Ativos');
      await assert.equal(await page.locator('[aria-current="page"] .sidebar__item-label').textContent(), 'Ativos');
      await assert.equal(await menuButton.getAttribute('aria-expanded'), 'false');

      await menuButton.press('Enter');
      await page.locator('#modern-sidebar .sidebar__item').nth(5).press('Enter');
      await assertReportsPreview(page);
      await assert.equal(await page.locator('.assets-report__mobile-list').isVisible(), true);
      await assert.equal(await page.locator('.assets-report__mobile-card').count(), 3);
      await assert.equal(await menuButton.getAttribute('aria-expanded'), 'false');
    });
  } finally {
    await browser.close();
  }
});

async function runViewportScenario(browser, viewport, scenario) {
  const context = await browser.newContext({
    viewport,
    hasTouch: viewport.width <= 430,
    isMobile: viewport.width <= 430,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  page.on('requestfailed', (request) => {
    failedRequests.push(request.url());
  });

  await page.goto(hostUrl, { waitUntil: 'networkidle' });

  await scenario(page);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  assert.equal(overflow, true, 'Horizontal overflow detected');
  assert.equal(consoleErrors.length, 0, `Console errors: ${consoleErrors.join(' | ')}`);
  assert.equal(pageErrors.length, 0, `Page errors: ${pageErrors.join(' | ')}`);
  assert.equal(failedRequests.length, 0, `Failed requests: ${failedRequests.join(' | ')}`);

  const requestOrigins = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => {
        try {
          return new URL(entry.name).origin;
        } catch {
          return 'invalid';
        }
      }),
  );

  const allowedOrigin = hostUrl ? new URL(hostUrl).origin : null;
  const externalRequests = requestOrigins.filter(
    (origin) => origin !== allowedOrigin && origin !== 'null',
  );
  assert.equal(externalRequests.length, 0, `External requests found: ${externalRequests.join(', ')}`);

  await context.close();
}

async function assertPageReady(page) {
  await page.getByRole('heading', { name: 'Carteira de Investimentos' }).waitFor();
  await page.locator('.sidebar__item').count().then((count) => {
    assert.equal(count, 7);
  });
  assert.equal(await page.evaluate(() => Object.prototype.hasOwnProperty.call(window, 'buildReportAssetRow')), false);
  assert.equal(await page.evaluate(() => Object.prototype.hasOwnProperty.call(window, 'createLegacyReportsReadonlySource')), false);
}

async function assertReportsPreview(page) {
  await assert.equal(await page.locator('h2#page-reports').textContent(), 'Previa somente leitura de Relatorios');
  const mainText = await page.locator('main').textContent();
  assert.ok(
    mainText?.includes('Snapshot legado somente leitura. React nao escreve na fonte.') === true,
    'Missing read-only snapshot notice',
  );
  await assert.equal(await page.locator('.assets-report__table').count(), 1);
  await assert.equal(await page.locator('.assets-report__table caption').textContent(), 'Previa demonstrativa de ativos em relatorios');
  await assert.equal(await page.locator('.assets-report__table thead th[scope="col"]').count(), 8);
  await assert.equal(await page.getByText('Total demonstrativo').count(), 1);

  for (const ticker of ['PETR4', 'MXRF11', 'BOVA11']) {
    assert.ok((await page.getByText(ticker).count()) >= 1, `Missing ticker: ${ticker}`);
  }

  for (const state of ['Positivo', 'Neutro', 'Negativo']) {
    assert.ok((await page.getByText(state).count()) >= 1, `Missing state: ${state}`);
  }
}
