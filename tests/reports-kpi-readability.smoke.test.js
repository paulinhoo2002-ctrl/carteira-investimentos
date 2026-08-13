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
  ].filter(Boolean).find(candidate => {
    try { fs.accessSync(candidate); return true; } catch { return false; }
  });
}

async function startServer(rootDir) {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      const filePath = path.normalize(path.join(rootDir, pathname === '/' ? '/index.html' : pathname));
      if (!filePath.startsWith(rootDir)) { res.writeHead(403); return res.end(); }
      res.writeHead(200, { 'Content-Type': mime[path.extname(filePath).toLowerCase()] || 'text/plain' });
      res.end(await fsp.readFile(filePath));
    } catch (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500);
      res.end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
}

const viewports = [
  [390, 844],
  [768, 1024],
  [1366, 768],
  [1920, 1080],
];

for (const theme of ['dark', 'light']) {
  for (const [width, height] of viewports) {
    test(`reports KPI labels ${theme} ${width}x${height}`, async () => {
      const executablePath = resolveBrowser();
      assert.ok(executablePath, 'Chrome/Edge not found');
      const harness = await startServer(path.join(__dirname, '..'));
      const { chromium } = await import('playwright-core');
      const browser = await chromium.launch({ executablePath, headless: true });
      const errors = [];
      const requestFailures = [];
      try {
        const page = await browser.newPage({ viewport: { width, height } });
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        page.on('pageerror', error => errors.push(error.message));
        page.on('requestfailed', request => requestFailures.push(request.url()));
        await page.goto(harness.url, { waitUntil: 'networkidle' });
        await page.evaluate(({ theme }) => {
          document.documentElement.dataset.theme = theme;
          document.documentElement.style.colorScheme = theme;
          go('relatorios');
        }, { theme });
        await page.waitForSelector('.reports-kpis');

        const snapshot = await page.evaluate(() => ({
          labels: [...document.querySelectorAll('.reports-kpi .label')].map(node => ({
            text: node.textContent.trim(),
            fontSize: getComputedStyle(node).fontSize,
            lineHeight: getComputedStyle(node).lineHeight,
          })),
          values: [...document.querySelectorAll('.reports-kpi .value')].map(node => node.textContent.trim()),
          filters: [...document.querySelectorAll('.reports-filter button')].map(node => node.textContent.trim()),
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        }));
        assert.equal(snapshot.labels.length, 8);
        for (const label of snapshot.labels) assert.ok(parseFloat(label.fontSize) >= 11, `${label.text} abaixo de 11px`);
        assert.ok(snapshot.values.every(Boolean), 'KPI sem valor');
        assert.deepEqual(snapshot.filters, ['Ano atual', 'Últimos 12 meses', 'Todos']);
        assert.equal(snapshot.overflow, false);
        assert.equal(errors.length, 0, errors.join(' | '));
        assert.equal(requestFailures.length, 0, requestFailures.join(' | '));
      } finally {
        await browser.close();
        harness.server.close();
      }
    });
  }
}
