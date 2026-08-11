const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

function browserPath() {
  return [
    process.env.CHROME_PATH,
    'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    'C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
  ].filter(Boolean).find(file => { try { fs.accessSync(file); return true; } catch { return false; } });
}

async function startServer(root) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      const file = path.normalize(path.join(root, pathname === '/' ? 'index.html' : pathname));
      if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(await fsp.readFile(file));
    } catch (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500);
      res.end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
}

const viewports = [
  { width: 390, height: 844, name: '390x844' },
  { width: 768, height: 1024, name: '768x1024' },
  { width: 1366, height: 768, name: '1366x768' },
  { width: 1920, height: 1080, name: '1920x1080' },
];

for (const viewport of viewports) {
  test(`provento operacional UX - ${viewport.name}`, async () => {
    const executablePath = browserPath();
    if (!executablePath) return;
    const { server, url } = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath, headless: true });
    const errors = { console: [], page: [], request: [] };
    try {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.width <= 430,
        isMobile: viewport.width <= 430,
      });
      const page = await context.newPage();
      page.on('console', message => { if (message.type() === 'error') errors.console.push(message.text()); });
      page.on('pageerror', error => errors.page.push(error.message));
      page.on('requestfailed', request => errors.request.push(request.url()));

      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(() => go('dividendos'));
      await page.locator('.div-premium').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByRole('button', { name: /Registrar provento/ }).first().click();

      const dialog = page.locator('.quick-movement-modal');
      await dialog.waitFor({ state: 'visible', timeout: 5000 });
      assert.equal(await dialog.locator('h3').innerText(), 'Registrar provento');
      assert.equal(await dialog.locator('#qm-ti').count(), 1);
      assert.equal(await dialog.locator('#qm-event').count(), 1);
      assert.equal(await dialog.locator('#qm-value').count(), 1);
      assert.equal(await dialog.locator('#qm-dt').count(), 1);
      assert.equal(await dialog.getByText('Revisão').count(), 1);

      for (const selector of ['#qm-ti', '#qm-event', '#qm-value', '#qm-dt', 'button:has-text("Cancelar")', 'button:has-text("Registrar provento")']) {
        const box = await dialog.locator(selector).first().boundingBox();
        assert.ok(box && box.width > 0 && box.height >= 44, `Alvo menor que 44px: ${selector}`);
      }
      await dialog.locator('#qm-ti').fill('PETR4');
      await dialog.locator('#qm-value').fill('120,00');
      await dialog.locator('#qm-event').selectOption({ label: 'Dividendos' }).catch(async () => {
        await dialog.locator('#qm-event').selectOption({ label: 'Dividendo' });
      });
      await dialog.locator('#qm-value').dispatchEvent('input');
      await page.waitForTimeout(50);
      assert.equal(await dialog.locator('#quick-movement-asset-summary').count(), 1);
      assert.match(await dialog.locator('#quick-movement-preview').innerText(), /PETR4/);
      assert.match(await dialog.locator('#quick-movement-preview').innerText(), /120/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
      await dialog.getByRole('button', { name: 'Cancelar' }).click();
      assert.equal(await page.locator('.quick-movement-modal').count(), 0);
      await context.close();
    } finally {
      await browser.close();
      server.close();
    }
    assert.deepEqual(errors, { console: [], page: [], request: [] });
  });
}
