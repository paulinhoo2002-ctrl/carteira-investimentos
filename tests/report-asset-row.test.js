const test = require('node:test');
const assert = require('node:assert/strict');

const { buildReportAssetRow } = require('../report-asset-row.js');

function makeDeps(overrides = {}) {
  return {
    assetAppliedValue(asset) {
      return Number(asset.__applied ?? 0);
    },
    assetCurrentValue(asset) {
      return Number(asset.__current ?? 0);
    },
    metaTicker() {
      return {};
    },
    normalizeType(value, fallback) {
      return value || fallback;
    },
    ...overrides
  };
}

test('buildReportAssetRow monta linha completa com dados explicitos do ativo', () => {
  const asset = {
    ticker: ' ITUB4 ',
    name: ' Itaú Unibanco ',
    type: 'Ação',
    sector: ' Bancos ',
    qty: 10,
    avg_price: 23.45,
    current_price: 31.9,
    source: ' Brapi ',
    updated_at: ' 2026-07-13T10:00:00Z ',
    __applied: 234.5,
    __current: 319
  };

  const row = buildReportAssetRow(asset, makeDeps());

  assert.deepStrictEqual(row, {
    ticker: 'ITUB4',
    name: 'Itaú Unibanco',
    type: 'Ação',
    sector: 'Bancos',
    qty: 10,
    avgPrice: 23.45,
    currentPrice: 31.9,
    applied: 234.5,
    current: 319,
    result: 84.5,
    resultPct: (84.5 / 234.5) * 100,
    source: 'Brapi',
    updatedAt: '2026-07-13T10:00:00Z'
  });
});

test('buildReportAssetRow usa fallbacks de metadata e placeholders quando o ativo vem incompleto', () => {
  const metaCalls = [];
  const asset = {
    ticker: 'ABCD11',
    qty: 0,
    avg_price: 0,
    current_price: 0,
    __applied: 0,
    __current: 0
  };

  const row = buildReportAssetRow(asset, makeDeps({
    metaTicker(ticker) {
      metaCalls.push(ticker);
      return { type: 'FII', sector: 'Logística' };
    }
  }));

  assert.deepStrictEqual(metaCalls, ['ABCD11', 'ABCD11']);
  assert.deepStrictEqual(row, {
    ticker: 'ABCD11',
    name: 'ABCD11',
    type: 'FII',
    sector: 'Logística',
    qty: 0,
    avgPrice: 0,
    currentPrice: 0,
    applied: 0,
    current: 0,
    result: 0,
    resultPct: 0,
    source: '—',
    updatedAt: '—'
  });
});

test('buildReportAssetRow preserva zeros e retorno minimo sem NaN quando aplicado e zero', () => {
  const asset = {
    ticker: '',
    name: '',
    product: '',
    qty: '',
    avg_price: '',
    current_price: '',
    __applied: 0,
    __current: 15
  };

  const row = buildReportAssetRow(asset, makeDeps());

  assert.equal(row.ticker, '—');
  assert.equal(row.name, '—');
  assert.equal(row.qty, 0);
  assert.equal(row.avgPrice, 0);
  assert.equal(row.currentPrice, 0);
  assert.equal(row.applied, 0);
  assert.equal(row.current, 15);
  assert.equal(row.result, 15);
  assert.equal(row.resultPct, 0);
});

test('buildReportAssetRow mantem caracteres especiais e calcula resultado negativo corretamente', () => {
  const asset = {
    ticker: ' MXRF11 ',
    product: ' Fundo "Renda"\nMensal ',
    type: '',
    source: ' XP "Mesa" ',
    quoteSource: '',
    quoteUpdatedAt: ' 13/07/2026 11:30 ',
    __applied: 1000,
    __current: 940
  };

  const row = buildReportAssetRow(asset, makeDeps({
    metaTicker() {
      return { type: 'FII', sector: '' };
    }
  }));

  assert.equal(row.ticker, 'MXRF11');
  assert.equal(row.name, 'Fundo "Renda"\nMensal');
  assert.equal(row.type, 'FII');
  assert.equal(row.sector, '—');
  assert.equal(row.source, 'XP "Mesa"');
  assert.equal(row.updatedAt, '13/07/2026 11:30');
  assert.equal(row.result, -60);
  assert.equal(row.resultPct, -6);
});
