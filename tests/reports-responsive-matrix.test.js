const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { chromium } = require('playwright-core');

const ROOT = process.cwd();
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const viewports = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 900 },
  { width: 1366, height: 768 },
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
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(async () => {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  });

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(`http://127.0.0.1:${port}/index.html?testMode=1&protectedReadOnlyQa=1`);
    await page.evaluate(() => go('relatorios'));
    await page.waitForSelector('.reports-premium-shell');

    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      heading: document.querySelector('.reports-premium-shell h1')?.textContent?.trim(),
      reconciliation: Boolean(document.querySelector('.reports-reconciliation')),
      periodControls: document.querySelectorAll('.reports-filter button').length,
    }));

    assert.equal(state.overflow, false, `overflow em ${viewport.width}px`);
    assert.equal(state.heading, 'Relatórios');
    assert.equal(state.reconciliation, true);
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
});
