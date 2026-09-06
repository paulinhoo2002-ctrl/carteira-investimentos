const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

function browserPath() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(file => { try { fs.accessSync(file); return true; } catch { return false; } });
}

async function startServer(root) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      const file = path.normalize(path.join(root, pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(root)) { res.writeHead(403); return res.end(''); }
      res.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain' });
      res.end(await fsp.readFile(file));
    } catch (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500);
      res.end('');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
}

const viewports = [
  { width: 390, height: 844, label: '390x844' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1920, height: 1080, label: '1920x1080' },
];

for (const viewport of viewports) {
  test(`Descoberta da matriz de Dividendos - ${viewport.label}`, async () => {
    const executablePath = browserPath();
    assert.ok(executablePath, 'Chrome/Edge nao encontrado');
    const harness = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.width <= 430,
      hasTouch: viewport.width <= 430,
    });
    const page = await context.newPage();
    const errors = [];
    const failures = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('requestfailed', request => failures.push(request.url()));
    try {
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => go('dividendos'));
      await page.waitForSelector('.canon-div-history .div-mat-table', { state: 'attached' });
      const before = await page.evaluate(() => ({
        total: S.proventos.reduce((sum, item) => sum + Number(item.valor || 0), 0),
        records: S.proventos.length,
        headers: [...document.querySelectorAll('.canon-div-history .div-mat-table thead th')].map(cell => cell.textContent.trim()),
        rows: document.querySelectorAll('.canon-div-history .div-mat-table tbody tr').length,
        futureCells: document.querySelectorAll('.canon-div-history .div-mat-table .mat-future').length,
        absentCells: document.querySelectorAll('.canon-div-history .div-mat-table .mat-absent').length,
      }));
      assert.deepEqual(before.headers, ['Ano', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'Média', 'Total']);
      assert.ok(before.rows > 0, 'A matriz deve exibir ao menos um ano');
      assert.ok(before.futureCells + before.absentCells > 0, 'Ausência/futuro deve permanecer explícita');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'overflow horizontal');
      const yearButtons = page.locator('.canon-div-history .canon-year-chip');
      assert.ok(await yearButtons.count() >= 2, 'Filtro anual precisa existir');
      await yearButtons.filter({ hasText: '2026' }).click();
      await page.waitForTimeout(50);
      assert.equal(await page.locator('.canon-div-history .canon-year-chip.on').innerText(), '2026');
      assert.ok(await page.locator('.canon-div-history .div-mat-table tbody tr').count() >= 1);
      const after = await page.evaluate(() => ({
        total: S.proventos.reduce((sum, item) => sum + Number(item.valor || 0), 0),
        records: S.proventos.length,
      }));
      assert.deepEqual(after, { total: before.total, records: before.records });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
      assert.equal(errors.length, 0, errors.join(' | '));
      assert.equal(failures.length, 0, failures.join(' | '));
    } finally {
      await context.close();
      await browser.close();
      harness.server.close();
    }
  });
}
