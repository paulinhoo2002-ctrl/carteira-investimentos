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
        return k && k.textContent.includes('Recebido') && k.textContent.includes('Média mensal');
      });
      assert.equal(kpisOk, true, `KPIs ausentes em ${vp.label}`);

      const overviewContract = await page.evaluate(() => ({
        distributionAbsent: !document.querySelector('.div-dist-panel'),
        reviewAbsent: !document.querySelector('.div-review-queue'),
        filtersAbsent: !document.querySelector('.div-overview-filters'),
      }));
      assert.deepEqual(overviewContract, {
        distributionAbsent: true,
        reviewAbsent: true,
        filtersAbsent: true,
      }, `A Visão geral deve conter apenas a leitura financeira principal em ${vp.label}`);

      const gridOk = await page.evaluate(() => !!document.querySelector('.div-exec-overview'));
      assert.equal(gridOk, true, `Grid exec-overview ausente em ${vp.label}`);

      await ctx.close();
    } finally {
      await browser.close();
      h.server.close();
    }
  });
});

for (const vp of [{ w: 390, h: 844 }, { w: 430, h: 932 }]) {
  test(`dividends mobile chart fits all official months - ${vp.w}px`, async () => {
    const exe = resolveBrowser();
    if (!exe) return;
    const h = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath: exe, headless: true });
    try {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
      page.on('pageerror', err => errors.push(err.message));
      await page.goto(h.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => go('dividendos'));
      await page.waitForFunction(() => document.querySelector('.dividend-evolution-chart') !== null, { timeout: 5000 });
      const proof = await page.evaluate(() => {
        const svg = document.querySelector('.dividend-evolution-chart');
        const rect = svg.getBoundingClientRect();
        const points = [...svg.querySelectorAll('.chart-data-point')].map(point => point.getBoundingClientRect());
        const labels = [...svg.querySelectorAll('text')].filter(text => !text.textContent.includes('R$'));
        return {
          points: points.length,
          labels: labels.length,
          firstVisible: points[0].left >= rect.left && points[0].right <= rect.right,
          lastVisible: points.at(-1).left >= rect.left && points.at(-1).right <= rect.right,
          withinViewport: rect.left >= 0 && rect.right <= window.innerWidth,
        };
      });
      assert.equal(proof.points >= 12, true);
      assert.equal(proof.labels, 12);
      assert.equal(proof.firstVisible, true);
      assert.equal(proof.lastVisible, true);
      assert.equal(proof.withinViewport, true);
      assert.equal(errors.length, 0, `Erros no console em ${vp.w}px: ${errors.join(' | ')}`);
      await ctx.close();
    } finally {
      await browser.close();
      h.server.close();
    }
  });
}

viewports.forEach(vp => {
test(`dividends overview monthly progressive disclosure - ${vp.label}`, async () => {
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

      // O overview canônico mantém o histórico principal visível; no mobile,
      // somente a tabela pode rolar internamente quando necessário.
      const historyVisible = await page.evaluate(() => {
        const history = document.querySelector('.div-premium .canon-div-history');
        return Boolean(history && history.getBoundingClientRect().height > 0);
      });
      assert.equal(historyVisible, true, `Historico mensal ausente em ${vp.label}`);

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
