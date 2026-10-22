// M567.3 — drilldown: filhos dos shells das 4 telas com alturas.
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
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

  const plan = [
    { route: 'metas', theme: 'dark', w: 390, shell: '.metas-shell' },
    { route: 'relatorios', theme: 'dark', w: 390, shell: '.reports-shell' },
    { route: 'renda-fixa', theme: 'dark', w: 390, shell: '.rf-page' },
  ];
  for (const p of plan) {
    await page.setViewportSize({ width: p.w, height: 844 });
    const out = await page.evaluate(({ route, theme, shell }) => {
      applyTheme(theme);
      go(route);
      const shellEl = document.querySelector(shell);
      const lines = [];
      const describe = (el, depth) => {
        const r = el.getBoundingClientRect();
        if (r.height < 40) return;
        lines.push(`${'  '.repeat(depth)}${Math.round(r.height)}px [${(el.className || '').toString().slice(0, 45)}] ${(el.innerText || '').replace(/\s+/g, ' ').slice(0, 55)}`);
      };
      [...shellEl.children].forEach(el => {
        describe(el, 0);
        [...el.children].forEach(c => describe(c, 1));
      });
      return { route, docH: Math.round(document.documentElement.scrollHeight), lines };
    }, p);
    console.log(`\n=== ${p.route} @${p.w} ${p.theme} docH=${out.docH} ===`);
    out.lines.forEach(l => console.log(l));
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  const out = await page.evaluate(() => {
    applyTheme('light');
    go('analise');
    const shellEl = document.querySelector('.assets-premium-shell');
    const lines = [];
    [...shellEl.children].forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.height < 30) return;
      lines.push(`${Math.round(r.height)}px [${(el.className || '').toString().slice(0, 45)}] ${(el.innerText || '').replace(/\s+/g, ' ').slice(0, 55)}`);
      [...el.children].forEach(c => { const rc = c.getBoundingClientRect(); if (rc.height >= 30) lines.push(`  ${Math.round(rc.height)}px [${(c.className || '').toString().slice(0, 42)}] ${(c.innerText || '').replace(/\s+/g, ' ').slice(0, 50)}`); });
    });
    return { docH: Math.round(document.documentElement.scrollHeight), lines };
  });
  console.log(`\n=== analise @1366 light docH=${out.docH} ===`);
  out.lines.forEach(l => console.log(l));
  await browser.close();
  await new Promise(res => harness.server.close(res));
})().catch(e => { console.error('PROBE_FAIL', e); process.exit(1); });
