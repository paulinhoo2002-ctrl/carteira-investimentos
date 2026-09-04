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
  ].filter(Boolean).find(file => { try { fs.accessSync(file); return true; } catch { return false; } });
}

async function startServer(root) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      const file = path.normalize(path.join(root, pathname === '/' ? 'index.html' : pathname));
      if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
      const content = await fsp.readFile(file);
      const type = path.extname(file) === '.js' ? 'text/javascript' : 'text/html';
      res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
      res.end(content);
    } catch (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500);
      res.end();
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

async function sizes(page, selector) {
  return page.$$eval(selector, elements => elements
    .map(element => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { text: (element.innerText || element.getAttribute('aria-label') || '').trim(), width: box.width, height: box.height, visible: style.display !== 'none' && box.width > 0 && box.height > 0 };
    })
    .filter(item => item.visible));
}

for (const viewport of viewports) {
  test(`utility touch targets - ${viewport.label}`, async () => {
    const executable = browserPath();
    assert.ok(executable, 'Chrome/Edge nao encontrado');
    const { chromium } = await import('playwright-core');
    const harness = await startServer(path.join(__dirname, '..'));
    const browser = await chromium.launch({ executablePath: executable, headless: true });
    const context = await browser.newContext({ viewport, isMobile: viewport.width <= 430, hasTouch: viewport.width <= 430 });
    const page = await context.newPage();
    const errors = [];
    const failures = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failures.push(request.url()));

    try {
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

      await page.evaluate(() => go('dashboard'));
      for (const item of await sizes(page, '.touch-target-utility')) assert.ok(item.height >= 44, `Dashboard ${item.text} abaixo de 44px`);

      await page.evaluate(() => go('ativos'));
      for (const item of await sizes(page, '.touch-target-utility')) assert.ok(item.height >= 44, `Ativos ${item.text} abaixo de 44px`);
      await page.locator('.touch-target-utility').first().focus();
      assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('touch-target-utility')), true);

      await page.evaluate(() => go('renda-fixa'));
      assert.ok(await page.locator('.premium-rf-position-row').count(), 'Tela dedicada de Renda Fixa ausente');
      const move = page.locator('.asset-action', { hasText: 'Movimentar' }).first();
      if (await move.count()) {
        await move.click();
        const close = page.locator('button', { hasText: 'Fechar' }).last();
        assert.ok(await close.count(), 'Fechar do editor RF ausente');
        const closeBox = await close.boundingBox();
        assert.ok(closeBox && closeBox.height >= 44, `Fechar RF abaixo de 44px: ${closeBox?.height}`);
        await close.focus();
        await close.click();
        await assert.rejects(() => page.locator('[aria-label="Movimentação de renda fixa"]').waitFor({ state: 'visible', timeout: 150 }), /Timeout/);
      }

      await page.evaluate(() => go('aportes'));
      for (const item of await sizes(page, '.touch-target-utility')) assert.ok(item.height >= 44, `Aportes ${item.text} abaixo de 44px`);

      await page.evaluate(() => go('metas'));
      for (const item of await sizes(page, '.metas-shell .btn')) assert.ok(item.height >= 44, `Metas ${item.text} abaixo de 44px`);

      await page.evaluate(() => { applyTheme('light'); applyTheme('dark'); });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      assert.deepEqual(failures, []);
    } finally {
      await context.close();
      await browser.close();
      harness.server.close();
    }
  });
}
