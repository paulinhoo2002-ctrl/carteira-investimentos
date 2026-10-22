// M568 — FASE 5: auditoria visual global estendida (dados sintéticos).
// 20 rotas × [320,360,390,412,430,768,1024,1366,1440,1920] × [light,dark] = 400 checks.
// Por combo: render, overflow horizontal, pageerrors, console errors, fontes <9px,
// disclosures abertos, alvos de toque <44px. Saída: tests/.qa-state/m568/global-audit.json
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'tests', '.qa-state', 'm568');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const ROUTES = ['dashboard', 'patrimonio', 'ativos', 'ranking', 'aportes', 'metas', 'dividendos', 'desempenho',
  'renda-fixa', 'irpf', 'rentabilidade', 'ajudar', 'auditoria', 'confiabilidade', 'relatorios',
  'corporate-eventos', 'importacao', 'ia', 'analise', 'settings'];
const VIEWPORTS = [320, 360, 390, 412, 430, 768, 1024, 1366, 1440, 1920];
const THEMES = ['light', 'dark'];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const h = await startLocalHttpServer(ROOT);
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const pageErrors = [];
  const consoleErrors = [];
  const localOrigin = new URL(h.url).origin;
  p.on('pageerror', e => pageErrors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await p.route('**/*', r => (new URL(r.request().url()).origin === localOrigin ? r.continue() : r.abort()));
  await p.goto(h.url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof S !== 'undefined' && Array.isArray(S.aportes) && typeof go === 'function');
  await p.evaluate(() => {
    restoreLocalTestData();
    fetchQuotes = async () => {};
    scheduleAutoProventosGratis = () => {};
    const active = activeWallet();
    const testWallet = { ...active, id: 'M568_QA_WALLET', name: 'Carteira sintética M568', assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents, goals: S.goals };
    const primaryWallet = { id: 'M568_QA_PRIMARY', name: 'Carteira principal sintética', assets: [], aportes: [], proventos: [], rfEvents: [], goals: {} };
    S.wallets = [primaryWallet, testWallet];
    S.activeWalletId = testWallet.id;
    S.hideValues = false;
  });

  const results = [];
  for (const w of VIEWPORTS) {
    await p.setViewportSize({ width: w, height: w >= 1024 ? 768 : w >= 768 ? 1024 : 844 });
    for (const theme of THEMES) {
      for (const route of ROUTES) {
        const r = await p.evaluate(({ route, theme }) => {
          applyTheme(theme);
          go(route);
          return {
            rendered: (document.getElementById('root').innerHTML.length > 500),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            under9: (() => { let n = 0; const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let node; while ((node = walker.nextNode())) { const el = node.parentElement; if (!el || !node.textContent.trim()) continue; const cs = getComputedStyle(el); const rect = el.getBoundingClientRect(); if (cs.display === 'none' || rect.width === 0) continue; if (parseFloat(cs.fontSize) < 9) n += 1; } return n; })(),
            openDetails: document.querySelectorAll('details[open]').length,
            smallTouch: (() => { let n = 0; document.querySelectorAll('button,summary').forEach(el => { const rect = el.getBoundingClientRect(); if (rect.width > 0 && rect.height > 0 && rect.height < 43) n += 1; }); return n; })(),
            route, theme,
          };
        }, { route, theme });
        r.viewport = w;
        r.pageErrors = pageErrors.splice(0);
        r.consoleErrors = consoleErrors.splice(0);
        results.push(r);
      }
    }
  }
  const fail = (cond) => results.filter(cond).map(r => `${r.route}@${r.viewport}/${r.theme}`);
  const summary = {
    total: results.length,
    renderFail: fail(r => !r.rendered),
    overflowFail: fail(r => r.overflow > 1),
    pageErrorFail: fail(r => r.pageErrors.length),
    consoleErrorFail: fail(r => r.consoleErrors.length),
    under9Fail: fail(r => r.under9 > 0),
    openDetails: results.filter(r => r.openDetails > 0).map(r => `${r.route}@${r.viewport}/${r.theme}:${r.openDetails}`),
    smallTouchHotspots: results.filter(r => r.smallTouch > 0).map(r => `${r.route}@${r.viewport}/${r.theme}:${r.smallTouch}`),
    pageErrorSamples: [...new Set(pageErrors)].slice(0, 5),
    consoleErrorSamples: [...new Set(consoleErrors)].slice(0, 8),
  };
  fs.writeFileSync(path.join(OUT, 'global-audit.json'), JSON.stringify({ summary, results }, null, 2));
  console.log(JSON.stringify(summary, null, 1));
  await b.close(); await new Promise(res => h.server.close(res));
})().catch(e => { console.error('AUDIT_FAIL', e); process.exit(1); });
