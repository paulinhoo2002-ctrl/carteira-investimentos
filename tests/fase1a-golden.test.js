'use strict';
// Fase 1a hermética: a árvore atual deve reproduzir, em dados sintéticos e relógio congelado, os
// indicadores financeiros da REFERÊNCIA de produção gravados em tests/fixtures/fase1a-golden.json.
// Não depende de Git nem de origin/main (roda no CI). O golden é regenerável e auditável:
//   node scripts/qa/fase1a-golden.js --baseline origin/main
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { collectSnapshot, STABLE_ROUTES, DASHBOARD_LABELS, DIVIDEND_LABELS } = require('./helpers/fase1-snapshot');

const repo = path.join(__dirname, '..');
const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'fase1a-golden.json'), 'utf8'));
let current = null;
// Diferenças intencionais aprovadas que acrescentam valores visíveis em relação à referência.
const additions = {};
golden.intentionalDifferences.forEach(item => (item.tokenAdditions || []).forEach(entry => {
  additions[`${entry.state}/${entry.route}`] = [...(additions[`${entry.state}/${entry.route}`] || []), ...entry.tokens];
}));

test.before(async () => { current = await collectSnapshot(repo); }, { timeout: 300000 });

test('golden tem origem documentada (referência de produção, não a árvore atual) e política de dados sintéticos', () => {
  assert.match(golden.meta.baselineRef, /^origin\/main$|^[\w./-]+$/);
  assert.match(golden.meta.baselineSha, /^[0-9a-f]{40}$/);
  assert.match(golden.meta.regenerate, /fase1a-golden\.js/);
  assert.match(golden.meta.dataPolicy, /sintéticos/);
  assert.ok(golden.intentionalDifferences.length >= 2);
  golden.intentionalDifferences.forEach(item => { assert.ok(item.id && item.area && item.description.length > 20); });
  assert.deepEqual(Object.keys(golden.expected).sort(), ['empty', 'noquotes', 'partial', 'rich']);
});

for (const state of ['rich', 'partial', 'noquotes', 'empty']) {
  test(`cx() (patrimônio, aplicado, resultado, rentabilidade) igual à referência — ${state}`, () => {
    assert.deepEqual(current[state].errors, []);
    assert.deepEqual(current[state].portfolio, golden.expected[state].portfolio);
  });

  test(`cartões comparáveis do Dashboard iguais à referência — ${state}`, () => {
    DASHBOARD_LABELS.forEach(label => {
      assert.equal(current[state].dashboardCards[label], golden.expected[state].dashboardCards[label], `${label} (${state})`);
    });
  });

  test(`11 telas sem mudança numérica: valores R$ e % iguais à referência — ${state}`, () => {
    STABLE_ROUTES.forEach(route => {
      const expected = [...golden.expected[state].routeTokens[route], ...(additions[`${state}/${route}`] || [])].sort();
      assert.deepEqual(current[state].routeTokens[route], expected, `${route} (${state})`);
    });
  });

  test(`KPIs comparáveis de Dividendos iguais à referência — ${state}`, () => {
    DIVIDEND_LABELS.forEach(label => {
      assert.equal(current[state].dividends.kpis[label], golden.expected[state].dividends.kpis[label], `${label} (${state})`);
    });
  });
}

test('Dividendos: matriz anual, resumo por ativo e ranking iguais à referência', () => {
  const expected = golden.expected.rich.dividends;
  const actual = current.rich.dividends;
  assert.equal(actual.matrixSha256, expected.matrixSha256);
  assert.equal(actual.assetSummary, expected.assetSummary);
  assert.equal(actual.byAssetSha256, expected.byAssetSha256);
  assert.deepEqual(actual.rankingFromBaselineView, expected.rankingFromBaselineView);
  // o ranking visível da V20 (fpTopPayers) reproduz o da referência: ticker, valor e participação
  assert.deepEqual(actual.fpPayers, expected.rankingFromBaselineView);
});

test('estado vazio: Dividendos não troca ausência por zero nos KPIs do topo (regra "desconhecido ≠ zero")', () => {
  Object.values(current.empty.dividends.kpis).forEach(value => assert.notEqual(value, 'R$ 0,00'));
});
