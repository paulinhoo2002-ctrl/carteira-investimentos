const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { startLocalHttpServer } = require('./local-http-server');

function browserPath() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(file => { try { fs.accessSync(file); return true; } catch { return false; } });
}

async function serve(root) {
  return startLocalHttpServer(root);
}

const viewports = [
  { width: 390, height: 844, label: '390x844' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1920, height: 1080, label: '1920x1080' },
];

for (const viewport of viewports) {
  test(`required date browser - ${viewport.label}`, async () => {
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
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('requestfailed', request => requestFailures.push(request.url()));
      await page.goto(harness.url, { waitUntil: 'networkidle' });

      await page.evaluate(() => window.openQuickMovement('compra'));
      const modal = page.locator('[aria-label="Nova movimentação"]');
      await modal.waitFor({ state: 'visible' });
      const today = new Date().toISOString().slice(0, 10);
      assert.equal(await page.locator('#qm-dt').inputValue(), today);
      await page.locator('#qm-dt').fill('');
      assert.equal(await page.locator('#qm-dt').inputValue(), '');
      assert.equal(await page.locator('#qm-error-banner').count(), 0);
      await page.locator('#qm-ti').fill('PETR4');
      await page.locator('#qm-qty').fill('10');
      await page.locator('#qm-price').fill('20');
      await modal.locator('button.btn.bsv').click();
      const banner = page.locator('#qm-error-banner');
      await banner.waitFor({ state: 'visible' });
      assert.equal(await banner.getAttribute('role'), 'alert');
      assert.equal(await banner.getAttribute('aria-live'), 'assertive');
      assert.equal(await page.locator('#qm-dt').getAttribute('aria-invalid'), 'true', await banner.textContent());
      assert.equal(await page.locator('#qm-dt').getAttribute('aria-describedby'), 'qm-error-banner');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'qm-dt');
      await page.locator('#qm-dt').fill('2026-08-20');
      await banner.waitFor({ state: 'detached' });
      assert.equal(await page.locator('#qm-dt').inputValue(), '2026-08-20');
      await page.evaluate(() => window.closeQuickMovement());

      await page.evaluate(() => window.openQuickMovement('renda-fixa'));
      await page.getByRole('tab', { name: 'Novo título' }).click();
      await page.locator('#qm-rf-name').fill('CDB Teste');
      await page.locator('#qm-rf-applied').fill('1000');
      await page.locator('#qm-rf-app-date').fill('');
      assert.equal(await page.locator('#qm-rf-app-date').inputValue(), '');
      await page.locator('.quick-movement-modal button.btn.bsv').click();
      await page.locator('#qm-error-banner').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#qm-rf-app-date').getAttribute('aria-invalid'), 'true');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'qm-rf-app-date');
      await page.locator('#qm-rf-app-date').fill('2026-08-21');
      await page.locator('#qm-error-banner').waitFor({ state: 'detached' });
      await page.evaluate(() => window.closeQuickMovement());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    } finally {
      await browser.close();
      await new Promise(resolve => harness.server.close(resolve));
    }
    assert.deepEqual(consoleErrors, [], `console.error em ${viewport.label}`);
    assert.deepEqual(pageErrors, [], `pageerror em ${viewport.label}`);
    assert.deepEqual(requestFailures, [], `requestfailed em ${viewport.label}`);
  });
}
