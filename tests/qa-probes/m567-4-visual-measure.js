// M567.4 — medição visual completa pós-remediação (substitui o m567-3-post-measure.js quebrado,
// preservado sem alteração). Dados 100% sintéticos; zero mutações financeiras.
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'tests', '.qa-state', 'm567-4');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const METAS_VIEWPORTS = [360, 390, 430, 768, 1366];
const THEMES = ['dark', 'light'];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const h = await startLocalHttpServer(ROOT);
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const localOrigin = new URL(h.url).origin;
  const pageErrors = [];
  p.on('pageerror', e => pageErrors.push(e.message));
  await p.route('**/*', r => (new URL(r.request().url()).origin === localOrigin ? r.continue() : r.abort()));
  await p.goto(h.url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof go === 'function');
  await p.evaluate(() => { restoreLocalTestData(); fetchQuotes = async () => {}; scheduleAutoProventosGratis = () => {}; });

  const report = { metas: [], relatorios: [], regressions: [], pageErrors };

  // ---- METAS: 5 viewports × 2 temas ----
  for (const w of METAS_VIEWPORTS) {
    await p.setViewportSize({ width: w, height: w >= 768 ? 1024 : 844 });
    for (const theme of THEMES) {
      await p.evaluate(t => { applyTheme(t); go('metas'); }, theme);
      await p.waitForTimeout(450);
      const m = await p.evaluate(() => {
        const card = document.querySelector('.metas-primary-goal');
        const grid = card?.querySelector('.metas-primary-goal-grid');
        const kpis = document.querySelector('.metas-kpi-grid');
        const h2 = card?.querySelector('h2');
        const cells = [...(grid?.querySelectorAll('.metas-primary-goal-value') || [])];
        const breaks = cells.filter(c => c.scrollWidth > c.clientWidth + 1).length;
        return {
          cardH: card ? Math.round(card.getBoundingClientRect().height) : null,
          h2px: h2 ? parseFloat(getComputedStyle(h2).fontSize) : null,
          gridH: grid ? Math.round(grid.getBoundingClientRect().height) : null,
          gridCols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : null,
          labels: cells.map(c => c.querySelector('span')?.textContent.trim()),
          kpiH: kpis ? Math.round(kpis.getBoundingClientRect().height) : null,
          shellH: Math.round(document.querySelector('.metas-shell').getBoundingClientRect().height),
          docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          minFont: (() => { let min = 99; card?.querySelectorAll('span,strong,small,p').forEach(el => { const r = el.getBoundingClientRect(); if (r.width > 0) min = Math.min(min, parseFloat(getComputedStyle(el).fontSize)); }); return min; })(),
          textBreaks: breaks,
        };
      });
      m.viewport = w; m.theme = theme;
      report.metas.push(m);
    }
  }

  // ---- RELATÓRIOS: filtro rolável + 6 opções + touch + teclado + sem corte (390, ambos os temas) ----
  await p.setViewportSize({ width: 390, height: 844 });
  for (const theme of THEMES) {
    await p.evaluate(t => { applyTheme(t); go('relatorios'); }, theme);
    await p.waitForTimeout(450);
    const r = await p.evaluate(() => {
      const filter = document.querySelector('.reports-filter');
      const buttons = [...filter.querySelectorAll('button')];
      const visible = filter.getBoundingClientRect().height;
      const touchOk = buttons.every(b => b.getBoundingClientRect().height >= 44);
      const keyboardOk = buttons.every(b => { b.focus(); return document.activeElement === b; });
      const clipping = buttons.filter(b => b.scrollWidth > b.clientWidth + 1).length;
      const allReachable = buttons.every(b => { b.scrollIntoView({ block: 'nearest', inline: 'center' }); return b.getBoundingClientRect().width > 0; });
      return {
        filterH: Math.round(visible),
        singleRow: Math.round(filter.firstElementChild.getBoundingClientRect().top) === Math.round(buttons[buttons.length - 1].getBoundingClientRect().top),
        btnCount: buttons.length,
        btnFont: getComputedStyle(buttons[0]).fontSize,
        scrollable: filter.scrollWidth > filter.clientWidth,
        scrollRange: filter.scrollWidth - filter.clientWidth,
        touchOk, keyboardOk, clipping, allReachable,
        docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    r.theme = theme;
    report.relatorios.push(r);
  }

  // ---- Regressão RF + ANALISE (alterações compartilhadas: index.html global CSS) ----
  for (const [route, w, theme] of [['renda-fixa', 390, 'dark'], ['renda-fixa', 1366, 'light'], ['analise', 390, 'dark'], ['analise', 1366, 'light']]) {
    await p.setViewportSize({ width: w, height: w >= 768 ? 1024 : 844 });
    await p.evaluate(([rt, t]) => { applyTheme(t); go(rt); }, [route, theme]);
    await p.waitForTimeout(450);
    const g = await p.evaluate(() => ({
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      rendered: (document.getElementById('root').innerHTML.length > 500),
    }));
    g.route = route; g.viewport = w; g.theme = theme;
    report.regressions.push(g);
  }
  report.pageErrors = pageErrors.splice(0);
  fs.writeFileSync(path.join(OUT, 'visual-measure.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 1));
  await b.close(); await new Promise(res => h.server.close(res));
})().catch(e => { console.error('PROBE_FAIL', e); process.exit(1); });
