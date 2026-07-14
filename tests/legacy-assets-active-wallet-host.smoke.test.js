const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

let hostUrl = process.env.ACTIVE_WALLET_HOST_URL ?? null;
const browserTest = test;

function resolveBrowserExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate));
}

browserTest('active wallet host smoke navigation', async () => {
  const projectRoot = path.join(__dirname, '..');
  const serverHandle = hostUrl ? null : await startStaticServer(projectRoot);
  const smokeUrl = hostUrl ?? serverHandle.url;
  const executablePath = resolveBrowserExecutable();
  assert.ok(executablePath, 'Chrome or Edge executable not found for active wallet host smoke test');

  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({
    executablePath,
    headless: true,
  });

  try {
    await runViewportScenario(browser, smokeUrl, { width: 1366, height: 768 }, async (page) => {
      await assertPageReady(page);
      await page.locator('.sidebar__item').nth(5).click();
      await assert.equal(await page.locator('h2#page-reports').textContent(), 'Previa somente leitura de Relatorios');
      await assert.equal(await page.locator('.assets-report__refresh-button').count(), 1);
      await assert.equal(await page.locator('.assets-report__table').count(), 1);
      await assert.equal(await page.getByText('PETR4').count() > 0, true);
      await assert.equal(await page.getByText('ITUB4').count() > 0, true);
      await assert.equal(await page.getByText('WEGE3').count() > 0, true);
      await assert.equal(await page.getByText('MXRF11').count(), 0);
      await assert.equal(
        await page.locator('.assets-report__notice').textContent(),
        'Snapshot legado somente leitura. React nao escreve na fonte.',
      );
      assert.match(await page.locator('.assets-report__diagnostic').innerText(), /Carteira ativa real/);
      assert.match(await page.locator('.assets-report__diagnostic').innerText(), /3 ativos/);
      assert.match(await page.locator('.assets-report__diagnostic').innerText(), /Leitura inicial pronta/);
      await assert.equal(await page.locator('.assets-report__diagnostic').getAttribute('data-origin-mode'), 'real-wallet');
      await assert.equal(await page.locator('.assets-report__diagnostic').getAttribute('data-refresh-status'), 'idle');
    });

    await runViewportScenario(browser, smokeUrl, { width: 390, height: 844 }, async (page) => {
      await assertPageReady(page);
      const menuButton = page.locator('.modern-menu-button');
      await menuButton.focus();
      await menuButton.press('Enter');
      await assert.equal(await menuButton.getAttribute('aria-expanded'), 'true');
      await page.locator('#modern-sidebar .sidebar__item').nth(5).press('Enter');
      await assert.equal(await page.locator('h2#page-reports').textContent(), 'Previa somente leitura de Relatorios');
      await assert.equal(await page.locator('.assets-report__refresh-button').count(), 1);
      await assert.equal(await page.getByText('PETR4').count() > 0, true);
      await assert.equal(await page.getByText('ITUB4').count() > 0, true);
      await assert.equal(await page.getByText('WEGE3').count() > 0, true);
      await assert.equal(await page.getByText('MXRF11').count(), 0);
      await assert.equal(await menuButton.getAttribute('aria-expanded'), 'false');
      await assert.equal(await page.locator('.assets-report__diagnostic').getAttribute('data-origin-mode'), 'real-wallet');
      await assert.equal(await page.locator('.assets-report__diagnostic').getAttribute('data-refresh-status'), 'idle');
    });
  } finally {
    await browser.close();
    await new Promise((resolve) => {
      if (!serverHandle) return resolve();
      serverHandle.server.close(() => resolve());
    });
  }
});

