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
  test(`dividends matrix toggle render - ${vp.label}`, async () => {
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

      // O Overview canônico não exibe tabs; a rota interna continua testável.
      await page.evaluate(() => setDividendViewMode('monthly'));
      await page.waitForTimeout(300);

      // Toggle de visualizacao deve existir na aba dedicada
      const toggleExists = await page.evaluate(() => {
        const group = document.querySelector('.div-monthly-toggle-group');
        return group && group.querySelectorAll('button').length === 2;
      });
      assert.equal(toggleExists, true, `Toggle de visualizacao ausente em ${vp.label}`);

      // Estado 'auto': Lista ativa por padrao no compacto; Matriz no desktop
      const defaultButton = vp.w <= 820 ? 'Lista' : 'Matriz';
      const defaultActive = await page.evaluate((label) => {
        const btn = [...document.querySelectorAll('.div-monthly-toggle-btn')].find(b => b.textContent.trim() === label);
        return btn && btn.getAttribute('aria-pressed') === 'true';
      }, defaultButton);
      assert.equal(defaultActive, true, `Toggle "${defaultButton}" nao ativo por padrao em ${vp.label}`);

      // Clicar em Matriz
      await page.evaluate(() => {
        const btns = document.querySelectorAll('.div-monthly-toggle-btn');
        const matrixBtn = Array.from(btns).find(b => b.textContent.includes('Matriz'));
        if (matrixBtn) matrixBtn.click();
      });
      await page.waitForTimeout(300);

      // Matrix deve renderizar tabela
      const matrixRendered = await page.evaluate(() => {
        const table = document.querySelector('.div-mat-table');
        return table && table.querySelectorAll('th').length >= 14;
      });
      assert.equal(matrixRendered, true, `Matrix nao renderizou em ${vp.label}`);

      // Colunas Jan-Dez
      const columnsOk = await page.evaluate(() => {
        const ths = document.querySelectorAll('.div-mat-table th');
        const text = Array.from(ths).map(t => t.textContent).join(' ');
        return text.includes('Jan') && text.includes('Dez') && text.includes('Média') && text.includes('Total');
      });
      assert.equal(columnsOk, true, `Colunas da matriz incorretas em ${vp.label}`);

      // Valores monetarios presentes na matriz
      const valuesOk = await page.evaluate(() => {
        const table = document.querySelector('.div-mat-table');
        if (!table) return false;
        const cells = [...table.querySelectorAll('.mat-val, .mat-total')];
        return cells.some(c => /R\$/.test(c.textContent));
      });
      assert.equal(valuesOk, true, `Valores monetarios ausentes na matriz em ${vp.label}`);

      // Alternar de volta para Lista
      await page.evaluate(() => {
        const btns = document.querySelectorAll('.div-monthly-toggle-btn');
        const listBtn = Array.from(btns).find(b => b.textContent.trim() === 'Lista');
        if (listBtn) listBtn.click();
      });
      await page.waitForTimeout(300);

      const listRendered = await page.evaluate(() => {
        return document.querySelector('.div-year-list') !== null;
      });
      assert.equal(listRendered, true, `Lista nao renderizou apos toggle em ${vp.label}`);

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

viewports.forEach(vp => {
  test(`dividends matrix filters interaction - ${vp.label}`, async () => {
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

      // O Overview canônico não exibe tabs; a rota interna continua testável.
      await page.evaluate(() => setDividendViewMode('monthly'));
      await page.waitForTimeout(300);

      // Mudar filtro periodo (12m)
      await page.evaluate(() => {
        const selects = document.querySelectorAll('.div-monthly-toolbar select');
        if (selects.length > 0) {
          selects[0].value = '12m';
          selects[0].dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await page.waitForTimeout(200);

      // Ativar matrix apos filtro
      await page.evaluate(() => {
        const btns = document.querySelectorAll('.div-monthly-toggle-btn');
        const matrixBtn = Array.from(btns).find(b => b.textContent.includes('Matriz'));
        if (matrixBtn) matrixBtn.click();
      });
      await page.waitForTimeout(300);

      // Matrix ainda deve renderizar
      const matrixStillOk = await page.evaluate(() => {
        const table = document.querySelector('.div-mat-table');
        if (!table) return false;
        const rows = table.querySelectorAll('tbody tr');
        return rows.length > 0;
      });
      if (!matrixStillOk) {
        const emptyState = await page.evaluate(() => {
          return document.querySelector('.div-premium-empty') !== null;
        });
        assert.equal(emptyState, true, `Matrix vazia sem empty state em ${vp.label}`);
      }

      // Limpar filtros do historico mensal
      await page.evaluate(() => {
        const clearBtn = document.querySelector('.div-monthly-toolbar .div-month-filter-actions .btn.bgh');
        if (clearBtn) clearBtn.click();
      });
      await page.waitForTimeout(200);

      // Matrix ainda funcional apos limpar filtros
      const matrixAfterClear = await page.evaluate(() => {
        const table = document.querySelector('.div-mat-table');
        return table !== null;
      });
      assert.equal(matrixAfterClear, true, `Matrix ausente apos limpar filtros em ${vp.label}`);

      // Filtros ainda presentes
      const filtersPresent = await page.evaluate(() => {
        return document.querySelectorAll('.div-monthly-toolbar select').length >= 3;
      });
      assert.equal(filtersPresent, true, `Filtros ausentes em ${vp.label}`);

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
