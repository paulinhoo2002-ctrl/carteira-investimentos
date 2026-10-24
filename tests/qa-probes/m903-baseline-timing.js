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
  const localOrigin = new URL(harness.url).origin;
  await page.route('**/*', r => new URL(r.request().url()).origin === localOrigin ? r.continue() : r.abort());
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof go === 'function');
  await page.evaluate(() => { restoreLocalTestData(); fetchQuotes = async () => {}; scheduleAutoProventosGratis = () => {}; });
  const t = await page.evaluate(async () => {
    openQuickMovement('compra');
    const snap = () => Array.from(document.querySelectorAll('.note-overlay input, .note-overlay select, .note-overlay textarea')).map(el => (el.type) + '=' + String(el.value || '').slice(0, 10));
    const t0 = snap();
    const base = (Array.isArray(window.__qmBaseline) ? window.__qmBaseline.map(v => JSON.stringify(v).slice(0, 12)) : null);
    await new Promise(r => setTimeout(r, 400));
    const t400 = snap();
    return { t0, base, t400 };
  });
  console.log(JSON.stringify(t, null, 1));
  await browser.close();
  await new Promise(r => harness.server.close(r));
})().catch(e => { console.error('FAIL', String(e).slice(0, 250)); process.exit(1); });
