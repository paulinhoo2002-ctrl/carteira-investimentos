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
  ].filter(Boolean).find(c => { try { fs.accessSync(c); return true; } catch { return false; } });
}

async function startServer(rootDir) {
  const server = http.createServer(async (req, res) => {
    try {
      const p = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      const f = p === '/' ? '/index.html' : p;
      const fp = path.normalize(path.join(rootDir, f));
      if (!fp.startsWith(rootDir)) { res.writeHead(403); res.end(''); return; }
      const c = await fsp.readFile(fp);
      const m = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
      res.writeHead(200, { 'Content-Type': m[path.extname(fp).toLowerCase()] || 'text/plain' });
      res.end(c);
    } catch (e) {
      res.writeHead(e.code === 'ENOENT' ? 404 : 500);
      res.end('');
    }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
}

const viewports = [
  { width: 390, height: 844, label: '390x844' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1920, height: 1080, label: '1920x1080' },
];

for (const vp of viewports) {
  test(`Limpar filtros de Dividendos - ${vp.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge nao encontrado');
    const harness = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.width <= 430,
      hasTouch: vp.width <= 430,
    });
    const page = await context.newPage();
    const errors = [];
    const failures = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
    page.on('requestfailed', req => failures.push(req.url()));
    try {
      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => go('dividendos'));
      await page.waitForFunction(() => document.querySelector('.div-premium') !== null, { timeout: 10000 });

      // Toolbar de filtros existe somente fora do modo visao geral
      await page.evaluate(() => setDividendViewMode('received'));
      await page.waitForSelector('.div-premium-toolbar', { state: 'visible', timeout: 10000 });

      // Correcao de escopo: a funcao deve estar global
      const typeofGlobal = await page.evaluate(() => typeof globalThis.clearAllDividendFilters);
      assert.equal(typeofGlobal, 'function', 'clearAllDividendFilters deve ser global');

      // Baseline financeiro
      const baseline = await page.evaluate(() => ({
        total: S.proventos.reduce((sum, item) => sum + Number(item.valor || 0), 0),
        records: S.proventos.length,
      }));

      // Botao real "Limpar filtros" inicia desabilitado
      const clearBtn = page.locator('.div-premium-toolbar button:has-text("Limpar filtros")');
      await clearBtn.waitFor({ state: 'visible', timeout: 10000 });
      assert.equal(await clearBtn.isDisabled(), true, 'Limpar filtros deve iniciar desabilitado');

      // Aplicar filtro real (chip de tipo)
      const chip = page.locator('.div-premium-chip:not(.on)').first();
      await chip.click();
      await page.waitForTimeout(150);

      // Provar estado filtrado
      const filtered = await page.evaluate(() => ({
        filter: S.dividendFilter,
        activeChips: [...document.querySelectorAll('.div-premium-chip.on')].filter(e => !e.closest('.div-collapsible')).map(e => e.textContent.trim()),
      }));
      assert.equal(filtered.filter, 'dividend', 'Filtro aplicado deve ser "dividend"');
      assert.equal(filtered.activeChips.length, 1, 'Deve haver exatamente um chip ativo');
      assert.ok(filtered.activeChips[0].includes('Dividendos'), `Chip ativo inesperado: ${filtered.activeChips[0]}`);
      assert.equal(await clearBtn.isDisabled(), false, 'Limpar filtros deve habilitar apos aplicar filtro');

      // Clicar no botao REAL (mesmo handler onclick do index.html)
      await clearBtn.click();
      await page.waitForTimeout(150);

      // Provar filtros zerados
      const cleared = await page.evaluate(() => ({
        filter: S.dividendFilter,
        classFilter: S.dividendClassFilter,
        period: S.dividendPeriod,
        search: S.dividendSearch,
        activeChips: [...document.querySelectorAll('.div-premium-chip.on')].filter(e => !e.closest('.div-collapsible')).map(e => e.textContent.trim()),
      }));
      assert.equal(cleared.filter, 'all', 'dividendFilter deve voltar a "all"');
      assert.equal(cleared.classFilter, 'all', 'dividendClassFilter deve voltar a "all"');
      assert.equal(cleared.period, 'all', 'dividendPeriod deve voltar a "all"');
      assert.equal(String(cleared.search || '').trim(), '', 'dividendSearch deve voltar a vazio');
      assert.equal(cleared.activeChips.length, 1, 'Deve haver um chip ativo apos limpar');
      assert.ok(cleared.activeChips[0].includes('Todos'), `Chip ativo apos limpar deve ser "Todos": ${cleared.activeChips[0]}`);

      // Botao volta a desabilitado
      assert.equal(await clearBtn.isDisabled(), true, 'Limpar filtros deve voltar a desabilitado');

      // Valores financeiros preservados
      const after = await page.evaluate(() => ({
        total: S.proventos.reduce((sum, item) => sum + Number(item.valor || 0), 0),
        records: S.proventos.length,
      }));
      assert.deepEqual(after, baseline, 'Valores financeiros devem permanecer intactos');

      // Telemetria 0/0/0
      assert.equal(errors.length, 0, `console errors: ${errors.join(' | ')}`);
      assert.equal(failures.length, 0, `request failures: ${failures.join(' | ')}`);

      // Sem overflow horizontal
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'overflow horizontal');

      await context.close();
    } finally {
      await browser.close();
      harness.server.close();
    }
  });
}
