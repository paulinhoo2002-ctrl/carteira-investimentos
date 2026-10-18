const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { startLocalHttpServer: startServer } = require('./local-http-server.js');

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

const viewports = [
  { width: 390, height: 844, label: '390x844' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1920, height: 1080, label: '1920x1080' },
];

for (const viewport of viewports) {
  test(`Acoes RF - polish visual ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge nao encontrado para o smoke Playwright');
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
    const requestFailures = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('requestfailed', request => requestFailures.push(request.url()));

    try {
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => { go('ativos'); setAssetsInnerTab('renda-fixa'); });
      const rfActionScope = page.locator('.premium-rf-position-list .premium-rf-position-row').first();
      await rfActionScope.waitFor({ state: 'visible', timeout: 5000 });

      const before = await page.evaluate(() => {
        const firstAsset = document.querySelector('.premium-rf-position-list .premium-rf-position-row');
        const ticker = firstAsset?.querySelector('.premium-rf-row-title')?.textContent.split('·')[0].trim();
        const asset = S.assets.find(item => String(item.ticker || '').trim().toUpperCase() === String(ticker || '').toUpperCase() && isRendaFixaAsset(item) && Number(rfPrincipalBalance(item).value) > 0);
        const buttons = [...(firstAsset?.querySelectorAll('.premium-rf-row-actions button') || [])]
          .filter(button => button.getBoundingClientRect().width > 0);
        const metrics = asset && {
          id: rfAssetEventId(asset),
          type: asset.type,
          balance: rfPrincipalBalance(asset).value,
          applied: asset.rf_applied_value,
          liquid: asset.rf_liquid_value || asset.fixed_current_value || asset.current_price,
          events: (S.rfEvents || []).length,
        };
        return {
          metrics,
          buttons: buttons.map(button => {
            const style = getComputedStyle(button);
            const rect = button.getBoundingClientRect();
            return { text: button.textContent.trim(), width: rect.width, height: rect.height, font: style.fontSize, padding: style.padding };
          }),
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      });
      assert.ok(before.metrics, `ativo RF elegivel ausente em ${viewport.label}`);
      assert.deepEqual(before.buttons.map(button => button.text), ['Detalhes', 'Movimentar', 'Resgatar', '✎ Editar']);
      assert.equal(before.overflow, false, `overflow horizontal em ${viewport.label}`);
      for (const button of before.buttons) {
        assert.ok(button.width >= 44 && button.height >= 44, `touch target invalido: ${button.text} ${button.width}x${button.height}`);
        assert.ok(button.width < 180, `acao excessivamente larga: ${button.text} ${button.width}px`);
      }

      await rfActionScope.getByRole('button', { name: 'Movimentar' }).click();
      await page.locator('.rf-event-editor').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('.rf-event-editor button', { hasText: 'Cancelar' }).click();
      await page.locator('.rf-event-editor').waitFor({ state: 'detached', timeout: 5000 });

      await rfActionScope.getByRole('button', { name: 'Resgatar' }).click();
      await page.locator('.rf-event-editor').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('.rf-event-editor button', { hasText: 'Cancelar' }).click();
      await page.locator('.rf-event-editor').waitFor({ state: 'detached', timeout: 5000 });

      const after = await page.evaluate(id => {
        const asset = S.assets.find(item => rfAssetEventId(item) === id);
        return { id: rfAssetEventId(asset), type: asset.type, balance: rfPrincipalBalance(asset).value, applied: asset.rf_applied_value, liquid: asset.rf_liquid_value || asset.fixed_current_value || asset.current_price, events: (S.rfEvents || []).length };
      }, before.metrics.id);
      assert.deepEqual(after, before.metrics, `dados financeiros mudaram em ${viewport.label}`);
      assert.equal(errors.length, 0, `console/page errors em ${viewport.label}: ${errors.join(' | ')}`);
      assert.equal(requestFailures.length, 0, `request failures em ${viewport.label}: ${requestFailures.join(' | ')}`);
    } finally {
      await context.close();
      await browser.close();
      harness.server.close();
    }
  });
}
