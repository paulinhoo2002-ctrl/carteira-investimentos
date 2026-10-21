// M567.2 — visibilidade real dos details[open] + renda-fixa@1366.
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const ROOT = require('path').join(__dirname, '..', '..');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const harness = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const localOrigin = new URL(harness.url).origin;
  await page.route('**/*', r => (new URL(r.request().url()).origin === localOrigin ? r.continue() : r.abort()));
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof go === 'function');
  await page.evaluate(() => { restoreLocalTestData(); fetchQuotes = async () => {}; scheduleAutoProventosGratis = () => {}; });

  for (const [route, w] of [['auditoria', 390], ['auditoria', 1366], ['renda-fixa', 1366], ['renda-fixa', 768], ['metas', 1366], ['analise', 1366]]) {
    await page.setViewportSize({ width: w, height: 844 });
    const found = await page.evaluate(routeName => {
      go(routeName);
      return [...document.querySelectorAll('details[open]')].map(d => {
        const panel = d.querySelector('.tab-menu-panel') || d;
        const r = panel.getBoundingClientRect();
        const cs = getComputedStyle(d);
        return {
          cls: d.className.slice(0, 40),
          summary: (d.querySelector('summary')?.textContent || '').trim().slice(0, 40),
          panelVisible: r.width > 0 && r.height > 0,
          panelH: Math.round(r.height),
          parentDisplayed: cs.display !== 'none',
        };
      });
    }, route);
    console.log(`${route}@${w}`, JSON.stringify(found));
  }
  await browser.close();
  await new Promise(res => harness.server.close(res));
})().catch(e => { console.error('PROBE_FAIL', e); process.exit(1); });
