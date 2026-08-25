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
  test(`product simplification contracts ${width}x${height}`, async () => {
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
      const result = await page.evaluate(() => {
        const desktopNav = document.querySelector('.tabs-desktop');
        const mobileNav = document.querySelector('.tabs-mobile');
        const navText = `${desktopNav?.textContent || ''} ${mobileNav?.textContent || ''}`;
        const desktopMenus = [...document.querySelectorAll('.hdr-right .wallet-menu, .hdr-right .cfg-menu, .hdr-right .binst, .hdr-right .hdr-top-fab')]
          .filter(node => getComputedStyle(node).display !== 'none');
        go('patrimonio');
        return {
          shell: Boolean(document.querySelector('.shell')),
          patrimonioInNavigation: navText.includes('Patrimônio'),
          desktopMenusVisible: desktopMenus.length,
          redirectedLegacyRoute: S.tab === 'dashboard',
          overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth,
        };
      });
      assert.equal(result.shell, true);
      assert.equal(result.patrimonioInNavigation, false);
      assert.equal(result.redirectedLegacyRoute, true);
      if (width >= 1181) assert.ok(result.desktopMenusVisible <= 1, 'desktop header retains at most one compact wallet indicator');
      assert.equal(result.overflow, false);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      harness.server.close();
    }
  });
}
