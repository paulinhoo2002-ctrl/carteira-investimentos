// M862-M879 — verificação em browser: CTA vazio, ESC limpo/sujo, title por rota (sintético, local).
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const harness = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 100)));
  const localOrigin = new URL(harness.url).origin;
  await page.route('**/*', r => new URL(r.request().url()).origin === localOrigin ? r.continue() : r.abort());
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof go === 'function');
  await page.evaluate(() => { restoreLocalTestData(); fetchQuotes = async () => {}; scheduleAutoProventosGratis = () => {}; });

  const out = {};

  // 1) M879: title muda por rota
  await page.evaluate(() => go('dividendos'));
  await page.waitForTimeout(500);
  out.titleDividendos = await page.evaluate(() => document.title);
  await page.evaluate(() => go('renda-fixa'));
  await page.waitForTimeout(500);
  out.titleRF = await page.evaluate(() => document.title);
  await page.evaluate(() => go('dashboard'));
  await page.waitForTimeout(500);
  out.titleDashboard = await page.evaluate(() => document.title);

  // 2) M877: CTA na carteira vazia
  await page.evaluate(() => {
    const w = activeWallet();
    const empty = { ...w, assets: [], aportes: [], proventos: [], rfEvents: [], goals: {} };
    const idx = S.wallets.findIndex(x => x.id === w.id);
    S.wallets = idx >= 0 ? S.wallets.map((x, i) => i === idx ? empty : x) : [empty];
    S.assets = []; S.aportes = []; S.proventos = []; S.rfEvents = []; S.goals = {};
    go('dashboard');
  });
  await page.waitForTimeout(900);
  out.emptyCTA = await page.evaluate(() => {
    const cta = document.querySelector('.dashboard-empty-cta');
    return {
      rendered: !!cta,
      ctaText: cta ? cta.innerText.replace(/\s+/g, ' ').slice(0, 80) : null,
      buttons: cta ? Array.from(cta.querySelectorAll('button')).map(b => b.textContent.trim()) : [],
    };
  });
  // clicar o CTA navega para ativos
  if (out.emptyCTA.rendered) {
    await page.evaluate(() => document.querySelector('.dashboard-empty-cta button').click());
    await page.waitForTimeout(700);
    out.ctaNavigates = await page.evaluate(() => S.tab);
  }

  // 3) M878: ESC no modal de movimentação (limpo fecha; sujo protege)
  await page.evaluate(() => { restoreLocalTestData(); go('ativos'); });
  await page.waitForTimeout(900);
  await page.evaluate(() => { document.querySelector('[onclick*="toggleAssetActionMenu"]')?.click(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const item = Array.from(document.querySelectorAll('[onclick*="openAssetQuickMovement"], [onclick*="quick"]')).find(i => /comprar/i.test((i.textContent || '') + (i.getAttribute('onclick') || '')));
    if (item) item.click();
  });
  await page.waitForTimeout(1000);
  const modalOpen = await page.evaluate(() => { const o = document.querySelector('.note-overlay'); return !!(o && o.offsetParent); });
  // ESC com formulário limpo (só prefills) → fecha
  let escClean = null;
  if (modalOpen) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    escClean = !(await page.evaluate(() => { const o = document.querySelector('.note-overlay'); return !!(o && o.offsetParent); }));
  }
  // reabrir, digitar valor (sujo) → ESC NÃO fecha
  let escDirty = null;
  if (escClean !== null) {
    await page.evaluate(() => { document.querySelector('[onclick*="toggleAssetActionMenu"]')?.click(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const item = Array.from(document.querySelectorAll('[onclick*="openAssetQuickMovement"], [onclick*="quick"]')).find(i => /comprar/i.test((i.textContent || '') + (i.getAttribute('onclick') || '')));
      if (item) item.click();
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => { const inp = document.querySelector('.note-overlay input:not([type=date]):not([type=checkbox])'); if (inp) { inp.value = '100'; inp.dispatchEvent(new Event('input', { bubbles: true })); } });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    escDirty = await page.evaluate(() => { const o = document.querySelector('.note-overlay'); return !!(o && o.offsetParent); });
  }
  out.modal = { opened: modalOpen, escCleanCloses: escClean, escDirtyStaysOpen: escDirty };
  out.pageErrors = errors.slice(0, 4);
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
  await new Promise(r => harness.server.close(r));
})().catch(e => { console.error('FAIL', String(e).slice(0, 300)); process.exit(1); });
