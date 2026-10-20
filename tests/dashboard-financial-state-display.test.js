'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function renderExecutiveKpis({ availability, appliedComplete, totalCurrent = 0, totalApplied = 0 } = {}) {
  const start = source.indexOf('function executiveKPIs(data){');
  const end = source.indexOf('\nfunction package2ExecutivePanel(', start);
  const cardStart = source.indexOf('function dashboardMetricCard(');
  const cardEnd = source.indexOf('\nfunction dashboardRadarCard(', cardStart);
  assert.ok(start >= 0 && end > start, 'executive KPI renderer exists');
  assert.ok(cardStart >= 0 && cardEnd > cardStart, 'metric card renderer exists');

  const context = vm.createContext({
    S: { hideValues: false, proventos: [], rfEvents: [] },
    FB: {},
    dashboardCurrentValueAvailability: () => availability,
    package2HasRenderableSummary: () => false,
    dashboardHasEconomicCertification: () => false,
    dashboardEconomicResultStatus: () => '',
    passiveIncomeMonthKey: () => '2026-10',
    passiveIncomeMonthSummary: () => ({ month: '2026-10', total: null, coverage: 'UNKNOWN' }),
    passiveIncomeValue: value => value == null ? '—' : `R$ ${value}`,
    dashboardMetricCard: undefined,
    dashboardMetricIcon: () => '',
    assetSignedMoneyText: value => `R$ ${value}`,
    fmtP: value => `${value}%`,
    fmt: value => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    esc: value => String(value),
    cx: () => ({ tC: totalCurrent, tI: totalApplied, tG: 0, tGP: 0, appliedComplete }),
  });
  vm.runInContext(`${source.slice(cardStart, cardEnd)}\n${source.slice(start, end)}\nglobalThis.render = executiveKPIs;`, context);
  return context.render({
    portfolio: { tC: totalCurrent, tI: totalApplied, tG: 0, tGP: 0, appliedComplete },
    recent: { month: '2026-10', total: null, coverage: 'UNKNOWN' },
  });
}

test('unknown current value and incomplete applied basis do not render a zero amount', () => {
  const html = renderExecutiveKpis({
    availability: { state: 'UNKNOWN', note: 'Valor atual indisponível' },
    appliedComplete: false,
  });

  assert.match(html, /Valor atual indisponível/i);
  assert.doesNotMatch(html, /R\$\s*0,00|R\$\s*0\.00/);
});

test('partial current value is not presented as a complete portfolio total', () => {
  const html = renderExecutiveKpis({
    availability: { state: 'PARTIAL', note: 'Parcial: 1 valor atual indisponível' },
    appliedComplete: true,
    totalCurrent: 100,
    totalApplied: 90,
  });

  assert.match(html, /Parcial: 1 valor atual indisponível/i);
  assert.match(html, /<div class="premium-metric-value">—<\/div>/);
});

test('empty portfolio states that no assets are registered', () => {
  const html = renderExecutiveKpis({
    availability: { state: 'NO_DATA', note: 'Sem ativos cadastrados' },
    appliedComplete: true,
  });

  assert.match(html, /Sem ativos cadastrados/i);
  assert.doesNotMatch(html, /Sem capital aplicado/i);
});

test('monthly income KPI identifies the value as received', () => {
  const html = renderExecutiveKpis({
    availability: { state: 'AVAILABLE', note: 'Valores atuais informados' },
    appliedComplete: true,
    totalCurrent: 100,
    totalApplied: 90,
  });

  assert.match(html, /premium-metric-label">Recebido</);
});
