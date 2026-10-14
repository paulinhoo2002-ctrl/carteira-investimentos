'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright-core');
const Mapping = require('../package1-portfolio-schema-mapping');
const { startLocalHttpServer } = require('./local-http-server');

const ROOT = path.resolve(__dirname, '..');

function packageFixture() {
  const asOf = '2026-10-10';
  const batch = 'SYN_SCHEMA_UI_BATCH';
  const positions = Array.from({ length: 35 }, (_, index) => {
    const type = index < 31 ? 'RV_ACAO' : 'RF';
    const value = type === 'RV_ACAO' ? (index === 0 ? 100 : index === 1 ? 28 : 0) : index === 31 ? 4 : 0;
    const source = `SYN_UI_SOURCE_${index + 1}`;
    const id = `SYN_UI_POSITION_${index + 1}`;
    const data = {
      document_id: id, schema_version: 2, custodian_id: 'SYN_UI_CUSTODIAN',
      asset_id: `SYN_UI_ASSET_${index + 1}`, asset_type: type, quantity: 1,
      current_value: value, as_of: asOf, average_cost: null, average_cost_status: 'UNKNOWN',
      cost_basis_value: index < 25 ? 0.5 : null,
      cost_basis_status: index < 25 ? 'DERIVED' : 'UNKNOWN', cost_method: index < 25 ? 'FIFO' : null,
      provenance: { source_id: source }, source_ids: [source], reconciliation_status: 'PARTIAL',
      import_batch_id: batch, created_at: '2026-10-14T12:00:00.000Z', updated_at: '2026-10-14T12:00:00.000Z'
    };
    return { collection: 'positions', document_id: id, data };
  });
  const snapshot = {
    document_id: 'SYN_UI_SNAPSHOT', snapshot_id: 'SYN_UI_SNAPSHOT', schema_version: 1,
    custodian_id: 'SYN_UI_CUSTODIAN', as_of: asOf, rv_official: 130, rf_official: 10,
    total_official: 140, rv_detail_sum: 128, rf_detail_sum: 4, detail_total: 132,
    rv_gap: 2, rf_gap: 6, total_gap: 8, reconciliation_status: 'PARTIAL',
    provenance: { source_id: 'SYN_UI_OFFICIAL' }, import_batch_id: batch
  };
  return { mode: 'LOCAL_DRY_RUN_ONLY', import_batch_id: batch,
    records: [...positions, { collection: 'account_snapshots', document_id: snapshot.document_id, data: snapshot }] };
}

test('embedded portfolio schema feeds all Package 1 synthetic UI routes without changing legacy state', async () => {
  const server = await startLocalHttpServer(ROOT);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.name));
  page.on('console', message => { if (message.type() === 'error') errors.push('console'); });
  const origin = new URL(server.url).origin;
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  try {
    await page.goto(server.url + '&testReadOnly=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof S !== 'undefined' && !!document.querySelector('.test-mode-banner'));
    const before = await page.evaluate(() => JSON.stringify({ assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents }));
    await page.addScriptTag({ path: path.join(ROOT, 'legacy/js/ui/package1-v2-qa.js') });
    const embedded = Mapping.toEmbeddedPackage1(packageFixture());
    const selectedView = Mapping.readEmbeddedPackage1({ [Mapping.FIELD]: embedded }).view;
    await page.evaluate(value => Package1V2Qa.setInput(value.positions, value.snapshot), selectedView);

    const routes = ['dashboard', 'patrimonio', 'ativos', 'renda-fixa', 'rentabilidade', 'irpf', 'dividendos'];
    for (const width of [390, 1366]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
      for (const theme of ['dark', 'light']) {
        await page.evaluate(themeName => applyTheme(themeName), theme);
        for (const route of routes) {
          await page.evaluate(routeName => go(routeName), route);
          const panel = page.locator('.package1-v2-qa');
          await panel.waitFor();
          assert.equal(await panel.getAttribute('data-reconciliation'), 'PARTIAL');
          const text = await panel.innerText();
          assert.match(text, /R\$\s?140,00/);
          assert.match(text, /R\$\s?132,00/);
          assert.match(text, /R\$\s?8,00/);
          assert.match(text, /custo médio —/i);
          assert.doesNotMatch(text, /resultado R\$ 0,00|ganho R\$/i);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${route}/${width}/${theme} overflow`);
        }
      }
    }
    assert.equal(await page.evaluate(() => JSON.stringify({ assets: S.assets, aportes: S.aportes, proventos: S.proventos, rfEvents: S.rfEvents })), before);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.server.closeAllConnections?.();
    await new Promise(resolve => server.server.close(resolve));
  }
});
