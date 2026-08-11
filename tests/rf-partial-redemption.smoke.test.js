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
      const file = path.normalize(path.join(rootDir, pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(rootDir)) { res.writeHead(403); res.end(''); return; }
      const content = await fsp.readFile(file);
      res.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain' });
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
  { width: 1366, height: 768, label: '1366x768' },
  { width: 390, height: 844, label: '390x844' },
];

for (const viewport of viewports) {
  test(`RF partial redemption smoke - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    if (!executablePath) return;

    const harness = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.width <= 430,
      hasTouch: viewport.width <= 430,
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const requestFailures = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('requestfailed', request => requestFailures.push(`${request.url()} :: ${request.failure()?.errorText || 'unknown'}`));

    try {
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => go('ativos'));
      await page.waitForFunction(() => document.querySelector('[onclick="setAssetsInnerTab(\'renda-fixa\')"]') !== null, { timeout: 5000 });
      await page.locator('[onclick="setAssetsInnerTab(\'renda-fixa\')"]').click();
      await page.waitForFunction(() => [...document.querySelectorAll('summary')].some(summary => summary.textContent.includes('audit')), { timeout: 5000 });

      const before = await page.evaluate(() => {
        const asset = S.assets.filter(isRendaFixaAsset).find(item => Number(item.rf_applied_value || 0) > 0);
        if (!asset) throw new Error('Nenhum ativo RF elegível em S.assets');
        const id = rfAssetEventId(asset);
        return {
          id,
          ticker: asset.ticker,
          values: {
            rf_applied_value: asset.rf_applied_value,
            rf_liquid_value: asset.rf_liquid_value,
            fixed_current_value: asset.fixed_current_value,
            current_price: asset.current_price,
          },
          balance: rfPrincipalBalance(asset),
          rfValues: rfValues(asset),
        };
      });

      await page.evaluate(() => {
        const summary = [...document.querySelectorAll('summary')].find(item => item.textContent.includes('audit'));
        if (!summary) throw new Error('Histórico RF não encontrado');
        summary.click();
      });
      await page.waitForFunction(id => [...document.querySelectorAll('button')].some(button =>
        button.getAttribute('onclick')?.includes('openRfMovementEditor') &&
        button.getAttribute('onclick')?.includes(id) &&
        button.getAttribute('onclick')?.includes('resgate_parcial')),
      before.id, { timeout: 5000 });

      await page.evaluate(id => {
        const button = [...document.querySelectorAll('button')].find(item =>
          item.getAttribute('onclick')?.includes('openRfMovementEditor') &&
          item.getAttribute('onclick')?.includes(id) &&
          item.getAttribute('onclick')?.includes('resgate_parcial'));
        if (!button) throw new Error(`Botão de resgate parcial não encontrado para ${id}`);
        button.click();
      }, before.id);
      await page.waitForSelector('.rf-event-editor', { state: 'visible', timeout: 5000 });
      assert.equal(await page.locator('.rf-event-editor').count(), 1);
      assert.equal(await page.locator('.rf-event-editor select').count(), 1);
      assert.equal(await page.locator('.rf-event-editor input[aria-label="Valor do principal movimentado"]').count(), 1);

      const redemption = Math.min(1000, Number(before.balance.value) - 1);
      assert.ok(redemption > 0 && redemption < Number(before.balance.value));
      const principalInput = page.locator('.rf-event-editor input[aria-label="Valor do principal movimentado"]');
      await principalInput.fill(redemption.toFixed(2).replace('.', ','));
      await principalInput.press('Tab');
      await page.locator('.rf-event-editor button').filter({ hasText: 'Confirmar resgate' }).click();
      await page.waitForFunction(() => !document.querySelector('.rf-event-editor'), { timeout: 5000 });

      const after = await page.evaluate(id => {
        const asset = S.assets.find(item => rfAssetEventId(item) === id);
        const event = [...S.rfEvents].reverse().find(item => item.assetId === id && item.type === 'resgate_parcial');
        if (!asset || !event) throw new Error('Resgate parcial não foi registrado');
        return {
          values: {
            rf_applied_value: asset.rf_applied_value,
            rf_liquid_value: asset.rf_liquid_value,
            fixed_current_value: asset.fixed_current_value,
            current_price: asset.current_price,
          },
          balance: rfPrincipalBalance(asset),
          rfValues: rfValues(asset),
          event: { type: event.type, principalDelta: event.principalDelta, assetId: event.assetId },
        };
      }, before.id);
      assert.equal(after.event.principalDelta, -redemption);
      assert.equal(after.values.rf_applied_value, Number((before.values.rf_applied_value - redemption).toFixed(2)));
      assert.ok(after.values.rf_liquid_value <= before.values.rf_liquid_value);
      for (const field of ['fixed_current_value', 'current_price']) {
        const beforeValue = Number(before.values[field]);
        const afterValue = Number(after.values[field]);
        if (Number.isFinite(beforeValue) && Number.isFinite(afterValue)) {
          assert.ok(afterValue <= beforeValue, `${field} não reduziu após o resgate`);
        }
      }

      await page.evaluate(() => go('ativos'));
      await page.waitForFunction(id => document.body.innerText.includes(id), before.ticker, { timeout: 5000 });
      const assetsVisual = await page.evaluate(ticker => {
        const text = document.body.innerText;
        const index = text.indexOf(ticker);
        return { visible: index >= 0, excerpt: index >= 0 ? text.slice(index, index + 500) : '' };
      }, before.ticker);
      assert.equal(assetsVisual.visible, true);
      assert.match(assetsVisual.excerpt, /R\$|Resultado|Rentabilidade/);

      await page.evaluate(() => go('patrimonio'));
      await page.waitForFunction(() => document.body.innerText.includes('Patrimônio') || document.body.innerText.includes('PatrimÃ´nio'), { timeout: 5000 });
      const patrimonyVisible = await page.evaluate(() => document.body.innerText.includes('Valor atual') || document.body.innerText.includes('Patrimônio') || document.body.innerText.includes('PatrimÃ´nio'));
      assert.equal(patrimonyVisible, true);

      // testMode usa fixture em memória e reload reinicializa o estado; persistência de reload não faz parte deste smoke.
      assert.equal(consoleErrors.length, 0, consoleErrors.join(' | '));
      assert.equal(pageErrors.length, 0, pageErrors.join(' | '));
      assert.equal(requestFailures.length, 0, requestFailures.join(' | '));
    } finally {
      await context.close();
      await browser.close();
      harness.server.close();
    }
  });
}
