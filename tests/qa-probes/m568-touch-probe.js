// M568 — identifica o(s) alvo(s) de toque <43px compartilhado(s) no shell @390 e @768.
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const h = await startLocalHttpServer(ROOT);
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(h.url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof go === 'function');
  await p.evaluate(() => { restoreLocalTestData(); fetchQuotes = async () => {}; });
  for (const [route, w] of [['dashboard', 390], ['dashboard', 768], ['rentabilidade', 390], ['auditoria', 390]]) {
    await p.setViewportSize({ width: w, height: w >= 768 ? 1024 : 844 });
    const out = await p.evaluate(routeName => {
      go(routeName);
      return [...document.querySelectorAll('button,summary')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.height < 43;
      }).map(el => {
        const r = el.getBoundingClientRect();
        return { h: Math.round(r.height), w: Math.round(r.w || r.width), cls: (el.className || '').toString().slice(0, 45), text: (el.textContent || '').trim().slice(0, 25) };
      });
    }, route);
    console.log(route + '@' + w, JSON.stringify(out));
  }
  await b.close(); await new Promise(res => h.server.close(res));
})().catch(e => { console.error('PROBE_FAIL', e); process.exit(1); });
