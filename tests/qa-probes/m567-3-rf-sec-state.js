// M567.3 — estado real das seções .sec do RF @390.
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
  const out = await p.evaluate(() => {
    go('renda-fixa');
    return [...document.querySelectorAll('.rf-page .sec, .rf-page details')].map(el => ({
      tag: el.tagName, open: el.open !== undefined ? el.open : 'n/a',
      h: Math.round(el.getBoundingClientRect().height),
      bodyH: (() => { const b2 = el.querySelector('.sec-body'); return b2 ? Math.round(b2.getBoundingClientRect().height) : null; })(),
      bodyVisible: (() => { const b2 = el.querySelector('.sec-body'); if (!b2) return null; return !!b2.offsetParent; })(),
      head: (el.querySelector('summary')?.textContent || '').replace(/\s+/g, ' ').slice(0, 45),
    }));
  });
  console.log(JSON.stringify(out, null, 1));
  await b.close(); await new Promise(r => h.server.close(r));
})().catch(e => { console.error('PROBE_FAIL', e); process.exit(1); });
