const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const { applyV289VisualFixture } = require('./helpers/v289-visual-fixtures');

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
      const contentType = file.endsWith('.html') ? 'text/html; charset=utf-8'
        : file.endsWith('.js') || file.endsWith('.mjs') ? 'text/javascript; charset=utf-8'
          : file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/plain';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(await fsp.readFile(file));
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

const EXPECTED_HEADERS = ['Ticker', 'Tipo', 'Aplicado', 'Atual', 'Resultado de mercado', 'Rendimentos recebidos', 'Resultado total', 'Rentab.', 'Vencimento', 'Situação'];

for (const viewport of viewports) {
  test(`RF table width - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge nao encontrado para o smoke Playwright');
    const harness = await startServer(path.join(__dirname, '..'));
    let browser;
    let context;
    let page;
    try {
      const { chromium } = await import('playwright-core');
      browser = await chromium.launch({ executablePath, headless: true });
      context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.width <= 430,
        hasTouch: viewport.width <= 430,
      });
      page = await context.newPage();
    const errors = [];
    const pageErrors = [];
    const requestFailures = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('requestfailed', request => requestFailures.push(request.url()));

      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await applyV289VisualFixture(page, 'baseline');
      await page.evaluate(() => go('renda-fixa'));
      const detail = page.locator('.premium-rf-page > details').filter({ hasText: 'Detalhamento dos títulos' });
      await detail.locator('summary').click();
      await page.waitForSelector('.rf-table tbody tr', { state: 'visible', timeout: 5000 });

      const snapshot = await page.evaluate(() => {
        const wrap = document.querySelector('.rf-table-wrap');
        const table = document.querySelector('.rf-table');
        const wrapRect = wrap.getBoundingClientRect();
        const headers = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
        const rows = [...table.querySelectorAll('tbody tr')];
        const firstRow = rows[0];
        const tds = firstRow ? [...firstRow.querySelectorAll('td')] : [];
        const position = document.querySelector('.premium-rf-position-row');
        const buttons = position ? [...position.querySelectorAll('.premium-rf-row-actions button')]
          .filter(b => b.getBoundingClientRect().width > 0 && b.getBoundingClientRect().height > 0)
          .map(b => {
            const r = b.getBoundingClientRect();
            return { text: b.textContent.trim(), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, right: Math.round(r.right * 10) / 10 };
          }) : [];
        const numericCells = tds.filter(td => td.classList.contains('rf-right'));
        const wrappedNumbers = numericCells.filter(td => {
          const numericText = td.querySelector('.rf-strong')?.textContent.trim() || td.textContent.trim();
          const span = document.createElement('span');
          span.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:inherit';
          span.textContent = numericText;
          document.body.appendChild(span);
          const textW = span.getBoundingClientRect().width;
          document.body.removeChild(span);
          return textW > td.getBoundingClientRect().width - 2;
        }).map(td => td.textContent.trim());
        const metrics = (() => {
          const asset = S.assets.find(item => isRendaFixaAsset(item) && Number(rfPrincipalBalance(item).value) > 0);
          return asset ? {
            id: rfAssetEventId(asset),
            applied: assetAppliedValue(asset),
            current: assetCurrentValue(asset),
            juros: assetJurosValue(asset),
            rentab: assetRentabPct(asset),
            liquid: asset.rf_liquid_value || asset.fixed_current_value || asset.current_price,
            balance: rfPrincipalBalance(asset).value,
          } : null;
        })();
        return {
          headers,
          rowCount: rows.length,
          positionButtons: buttons,
          wrapClientW: wrap.clientWidth,
          wrapScrollW: wrap.scrollWidth,
          overflowTable: wrap.scrollWidth > wrap.clientWidth,
          overflowPage: document.documentElement.scrollWidth > window.innerWidth,
          wrappedNumbers,
          metrics,
        };
      });

      assert.deepEqual(snapshot.headers, EXPECTED_HEADERS, `colunas incorretas em ${viewport.label}`);
      assert.ok(snapshot.rowCount > 0, `sem linhas RF em ${viewport.label}`);
      assert.ok(snapshot.metrics, `ativo RF elegivel ausente em ${viewport.label}`);
      assert.deepEqual(snapshot.positionButtons.map(b => b.text), ['Detalhes', 'Movimentar', 'Resgatar', '✎ Editar'], `acoes da posicao incorretas em ${viewport.label}`);
      for (const button of snapshot.positionButtons) {
        assert.ok(button.h >= 44, `touch target < 44px: ${button.text} h=${button.h}`);
      }
      assert.deepEqual(snapshot.wrappedNumbers, [], `valores numericos quebrados em ${viewport.label}`);

      if (viewport.width >= 1366) {
        assert.equal(snapshot.overflowTable, false, `scroll interno da tabela em ${viewport.label} (scrollWidth=${snapshot.wrapScrollW} clientWidth=${snapshot.wrapClientW})`);
      }
      assert.equal(snapshot.overflowPage, false, `overflow horizontal da pagina em ${viewport.label}`);

      const id = snapshot.metrics.id;

      await page.locator('.premium-rf-position-row:first-child button', { hasText: 'Movimentar' }).click();
      await page.locator('.rf-event-editor').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('.rf-event-editor button', { hasText: 'Cancelar' }).click();
      await page.locator('.rf-event-editor').waitFor({ state: 'detached', timeout: 5000 });

      await page.locator('.premium-rf-position-row:first-child button', { hasText: 'Resgatar' }).click();
      await page.locator('.rf-event-editor').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('.rf-event-editor button', { hasText: 'Cancelar' }).click();
      await page.locator('.rf-event-editor').waitFor({ state: 'detached', timeout: 5000 });

      const after = await page.evaluate(id => {
        const asset = S.assets.find(item => rfAssetEventId(item) === id);
        return asset ? {
          id: rfAssetEventId(asset),
          applied: assetAppliedValue(asset),
          current: assetCurrentValue(asset),
          juros: assetJurosValue(asset),
          rentab: assetRentabPct(asset),
          liquid: asset.rf_liquid_value || asset.fixed_current_value || asset.current_price,
          balance: rfPrincipalBalance(asset).value,
        } : null;
      }, id);
      assert.deepEqual(after, snapshot.metrics, `dados financeiros mudaram em ${viewport.label}`);

      assert.equal(errors.length, 0, `console errors em ${viewport.label}: ${errors.join(' | ')}`);
      assert.equal(pageErrors.length, 0, `page errors em ${viewport.label}: ${pageErrors.join(' | ')}`);
      assert.equal(requestFailures.length, 0, `request failures em ${viewport.label}: ${requestFailures.join(' | ')}`);
    } finally {
      if (context) await context.close();
      if (browser) await browser.close();
      harness.server.close();
    }
  });
}
