// M567.5 — blast radius: contraste de TODOS os .btn.bp em light theme, todas as rotas.
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROUTES = ['dashboard', 'patrimonio', 'ativos', 'aportes', 'metas', 'dividendos', 'renda-fixa', 'irpf', 'rentabilidade', 'ajudar', 'auditoria', 'confiabilidade', 'relatorios', 'importacao', 'ia', 'analise', 'settings', 'corporate-eventos'];

function parseRGB(s) { return (s.match(/\d+(\.\d+)?/g) || [0, 0, 0]).slice(0, 3).map(Number); }
function lum([R, G, B]) { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(R) + 0.7152 * f(G) + 0.0722 * f(B); }
function ratio(a, b) { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); }
function gradStops(bgImage) { return [...bgImage.matchAll(/rgba?\([^)]+\)/g)].map(m => parseRGB(m[0])); }

(async () => {
  const h = await startLocalHttpServer(ROOT);
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const localOrigin = new URL(h.url).origin;
  await p.route('**/*', r => (new URL(r.request().url()).origin === localOrigin ? r.continue() : r.abort()));
  await p.goto(h.url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof go === 'function');
  await p.evaluate(() => { restoreLocalTestData(); fetchQuotes = async () => {}; scheduleAutoProventosGratis = () => {}; });
  const failures = [];
  const all = [];
  for (const route of ROUTES) {
    const found = await p.evaluate(routeName => {
      applyTheme('light');
      go(routeName);
      return [...document.querySelectorAll('.btn.bp')].map(btn => {
        if (!btn.offsetParent) return null;
        const parseRGB = s => (s.match(/\d+(\.\d+)?/g) || [0, 0, 0]).slice(0, 3).map(Number);
        const lum = ([R, G, B]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(R) + 0.7152 * f(G) + 0.0722 * f(B); };
        const ratio = (a, b2) => { const [l1, l2] = [lum(a), lum(b2)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };
        const gradStops = img => [...img.matchAll(/rgba?\([^)]+\)/g)].map(m => parseRGB(m[0]));
        const cs = getComputedStyle(btn);
        const fg = parseRGB(cs.color);
        let worst = 99;
        const stops = gradStops(cs.backgroundImage);
        if (stops.length >= 2) {
          for (const s of stops) worst = Math.min(worst, ratio(fg, s));
        } else {
          let bg = parseRGB(cs.backgroundColor);
          if (cs.backgroundColor === 'rgba(0, 0, 0, 0)') {
            let el = btn.parentElement;
            while (el) { const bgs = getComputedStyle(el); if (bgs.backgroundColor !== 'rgba(0, 0, 0, 0)') { bg = parseRGB(bgs.backgroundColor); break; } const st = gradStops(bgs.backgroundImage); if (st.length) { bg = st[0]; break; } el = el.parentElement; }
          }
          worst = ratio(fg, bg);
        }
        return { route: routeName, text: btn.textContent.trim().slice(0, 25), cls: btn.className.replace('btn bp', '').trim().slice(0, 30), contrast: Number(worst.toFixed(2)) };
      }).filter(Boolean);
    }, route);
    all.push(...found);
    found.filter(x => x.contrast < 4.5).forEach(x => failures.push(x));
  }
  console.log('TOTAL .btn.bp visíveis (light):', all.length);
  console.log('FALHAS <4.5:1:', failures.length);
  const byKey = {};
  failures.forEach(f => { byKey[f.text + '|' + f.cls] = byKey[f.text + '|' + f.cls] || { ...f, routes: [] }; byKey[f.text + '|' + f.cls].routes.push(f.route); });
  Object.values(byKey).forEach(f => console.log(`  ${f.contrast}:1  "${f.text}" [${f.cls}] rotas: ${[...new Set(f.routes)].join(',')}`));
  await b.close(); await new Promise(res => h.server.close(res));
})().catch(e => { console.error('PROBE_FAIL', e); process.exit(1); });
