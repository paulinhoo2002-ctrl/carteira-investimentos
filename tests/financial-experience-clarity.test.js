'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const html = () => fs.readFileSync(path.join(root, 'index.html'), 'utf8');
function assertSourceIncludes(source, value, message) {
  assert.ok(source.includes(value), message || `missing expected source: ${value}`);
}

function extract(start, end) {
  const source = html();
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.notEqual(from, -1, `missing start: ${start}`);
  assert.notEqual(to, -1, `missing end: ${end}`);
  return source.slice(from, to);
}

function dividendKpiHtml(lastMonth) {
  const now = new Date();
  const keys = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  });
  const previousKey = keys[keys.length - 2];
  const months = keys.map(key => key === previousKey
    ? { key, ...lastMonth }
    : { key, total: null, coverage: 'UNKNOWN' });
  const context = {
    S: { assets: [] },
    passiveIncomeGoalStats: () => ({ monthKeys: keys, total12: null }),
    DividendIntelligence: { classifyIncomeState: () => 'PAID' },
    dividendAnnualMatrixData: () => [{ months }],
    assetCurrentValue: () => null,
    fmt: value => `R$ ${value}`,
    fmtP: value => `${value}%`,
    esc: value => String(value ?? ''),
    waveBIcon: () => '',
  };
  vm.runInNewContext(extract('function dividendExecutiveKpis(rows=dividendPremiumRows()){', 'function dividendDistributionRow(month, maxVal){'), context);
  const output = context.dividendExecutiveKpis([]);
  const start = output.indexOf('>Último mês<');
  return output.slice(start, output.indexOf('</article>', start));
}

test('Dividendos apresenta mês completo confirmado como completo', () => {
  const card = dividendKpiHtml({ total: 0, coverage: 'COMPLETE' });
  assert.match(card, />R\$ 0<\/div>/);
  assert.match(card, /Mês completo confirmado/);
});

test('Dividendos preserva parcial e mês desconhecido sem converter ausência em zero', () => {
  const partial = dividendKpiHtml({ total: 125, coverage: 'PARTIAL' });
  assert.match(partial, />R\$ 125<\/div>/);
  assert.match(partial, /Recebido registrado · cobertura parcial/);
  const unknown = dividendKpiHtml({ total: null, coverage: 'UNKNOWN' });
  assert.match(unknown, />—<\/div>/);
  assert.match(unknown, /Cobertura desconhecida/);
  const unknownZero = dividendKpiHtml({ total: 0, coverage: 'UNKNOWN' });
  assert.match(unknownZero, />—<\/div>/);
  const partialZero = dividendKpiHtml({ total: 0, coverage: 'PARTIAL' });
  assert.match(partialZero, />—<\/div>/);
});

test('Metas identifica renda mensal e anual como estimativas não recebidas', () => {
  assertSourceIncludes(html(), 'Estimativa da carteira · não recebida');
  assertSourceIncludes(html(), 'metas-kpi-sub ds-kpi__context">Estimativa · não recebida</div>');
});

test('Dividendos identifica projeção anual como estimativa não recebida', () => {
  const source = extract('function dividendExecutiveKpis(rows=dividendPremiumRows()){', 'function dividendDistributionRow(month, maxVal){');
  assertSourceIncludes(source, 'Estimativa · não recebida · somente meses completos');
});
