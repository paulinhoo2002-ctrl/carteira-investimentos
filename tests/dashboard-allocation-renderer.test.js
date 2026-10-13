'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rendererPath = path.join(__dirname, '..', 'legacy', 'js', 'screens', 'dashboard-allocation.js');

function render(allocation, hideValues = false) {
  const context = {
    portfolioAllocationSnapshot: () => allocation,
    S: { hideValues },
    esc: value => String(value ?? ''),
    fmt: value => `R$ ${Number(value).toFixed(2)}`,
    dataTrustDate: value => `DATA:${value}`,
    PortfolioAllocationIntelligence: {
      formatPercent: value => Number.isFinite(value) ? `${value.toFixed(1)}%` : 'indisponível',
    },
  };
  vm.runInNewContext(fs.readFileSync(rendererPath, 'utf8'), context, { filename: rendererPath });
  return context.dashboardV3AllocationPanel();
}

test('real allocation renderer keeps all-unknown values unavailable', () => {
  const html = render({ positionCount: 2, unknownPositionCount: 2, knownPositionCount: 0, totalKnownValue: null, classes: { rows: [] }, institutions: { rows: [] }, coverage: {} });
  assert.match(html, /Valores atuais indisponíveis\./);
  assert.match(html, /2 valores atuais indisponíveis; percentuais usam apenas valores conhecidos/);
  assert.match(html, /Participação por classe · base: valor atual conhecido/);
  assert.doesNotMatch(html, /R\$ 0\.00|0\.0%/);
});

test('real allocation renderer distinguishes confirmed zero from missing values', () => {
  const html = render({ positionCount: 1, unknownPositionCount: 0, knownPositionCount: 1, totalKnownValue: 0, classes: { rows: [] }, institutions: { rows: [] }, coverage: {} });
  assert.match(html, /Valor atual conhecido: zero; percentuais indisponíveis com base zero/);
  assert.doesNotMatch(html, /Sem ativos cadastrados/);
});

test('real allocation renderer labels partial coverage and uses only supplied known classes', () => {
  const html = render({
    positionCount: 2, unknownPositionCount: 1, knownPositionCount: 1, totalKnownValue: 10000,
    classes: { rows: [{ label: 'Ações', value: 10000, shareOfKnown: 100 }] },
    institutions: { rows: [] }, coverage: { institution: { coverageCount: 50, coverageValue: 100 } },
    valuationAsOf: { status: 'PARTIAL', date: '2026-10-10' },
  });
  assert.match(html, /Ações/);
  assert.match(html, /100\.0%/);
  assert.match(html, /1 valor atual indisponível; percentuais usam apenas valores conhecidos/);
  assert.match(html, /carteira parcial/);
});

test('real allocation renderer hides class and institution detail when values are hidden', () => {
  const html = render({
    positionCount: 1, unknownPositionCount: 0, knownPositionCount: 1, totalKnownValue: 12000,
    classes: { rows: [{ label: 'Classe sintética privada', value: 12000, shareOfKnown: 100 }] },
    institutions: { rows: [{ label: 'Instituição sintética privada', shareOfKnown: 100 }] },
    coverage: { institution: { coverageCount: 100, coverageValue: 100 } },
    valuationAsOf: { status: 'COMPLETE', date: '2026-10-10' },
  }, true);
  assert.match(html, /Composição oculta/);
  assert.doesNotMatch(html, /Classe sintética privada|Instituição sintética privada|R\$ 12000\.00|100\.0%/);
});
