const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
(async () => {
  const harness = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 150)));
  const localOrigin = new URL(harness.url).origin;
  await page.route('**/*', r => new URL(r.request().url()).origin === localOrigin ? r.continue() : r.abort());
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof go === 'function');
  await page.evaluate(() => { restoreLocalTestData(); fetchQuotes = async () => {}; scheduleAutoProventosGratis = () => {}; });
  const direct = await page.evaluate(() => {
    try { openQuickMovement('compra'); return 'called-ok'; } catch (e) { return 'THREW: ' + String(e).slice(0, 120); }
  });
  await page.waitForTimeout(1000);
  const state = await page.evaluate(() => ({ open: !!S.quickMovementOpen, overlayVisible: !!(document.querySelector('.note-overlay') && document.querySelector('.note-overlay').offsetParent), baseline: Array.isArray(window.__qmBaseline) ? window.__qmBaseline.length : null }));
  console.log(JSON.stringify({ direct, state, errors: errors.slice(0, 3) }, null, 1));
  await browser.close();
  await new Promise(r => harness.server.close(r));
})().catch(e => { console.error('FAIL', String(e).slice(0, 300)); process.exit(1); });
