const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
const hostHtmlPath = path.join(__dirname, '..', 'modern', 'host.html');
const hostModulePath = path.join(__dirname, '..', 'modern', 'src', 'host.tsx');
const hostSourceModulePath = path.join(__dirname, '..', 'modern', 'src', 'bootstrap', 'hostLegacyReportsReadonlySource.ts');
const modernMainPath = path.join(__dirname, '..', 'modern', 'src', 'main.tsx');
const previewModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'reports', 'AssetsReportPreview.tsx');
const bridgeModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'reports', 'reportsReadonlyBridge.ts');
const adapterModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'reports', 'reportsSnapshotAdapter.ts');

async function loadHostSourceModule() {
  return import(pathToFileURL(hostSourceModulePath).href);
}

function normalize(text) {
  return text.replace(/\r\n/g, '\n');
}

function assertDeepFrozen(snapshot) {
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.summary), true);
  assert.equal(Object.isFrozen(snapshot.items), true);

  for (const item of snapshot.items) {
    assert.equal(Object.isFrozen(item), true);
  }
}

test('fase 178 mantém a composicao experimental isolada no entrypoint legado', () => {
  const indexHtml = normalize(fs.readFileSync(indexHtmlPath, 'utf8'));
  const hostHtml = normalize(fs.readFileSync(hostHtmlPath, 'utf8'));
  const hostTsx = normalize(fs.readFileSync(hostModulePath, 'utf8'));
  const hostSourceTs = normalize(fs.readFileSync(hostSourceModulePath, 'utf8'));
  const modernMainTsx = normalize(fs.readFileSync(modernMainPath, 'utf8'));
  const previewTsx = normalize(fs.readFileSync(previewModulePath, 'utf8'));
  const bridgeTs = normalize(fs.readFileSync(bridgeModulePath, 'utf8'));
  const adapterTs = normalize(fs.readFileSync(adapterModulePath, 'utf8'));

  assert.match(indexHtml, /activeWalletHost/);
  assert.match(indexHtml, /bootstrapExperimentalActiveWalletHost/);
  assert.match(indexHtml, /Array\.isArray\(S\.assets\)/);
  assert.match(indexHtml, /if\(!isActiveWalletHostMode\(\)\)\{\n  setInterval\(/);
  assert.match(indexHtml, /isReadonlyReportsExperimentalEntryEnabled/);
  assert.match(indexHtml, /function isReadonlyReportsExperimentalEntryEnabled\(\)\{\s*return isLocalTestMode\(\) && !isActiveWalletHostMode\(\);\s*\}/);
  assert.match(indexHtml, /readonlyReportPage/);
  assert.match(indexHtml, /readonly-report-page-contract\.js/);
  assert.match(indexHtml, /getReadonlyReportPageContract/);
  assert.equal(indexHtml.includes('fallbackReadonlyReportPageContract'), false);
  assert.equal(indexHtml.includes('readonlyReportPageContractFromGlobal'), false);
  assert.equal(indexHtml.includes('resolveReadonlyReportPageContractSafely'), false);
  assert.match(hostHtml, /readonly-report-page-contract\.js/);
  assert.equal(indexHtml.includes('normalizeReadonlyReportSessionPageId'), false);
  assert.equal(indexHtml.includes('READONLY_REPORT_SESSION_PAGE_IDS=new Set'), false);
  assert.match(indexHtml, /readonlyReportsExperimentalHostUrl/);
  assert.match(indexHtml, /readonlyReportsLegacyReturnUrl/);
  assert.match(indexHtml, /openReadonlyReportsExperimentalHost/);
  assert.match(indexHtml, /returnFromReadonlyReportsExperimentalHost/);
  assert.match(indexHtml, /installReadonlyReportsExperimentalBanner/);
  assert.match(indexHtml, /Relatório experimental somente leitura/);
  assert.match(indexHtml, /Abrir relatório experimental/);
  assert.match(indexHtml, /Voltar ao legado/);
  assert.match(indexHtml, /activeWalletHost=1&testMode=1/);

  for (const text of [hostHtml, hostTsx, hostSourceTs, modernMainTsx, previewTsx, bridgeTs, adapterTs]) {
    assert.equal(text.includes('S.assets'), false, 'Modern files cannot know S.assets');
    assert.equal(text.includes('window.S'), false, 'Modern files cannot know window.S');
    assert.equal(text.includes('globalThis.S'), false, 'Modern files cannot know globalThis.S');
  }

  assert.equal(hostTsx.includes('document.getElementById'), true);
  assert.equal(hostTsx.includes('createConnectedReportsDemoSource'), true);
  assert.equal(hostTsx.includes('bootstrapHost'), true);
  assert.equal(hostTsx.includes('isHostPage'), true);
  assert.equal(modernMainTsx.includes('legacy/reports-readonly-source.js'), false);
  assert.equal(previewTsx.includes('createConnectedReportsDemoSource'), false);
  assert.equal(bridgeTs.includes('S.assets'), false);
  assert.equal(adapterTs.includes('S.assets'), false);
});

test('provider readonly experimental lê a coleção atual e preserva snapshots imutáveis', async () => {
  const legacyReports = require('../legacy/reports-readonly-source.js');
  const reportAssetRow = require('../report-asset-row.js');
  const { hostAssetAppliedValue, hostAssetCurrentValue, hostMetaTicker, hostNormalizeType } = await loadHostSourceModule();

  let assets = [
    {
      ticker: 'PETR4',
      name: 'Petrobras',
      type: 'Ação',
      sector: 'Energia',
      qty: 10,
      avg_price: 20,
      current_price: 25,
      applied: 200,
      current: 250,
      source: 'host-experimental',
      updated_at: '2026-07-14T10:30:00.000Z',
    },
    {
      ticker: 'MXRF11',
      name: 'Maxi Renda',
      type: 'FII',
      sector: 'Imobiliario',
      qty: 5,
      avg_price: 100,
      current_price: 90,
      applied: 500,
      current: 450,
      source: 'host-experimental',
      updated_at: '2026-07-14T10:30:00.000Z',
    },
    {
      ticker: 'BOVA11',
      name: 'BOVA',
      type: 'ETF',
      sector: 'Ibovespa',
      qty: 2,
      avg_price: 100,
      current_price: 100,
      applied: 200,
      current: 200,
      source: 'host-experimental',
      updated_at: '2026-07-14T10:30:00.000Z',
    },
  ];

  const provider = legacyReports.createLegacyAssetsReadonlyProvider({
    getAssets() {
      return assets;
    },
    buildReportAssetRow: reportAssetRow.buildReportAssetRow,
    assetAppliedValue: hostAssetAppliedValue,
    assetCurrentValue: hostAssetCurrentValue,
    metaTicker: hostMetaTicker,
    normalizeType: hostNormalizeType,
    getGeneratedAt() {
      return '2026-07-14T10:30:00.000Z';
    },
    notice: 'Snapshot legado somente leitura. React nao escreve na fonte.',
  });

  const firstSnapshot = provider.getSnapshot();
  assert.equal(firstSnapshot.summary.totalValue, 900);
  assert.equal(firstSnapshot.summary.itemCount, 3);
  assert.equal(firstSnapshot.summary.averageVariationPct, 5);
  assert.deepEqual(firstSnapshot.items.map((item) => item.ticker), ['PETR4', 'MXRF11', 'BOVA11']);
  assert.deepEqual(firstSnapshot.items.map((item) => item.category), ['Acao demo', 'FII demo', 'ETF demo']);
  assert.deepEqual(firstSnapshot.items.map((item) => item.trend), ['positive', 'negative', 'neutral']);
  assertDeepFrozen(firstSnapshot);

  assets[0].current_price = 30;
  assets[0].current = 300;

  const secondSnapshot = provider.getSnapshot();
  assert.equal(secondSnapshot.summary.totalValue, 950);
  assert.ok(Math.abs(secondSnapshot.summary.averageVariationPct - 13.333333333333334) < 1e-9);
  assert.equal(secondSnapshot.items[0].currentValue, 300);
  assert.equal(secondSnapshot.items[1].currentValue, 450);
  assert.equal(secondSnapshot.items[2].currentValue, 200);
  assert.equal(firstSnapshot.items[0].currentValue, 250);
  assert.equal(firstSnapshot.items[1].currentValue, 450);
  assert.equal(firstSnapshot.items[2].currentValue, 200);
  assert.equal(Object.isFrozen(assets), false);
  assert.equal(Object.isFrozen(assets[0]), false);
  assertDeepFrozen(secondSnapshot);
});

test('provider readonly experimental aceita colecao vazia e usa fallback em erro ou item invalido', async () => {
  const legacyReports = require('../legacy/reports-readonly-source.js');
  const reportAssetRow = require('../report-asset-row.js');
  const { hostAssetAppliedValue, hostAssetCurrentValue, hostMetaTicker, hostNormalizeType } = await loadHostSourceModule();

  const emptyProvider = legacyReports.createLegacyAssetsReadonlyProvider({
    getAssets() {
      return [];
    },
    buildReportAssetRow: reportAssetRow.buildReportAssetRow,
    assetAppliedValue: hostAssetAppliedValue,
    assetCurrentValue: hostAssetCurrentValue,
    metaTicker: hostMetaTicker,
    normalizeType: hostNormalizeType,
    getGeneratedAt() {
      return '2026-07-14T10:30:00.000Z';
    },
    notice: 'Snapshot legado somente leitura. React nao escreve na fonte.',
  });

  const emptySnapshot = emptyProvider.getSnapshot();
  assert.equal(emptySnapshot.summary.totalValue, 0);
  assert.equal(emptySnapshot.summary.itemCount, 0);
  assert.equal(emptySnapshot.summary.averageVariationPct, 0);
  assert.deepEqual(emptySnapshot.items, []);
  assertDeepFrozen(emptySnapshot);

  const fallbackSnapshot = legacyReports.LEGACY_REPORTS_SOURCE_FALLBACK_SNAPSHOT;
  const throwingProvider = legacyReports.createLegacyAssetsReadonlyProvider({
    getAssets() {
      throw new Error('boom');
    },
    buildReportAssetRow: reportAssetRow.buildReportAssetRow,
    assetAppliedValue: hostAssetAppliedValue,
    assetCurrentValue: hostAssetCurrentValue,
    metaTicker: hostMetaTicker,
    normalizeType: hostNormalizeType,
    getGeneratedAt() {
      return '2026-07-14T10:30:00.000Z';
    },
    notice: 'Snapshot legado somente leitura. React nao escreve na fonte.',
  });

  const invalidProvider = legacyReports.createLegacyAssetsReadonlyProvider({
    getAssets() {
      return [
        {
          ticker: 'BAD3',
          name: 'Invalido',
          type: 'Acao',
          sector: 'Teste',
          qty: 1,
          avg_price: Number.NaN,
          current_price: 10,
          source: 'host-experimental',
          updated_at: '2026-07-14T10:30:00.000Z',
        },
      ];
    },
    buildReportAssetRow: reportAssetRow.buildReportAssetRow,
    assetAppliedValue: hostAssetAppliedValue,
    assetCurrentValue: hostAssetCurrentValue,
    metaTicker: hostMetaTicker,
    normalizeType: hostNormalizeType,
    getGeneratedAt() {
      return '2026-07-14T10:30:00.000Z';
    },
    notice: 'Snapshot legado somente leitura. React nao escreve na fonte.',
  });

  assert.deepEqual(throwingProvider.getSnapshot(), fallbackSnapshot);
  assert.deepEqual(invalidProvider.getSnapshot(), fallbackSnapshot);
});
