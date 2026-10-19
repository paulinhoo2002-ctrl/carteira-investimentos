'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function render(summary, hideValues = false) {
  const start = source.indexOf('function dashboardEconomicResultStatus(');
  const end = source.indexOf('\nfunction ', start + 10);
  assert.notEqual(start, -1, 'dashboard status presenter exists');
  assert.notEqual(end, -1, 'dashboard status presenter is bounded');
  const context = {
    S: { hideValues },
    assetSignedMoneyText: value => `${value > 0 ? '+ ' : value < 0 ? '- ' : ''}R$ ${Math.abs(Number(value)).toFixed(2)}`,
    fmt: value => `R$ ${Number(value).toFixed(2)}`,
    fmtP: value => `${Number(value).toFixed(2)}%`,
    esc: value => String(value),
  };
  vm.runInNewContext(`${source.slice(start, end)};globalThis.render=dashboardEconomicResultStatus;`, context);
  return context.render(summary);
}

test('dashboard keeps UNKNOWN distinct from a numeric zero', () => {
  const html = render({ status: 'PARTIAL', certifiedAssets: [], totalEconomicResult: null });
  assert.match(html, /Resultado total: Em consolidação/);
  assert.doesNotMatch(html, /R\$|0,00|0\.00/);
});

test('dashboard labels a certified subset and never calls it the portfolio total', () => {
  const html = render({
    status: 'PARTIAL', certifiedAssets: ['rf-1'], partialAssets: ['rf-2'],
    certifiedEconomicResult: 7408.93, certifiedReturnPct: 11.29,
    totalEconomicResult: null,
  });
  assert.match(html, /Subtotal certificado/);
  assert.match(html, /\+ R\$ 7408\.93/);
  assert.match(html, /11\.29%/);
  assert.match(html, /resultado total da carteira permanece em consolidação/i);
  assert.match(html, /dashboard-total-result-value positive/);
  assert.doesNotMatch(html, /Resultado total: R\$/);
});

test('dashboard labels numeric total only for a complete portfolio result', () => {
  const html = render({ status: 'COMPLETE', certifiedAssets: ['rf-1'], totalEconomicResult: -10, totalReturnPct: -1 });
  assert.match(html, /Resultado total: - R\$ 10\.00/);
  assert.match(html, /dashboard-total-result-value negative/);
  assert.match(html, /-1\.00%/);
  assert.doesNotMatch(html, /Subtotal certificado/);
});

test('certified zero uses neutral color instead of gain/loss semantics', () => {
  const html = render({ status: 'COMPLETE', totalEconomicResult: 0 });
  assert.match(html, /Resultado total: R\$ 0\.00/);
  assert.match(html, /dashboard-total-result-value neutral/);
});

test('dashboard detects only complete totals or certified numeric subsets for duplicate suppression', () => {
  const start = source.indexOf('function dashboardHasEconomicCertification(');
  const end = source.indexOf('\nfunction ', start + 10);
  assert.notEqual(start, -1);
  const context = vm.createContext({});
  vm.runInContext(`${source.slice(start, end)};globalThis.check=dashboardHasEconomicCertification;`, context);
  assert.equal(context.check({ status: 'PARTIAL', totalEconomicResult: null }), false);
  assert.equal(context.check({ status: 'PARTIAL', certifiedAssets: ['rf-1'], certifiedEconomicResult: 12 }), true);
  assert.equal(context.check({ status: 'COMPLETE', totalEconomicResult: -2 }), true);
});

test('Package2 fallback keeps one consolidation label; certified subset uses the dashboard status strip', () => {
  const start = source.indexOf('function dashboardHasEconomicCertification(');
  const end = source.indexOf('\nfunction package2ExecutivePanel(', start);
  assert.notEqual(start, -1);
  const context = vm.createContext({
    S: { hideValues: false, proventos: [], rfEvents: [] },
    FB: { package2: { current_result_summary: { rv_total: 1 }, income_summary: { y2026_total: 1 } } },
    dashboardCurrentValueAvailability: () => ({ state: 'AVAILABLE', note: 'Disponível' }),
    passiveIncomeMonthKey: () => '2026-10',
    passiveIncomeMonthSummary: () => ({ month: '2026-10', total: null, coverage: 'UNKNOWN' }),
    passiveIncomeValue: () => '—',
    dashboardEconomicResultStatus: summary => summary?.certifiedAssets?.length ? '<div>Subtotal certificado</div>' : '<div>Resultado total: Em consolidação</div>',
    assetSignedMoneyText: value => `R$ ${value}`,
    fmtP: value => `${value}%`, fmt: value => `R$ ${value}`,
    dashboardMetricCard: (_icon, label, value) => `${label}|${value}`,
    dashboardMetricIcon: () => '',
  });
  vm.runInContext(`${source.slice(start, end)};globalThis.render=executiveKPIs;`, context);
  const fallback = context.render({ portfolio: { tC: 0, tI: 0, tG: 0, tGP: 0, appliedComplete: true }, portfolioEconomicResult: { status: 'PARTIAL' } });
  assert.doesNotMatch(fallback, /Resultado total: Em consolidação/);
  const certified = context.render({ portfolio: { tC: 0, tI: 0, tG: 0, tGP: 0, appliedComplete: true }, portfolioEconomicResult: { status: 'PARTIAL', certifiedAssets: ['rf-1'], certifiedEconomicResult: 12 } });
  assert.match(certified, /Subtotal certificado/);
});

