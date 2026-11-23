const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function app(viewport = { width: 1366, height: 768 }) {
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport, isMobile: viewport.width <= 430, hasTouch: viewport.width <= 430 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const NativeDate = Date;
    const fixedNow = NativeDate.parse('2026-08-31T12:00:00-03:00');
    class FixedDate extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : ['2026-08-31T12:00:00-03:00']));
      }
      static now() { return fixedNow; }
    }
    window.Date = FixedDate;
  });
  await page.goto(harness.url, { waitUntil: 'networkidle' });
  await page.evaluate(() => { restoreLocalTestData(); go('relatorios'); });
  await page.waitForSelector('.reports-premium-shell', { timeout: 15000 });
  return { browser, page, errors, harness };
}

test('RELATÓRIOS: patrimônio truth view mantém série cumulativa oficial', async () => {
  const { browser, page, errors, harness } = await app();
  try {
    const rows = await page.evaluate(() => {
      const data = typeof reportPatrimonyRows === 'function' ? reportPatrimonyRows() : [];
      return data.map(row => ({
        period: row.period,
        contribution: row.contribution,
        accumulatedContributions: row.accumulatedContributions,
        estimatedPatrimony: row.estimatedPatrimony,
        estimatedEvolution: row.estimatedEvolution,
      }));
    });

    assert.equal(rows.length, 12, 'Série patrimonial deve cobrir 12 meses');
    assert.deepEqual(
      rows.map(row => row.accumulatedContributions),
      [37098, 40098, 41098, null, null, 41798, null, null, null, null, null, null],
      'Aportes acumulados só existem nos meses com movimento registrado; meses sem registro são null (UNKNOWN != ZERO)'
    );
    assert.equal(Math.round(rows.at(-1).estimatedPatrimony * 100) / 100, 51660.53);
    assert.equal(Math.round(rows.at(-1).estimatedEvolution * 100) / 100, 5062.53);

    const chartValues = await page.$$eval('.reports-evolution-chart .reports-evolution-bar', bars => bars.length);
    assert.ok(chartValues >= 6, 'O gráfico deve exibir barras suficientes para a leitura visual');
    const chartText = await page.locator('.reports-evolution-chart').innerText();
    assert.ok(!/Sem histórico suficiente/i.test(chartText), 'O gráfico não deve cair no estado vazio');

    // "Análise patrimonial" é acordeão fechado por padrão (SM189.60); abrir antes de ler o conteúdo, sem mudar as asserções.
    await page.evaluate(() => document.querySelectorAll('.reports-analysis-details').forEach(item => { item.open = true; }));
    const footerText = await page.locator('.reports-evolution-panel .reports-panel-footer').innerText();
    assert.match(footerText, /Último patrimônio/);
    assert.match(footerText, /R\$\s+51\.660,53/);
    assert.match(footerText, /Diferença/);
    assert.match(footerText, /R\$\s+5\.062,53/);

    assert.equal(errors.length, 0, errors.join(' | '));
  } finally {
    await browser.close();
    harness.server.close();
  }
});
