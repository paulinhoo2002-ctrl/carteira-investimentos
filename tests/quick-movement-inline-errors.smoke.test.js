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
  ].filter(Boolean).find(candidate => {
    try { fs.accessSync(candidate); return true; } catch { return false; }
  });
}

async function startServer(rootDir) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      const relative = pathname === '/' ? '/index.html' : pathname;
      const filePath = path.normalize(path.join(rootDir, relative));
      if (!filePath.startsWith(rootDir)) { res.writeHead(403); res.end(''); return; }
      const content = await fsp.readFile(filePath);
      const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
      res.writeHead(200, { 'Content-Type': mime[path.extname(filePath).toLowerCase()] || 'text/plain' });
      res.end(content);
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
  test(`inline errors browser - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge nao encontrado');
    const { chromium } = await import('playwright-core');
    const harness = await startServer(path.join(__dirname, '..'));
    const browser = await chromium.launch({ executablePath, headless: true });
    const consoleErrors = [];
    const pageErrors = [];
    const requestFailures = [];
    const nativeAlerts = [];

    try {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      await page.addInitScript(() => {
        window.__nativeAlerts = [];
        window.alert = message => window.__nativeAlerts.push(String(message));
      });
      page.on('console', message => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('requestfailed', request => requestFailures.push(request.url()));
      await page.goto(harness.url, { waitUntil: 'networkidle' });

      const open = async kind => {
        await page.evaluate(next => window.openQuickMovement(next), kind);
        await page.locator('[aria-label="Nova movimentação"]').waitFor({ state: 'visible' });
      };
      const save = () => page.locator('.quick-movement-modal button.btn.bsv').click();
      const errorBanner = page.locator('#qm-error-banner');
      const assertError = async (fieldId, expected) => {
        await assert.doesNotReject(() => errorBanner.waitFor({ state: 'visible' }));
        assert.equal(await errorBanner.getAttribute('role'), 'alert');
        assert.equal(await errorBanner.getAttribute('aria-live'), 'assertive');
        assert.match(await errorBanner.textContent(), expected);
        const field = page.locator(`#${fieldId}`);
        assert.equal(await field.getAttribute('aria-invalid'), 'true');
        assert.equal(await field.getAttribute('aria-describedby'), 'qm-error-banner');
        assert.equal(await page.evaluate(() => document.activeElement?.id), fieldId);
        assert.equal(await page.locator('[aria-label="Nova movimentação"]').isVisible(), true);
      };
      const reset = async kind => {
        if (await page.locator('[aria-label="Nova movimentação"]').count()) {
          await page.evaluate(() => window.closeQuickMovement());
        }
        await open(kind);
      };

      await open('compra');
      await save();
      await assertError('qm-ti', /ticker/i);
      await page.locator('#qm-ti').fill('PETR4');
      await page.locator('#qm-qty').fill('1');
      await page.locator('#qm-price').fill('10');
      await errorBanner.waitFor({ state: 'detached' });
      assert.equal(await page.locator('#qm-ti').getAttribute('aria-invalid'), null);
      await reset('compra');
      await page.locator('#qm-ti').fill('PETR4');
      await page.locator('#qm-qty').fill('0');
      await page.locator('#qm-price').fill('10');
      await save();
      await assertError('qm-qty', /quantidade/i);
      await reset('compra');
      await page.locator('#qm-ti').fill('PETR4');
      await page.locator('#qm-qty').fill('1');
      await page.locator('#qm-price').fill('0');
      await save();
      await assertError('qm-price', /preço/i);

      await reset('provento');
      await save();
      await assertError('qm-ti', /ticker/i);
      await reset('provento');
      await page.locator('#qm-ti').fill('PETR4');
      await page.locator('#qm-value').fill('0');
      await save();
      await assertError('qm-value', /valor recebido/i);

      await reset('outro');
      await save();
      await assertError('qm-outro-title', /título/i);
      await reset('venda');
      await save();
      await assertError('qm-sale-asset', /ativo/i);

      await page.evaluate(() => window.closeQuickMovement());
      await open('compra');
      assert.equal(await errorBanner.count(), 0);
      await save();
      await assertError('qm-ti', /ticker/i);
      await page.evaluate(() => window.closeQuickMovement());
      await open('compra');
      assert.equal(await errorBanner.count(), 0);
      await page.locator('#qm-ti').fill('PETR4');
      await page.locator('#qm-qty').fill('1');
      await page.locator('#qm-price').fill('10');
      await save();
      assert.equal(await page.locator('[aria-label="Nova movimentação"]').count(), 0);
      assert.equal(await page.locator('.toast').count() > 0, true);
      assert.deepEqual(await page.evaluate(() => window.__nativeAlerts), []);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      assert.equal(overflow, false, `overflow horizontal em ${viewport.label}`);
      nativeAlerts.push(...await page.evaluate(() => window.__nativeAlerts));
    } finally {
      await browser.close();
      await new Promise(resolve => harness.server.close(resolve));
    }
    assert.deepEqual(consoleErrors, [], `console.error em ${viewport.label}`);
    assert.deepEqual(pageErrors, [], `pageerror em ${viewport.label}`);
    assert.deepEqual(requestFailures, [], `requestfailed em ${viewport.label}`);
    assert.deepEqual(nativeAlerts, [], `alert nativo em ${viewport.label}`);
  });
}
