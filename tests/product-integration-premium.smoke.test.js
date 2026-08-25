const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const fsp = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

const routes = ['dashboard', 'patrimonio', 'ativos', 'aportes', 'metas', 'dividendos', 'rentabilidade', 'ajudar', 'relatorios', 'ia', 'auditoria'];
const viewports = [[390, 844], [430, 932], [768, 1024], [1366, 768], [1920, 1080]];

function resolveBrowser() {
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

for (const theme of ['dark', 'light']) {
  for (const [width, height] of viewports) {
    test(`produto integrado ${theme} ${width}x${height}`, async () => {
      const executablePath = resolveBrowser();
      assert.ok(executablePath, 'Chrome não encontrado');
      const harness = await startServer(path.join(__dirname, '..'));
      const { chromium } = await import('playwright-core');
      const browser = await chromium.launch({ executablePath, headless: true });
      const consoleErrors = [];
      const pageErrors = [];
      const requestFailures = [];
      try {
        const page = await browser.newPage({ viewport: { width, height } });
        page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
        page.on('pageerror', error => pageErrors.push(error.message));
        page.on('requestfailed', request => requestFailures.push(request.url()));
        await page.goto(harness.url, { waitUntil: 'networkidle' });
        await page.evaluate(({ theme }) => {
          document.documentElement.dataset.theme = theme;
        }, { theme });
        for (const route of routes) {
          await page.evaluate(routeName => go(routeName), route);
          await page.waitForTimeout(25);
          assert.ok(await page.locator('#root').innerText(), `rota vazia: ${route}`);
        }
        const result = await page.evaluate(() => ({
          overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth,
          shell: Boolean(document.querySelector('.shell')),
          desktopNav: Boolean(document.querySelector('.tabs-desktop')),
          mobileNav: Boolean(document.querySelector('.tabs-mobile')),
        }));
        assert.equal(result.shell, true);
        assert.equal(result.desktopNav, true);
        assert.equal(result.mobileNav, true);
        assert.equal(result.overflow, false);
        assert.deepEqual(consoleErrors, []);
        assert.deepEqual(pageErrors, []);
        assert.deepEqual(requestFailures, []);
      } finally {
        await browser.close();
        harness.server.close();
      }
    });
  }
}
