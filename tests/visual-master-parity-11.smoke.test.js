const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173/index.html?testMode=1';
const viewports = [
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

async function openPage(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => requestFailures.push(request.url()));
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(350);
  return { page, consoleErrors, pageErrors, requestFailures };
}

async function inspect(page, tab) {
  await page.evaluate(currentTab => window.go(currentTab), tab);
  await page.waitForTimeout(250);
  return page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    clipped: [...document.querySelectorAll('.premium-panel, .analysis-summary-card, .card')]
      .some(node => node.scrollWidth > node.clientWidth + 1),
  }));
}

test('visual master parity keeps the shared executive shell', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      const { page, consoleErrors, pageErrors, requestFailures } = await openPage(browser, viewport);
      const dashboard = await inspect(page, 'dashboard');
      assert.equal(await page.locator('.dashboard-executive-kpis').count(), 1, `${viewport.name}: Dashboard KPI block`);
      assert.equal(await page.locator('.dashboard-executive-kpis > *').count(), 5, `${viewport.name}: five Dashboard KPIs`);
      assert.equal(await page.locator('.dashboard-master-primary > *').count(), 3, `${viewport.name}: three primary panels`);
      assert.equal(await page.locator('.dashboard-master-secondary > *').count(), 3, `${viewport.name}: three secondary panels`);
      assert.equal(dashboard.overflow, false, `${viewport.name}: overflow Dashboard`);
      assert.equal(dashboard.clipped, false, `${viewport.name}: clipping Dashboard`);
      assert.deepEqual(consoleErrors, [], `${viewport.name}: console errors`);
      assert.deepEqual(pageErrors, [], `${viewport.name}: page errors`);
      assert.deepEqual(requestFailures, [], `${viewport.name}: request failures`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test('visual master parity keeps the four executive areas readable', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const tab of ['dividendos', 'ativos', 'rentabilidade']) {
      const { page, consoleErrors, pageErrors, requestFailures } = await openPage(browser, { width: 1366, height: 768 });
      const state = await inspect(page, tab);
      assert.equal(state.overflow, false, `${tab}: overflow`);
      assert.equal(state.clipped, false, `${tab}: clipping`);
      assert.deepEqual(consoleErrors, [], `${tab}: console errors`);
      assert.deepEqual(pageErrors, [], `${tab}: page errors`);
      assert.deepEqual(requestFailures, [], `${tab}: request failures`);
      if (tab === 'dividendos') {
        assert.equal(await page.locator('.div-premium').count(), 1);
        assert.match(await page.locator('.div-premium').innerText(), /Histórico|Evolução/);
      }
      if (tab === 'ativos') assert.ok((await page.locator('.assets-premium-kpis, .asset-kpi-grid').count()) > 0, 'Ativos sem KPIs');
      if (tab === 'rentabilidade') assert.match(await page.locator('body').innerText(), /Rentabilidade/);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
