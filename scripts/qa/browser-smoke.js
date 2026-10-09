'use strict';

const { chromium, firefox, webkit } = require('playwright');

const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:4173';
const browserType = process.env.QA_BROWSER || 'chromium';
const viewports = [[390, 844], [430, 932], [768, 1024], [1366, 768], [1440, 900], [1536, 864], [1920, 1080]];

async function main() {
  let browser;
  switch (browserType) {
    case 'firefox':
      browser = await firefox.launch({ headless: true });
      break;
    case 'webkit':
      browser = await webkit.launch({ headless: true });
      break;
    case 'chromium':
    default:
      browser = await chromium.launch({ headless: true });
      break;
  }
  const page = await browser.newPage();
  const consoleErrors = [];
  const expectedOfflineErrors = [];
  const pageErrors = [];
  const requestErrors = [];
  page.on('console', message => {
    if (message.type() !== 'error') return;
    if (message.text().includes('ERR_NETWORK_ACCESS_DENIED')) expectedOfflineErrors.push(message.text());
    else consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => { if (request.url().startsWith(origin)) requestErrors.push(`${request.method()} ${request.url()}`); });
  const results = [];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await page.goto(`${origin}/index.html?cachebust=qa-smoke-${width}`, { waitUntil: 'domcontentloaded' });
    results.push(await page.evaluate(({ width, height }) => ({ width, height, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, bodyWidth: document.body.scrollWidth, viewportWidth: innerWidth }), { width, height }));
  }
  const result = { viewports: results, consoleErrors, expectedOfflineErrors: expectedOfflineErrors.length, pageErrors, requestErrors, OVERFLOW: results.some(item => item.overflow) ? 1 : 0, CONSOLE_ERRORS: consoleErrors.length, PAGE_ERRORS: pageErrors.length, REQUEST_ERRORS_RELEVANT: requestErrors.length };
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  process.exitCode = result.OVERFLOW || result.CONSOLE_ERRORS || result.PAGE_ERRORS || result.REQUEST_ERRORS_RELEVANT ? 2 : 0;
}

main().catch(error => { console.error(error.stack); process.exitCode = 1; });
