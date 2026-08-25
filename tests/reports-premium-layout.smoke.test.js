const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const fsp = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

function browserPath() {
  return [process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe']
    .filter(Boolean).find(candidate => { try { fs.accessSync(candidate); return true; } catch { return false; } });
}

async function startServer(root) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      const filePath = path.normalize(path.join(root, pathname === '/' ? '/index.html' : pathname));
      if (!filePath.startsWith(root)) { res.writeHead(403); return res.end(); }
      res.writeHead(200, { 'Content-Type': path.extname(filePath) === '.html' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8' });
      res.end(await fsp.readFile(filePath));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
}

for (const [width, height] of [[390, 844], [430, 932], [768, 1024], [1366, 768], [1920, 1080]]) {
  test(`reports premium layout ${width}x${height}`, async () => {
    const executablePath = browserPath();
    assert.ok(executablePath, 'Chrome não encontrado');
    const harness = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath, headless: true });
    const errors = [];
    try {
      const page = await browser.newPage({ viewport: { width, height } });
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => go('relatorios'));
      await page.waitForSelector('.reports-premium-shell');
      const result = await page.evaluate(() => {
        const last = [...document.querySelectorAll('.reports-premium-shell > *')].filter(node => node.getBoundingClientRect().height > 0).at(-1);
        const nav = document.querySelector('#investBottomNav');
        return {
          executiveKpis: document.querySelectorAll('.reports-premium-kpis .reports-kpi').length,
          evolution: Boolean(document.querySelector('.reports-evolution-chart')),
          allocation: Boolean(document.querySelector('.reports-data-list')),
          income: document.body.textContent.includes('Renda e proventos'),
          fixedIncome: document.body.textContent.includes('Renda Fixa'),
          exportsClosed: document.querySelector('#reports-export-details')?.open === false,
          overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth,
          financialPlaceholders: /NaN|Infinity|undefined|null/.test(document.querySelector('.reports-premium-shell')?.textContent || ''),
          lastBottom: last?.getBoundingClientRect().bottom || 0,
          navTop: nav?.getBoundingClientRect().top || innerHeight,
        };
      });
      assert.equal(result.executiveKpis, 5);
      assert.equal(result.evolution, true);
      assert.equal(result.allocation, true);
      assert.equal(result.income, true);
      assert.equal(result.fixedIncome, true);
      assert.equal(result.exportsClosed, true);
      assert.equal(result.overflow, false);
      assert.equal(result.financialPlaceholders, false);
      assert.ok(result.lastBottom >= result.navTop, 'conteúdo final não alcançável antes da navegação');
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      harness.server.close();
    }
  });
}