test('null Package2 aggregates stay unknown and do not suppress dashboard consolidation', () => {
  const summary = { current_result_summary: { rv_total: null }, income_summary: { y2026_total: null } };
  const panelStart = source.indexOf('function package2FiniteNumber(');
  const panelEnd = source.indexOf('\nfunction dashboardEvolutionPanel(', panelStart + 10);
  assert.notEqual(panelStart, -1);
  const panelContext = vm.createContext({
    S: { hideValues: false }, FB: { package2: summary },
    dashboardMetricCard: (_icon, label, value) => `${label}|${value}`,
    dashboardMetricIcon: () => '', assetSignedMoneyText: value => `R$ ${value}`,
  });
  vm.runInContext(`${source.slice(panelStart, panelEnd)};globalThis.render=package2ExecutivePanel;`, panelContext);
  assert.equal(panelContext.render(), '');

  const dashboardStart = source.indexOf('function dashboardHasEconomicCertification(');
  const dashboardEnd = source.indexOf('\nfunction package2ExecutivePanel(', dashboardStart);
  const dashboardContext = vm.createContext({
    S: { hideValues: false, proventos: [], rfEvents: [] }, FB: { package2: summary },
    dashboardCurrentValueAvailability: () => ({ state: 'AVAILABLE', note: 'Disponível' }),
    passiveIncomeMonthKey: () => '2026-10',
    passiveIncomeMonthSummary: () => ({ month: '2026-10', total: null, coverage: 'UNKNOWN' }),
    passiveIncomeValue: () => '—',
    dashboardEconomicResultStatus: () => '<div>Resultado total: Em consolidação</div>',
    assetSignedMoneyText: value => `R$ ${value}`,
    fmtP: value => `${value}%`, fmt: value => `R$ ${value}`,
    dashboardMetricCard: (_icon, label, value) => `${label}|${value}`,
    dashboardMetricIcon: () => '',
  });
  vm.runInContext(`${source.slice(dashboardStart, dashboardEnd)};globalThis.render=executiveKPIs;`, dashboardContext);
  const dashboard = dashboardContext.render({
    portfolio: { tC: 0, tI: 0, tG: 0, tGP: 0, appliedComplete: true },
    portfolioEconomicResult: { status: 'PARTIAL' },
  });
  assert.match(dashboard, /Resultado total: Em consolidação/);
  assert.doesNotMatch(dashboard, /Resultado certificado da RV|Renda recebida/);
});

test('Hide Values masks dashboard subtotal and return in visible and accessible text', () => {
  const html = render({ status: 'PARTIAL', certifiedAssets: ['rf-1'], certifiedEconomicResult: 7408.93, certifiedReturnPct: 11.29 }, true);
  assert.doesNotMatch(html, /7408|11\.29|R\$|%/);
  assert.match(html, /Subtotal certificado/);
  assert.match(html, /••••/);
  assert.match(html, /dashboard-total-result-value neutral/);
});

test('dashboard aggregation consumes reconciliations without enabling incomplete totals', () => {
  assert.ok(source.includes('function portfolioEconomicResultSnapshot('));
  assert.ok(source.includes("inventoryCoverage:'UNKNOWN'"));
  assert.ok(source.includes('data.portfolioEconomicResult=portfolioEconomicResultSnapshot'));
  assert.ok(source.includes('dashboardEconomicResultStatus(data?.portfolioEconomicResult)'));
});

test('dashboard aggregator maps RF results by identity and keeps portfolio inventory unproven', () => {
  const start = source.indexOf('function portfolioEconomicResultSnapshot(');
  const end = source.indexOf('\nfunction ', start + 10);
  assert.notEqual(start, -1);
  const input = { assets: [{ id: 'rf-1', type: 'Renda Fixa' }, { id: 'stock-1', type: 'Ação' }] };
  const api = {
    reconcileAsset({ asset }) { return { assetId: asset.id, status: 'NOT_AVAILABLE' }; },
    aggregatePortfolio(value) { return value; },
  };
  const context = vm.createContext({ S: input, FinancialTruthReconciliation: api });
  vm.runInContext(`${source.slice(start, end)};globalThis.run=portfolioEconomicResultSnapshot;`, context);
  const rfReconciliation = { assetId: 'rf-1', status: 'COMPLETE' };
  const result = context.run({ assets: [{ asset: input.assets[0], reconciliation: rfReconciliation }] });

  assert.equal(result.inventoryCoverage, 'UNKNOWN');
  assert.deepEqual(Array.from(result.reconciliations), [rfReconciliation, { assetId: 'stock-1', status: 'NOT_AVAILABLE' }]);
});
