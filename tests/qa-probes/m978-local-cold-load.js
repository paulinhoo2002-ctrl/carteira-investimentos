// M978 — carga fria LOCAL com xlsx lazy: recursos iniciais NÃO devem conter xlsx.full.min.js
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
(async () => {
  const harness = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const localOrigin = new URL(harness.url).origin;
  await page.route('**/*', r => new URL(r.request().url()).origin === localOrigin || r.request().url().includes('cdn.jsdelivr') ? r.continue() : r.abort());
  await page.goto(harness.url, { waitUntil: 'load', timeout: 60000 });
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0] || {}; return { ttfb: Math.round(n.responseStart || 0), dcl: Math.round(n.domContentLoadedEventEnd || 0), load: Math.round(n.loadEventEnd || 0) }; });
  const res = await page.evaluate(() => performance.getEntriesByType('resource'));
  const xlsxInit = res.filter(r => /xlsx/.test(r.name));
  const totalKB = Math.round(res.concat(performance.getEntriesByType('navigation')).reduce((s, e) => s + (e.transferSize || 0), 0) / 1024);
  const lazy = await page.evaluate(() => ensureXLSX().then(() => typeof XLSX));
  console.log(JSON.stringify({ nav, totalTransferKB: totalKB, xlsxInInitialLoad: xlsxInit.length, xlsxAfterLazy: lazy, resources: res.length }));
  await browser.close();
  await new Promise(r => harness.server.close(r));
})().catch(e => { console.error('FAIL', String(e).slice(0, 200)); process.exit(1); });
