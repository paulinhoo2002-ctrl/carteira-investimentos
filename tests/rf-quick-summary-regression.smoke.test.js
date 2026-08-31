const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright-core');

test('selecionar título RF mantém o editor funcional sem resumo opcional', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  try {
    await page.goto('http://127.0.0.1:4173/index.html?testMode=1', { waitUntil: 'networkidle' });
    await page.evaluate(() => { restoreLocalTestData(); go('aportes'); openQuickMovement('renda-fixa'); });
    await page.selectOption('#qm-rf-existing-asset', 'rf-cra24');
    await page.evaluate(() => updateRfAssetSummary(document.querySelector('#qm-rf-existing-asset')));
    await page.getByRole('button', { name: 'Continuar aplicação' }).click();
    assert.ok(await page.locator('#rfmv-rf-cra24-principal').isVisible());
    assert.equal(errors.length, 0, errors.join(' | '));
  } finally {
    await browser.close();
  }
});
