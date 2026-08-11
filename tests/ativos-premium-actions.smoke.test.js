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
      res.writeHead(200, { 'Content-Type': pathname.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain' });
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
  test(`Ativos Premium Actions - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge nao encontrado para o smoke Playwright');
    const harness = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath, headless: true });
    const errors = [];
    const requestFailures = [];
    try {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.width <= 430,
        isMobile: viewport.width <= 430,
      });
      const page = await context.newPage();
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
      page.on('requestfailed', request => requestFailures.push(`${request.url()} (${request.failure()?.errorText || 'unknown'})`));
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => go('ativos'));
      await page.waitForSelector('.ag', { state: 'visible', timeout: 5000 });
      await page.locator('.ag').first().locator('summary').click();

      const snapshot = await page.evaluate(() => {
        const visible = element => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
        };
        const rows = [...document.querySelectorAll('.ag-table tbody tr')].filter(visible);
        const rfRows = [...document.querySelectorAll('.rf-table tbody tr')].filter(visible);
        const actions = [...document.querySelectorAll('.asset-actions button')].filter(visible).map(button => ({
          text: button.textContent.trim(),
          width: button.getBoundingClientRect().width,
          height: button.getBoundingClientRect().height,
        }));
        return {
          normalRows: rows.length,
          rfRows: rfRows.length,
          normalIdentity: rows[0]?.textContent.trim() || '',
          rfIdentity: rfRows[0]?.textContent.trim() || '',
          hasBuy: actions.some(action => action.text === 'Comprar'),
          hasSell: actions.some(action => action.text === 'Vender'),
          hasMove: actions.some(action => action.text === 'Movimentar'),
          hasRedeem: actions.some(action => action.text === 'Resgatar'),
          hasMenu: actions.some(action => action.text === 'Mais'),
          actions,
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      });
      assert.ok(snapshot.normalRows > 0, `ativos variaveis nao visiveis em ${viewport.label}`);
      assert.ok(snapshot.rfRows > 0, `ativos RF nao visiveis em ${viewport.label}`);
      assert.ok(snapshot.normalIdentity.length > 0 && snapshot.rfIdentity.length > 0, `identidade do ativo ausente em ${viewport.label}`);
      assert.equal(snapshot.hasBuy, true, `Comprar ausente em ${viewport.label}`);
      assert.equal(snapshot.hasSell, true, `Vender ausente em ${viewport.label}`);
      assert.equal(snapshot.hasMove, true, `Movimentar ausente em ${viewport.label}`);
      assert.equal(snapshot.hasRedeem, true, `Resgatar ausente em ${viewport.label}`);
      assert.equal(snapshot.hasMenu, true, `menu contextual ausente em ${viewport.label}`);
      assert.equal(snapshot.overflow, false, `overflow horizontal em ${viewport.label}`);
      for (const action of snapshot.actions) assert.ok(action.width >= 44 && action.height >= 44, `acao menor que 44px: ${action.text} (${action.width}x${action.height}) em ${viewport.label}`);

      const beforeData = { normal: snapshot.normalIdentity, rf: snapshot.rfIdentity };
      const firstMenu = page.locator('.asset-action-menu').first();
      await firstMenu.locator('button[aria-haspopup="menu"]').click();
      await assert.doesNotReject(async () => firstMenu.locator('.asset-action-menu-panel.open').waitFor({ state: 'visible', timeout: 1000 }));
      await page.keyboard.press('Escape');
      await assert.doesNotReject(async () => firstMenu.locator('.asset-action-menu-panel.open').waitFor({ state: 'hidden', timeout: 1000 }));
      const afterData = await page.evaluate(() => ({
        normal: document.querySelector('.ag-table tbody tr')?.textContent.trim() || '',
        rf: document.querySelector('.rf-table tbody tr')?.textContent.trim() || '',
      }));
      assert.deepEqual(afterData, beforeData, `dados do ativo mudaram ao abrir/fechar menu em ${viewport.label}`);
      await context.close();
    } finally {
      await browser.close();
      harness.server.close();
    }
    assert.deepEqual(errors, [], `telemetria console/pageerror em ${viewport.label}: ${errors.join(' | ')}`);
    assert.deepEqual(requestFailures, [], `requestfailed em ${viewport.label}: ${requestFailures.join(' | ')}`);
  });
}
