// M567.2 — diagnostica o nó de texto sub-9px no gráfico de relatorios@390.
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
  for (const theme of ['dark', 'light']) {
    const info = await page.evaluate(themeName => {
      applyTheme(themeName);
      go('relatorios');
      const hits = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(node.textContent.trim())) continue;
        const el = node.parentElement;
        const cs = getComputedStyle(el);
        if (parseFloat(cs.fontSize) < 9) {
          const svg = el.closest('svg');
          hits.push({
            tag: el.tagName, fontSize: cs.fontSize,
            parentClass: el.parentElement?.className?.slice?.(0, 50) || '',
            svgViewBox: svg?.getAttribute('viewBox'),
            svgComputedWidth: svg ? getComputedStyle(svg).width : null,
            svgAttrWidth: svg?.getAttribute('width'),
            textClass: el.getAttribute('class'),
            ancestorFonts: (function chain(el2) {
              const out = []; let cur = el2;
              for (let i = 0; i < 6 && cur; i++) { out.push(`${cur.tagName||'?'}.${(cur.className&&cur.className.baseVal!==undefined?cur.className.baseVal:cur.className||'').toString().slice(0,30)}=${getComputedStyle(cur).fontSize}`); cur = cur.parentElement; }
              return out;
            })(el),
          });
        }
      }
      return hits.slice(0, 3);
    }, theme);
    console.log(theme, JSON.stringify(info, null, 1));
  }
  await browser.close();
  await new Promise(res => harness.server.close(res));
})().catch(e => { console.error('PROBE_FAIL', e); process.exit(1); });
