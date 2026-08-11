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
      const mime = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
      };
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

const metricLabels = [
  'Patrimônio atual',
  'Total investido',
  'Resultado geral',
  'Rentabilidade',
  'Recebido no mês',
  'Média 12 meses',
  'Meta mensal',
  'Falta para meta — média 12M',
];

for (const viewport of viewports) {
  test(`Dashboard Premium Clarity - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge não encontrado para o smoke Playwright');

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
      page.on('console', message => {
        if (message.type() === 'error') errors.push(`console: ${message.text()}`);
      });
      page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
      page.on('requestfailed', request => requestFailures.push(`${request.url()} (${request.failure()?.errorText || 'unknown'})`));

      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.waitForSelector('.dashboard-home-summary', { state: 'visible', timeout: 5000 });
      await page.waitForSelector('.dashboard-home-income', { state: 'visible', timeout: 5000 });

      const snapshot = await page.evaluate(labels => {
        const visible = element => {
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && box.width > 0 && box.height > 0;
        };
        return {
          metrics: labels.map(label => {
            const labelNode = [...document.querySelectorAll('.premium-metric-label')].find(node => node.textContent.trim() === label);
            const card = labelNode?.closest('.premium-metric');
            const value = card?.querySelector('.premium-metric-value');
            const cardBox = card?.getBoundingClientRect();
            const valueBox = value?.getBoundingClientRect();
            return {
              label,
              visible: !!card && visible(card) && !!value && visible(value),
              text: value?.textContent.trim() || '',
              cardWidth: cardBox?.width || 0,
              cardHeight: cardBox?.height || 0,
              valueWidth: valueBox?.width || 0,
              valueHeight: valueBox?.height || 0,
              valueScrollHeight: value?.scrollHeight || 0,
              valueClientHeight: value?.clientHeight || 0,
            };
          }),
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          buttons: [...document.querySelectorAll('.dashboard-home-summary button, .dashboard-home-income button')]
            .filter(visible)
            .map(button => ({ text: button.textContent.trim(), width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })),
        };
      }, metricLabels);

      for (const metric of snapshot.metrics) {
        assert.equal(metric.visible, true, `${metric.label} não está visível em ${viewport.label}`);
        assert.ok(metric.text.length > 0, `${metric.label} não tem valor em ${viewport.label}`);
        assert.ok(metric.cardWidth > 0 && metric.cardHeight > 0, `${metric.label} sem bounding box em ${viewport.label}`);
        assert.ok(metric.valueWidth > 0 && metric.valueHeight > 0, `${metric.label} sem valor visível em ${viewport.label}`);
        assert.ok(metric.valueScrollHeight <= metric.valueClientHeight + 1, `${metric.label} quebrou verticalmente em ${viewport.label}`);
      }
      assert.equal(snapshot.overflow, false, `overflow horizontal em ${viewport.label}`);
      for (const button of snapshot.buttons) {
        assert.ok(button.width >= 44 && button.height >= 44, `CTA menor que 44px: ${button.text} em ${viewport.label}`);
      }
      assert.equal(errors.length, 0, `telemetria console/pageerror em ${viewport.label}: ${errors.join(' | ')}`);
      assert.equal(requestFailures.length, 0, `requestfailed em ${viewport.label}: ${requestFailures.join(' | ')}`);

      await context.close();
    } finally {
      await browser.close();
      harness.server.close();
    }
  });
}
