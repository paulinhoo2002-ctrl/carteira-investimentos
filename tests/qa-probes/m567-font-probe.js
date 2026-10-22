const path = require('path');
// M567 — re-probe de fontes: distingue violação real (<9px) de micro-labels permitidos (9–9.99px).
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const ROOT = path.join(__dirname, '..', '..');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROUTES = ['dashboard', 'patrimonio', 'ativos', 'aportes', 'metas', 'dividendos', 'renda-fixa', 'irpf', 'rentabilidade', 'ajudar', 'auditoria', 'confiabilidade', 'relatorios', 'corporate-eventos', 'importacao', 'ia', 'analise', 'settings'];

(async () => {
  const harness = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const localOrigin = new URL(harness.url).origin;
  await page.route('**/*', r => (new URL(r.request().url()).origin === localOrigin ? r.continue() : r.abort()));
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof S !== 'undefined' && Array.isArray(S.aportes) && typeof go === 'function');
  await page.evaluate(() => { restoreLocalTestData(); fetchQuotes = async () => {}; scheduleAutoProventosGratis = () => {}; });
  const out = {};
  for (const route of ROUTES) {
    out[route] = await page.evaluate(routeName => {
      go(routeName);
      const root = document.getElementById('root') || document.body;
      const under9 = [];
      const nine = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const el = node.parentElement;
        if (!el || !node.textContent.trim()) continue;
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (cs.display === 'none' || cs.visibility === 'hidden' || rect.width === 0) continue;
        const fs = parseFloat(cs.fontSize);
        const text = node.textContent.trim().slice(0, 40);
        if (fs < 9) under9.push(`${fs.toFixed(1)}px "${text}"`);
        else if (fs < 10) nine.push(text);
      }
      return { under9, microLabels9px: nine.length };
    }, route);
  }
  for (const [route, r] of Object.entries(out)) {
    console.log(`${route}: under9=${r.under9.length} micro9px=${r.microLabels9px}${r.under9.length ? ' | ' + r.under9.slice(0, 4).join(' ; ') : ''}`);
  }
  await browser.close();
  await new Promise(res => harness.server.close(res));
})().catch(e => { console.error('PROBE_FAIL', e); process.exit(1); });
