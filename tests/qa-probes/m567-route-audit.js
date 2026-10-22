// M567 FASE 5/6 — Auditoria funcional+visual das rotas da SPA (dados 100% sintéticos).
// Um servidor + um browser: percorre todas as rotas renderizáveis em
// mobile 390 / tablet 768 / desktop 1366, temas dark+light, coletando:
// render, pageerrors, console errors, overflow horizontal, fontes <10px,
// detalhes abertos por padrão, alvos de toque <43px; valida Hide Values
// (zero R$ visível e zero vazamento em aria-label/title) e tira as
// capturas de evidência. Saída: tests/.qa-state/m567/route-audit.json + PNGs.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'tests', '.qa-state', 'm567');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const ROUTES = ['dashboard', 'patrimonio', 'ativos', 'ranking', 'aportes', 'metas', 'dividendos', 'desempenho',
  'renda-fixa', 'irpf', 'rentabilidade', 'ajudar', 'auditoria', 'confiabilidade', 'relatorios',
  'corporate-eventos', 'importacao', 'ia', 'analise', 'settings'];

const VIEWPORTS = [
  { name: 'mobile390', width: 390, height: 844 },
  { name: 'tablet768', width: 768, height: 1024 },
  { name: 'desktop1366', width: 1366, height: 768 },
];
const THEMES = ['dark', 'light'];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const harness = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const localOrigin = new URL(harness.url).origin;
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.route('**/*', async route => {
    const req = route.request();
    if (new URL(req.url()).origin === localOrigin) return route.continue();
    return route.abort();
  });
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof S !== 'undefined' && Array.isArray(S.aportes) && typeof go === 'function');
  await page.evaluate(() => {
    restoreLocalTestData();
    fetchQuotes = async () => {};
    scheduleAutoProventosGratis = () => {};
    const active = activeWallet();
    const testWallet = { ...active, id: 'M567_QA_WALLET', name: 'Carteira sintética M567', assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents, goals: S.goals };
    const primaryWallet = { id: 'M567_QA_PRIMARY', name: 'Carteira principal sintética', assets: [], aportes: [], proventos: [], rfEvents: [], goals: {} };
    S.wallets = [primaryWallet, testWallet];
    S.activeWalletId = testWallet.id;
    S.hideValues = false;
  });

  const results = [];
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const theme of THEMES) {
      for (const route of ROUTES) {
        const r = await page.evaluate(async ({ route, theme }) => {
          applyTheme(theme);
          go(route);
          await new Promise(res => requestAnimationFrame(() => setTimeout(res, 120)));
          const root = document.getElementById('root') || document.body;
          const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          let smallFonts = 0;
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          let node;
          while ((node = walker.nextNode())) {
            const el = node.parentElement;
            if (!el || !node.textContent.trim()) continue;
            const cs = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if (cs.display === 'none' || cs.visibility === 'hidden' || rect.width === 0) continue;
            const fs = parseFloat(cs.fontSize);
            if (fs < 10) smallFonts += 1;
          }
          const openDetails = document.querySelectorAll('details[open]').length;
          let smallTouch = 0;
          document.querySelectorAll('button, summary').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && rect.height < 43) smallTouch += 1;
          });
          return {
            route, theme, rendered: root.innerHTML.length > 500,
            htmlLen: root.innerHTML.length, overflow, smallFonts, openDetails, smallTouch,
          };
        }, { route, theme });
        r.viewport = vp.name;
        r.pageErrors = pageErrors.splice(0);
        r.consoleErrors = consoleErrors.splice(0);
        results.push(r);
      }
    }
  }

  // Hide Values: zero vazamento em texto + atributos (3 rotas representativas)
  const hideValues = {};
  for (const route of ['dashboard', 'dividendos', 'ativos']) {
    hideValues[route] = await page.evaluate(routeName => {
      go(routeName);
      S.hideValues = false; render();
      const before = (document.body.innerText.match(/R\$\s*\d/g) || []).length;
      S.hideValues = true; render();
      const textAfter = (document.body.innerText.match(/R\$\s*\d/g) || []).length;
      let attrLeaks = 0;
      document.querySelectorAll('[aria-label],[title]').forEach(el => {
        if (/R\$\s*\d/.test(`${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''}`)) attrLeaks += 1;
      });
      S.hideValues = false; render();
      return { before, textAfter, attrLeaks };
    }, route);
  }

  // Capturas de evidência (4 preferidas + tablet)
  await page.setViewportSize({ width: 1366, height: 768 });
  const shots = [
    { route: 'dashboard', theme: 'dark', name: 'm567-desktop1366-dashboard-dark' },
    { route: 'dashboard', theme: 'light', name: 'm567-desktop1366-dashboard-light' },
    { route: 'ativos', theme: 'dark', name: 'm567-desktop1366-ativos-dark' },
    { route: 'metas', theme: 'light', name: 'm567-desktop1366-metas-light' },
  ];
  await page.setViewportSize({ width: 390, height: 844 });
  shots.push(
    { route: 'dashboard', theme: 'dark', name: 'm567-mobile390-dashboard-dark' },
    { route: 'dashboard', theme: 'light', name: 'm567-mobile390-dashboard-light' },
  );
  await page.setViewportSize({ width: 768, height: 1024 });
  shots.push({ route: 'dividendos', theme: 'light', name: 'm567-tablet768-dividendos-light' });
  for (const s of shots) {
    await page.setViewportSize({ width: s.name.includes('mobile') ? 390 : s.name.includes('tablet') ? 768 : 1366, height: s.name.includes('mobile') ? 844 : s.name.includes('tablet') ? 1024 : 768 });
    await page.evaluate(({ route, theme }) => { applyTheme(theme); go(route); }, s);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, `${s.name}.png`), fullPage: false });
  }

  const summary = {
    totalChecks: results.length,
    routes: ROUTES.length,
    renderFailures: results.filter(r => !r.rendered).map(r => `${r.route}@${r.viewport}/${r.theme}`),
    overflowFailures: results.filter(r => r.overflow > 1).map(r => `${r.route}@${r.viewport}/${r.theme}:+${r.overflow}px`),
    pageErrorFailures: results.filter(r => r.pageErrors.length).map(r => `${r.route}@${r.viewport}/${r.theme}:${r.pageErrors.length}`),
    consoleErrorFailures: results.filter(r => r.consoleErrors.length).map(r => `${r.route}@${r.viewport}/${r.theme}:${r.consoleErrors.length}`),
    smallFontHotspots: results.filter(r => r.smallFonts > 0).map(r => `${r.route}@${r.viewport}/${r.theme}:${r.smallFonts}`),
    openDetailsDefault: results.filter(r => r.openDetails > 0).map(r => `${r.route}@${r.viewport}/${r.theme}:${r.openDetails}`),
    hideValues,
    pageErrorSamples: pageErrors.slice(0, 5),
    consoleErrorSamples: [...new Set(consoleErrors)].slice(0, 8),
  };
  fs.writeFileSync(path.join(OUT, 'route-audit.json'), JSON.stringify({ summary, results }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
  await new Promise(res => harness.server.close(res));
}

main().catch(e => { console.error('AUDIT_FAIL', e); process.exit(1); });
