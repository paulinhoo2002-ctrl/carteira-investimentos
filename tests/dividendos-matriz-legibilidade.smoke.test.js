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
  test(`dividendos matriz legibilidade - ${vp.label}`, async () => {
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

      // Navegar para aba Historico mensal
      const tabExists = await page.evaluate(() => {
        const tabs = document.querySelectorAll('.div-premium-tab');
        return Array.from(tabs).some(t => t.textContent.includes('Histórico'));
      });
      assert.equal(tabExists, true, `Aba Historico mensal ausente em ${vp.label}`);

      await page.evaluate(() => {
        const tabs = document.querySelectorAll('.div-premium-tab');
        const tab = Array.from(tabs).find(t => t.textContent.includes('Histórico'));
        if (tab) tab.click();
      });
      await page.waitForTimeout(300);

      // Toggle vivo Lista/Matriz
      const toggleExists = await page.evaluate(() => {
        const group = document.querySelector('.div-monthly-toggle-group');
        return group && group.querySelectorAll('.div-monthly-toggle-btn').length === 2;
      });
      assert.equal(toggleExists, true, `Toggle Lista/Matriz ausente em ${vp.label}`);

      // Ativar matriz
      await page.evaluate(() => {
        const btns = document.querySelectorAll('.div-monthly-toggle-btn');
        const matrixBtn = Array.from(btns).find(b => b.textContent.includes('Matriz'));
        if (matrixBtn) matrixBtn.click();
      });
      await page.waitForTimeout(300);

      // 1. Matriz renderiza com cabecalhos Ano + Jan..Dez + Media + Total
      const matrixRendered = await page.evaluate(() => {
        const table = document.querySelector('.div-mat-table');
        return table && table.querySelectorAll('th').length >= 14;
      });
      assert.equal(matrixRendered, true, `Matriz nao renderizou em ${vp.label}`);

      // 2. Colunas e linhas esperadas
      const columnsOk = await page.evaluate(() => {
        const ths = document.querySelectorAll('.div-mat-table th');
        const text = Array.from(ths).map(t => t.textContent).join(' ');
        const years = Array.from(document.querySelectorAll('.div-mat-table .mat-year')).map(t => t.textContent);
        return text.includes('Jan') && text.includes('Dez') && text.includes('Média') && text.includes('Total') && years.includes('2026') && years.includes('2025');
      });
      assert.equal(columnsOk, true, `Colunas/anos da matriz incorretos em ${vp.label}`);

      // 3. Valores financeiros preservados (totais e medias anuais)
      const financials = await page.evaluate(() => {
        const totals = Array.from(document.querySelectorAll('.div-mat-table .mat-total')).map(t => t.textContent);
        const means = Array.from(document.querySelectorAll('.div-mat-table .mat-mean')).map(t => t.textContent);
        return { totals, means };
      });
      assert.deepEqual(financials.totals, ['R$\u00a01.841,74', 'R$\u00a0210,60'], `Totais alterados em ${vp.label}: ${financials.totals.join(' | ')}`);
      assert.deepEqual(financials.means, ['R$\u00a0230,22', 'R$\u00a0105,30'], `Medias alteradas em ${vp.label}: ${financials.means.join(' | ')}`);

      // 4. Cabecalho 12px semibold
      const th = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('.div-mat-table th'));
        return { fs: s.fontSize, fw: s.fontWeight };
      });
      assert.equal(th.fs, '12px', `Header font-size errado em ${vp.label}: ${th.fs}`);
      assert.equal(th.fw, '700', `Header font-weight errado em ${vp.label}: ${th.fw}`);

      // 5. Valores 11px
      const td = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('.div-mat-table .mat-val'));
        return { fs: s.fontSize, fw: s.fontWeight };
      });
      assert.equal(td.fs, '11px', `Valor font-size errado em ${vp.label}: ${td.fs}`);
      assert.equal(td.fw, '850', `Valor font-weight errado em ${vp.label}: ${td.fw}`);

      // 6. Ano 12px semibold
      const year = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('.div-mat-table .mat-year'));
        return { fs: s.fontSize, fw: s.fontWeight };
      });
      assert.equal(year.fs, '12px', `Ano font-size errado em ${vp.label}: ${year.fs}`);
      assert.equal(year.fw, '700', `Ano font-weight errado em ${vp.label}: ${year.fw}`);

      // 7. Media 12px semibold
      const mean = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('.div-mat-table .mat-mean'));
        return { fs: s.fontSize, fw: s.fontWeight };
      });
      assert.equal(mean.fs, '12px', `Media font-size errado em ${vp.label}: ${mean.fs}`);
      assert.equal(mean.fw, '700', `Media font-weight errado em ${vp.label}: ${mean.fw}`);

      // 8. Total 12px bold
      const total = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('.div-mat-table .mat-total'));
        return { fs: s.fontSize, fw: s.fontWeight };
      });
      assert.equal(total.fs, '12px', `Total font-size errado em ${vp.label}: ${total.fs}`);
      assert.equal(total.fw, '900', `Total font-weight errado em ${vp.label}: ${total.fw}`);

      // 9. Padding 8px
      const pad = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('.div-mat-table th'));
        return s.padding;
      });
      assert.equal(pad, '8px', `Padding errado em ${vp.label}: ${pad}`);

      // 10. tabular-nums
      const fnv = await page.evaluate(() => {
        return getComputedStyle(document.querySelector('.div-mat-table')).fontVariantNumeric;
      });
      assert.equal(fnv, 'tabular-nums', `tabular-nums ausente em ${vp.label}: ${fnv}`);

      // 11. Line-height maior que baseline (legibilidade)
      const lh = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('.div-mat-table td'));
        return parseFloat(s.lineHeight);
      });
      assert.ok(lh >= 15, `Line-height muito baixo em ${vp.label}: ${lh}px`);

      // 12. Sem overflow horizontal da pagina
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, `Overflow horizontal em ${vp.label}`);

      // 13. Scroll interno preservado
      const scrollable = await page.evaluate(() => {
        const sc = document.querySelector('.div-mat-scroll');
        return sc && sc.scrollWidth >= sc.clientWidth;
      });
      assert.equal(scrollable, true, `Scroll interno da matriz ausente em ${vp.label}`);

      // 14. Sem erros no console
      assert.equal(errors.length, 0, `Erros no console em ${vp.label}: ${errors.join(' | ')}`);

      // 15. Alternar de volta para Lista mantem o app funcional
      await page.evaluate(() => {
        const btns = document.querySelectorAll('.div-monthly-toggle-btn');
        const listBtn = Array.from(btns).find(b => b.textContent.includes('Lista'));
        if (listBtn) listBtn.click();
      });
      await page.waitForTimeout(300);
      const listRendered = await page.evaluate(() => {
        return document.querySelector('.div-year-list') !== null;
      });
      assert.equal(listRendered, true, `Lista nao renderizou apos toggle em ${vp.label}`);

      await ctx.close();
    } finally {
      await browser.close();
      h.server.close();
    }
  });
});
