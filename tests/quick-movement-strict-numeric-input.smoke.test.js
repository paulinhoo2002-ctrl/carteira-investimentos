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

async function serve(root) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      const file = path.normalize(path.join(root, pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
      res.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8' });
      res.end(await fsp.readFile(file));
    } catch { res.writeHead(404); res.end(); }
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
  test(`strict numeric browser - ${viewport.label}`, async () => {
    const executablePath = browserPath();
    assert.ok(executablePath, 'Chrome/Edge nao encontrado');
    const { chromium } = await import('playwright-core');
    const harness = await serve(path.join(__dirname, '..'));
    const browser = await chromium.launch({ executablePath, headless: true });
    const consoleErrors = [];
    const pageErrors = [];
    const requestFailures = [];
    try {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      await page.addInitScript(() => { window.__nativeAlerts = []; window.alert = message => window.__nativeAlerts.push(String(message)); });
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('requestfailed', request => requestFailures.push(request.url()));
      await page.goto(harness.url, { waitUntil: 'networkidle' });

      const open = async kind => {
        await page.evaluate(next => window.openQuickMovement(next), kind);
        await page.locator('[aria-label="Nova movimentação"]').waitFor({ state: 'visible' });
      };
      const save = () => page.locator('.quick-movement-modal button.btn.bsv').click();
      const banner = page.locator('#qm-error-banner');
      const assertFieldError = async id => {
        await banner.waitFor({ state: 'visible' });
        assert.equal(await banner.getAttribute('role'), 'alert');
        assert.equal(await banner.getAttribute('aria-live'), 'assertive');
        const field = page.locator(`#${id}`);
        assert.equal(await field.getAttribute('aria-invalid'), 'true');
        assert.equal(await field.getAttribute('aria-describedby'), 'qm-error-banner');
        assert.equal(await page.evaluate(() => document.activeElement?.id), id);
        assert.equal(await page.locator('[aria-label="Nova movimentação"]').isVisible(), true);
      };
      const buildCompra = async (qty, price) => page.evaluate(({ qty, price }) => {
        document.getElementById('qm-ti').value = 'PETR4';
        document.getElementById('qm-qty').value = qty;
        document.getElementById('qm-price').value = price;
        return window.quickMovementBuildAporteFromFields('compra');
      }, { qty, price });

      const valid = [['10', 10], ['10,5', 10.5], ['10.50', 10.5], ['1.234,56', 1234.56], ['1234,56', 1234.56], ['1234.56', 1234.56]];
      for (const [input, expected] of valid) {
        await open('compra');
        const built = await buildCompra(input, '10');
        assert.equal(built.error, undefined, `${input} deveria ser aceito`);
        assert.equal(built.reg.qty, expected);
        assert.equal(built.reg.price, 10);
        await page.evaluate(() => window.closeQuickMovement());
      }

      for (const input of ['10abc', 'abc10', '1,2,3', '--10', '10-', '-10', 'Infinity']) {
        await open('compra');
        await page.locator('#qm-ti').fill('PETR4');
        await page.locator('#qm-qty').fill(input);
        await page.locator('#qm-price').fill('10');
        await save();
        await assertFieldError('qm-qty');
        assert.equal(await page.locator('#qm-qty').inputValue(), input);
        assert.deepEqual(await page.evaluate(() => window.__nativeAlerts), []);
        await page.locator('#qm-qty').fill('10,5');
        await banner.waitFor({ state: 'detached' });
        assert.equal(await page.locator('#qm-qty').getAttribute('aria-invalid'), null);
        assert.equal(await page.locator('#qm-qty').getAttribute('aria-describedby'), null);
        await page.evaluate(() => window.closeQuickMovement());
      }

      await open('compra');
      await page.locator('#qm-ti').fill('PETR4');
      await page.locator('#qm-qty').fill('10');
      await page.locator('#qm-price').fill('10abc');
      await save();
      await assertFieldError('qm-price');
      await page.locator('#qm-price').fill('1234,56');
      await banner.waitFor({ state: 'detached' });
      await page.evaluate(() => window.closeQuickMovement());

      await open('provento');
      await page.locator('#qm-ti').fill('PETR4');
      await page.locator('#qm-value').fill('10,50');
      const income = await page.evaluate(() => window.quickMovementBuildAporteFromFields('provento'));
      assert.equal(income.reg.value, 10.5);
      await page.locator('#qm-value').fill('10abc');
      await save();
      await assertFieldError('qm-value');
      await page.evaluate(() => window.closeQuickMovement());

      await open('renda-fixa');
      await page.getByRole('tab', { name: 'Novo título' }).click();
      for (const id of ['qm-rf-applied', 'qm-rf-gross', 'qm-rf-liquid']) assert.equal(await page.locator(`#${id}`).getAttribute('inputmode'), 'decimal');
      await page.locator('#qm-rf-name').fill('CDB Teste');
      await page.locator('#qm-rf-applied').fill('1.234,56');
      const fixed = await page.evaluate(() => window.quickMovementBuildAporteFromFields('renda-fixa'));
      assert.equal(fixed.error, undefined);
      assert.equal(fixed.reg.rf_applied_value, 1234.56);
      await page.locator('#qm-rf-applied').fill('10abc');
      await save();
      await assertFieldError('qm-rf-applied');
      await page.evaluate(() => window.closeQuickMovement());

      await open('outro');
      await page.locator('#qm-outro-title').fill('Ajuste');
      await page.locator('#qm-outro-value').fill('10,50');
      const other = await page.evaluate(() => window.quickMovementBuildAporteFromFields('outro'));
      assert.equal(other.reg.value, 10.5);
      await page.locator('#qm-outro-value').fill('10abc');
      await save();
      await assertFieldError('qm-outro-value');
      await page.evaluate(() => window.closeQuickMovement());

      await open('venda');
      assert.equal(await page.locator('#qm-qty').getAttribute('inputmode'), 'decimal');
      const negative = await page.evaluate(() => window.parseQuickMovementNumber('-10'));
      assert.equal(negative.ok, false);
      await page.evaluate(() => window.closeQuickMovement());

      const numericIds = ['qm-qty', 'qm-price', 'qm-value', 'qm-rf-applied', 'qm-rf-gross', 'qm-rf-liquid', 'qm-rf-iriof', 'qm-rf-unavailable', 'qm-outro-value'];
      await open('compra');
      for (const id of numericIds.slice(0, 2)) assert.equal(await page.locator(`#${id}`).getAttribute('inputmode'), 'decimal', id);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
      assert.deepEqual(await page.evaluate(() => window.__nativeAlerts), []);
    } finally {
      await browser.close();
      await new Promise(resolve => harness.server.close(resolve));
    }
    assert.deepEqual(consoleErrors, [], `console.error em ${viewport.label}`);
    assert.deepEqual(pageErrors, [], `pageerror em ${viewport.label}`);
    assert.deepEqual(requestFailures, [], `requestfailed em ${viewport.label}`);
  });
}
