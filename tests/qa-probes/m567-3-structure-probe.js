// M567.3 — medição estrutural das 4 telas-alvo (mobile 390 dark; analise também em 1366 light).
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
  await page.waitForFunction(() => typeof S !== 'undefined' && Array.isArray(S.aportes) && typeof go === 'function');
  await page.evaluate(() => { restoreLocalTestData(); fetchQuotes = async () => {}; scheduleAutoProventosGratis = () => {}; });

  const dump = (route, theme, w, extraEval) => {
    return page.evaluate(async ({ route, theme, extraEval }) => {
      applyTheme(theme);
      go(route);
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 150)));
      if (extraEval) eval(extraEval);
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 150)));
      const root = document.getElementById('root');
      const out = { route, theme, w: innerWidth, blocks: [] };
      const main = document.querySelector('main.shell-main, .shell-main') || document.getElementById('root');
      out.mainCls = (main.className || '').toString().slice(0, 40);
      const wrapEl = main.querySelector(':scope > .wrap');
      const target = wrapEl ? wrapEl.querySelectorAll(':scope > *') : main.querySelectorAll(':scope > *');
      [...(target.length ? target : [main])].forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.height < 8) return;
        out.blocks.push({
          cls: (el.className || '').toString().slice(0, 55),
          tag: el.tagName,
          h: Math.round(r.height),
          kids: el.children.length,
          head: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 70),
        });
      });
      out.docH = Math.round(document.documentElement.scrollHeight);
      out.viewportH = innerHeight;
      return out;
    }, { route, theme, extraEval });
  };

  console.log('=== METAS 390 dark (default) ===');
  console.log(JSON.stringify(await dump('metas', 'dark', 390), null, 1));
  console.log('=== METAS 390 dark (patrimony section open) ===');
  console.log(JSON.stringify(await dump('metas', 'dark', 390, `document.querySelector('.metas-patrimony-section')?.setAttribute('open','')`), null, 1));
  console.log('=== RELATORIOS 390 dark (default) ===');
  console.log(JSON.stringify(await dump('relatorios', 'dark', 390), null, 1));
  console.log('=== RENDA-FIXA 390 dark (default) ===');
  console.log(JSON.stringify(await dump('renda-fixa', 'dark', 390), null, 1));
  await page.setViewportSize({ width: 1366, height: 768 });
  console.log('=== ANALISE 1366 light (default) ===');
  console.log(JSON.stringify(await dump('analise', 'light', 1366), null, 1));
  await browser.close();
  await new Promise(res => harness.server.close(res));
})().catch(e => { console.error('PROBE_FAIL', e); process.exit(1); });
