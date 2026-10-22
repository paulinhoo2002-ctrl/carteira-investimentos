// M567.5 — RF "+ Nova aplicação" (estado/contraste/toque/teclado/foco/hover) + percepção do scroll do filtro de relatórios.
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const h = await startLocalHttpServer(ROOT);
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const localOrigin = new URL(h.url).origin;
  await p.route('**/*', r => (new URL(r.request().url()).origin === localOrigin ? r.continue() : r.abort()));
  await p.goto(h.url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof go === 'function');
  await p.evaluate(() => { restoreLocalTestData(); fetchQuotes = async () => {}; scheduleAutoProventosGratis = () => {}; });

  const rf = await p.evaluate(() => {
    go('renda-fixa');
    const btns = [...document.querySelectorAll('.premium-rf-header button')];
    return btns.map(btn => {
      const cs = getComputedStyle(btn);
      const r = btn.getBoundingClientRect();
      const rgb = c => c.match(/\d+/g)?.slice(0, 3).map(Number) || [0, 0, 0];
      const lum = ([R, G, Bc]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(R) + 0.7152 * f(G) + 0.0722 * f(Bc); };
      const ratio = (a, b2) => { const [l1, l2] = [lum(a), lum(b2)].sort((x, y) => y - x); return ((l1 + 0.05) / (l2 + 0.05)).toFixed(2); };
      btn.focus();
      const focused = document.activeElement === btn;
      const focusOutline = cs.outlineStyle !== 'none' || cs.boxShadow !== 'none' || cs.borderColor !== '';
      return {
        text: btn.textContent.trim().slice(0, 22),
        disabled: btn.disabled,
        h: Math.round(r.height),
        w: Math.round(r.width),
        font: cs.fontSize,
        color: cs.color, background: cs.backgroundColor,
        contrast: ratio(rgb(cs.color), rgb(cs.backgroundColor)),
        focusable: focused,
        cursor: cs.cursor,
      };
    });
  });
  console.log('RF_BUTTONS', JSON.stringify(rf, null, 1));

  const filter = await p.evaluate(() => {
    applyTheme('dark');
    go('relatorios');
    const f = document.querySelector('.reports-filter');
    const r = f.getBoundingClientRect();
    const chips = [...f.querySelectorAll('button')].map(c2 => {
      const cr = c2.getBoundingClientRect();
      const visiblePart = Math.max(0, Math.min(cr.right, r.right) - Math.max(cr.left, r.left));
      return { text: c2.textContent.trim(), w: Math.round(cr.width), visiblePx: Math.round(visiblePart), cutOff: visiblePart < cr.width };
    });
    return { filterW: Math.round(r.width), scrollRange: f.scrollWidth - f.clientWidth, chips };
  });
  console.log('REPORTS_FILTER', JSON.stringify(filter, null, 1));
  await b.close(); await new Promise(res => h.server.close(res));
})().catch(e => { console.error('PROBE_FAIL', e); process.exit(1); });
