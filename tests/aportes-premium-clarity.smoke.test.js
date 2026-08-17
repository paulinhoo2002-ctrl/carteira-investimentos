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
      const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
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

const labels = [
  'Total aportado',
  'Média mensal',
  'Maior aporte',
  'Meses com aportes',
];

for (const viewport of viewports) {
  test(`Aportes Premium Clarity - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge n\u00e3o encontrado para o smoke Playwright');
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
      await page.evaluate(() => go('aportes'));
      await page.waitForSelector('.aporte-premium', { state: 'visible', timeout: 5000 });
      await page.waitForSelector('.ap-summary', { state: 'visible', timeout: 5000 });

      const readSnapshot = () => page.evaluate(expectedLabels => {
        const visible = element => {
          if (!element) return false;
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && box.width > 0 && box.height > 0;
        };
        const metrics = expectedLabels.map(label => {
          const labelNode = [...document.querySelectorAll('.aporte-contribution-grid .cl')].find(node => node.textContent.trim() === label);
          const card = labelNode?.closest('.card');
          const value = card?.querySelector('.cv');
          const valueBox = value?.getBoundingClientRect();
          return { label, visible: visible(card) && visible(value), value: value?.textContent.trim() || '', valueHeight: valueBox?.height || 0, overflow: value ? getComputedStyle(value).overflow : '' };
        });
        const cta = [...document.querySelectorAll('.ap-toolbar .btn')].find(button => button.textContent.includes('Nova movimenta'));
        const tabs = [...document.querySelectorAll('.aporte-view-tab')];
        return {
          metrics,
          cta: cta ? { text: cta.textContent.trim(), width: cta.getBoundingClientRect().width, height: cta.getBoundingClientRect().height } : null,
          tabs: tabs.map(tab => ({ text: tab.textContent.trim(), width: tab.getBoundingClientRect().width, height: tab.getBoundingClientRect().height })),
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      }, labels);
      const snapshot = await readSnapshot();

      for (const metric of snapshot.metrics) {
        assert.equal(metric.visible, true, `${metric.label} n\u00e3o est\u00e1 vis\u00edvel em ${viewport.label}`);
        assert.ok(metric.value.length > 0, `${metric.label} sem valor em ${viewport.label}`);
        assert.ok(metric.valueHeight > 0, `${metric.label} sem bounding box em ${viewport.label}`);
        assert.notEqual(metric.overflow, 'hidden', `${metric.label} est\u00e1 cortado em ${viewport.label}`);
        assert.notEqual(metric.overflow, 'clip', `${metric.label} est\u00e1 cortado em ${viewport.label}`);
      }
      assert.ok(snapshot.cta, `CTA Nova movimenta\u00e7\u00e3o ausente em ${viewport.label}`);
      assert.ok(snapshot.cta.width >= 44 && snapshot.cta.height >= 44, `CTA Nova movimenta\u00e7\u00e3o menor que 44px em ${viewport.label}`);
      for (const tab of snapshot.tabs) assert.ok(tab.width >= 44 && tab.height >= 44, `Aba ${tab.text} menor que 44px em ${viewport.label}`);
      assert.equal(snapshot.overflow, false, `overflow horizontal em ${viewport.label}`);

      const before = snapshot.metrics.map(metric => metric.value);
      await page.evaluate(() => go('dashboard'));
      await page.evaluate(() => go('aportes'));
      await page.waitForSelector('.aporte-contribution-grid', { state: 'visible', timeout: 5000 });
      const after = await readSnapshot();
      assert.deepEqual(after.metrics.map(metric => metric.value), before, `valores dos KPIs mudaram ao navegar em ${viewport.label}`);
      assert.equal(errors.length, 0, `console/pageerror em ${viewport.label}: ${errors.join(' | ')}`);
      assert.equal(requestFailures.length, 0, `requestfailed em ${viewport.label}: ${requestFailures.join(' | ')}`);
      await context.close();
    } finally {
      await browser.close();
      harness.server.close();
    }
  });
}
