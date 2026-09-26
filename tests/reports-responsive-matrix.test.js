const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright-core');
let axePath = null;
try { axePath = require.resolve('axe-core'); } catch {}

const ROOT = process.cwd();
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const viewports = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 900 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1920, height: 1080 },
];

function startServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    const file = url.pathname === '/' ? '/index.html' : url.pathname;
    const safePath = require('node:path').join(ROOT, file);
    require('node:fs').readFile(safePath, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end('not found');
        return;
      }
      response.writeHead(200);
      response.end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

test('relatórios preserva leitura responsiva e impressão nos viewports certificados', async (t) => {
  const server = await startServer();
  const port = server.address().port;
  const screenshotDir = process.env.V273_SCREENSHOT_DIR || path.join(os.tmpdir(), 'v273-reports-qa');
  let browser = null;
  t.after(async () => {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  });
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const pageErrors = [];
  const consoleErrors = [];
  const requestFailures = [];

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('requestfailed', request => requestFailures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'failed'}`));
    await page.goto(`http://127.0.0.1:${port}/index.html?testMode=1&protectedReadOnlyQa=1`);
    await page.evaluate(() => go('relatorios'));
    await page.waitForSelector('.reports-premium-shell');
    if (viewport.width === 390 && axePath) {
      await page.addScriptTag({ path: axePath });
      const axe = await page.evaluate(async () => window.axe.run(document.querySelector('.reports-v273-health')));
      const blockingViolations = axe.violations.filter(item => ['critical', 'serious'].includes(item.impact));
      assert.deepEqual(blockingViolations.map(item => ({ id: item.id, impact: item.impact })), []);
    }

    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      heading: document.querySelector('.reports-premium-shell h1')?.textContent?.trim(),
      reconciliation: Boolean(document.querySelector('.reports-reconciliation')),
      dataHealth: Boolean(document.querySelector('.reports-v273-health')),
      healthTiles: document.querySelectorAll('.reports-v273-health-item').length,
      engineDataSplit: document.querySelector('.reports-v273-health .reports-reconciliation-note')?.textContent?.includes('dados prontos para performance real'),
      healthLabelled: Boolean(document.querySelector('.reports-v273-health[aria-labelledby="reports-data-health-title"]')),
      healthStatusText: [...document.querySelectorAll('.reports-v273-health-item strong')].map(node => node.textContent.trim()),
      periodControls: document.querySelectorAll('.reports-filter button').length,
    }));

    assert.equal(state.overflow, false, `overflow em ${viewport.width}px`);
    assert.equal(state.heading, 'Relatórios');
    assert.equal(state.reconciliation, true);
    assert.equal(state.dataHealth, true);
    assert.equal(state.healthTiles, 8);
    assert.equal(state.engineDataSplit, true);
    assert.equal(state.healthLabelled, true);
    assert.equal(state.healthStatusText.length, 8);

    if ([390, 768, 1366, 1920].includes(viewport.width)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
      await page.locator('.reports-v273-health').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(screenshotDir, `v273-reports-${viewport.width}.png`) });
    }
    assert.equal(state.periodControls, 6);

    await page.emulateMedia({ media: 'print' });
    const printState = await page.evaluate(() => ({
      tabsHidden: getComputedStyle(document.querySelector('.tabs-desktop')).display === 'none',
      shellVisible: getComputedStyle(document.querySelector('.reports-premium-shell')).display !== 'none',
    }));
    assert.equal(printState.tabsHidden, true, `navegação visível no print em ${viewport.width}px`);
    assert.equal(printState.shellVisible, true);
    await page.close();
  }
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(requestFailures, []);
});
