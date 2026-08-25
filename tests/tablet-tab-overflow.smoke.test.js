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
      const ext = path.extname(filePath).toLowerCase();
      const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      res.end(content);
    } catch (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500);
      res.end('');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
}

const mainTabs = ['Dashboard', 'Ativos', 'Aportes', 'Metas', 'Dividendos', 'Rentabilidade', 'Rebalancear', 'IA'];
const reportGroupItems = ['Relatórios', 'IRPF', 'Auditoria'];

const viewports = [
  { width: 960, height: 768, label: '960x768', desktopTabs: false },
  { width: 961, height: 768, label: '961x768', desktopTabs: false },
  { width: 1024, height: 768, label: '1024x768', desktopTabs: false },
  { width: 1100, height: 768, label: '1100x768', desktopTabs: false },
  { width: 1180, height: 768, label: '1180x768', desktopTabs: false },
  { width: 1200, height: 768, label: '1200x768', desktopTabs: true },
  { width: 1366, height: 768, label: '1366x768', desktopTabs: true },
];

for (const viewport of viewports) {
  test(`Tabs overflow 1024px - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge nao encontrado para o smoke de tabs');
    const { chromium } = await import('playwright-core');
    const harness = await startServer(path.join(__dirname, '..'));
    const browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    const errors = [];
    const failures = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('requestfailed', request => failures.push(request.url()));

    try {
      await page.goto(harness.url, { waitUntil: 'networkidle' });

      const result = await page.evaluate(() => {
        const desktop = document.querySelector('.tabs-desktop');
        const mobile = document.querySelector('.tabs-mobile');
        const visible = element => {
          if (!element) return false;
          const box = element.getBoundingClientRect();
          return getComputedStyle(element).display !== 'none' && box.width > 0 && box.height > 0;
        };
        return {
          pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
          desktopVisible: visible(desktop),
          mobileVisible: visible(mobile),
          mobileTabLabels: mobile ? [...mobile.querySelectorAll('button.tab')].map(b => b.textContent.trim()) : [],
          groupLabel: mobile ? (mobile.querySelector('details.tab-menu summary.tab') || { textContent: '' }).textContent.trim() : '',
        };
      });

      assert.equal(result.pageOverflow, 0, `pageOverflow deve ser 0 em ${viewport.label}`);
      assert.equal(result.desktopVisible, viewport.desktopTabs, `tabs-desktop esperadas como ${viewport.desktopTabs} em ${viewport.label}`);
      assert.equal(result.mobileVisible, !viewport.desktopTabs, `tabs-mobile esperadas como ${!viewport.desktopTabs} em ${viewport.label}`);

      if (!viewport.desktopTabs) {
        for (const label of mainTabs) {
          assert.ok(result.mobileTabLabels.some(text => text.includes(label)), `tab '${label}' acessivel via tabs-mobile em ${viewport.label}`);
        }
        assert.ok(result.groupLabel.includes('Relatórios'), `grupo 'Relatórios' acessivel via tabs-mobile em ${viewport.label}`);
        const groupItems = await page.evaluate(() => {
          const group = document.querySelector('.tabs-mobile details.tab-menu');
          group.setAttribute('open', '');
          return [...group.querySelectorAll('.tab-menu-panel button')].map(b => b.textContent.trim());
        });
        assert.equal(groupItems.length, 3, `grupo Relatórios com 3 itens em ${viewport.label}`);
        for (const item of reportGroupItems) {
          assert.ok(groupItems.some(text => text.includes(item)), `item '${item}' do grupo acessivel em ${viewport.label}`);
        }
        await page.click('.tabs-mobile details.tab-menu .tab-menu-panel button:text("Auditoria")');
        await page.waitForTimeout(60);
        assert.equal(await page.evaluate(() => S.tab), 'auditoria', `navegacao via grupo funciona em ${viewport.label}`);
        await page.click('.tabs-mobile button.tab:text("Dividendos")');
        await page.waitForTimeout(60);
        assert.equal(await page.evaluate(() => S.tab), 'dividendos', `navegacao por tab funciona em ${viewport.label}`);
      } else {
        const desktopCount = await page.evaluate(() => document.querySelectorAll('.tabs-desktop button.tab, .tabs-desktop summary.tab').length);
        assert.ok(desktopCount >= mainTabs.length, `tabs desktop renderizadas em ${viewport.label}`);
        await page.click('.tabs-desktop button.tab:text("Rentabilidade")');
        await page.waitForTimeout(60);
        assert.equal(await page.evaluate(() => S.tab), 'rentabilidade', `navegacao desktop funciona em ${viewport.label}`);
      }

      assert.deepEqual(errors, []);
      assert.deepEqual(failures, []);
    } finally {
      await context.close();
      await browser.close();
      harness.server.close();
    }
  });
}
