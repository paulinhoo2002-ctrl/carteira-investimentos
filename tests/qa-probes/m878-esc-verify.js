// M878 — ESC no modal de movimentação: limpo fecha, sujo protege (browser, sintético)
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
(async () => {
  const harness = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const localOrigin = new URL(harness.url).origin;
  await page.route('**/*', r => new URL(r.request().url()).origin === localOrigin ? r.continue() : r.abort());
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof go === 'function' && S.assets.length > 0);
  await page.evaluate(() => { fetchQuotes = async () => {}; scheduleAutoProventosGratis = () => {}; go('ativos'); });
  await page.waitForTimeout(1200);
  const open = async () => {
    await page.evaluate(() => { const b = document.querySelector('[onclick*="toggleAssetActionMenu"]'); if (b) b.click(); });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const item = Array.from(document.querySelectorAll('[onclick*="openAssetQuickMovement"], [onclick*="quick"]')).find(i => /comprar/i.test((i.textContent || '') + (i.getAttribute('onclick') || '')));
      if (item) item.click();
    });
    await page.waitForTimeout(1200);
    return page.evaluate(() => { const o = document.querySelector('.note-overlay'); return !!(o && (o.checkVisibility ? o.checkVisibility() : o.getBoundingClientRect().width > 0)); });
  };
  const isOpen = await page.evaluate(() => { const o = document.querySelector('.note-overlay'); return !!(o && (o.checkVisibility ? o.checkVisibility() : o.getBoundingClientRect().width > 0)); });
  let opened = isOpen || (await open());
  let escCleanCloses = null, escDirtyStaysOpen = null;
  if (opened) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    escCleanCloses = !(await page.evaluate(() => { const o = document.querySelector('.note-overlay'); return !!(o && (o.checkVisibility ? o.checkVisibility() : o.getBoundingClientRect().width > 0)); }));
    if (escCleanCloses) {
      opened = await open();
      if (opened) {
        await page.evaluate(() => { const inp = document.querySelector('.note-overlay input:not([type=date]):not([type=checkbox])'); if (inp) { inp.value = '100'; inp.dispatchEvent(new Event('input', { bubbles: true })); } return true; });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(700);
        escDirtyStaysOpen = await page.evaluate(() => { const o = document.querySelector('.note-overlay'); return !!(o && (o.checkVisibility ? o.checkVisibility() : o.getBoundingClientRect().width > 0)); });
      }
    }
  }
  console.log(JSON.stringify({ opened, escCleanCloses, escDirtyStaysOpen }, null, 1));
  await browser.close();
  await new Promise(r => harness.server.close(r));
})().catch(e => { console.error('FAIL', String(e).slice(0, 300)); process.exit(1); });
