const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

function resolveBrowser() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(c => { try { fs.accessSync(c); return true; } catch { return false; } });
}

async function startServer(rootDir) {
  const server = http.createServer(async (req, res) => {
    try {
      const p = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      let f = p === '/' ? '/index.html' : p;
      const fp = path.normalize(path.join(rootDir, f));
      if (!fp.startsWith(rootDir)) { res.writeHead(403); res.end(''); return; }
      const c = await fsp.readFile(fp);
      const m = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
      res.writeHead(200, { 'Content-Type': m[path.extname(fp).toLowerCase()] || 'text/plain' });
      res.end(c);
    } catch (e) {
      res.writeHead(e.code === 'ENOENT' ? 404 : 500);
      res.end('');
    }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
}

const viewports = [
  { w: 390, h: 844, label: '390x844' },
  { w: 768, h: 1024, label: '768x1024' },
  { w: 1366, h: 768, label: '1366x768' },
  { w: 1920, h: 1080, label: '1920x1080' },
];

viewports.forEach(vp => {
  test(`dividends summary clarity - ${vp.label}`, async () => {
    const exe = resolveBrowser();
    if (!exe) return;

    const h = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath: exe, headless: true });
    try {
      const ctx = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        hasTouch: vp.w <= 430,
        isMobile: vp.w <= 430,
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
      page.on('pageerror', err => errors.push(err.message));

      await page.goto(h.url, { waitUntil: 'networkidle' });

      await page.evaluate(() => go('dividendos'));
      await page.waitForFunction(() => document.querySelector('.div-premium') !== null, { timeout: 5000 });

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, `Overflow horizontal em ${vp.label}`);
      assert.equal(errors.length, 0, `Erros no console em ${vp.label}: ${errors.join(' | ')}`);

      const kpisOk = await page.evaluate(() => {
        const k = document.querySelector('.div-exec-kpis');
        return k && k.textContent.includes('Recebido no mês') && k.textContent.includes('Total últimos 12 meses');
      });
      assert.equal(kpisOk, true, `KPIs ausentes em ${vp.label}`);

      const panelOk = await page.evaluate(() => {
        const p = document.querySelector('.div-dist-panel');
        return p && p.textContent.includes('Distribuição mensal');
      });
      assert.equal(panelOk, true, `Painel distribuicao ausente em ${vp.label}`);

      const gridOk = await page.evaluate(() => !!document.querySelector('.div-exec-overview'));
      assert.equal(gridOk, true, `Grid exec-overview ausente em ${vp.label}`);

      await ctx.close();
    } finally {
      await browser.close();
      h.server.close();
    }
  });
});

viewports.forEach(vp => {
  test(`dividends overview monthly collapsed + distribution period - ${vp.label}`, async () => {
    const exe = resolveBrowser();
    if (!exe) return;

    const h = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath: exe, headless: true });
    try {
      const ctx = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        hasTouch: vp.w <= 430,
        isMobile: vp.w <= 430,
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
      page.on('pageerror', err => errors.push(err.message));

      await page.goto(h.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => go('dividendos'));
      await page.waitForFunction(() => document.querySelector('.div-premium') !== null, { timeout: 5000 });

      // Historico mensal comeca oculto na visao geral
      const startCollapsed = await page.evaluate(() => {
        const details = document.querySelector('.div-exec-overview .div-monthly-table-block');
        return details && !details.hasAttribute('open');
      });
      assert.equal(startCollapsed, true, `Historico mensal overview nao comeca oculto em ${vp.label}`);

      // Mostrar expande
      await page.evaluate(() => {
        const details = document.querySelector('.div-exec-overview .div-monthly-table-block');
        if (details) details.querySelector('summary').click();
      });
      await page.waitForTimeout(200);
      const afterClick = await page.evaluate(() => {
        const details = document.querySelector('.div-exec-overview .div-monthly-table-block');
        return details && details.hasAttribute('open');
      });
      assert.equal(afterClick, true, `Historico mensal nao expandiu ao clicar em ${vp.label}`);

      // Seletor de periodo na distribuicao
      const selectorExists = await page.evaluate(() => {
        const p = document.querySelector('.div-dist-periods');
        return p && p.textContent.includes('12 meses') && p.textContent.includes('24 meses')
          && p.textContent.includes('36 meses') && p.textContent.includes('Todos');
      });
      assert.equal(selectorExists, true, `Seletor periodo ausente em ${vp.label}`);

      // Trocar para 24 meses
      await page.evaluate(() => setDividendDistributionPeriod('24m'));
      await page.waitForTimeout(200);
      const period24 = await page.evaluate(() => {
        const chips = document.querySelectorAll('.div-dist-periods .div-premium-chip');
        return Array.from(chips).find(c => c.classList.contains('on') && c.textContent.includes('24'));
      });
      assert.notEqual(period24, null, `Periodo 24m nao ativo em ${vp.label}`);

      // Trocar para Todos
      await page.evaluate(() => setDividendDistributionPeriod('all'));
      await page.waitForTimeout(200);
      const periodAll = await page.evaluate(() => {
        const chips = document.querySelectorAll('.div-dist-periods .div-premium-chip');
        return Array.from(chips).find(c => c.classList.contains('on') && c.textContent.includes('Todos'));
      });
      assert.notEqual(periodAll, null, `Periodo all nao ativo em ${vp.label}`);

      // Scroll container presente se >12 meses
      const scrollLogic = await page.evaluate(() => {
        const period = String(S.dividendDistributionPeriod || '12m');
        const months = document.querySelectorAll('.div-dist-rows .div-dist-row');
        return period !== '12m' && months.length > 12;
      });
      if (scrollLogic) {
        const hasScroll = await page.evaluate(() => document.querySelectorAll('.div-dist-scroll').length > 0);
        assert.equal(hasScroll, true, `Scroll container ausente com Todos em ${vp.label}`);
      }

      // Sem overflow horizontal
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, `Overflow horizontal em ${vp.label}`);
      assert.equal(errors.length, 0, `Erros no console em ${vp.label}: ${errors.join(' | ')}`);

      await ctx.close();
    } finally {
      await browser.close();
      h.server.close();
    }
  });
});
