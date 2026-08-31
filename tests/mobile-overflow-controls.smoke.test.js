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
  { width: 360, height: 800, label: '360x800' },
  { width: 390, height: 844, label: '390x844' },
  { width: 430, height: 932, label: '430x932' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1024, height: 768, label: '1024x768' },
  { width: 1366, height: 768, label: '1366x768' },
];

function pageOverflowExpr() {
  return `(()=>{const s=document.scrollingElement;return Math.max(s.scrollWidth,document.body?document.body.scrollWidth:0)-window.innerWidth})()`;
}

for (const viewport of viewports) {
  test(`Mobile overflow controls - ${viewport.label}`, async () => {
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
      page.on('requestfailed', request => { if (!request.url().includes('favicon')) requestFailures.push(`${request.url()} (${request.failure()?.errorText || 'unknown'})`); });
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => typeof go === 'function' && typeof openQuickMovement === 'function');

      const pageOverflow = async () => page.evaluate(pageOverflowExpr());

      // IA: o modo-bar fica dentro de <details class="ai-compact-details"> (recolhido por padrao).
      // O teste deve: (1) localizar o painel "Leituras complementares", (2) expandi-lo,
      // (3) entao verificar os controles de modo quanto a overflow, viewport e altura minima.
      await page.evaluate(() => go('ia'));
      const detailsLocator = page.locator('.ai-compact-details').first();
      await detailsLocator.waitFor({ state: 'attached', timeout: 5000 });
      assert.equal(await detailsLocator.evaluate(el => el.open), false, `details de Insights deveria iniciar recolhido em ${viewport.label}`);
      assert.ok(await detailsLocator.locator('summary').isVisible(), `summary "Leituras complementares" nao visivel em ${viewport.label}`);
      await detailsLocator.locator('summary').click();
      await page.waitForSelector('.ai-modebar', { state: 'visible', timeout: 5000 });
      assert.equal(await detailsLocator.evaluate(el => el.open), true, `details de Insights nao expandiu em ${viewport.label}`);
      const ia = await page.evaluate(() => {
        const vw = window.innerWidth;
        const bar = document.querySelector('.ai-modebar');
        const cs = getComputedStyle(bar);
        const buttons = [...bar.querySelectorAll('button')].map(btn => {
          const r = btn.getBoundingClientRect();
          return { text: btn.textContent.trim(), left: r.left, right: r.right, height: r.height, fullyInViewport: r.left >= -1 && r.right <= vw + 1 };
        });
        const conc = buttons.find(b => b.text === 'Concentração');
        return { barScrollWidth: bar.scrollWidth, barClientWidth: bar.clientWidth, flexWrap: cs.flexWrap, buttons, concentracao: conc || null, allVisible: buttons.every(b => b.fullyInViewport) };
      });
      assert.equal(ia.buttons.length, 4, `modos da IA incompletos em ${viewport.label}`);
      assert.ok(ia.concentracao, `Concentracao ausente em ${viewport.label}`);
      assert.ok(ia.concentracao.fullyInViewport, `Concentracao cortada em ${viewport.label} (right=${Math.round(ia.concentracao.right)} vw=${viewport.width})`);
      assert.ok(ia.concentracao.height >= 44, `Concentracao menor que 44px em ${viewport.label}`);
      assert.ok(ia.allVisible, `algum modo da IA cortado em ${viewport.label}`);
      assert.equal(await pageOverflow(), 0, `pageOverflow na IA em ${viewport.label}`);

      // Dividendos: todas as abas visiveis, ultima (Revisao) alcancavel
      await page.evaluate(() => go('dividendos'));
      await page.waitForSelector('.div-premium-tabs', { state: 'visible', timeout: 5000 });
      const div = await page.evaluate(() => {
        const vw = window.innerWidth;
        const tabs = document.querySelector('.div-premium-tabs');
        const list = [...tabs.querySelectorAll('.div-premium-tab')].map(btn => {
          const r = btn.getBoundingClientRect();
          return { text: btn.textContent.trim(), left: r.left, right: r.right, fullyInViewport: r.left >= -1 && r.right <= vw + 1 };
        });
        return { list, last: list[list.length - 1], allVisible: list.every(t => t.fullyInViewport) };
      });
      assert.equal(div.list.length, 6, `abas de dividendos incompletas em ${viewport.label}`);
      assert.ok(div.allVisible, `alguma aba de dividendos cortada em ${viewport.label}`);
      assert.ok(div.last.fullyInViewport, `aba Revisao cortada em ${viewport.label} (right=${Math.round(div.last.right)} vw=${viewport.width})`);
      assert.equal(await pageOverflow(), 0, `pageOverflow em dividendos ${viewport.label}`);

      // Ativos: acoes (Comprar/Vender/Mais e Movimentar/Resgatar) visiveis e sem sobreposicao
      await page.evaluate(() => go('ativos'));
      await page.waitForSelector('.ag', { state: 'visible', timeout: 5000 });
      await page.locator('.ag').first().locator('summary').click();
      await page.waitForTimeout(150);
      const ativ = await page.evaluate(() => {
        const vw = window.innerWidth;
        const visible = element => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
        };
        const wrappers = [...document.querySelectorAll('.ag-table .tw, .rf-table-wrap')].filter(w => visible(w) && w.querySelector('tbody tr'));
        const tables = wrappers.map(w => {
          const firstRow = w.querySelector('tbody tr');
          const actions = firstRow.querySelector('.asset-actions');
          const buttons = [...actions.querySelectorAll('button')].filter(visible).map(btn => {
            const r = btn.getBoundingClientRect();
            return { text: btn.textContent.trim(), left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height, fullyInViewport: r.left >= -1 && r.right <= vw + 1 };
          });
          let overlap = false;
          for (let i = 0; i < buttons.length; i++) {
            for (let j = i + 1; j < buttons.length; j++) {
              const a = buttons[i], b = buttons[j];
              const xOverlap = a.left < b.right && b.left < a.right;
              const yOverlap = a.top < b.bottom && b.top < a.bottom;
              if (xOverlap && yOverlap) overlap = true;
            }
          }
          return { cls: w.className, sticky: getComputedStyle(firstRow.lastElementChild).position, buttons, buttonsOverlap: overlap, actionsVisible: buttons.every(b => b.fullyInViewport) };
        });
        return { tables, anyTable: tables.length > 0 };
      });
      assert.ok(ativ.anyTable, `nenhuma tabela de ativos visivel em ${viewport.label}`);
      for (const table of ativ.tables) {
        assert.ok(table.buttons.length >= 2, `acoes ausentes em ${viewport.label} (${table.cls})`);
        assert.ok(table.actionsVisible, `acoes cortadas em ${viewport.label} (${table.cls})`);
        assert.equal(table.buttonsOverlap, false, `acoes sobrepostas em ${viewport.label} (${table.cls})`);
        for (const button of table.buttons) assert.ok(button.height >= 44, `acao menor que 44px em ${viewport.label}: ${button.text} (${Math.round(button.height)}px)`);
        if (viewport.width <= 1024) {
          assert.equal(table.sticky, 'sticky', `coluna de acoes nao sticky em ${viewport.label} (${table.cls})`);
        } else {
          assert.equal(table.sticky, 'static', `sticky indevido em desktop ${viewport.label} (${table.cls})`);
        }
      }
      assert.equal(await pageOverflow(), 0, `pageOverflow em ativos ${viewport.label}`);

      await context.close();
    } finally {
      await browser.close();
      harness.server.close();
    }
    assert.deepEqual(errors, [], `telemetria console/pageerror em ${viewport.label}: ${errors.join(' | ')}`);
    assert.deepEqual(requestFailures, [], `requestfailed em ${viewport.label}: ${requestFailures.join(' | ')}`);
  });
}