browserTest('legacy reports experimental entry opens host and returns to legacy', async () => {
  const projectRoot = path.join(__dirname, '..');
  const serverHandle = hostUrl ? null : await startStaticServer(projectRoot);
  const smokeUrl = hostUrl ?? serverHandle.url;
  const legacyUrl = buildLegacyUrl(smokeUrl);
  const executablePath = resolveBrowserExecutable();
  assert.ok(executablePath, 'Chrome or Edge executable not found for legacy entry smoke test');

  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({
    executablePath,
    headless: true,
  });

  try {
    await runViewportScenario(browser, legacyUrl, { width: 1366, height: 768 }, async (page) => {
      await assertLegacyPageReady(page);
      await page.evaluate(() => go('relatorios'));
      await assert.equal(await page.locator('.reports-experiment-entry').count(), 1);
      await assert.equal(
        await page.locator('.reports-experiment-entry__title').textContent(),
        'Relatório experimental somente leitura',
      );

      await assert.equal(await page.getByRole('button', { name: 'Abrir relatório experimental' }).count(), 1);
      await page.getByRole('button', { name: 'Abrir relatório experimental' }).click();
      await page.waitForURL((url) => url.href.includes('activeWalletHost=1') && url.searchParams.get('testMode') === '1');
      await page.locator('#readonly-reports-experimental-banner').waitFor();
      await assert.equal(await page.locator('#readonly-reports-experimental-banner').count(), 1);
      await assert.equal(
        await page.locator('#readonly-reports-experimental-banner .reports-experiment-entry__title').textContent(),
        'Relatório experimental somente leitura',
      );
      await assert.equal(await page.getByRole('button', { name: 'Voltar ao legado' }).count(), 1);
      await page.getByRole('button', { name: 'Voltar ao legado' }).click();
      await page.waitForURL((url) => !url.href.includes('activeWalletHost=1') && url.searchParams.get('testMode') === '1');
      await page.locator('.hdr-title').waitFor();
      await assert.equal(await page.locator('#readonly-reports-experimental-banner').count(), 0);
      await assert.equal(await page.locator('.hdr-title').textContent(), 'Carteira de Investimentos');
      await assert.equal(await page.locator('.reports-experiment-entry').count(), 0);
    });

    await runViewportScenario(browser, legacyUrl, { width: 390, height: 844 }, async (page) => {
      await assertLegacyPageReady(page);
      await page.evaluate(() => go('relatorios'));
      await assert.equal(await page.locator('.reports-experiment-entry').count(), 1);
      await page.getByRole('button', { name: 'Abrir relatório experimental' }).click();
      await page.waitForURL((url) => url.href.includes('activeWalletHost=1') && url.searchParams.get('testMode') === '1');
      await page.locator('#readonly-reports-experimental-banner').waitFor();
      await assert.equal(await page.locator('#readonly-reports-experimental-banner').count(), 1);
      await page.getByRole('button', { name: 'Voltar ao legado' }).click();
      await page.waitForURL((url) => !url.href.includes('activeWalletHost=1') && url.searchParams.get('testMode') === '1');
      await page.locator('.hdr-title').waitFor();
      await assert.equal(await page.locator('#readonly-reports-experimental-banner').count(), 0);
      await assert.equal(await page.locator('.hdr-title').textContent(), 'Carteira de Investimentos');
      await assert.equal(await page.locator('.reports-experiment-entry').count(), 0);
    });
  } finally {
    await browser.close();
    await new Promise((resolve) => {
      if (!serverHandle) return resolve();
      serverHandle.server.close(() => resolve());
    });
  }
});

async function runViewportScenario(browser, url, viewport, scenario) {
  const context = await browser.newContext({
    viewport,
    hasTouch: viewport.width <= 430,
    isMobile: viewport.width <= 430,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  page.on('requestfailed', (request) => {
    failedRequests.push(request.url());
  });

  await page.goto(url, { waitUntil: 'networkidle' });

  await scenario(page);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  assert.equal(overflow, true, 'Horizontal overflow detected');
  assert.equal(consoleErrors.length, 0, `Console errors: ${consoleErrors.join(' | ')}`);
  assert.equal(pageErrors.length, 0, `Page errors: ${pageErrors.join(' | ')}`);
  assert.equal(failedRequests.length, 0, `Failed requests: ${failedRequests.join(' | ')}`);

  const requestOrigins = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => {
        try {
          return new URL(entry.name).origin;
        } catch {
          return 'invalid';
        }
      }),
  );

  const allowedOrigin = url ? new URL(url).origin : null;
  const externalRequests = requestOrigins.filter(
    (origin) => origin !== allowedOrigin && origin !== 'null',
  );
  assert.equal(externalRequests.length, 0, `External requests found: ${externalRequests.join(', ')}`);

  await context.close();
}

async function assertPageReady(page) {
  await page.locator('.hdr-title').waitFor();
  await assert.equal(await page.locator('.hdr-title').textContent(), 'Carteira de Investimentos');
  await assert.match(await page.locator('.hdr-sub').textContent(), /Modo de teste local/);
  await assert.equal(await page.locator('.tab').count() >= 7, true);
  assert.equal(await page.evaluate(() => Object.prototype.hasOwnProperty.call(window, 'buildReportAssetRow')), false);
  assert.equal(await page.evaluate(() => Object.prototype.hasOwnProperty.call(window, 'createLegacyReportsReadonlySource')), false);
}

async function assertLegacyPageReady(page) {
  await page.locator('.hdr-title').waitFor();
  await assert.equal(await page.locator('.hdr-title').textContent(), 'Carteira de Investimentos');
  await assert.match(await page.locator('.hdr-sub').textContent(), /Modo de teste local/);
  await assert.equal(await page.locator('.tab').count() >= 7, true);
}

async function startStaticServer(rootDir) {
  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (!pathname || pathname === '/') pathname = '/index.html';
      const filePath = path.normalize(path.join(rootDir, pathname));
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }

      const content = await fsp.readFile(filePath);
      res.writeHead(200, { 'Content-Type': contentType(filePath) });
      res.end(content);
    } catch (error) {
      const status = error && error.code === 'ENOENT' ? 404 : 500;
      res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(status === 404 ? 'Not found' : 'Internal error');
    }
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const { port } = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}/index.html`,
    url: `http://127.0.0.1:${port}/index.html?activeWalletHost=1&testMode=1`,
  };
}

function buildLegacyUrl(urlLike) {
  const url = new URL(urlLike);
  url.searchParams.delete('activeWalletHost');
  url.searchParams.set('testMode', '1');
  return url.toString();
}

function contentType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.ico':
      return 'image/x-icon';
    case '.map':
      return 'application/json; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}
