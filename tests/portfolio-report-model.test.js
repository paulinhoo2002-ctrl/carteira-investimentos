const assert = require('node:assert/strict');
const test = require('node:test');
const { buildPortfolioReportModel } = require('../portfolio-report-model.js');

function input(overrides = {}) {
  return {
    summary: {
      portfolio: { tC: 12500, tI: 10000, tG: 2500, tGP: 25 },
      income: { total12: 320 },
    },
    assets: [{ ticker: 'PETR4', current: 12500 }],
    allocation: [{ type: 'Ações', value: 12500 }],
    performance: { status: 'TRACKING_STARTED', startDate: '2026-09-15' },
    valueCoverage: 87,
    freshness: 'RECENT_SNAPSHOT',
    ...overrides,
  };
}

test('modelo de relatórios preserva métricas canônicas e cobertura parcial', () => {
  const model = buildPortfolioReportModel(input());
  assert.equal(model.readOnly, true);
  assert.equal(model.metrics.portfolioValue.value, 12500);
  assert.equal(model.metrics.marketResult.value, 2500);
  assert.equal(model.sections.performance.status, 'TRACKING_STARTED');
  assert.equal(model.sections.assets.items.length, 1);
  assert.equal(model.coverage.status, 'PARTIAL');
  assert.equal(model.coverage.value, 87);
});

test('modelo não transforma ausência em zero ou retorno fictício', () => {
  const model = buildPortfolioReportModel({ summary: {}, performance: {} });
  assert.equal(model.metrics.portfolioValue.value, null);
  assert.equal(model.metrics.portfolioValue.status, 'UNAVAILABLE');
  assert.equal(model.sections.performance.status, 'INSUFFICIENT_DATA');
  assert.equal(model.sections.performance.items[0].value, null);
  assert.equal(model.coverage.status, 'UNAVAILABLE');
});

test('valores nulos ou vazios permanecem indisponíveis em vez de virarem zero', () => {
  const model = buildPortfolioReportModel({
    summary: { portfolio: { tC: null, tI: '', tG: undefined, tGP: null }, income: { total12: null } },
  });
  for (const key of ['portfolioValue', 'invested', 'marketResult', 'returnPercent', 'incomeReceived']) {
    assert.equal(model.metrics[key].value, null, `${key} não deve assumir zero`);
    assert.equal(model.metrics[key].status, 'UNAVAILABLE');
  }
});

test('renda, proventos e risco preservam estados sem escrita', () => {
  const model = buildPortfolioReportModel(input({
    proventos: [{ ticker: 'PETR4', value: 320 }],
    alerts: [{ severity: 'warning', area: 'preço' }],
  }));
  assert.equal(model.sections.proventos.status, 'AVAILABLE');
  assert.equal(model.sections.risk.status, 'ATTENTION');
  assert.equal(model.sections.income.items[0].received.value, 320);
  assert.equal(model.readOnly, true);
});

test('xirr sem fluxos externos permanece explicitamente indisponível', () => {
  const model = buildPortfolioReportModel(input({ xirr: {} }));
  const xirr = model.sections.performance.items.find(item => item.key === 'xirr');
  assert.equal(xirr.status, 'INSUFFICIENT_DATA');
  assert.equal(xirr.value, null);
  assert.match(xirr.reason, /Fluxos externos/);
});

test('modelo integra readiness V273 sem alterar o contrato anterior', () => {
  const model = buildPortfolioReportModel(input({
    readiness: {
      history: { status: 'TRACKING_STARTED', snapshotCount: 1 },
      performance: { engineAvailable: true, dataReady: false, reasonCodes: ['WALLET_ID_UNAVAILABLE'] },
    },
  }));
  assert.equal(model.readOnly, true);
  assert.equal(model.metrics.portfolioValue.value, 12500);
  assert.equal(model.readiness.engineAvailable, true);
  assert.equal(model.readiness.dataReady, false);
  assert.ok(model.readiness.sections.performance.reasonCodes.includes('WALLET_ID_UNAVAILABLE'));
});
