'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractSnippet(startMarker, endMarker) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert.notEqual(start, -1, `Start marker not found: ${startMarker}`);
  assert.notEqual(end, -1, `End marker not found: ${endMarker}`);
  return html.slice(start, end);
}

function renderEvolutionPanel(months, hideValues = false) {
  const snippet = extractSnippet('function dashboardEvolutionPanel(data){', 'function dashboardIncomePanel(data){');
  let chartInput;
  const renderPanel = vm.runInNewContext(`${snippet}\ndashboardEvolutionPanel`, {
    S: { dashPeriod: 12, hideValues },
    patrimonySnapshot: () => ({ months }),
    lineChart(series, labels) { chartInput = { series, labels }; return '<svg></svg>'; },
    fmt: value => String(value)
  });
  const html = renderPanel({});
  return { html, chartInput };
}

test('M554: evolution panel with zero months of movement renders empty state', () => {
  const { html } = renderEvolutionPanel([
    { movementCount: 0, cumulative: null, label: 'Jan/26' },
    { movementCount: 0, cumulative: null, label: 'Fev/26' },
    { movementCount: 0, cumulative: null, label: 'Mar/26' }
  ]);
  assert.match(html, /dashboard-evolution-empty/);
  assert.match(html, /Não há movimentações registradas na janela/);
  assert.match(html, /a cobertura do histórico é desconhecida/);
  assert.match(html, /<summary>Movimento registrado<\/summary>/);
  assert.doesNotMatch(html, /dashboard-evolution-compact/);
  assert.doesNotMatch(html, /dashboard-evolution-sparse/);
});

test('M554: evolution panel with one month of movement renders compact', () => {
  const { html, chartInput } = renderEvolutionPanel([
    { movementCount: 0, cumulative: null, label: 'Jan/26' },
    { movementCount: 0, cumulative: null, label: 'Fev/26' },
    { movementCount: 1, cumulative: 150, label: 'Mar/26' }
  ]);
  assert.match(html, /dashboard-evolution-compact/);
  assert.match(html, /dashboard-evolution-sparse/);
  assert.match(html, /Exibe somente o mês com movimento registrado \(Mar\/26\) de 3 \(33%\)/);
  assert.match(html, /Meses sem registro não aparecem/);
  assert.match(html, /[Aa] cobertura do histórico permanece desconhecida/);
  assert.match(html, /Mar\/26/);
  assert.match(html, /Acumulado até Mar\/26/);
  assert.match(html, /150/);
  assert.match(html, /Sem série temporal suficiente/);
  assert.doesNotMatch(html, /<svg/);
  assert.equal(chartInput, undefined);
});

test('M554: evolution panel with two months of movement renders compact without sparse', () => {
  const { html, chartInput } = renderEvolutionPanel([
    { movementCount: 1, cumulative: 100, label: 'Jan/26' },
    { movementCount: 1, cumulative: 130, label: 'Fev/26' },
    { movementCount: 0, cumulative: null, label: 'Mar/26' }
  ]);
  assert.match(html, /dashboard-evolution-compact/);
  assert.doesNotMatch(html, /dashboard-evolution-sparse/);
  assert.match(html, /2 de 3 meses com movimento registrado \(67%\)/);
  assert.match(html, /Meses sem registro não são preenchidos/);
  assert.match(html, /a cobertura do histórico permanece desconhecida/);
  assert.deepEqual(Array.from(chartInput.series[0].values), [100, 130, null]);
  assert.deepEqual(Array.from(chartInput.labels), ['Jan/26', 'Fev/26', 'Mar/26']);
});

test('M586: one observed month hides its amount without leaking it into attributes', () => {
  const { html, chartInput } = renderEvolutionPanel([
    { movementCount: 1, cumulative: 123456.78, label: 'Out/26' }
  ], true);
  assert.match(html, /Out\/26/);
  assert.match(html, /••••/);
  assert.doesNotMatch(html, /123456|<svg|aria-label="[^"]*123456/);
  assert.equal(chartInput, undefined);
});

test('M554: evolution panel with sufficient history renders full', () => {
  const { html } = renderEvolutionPanel([
    { movementCount: 2, cumulative: 100, label: 'Jan/26' },
    { movementCount: 1, cumulative: 130, label: 'Fev/26' },
    { movementCount: 3, cumulative: 180, label: 'Mar/26' },
    { movementCount: 1, cumulative: 200, label: 'Abr/26' }
  ]);
  assert.doesNotMatch(html, /dashboard-evolution-compact/);
  assert.doesNotMatch(html, /dashboard-evolution-sparse/);
  assert.match(html, /4 de 4 meses com movimento registrado \(100%\)/);
  assert.match(html, /a cobertura do histórico permanece desconhecida/);
});

test('M554: movement percentage is labeled as registered movement, not certified coverage', () => {
  const { html } = renderEvolutionPanel([
    { movementCount: 1, cumulative: 100, label: 'Jan/26' },
    { movementCount: 0, cumulative: null, label: 'Fev/26' },
    { movementCount: 0, cumulative: null, label: 'Mar/26' }
  ]);
  assert.match(html, /Exibe somente o mês com movimento registrado \(Jan\/26\) de 3 \(33%\)/);
  assert.match(html, /[Aa] cobertura do histórico permanece desconhecida/);
  assert.doesNotMatch(html, /cobertura certificada/i);
  assert.doesNotMatch(html, /cobertura completa/i);
  assert.doesNotMatch(html, /percentual de completude/i);
});

test('M554: patrimonioTab labels coverage as unknown, not certified', () => {
  assert.match(source, /Meses com movimento registrado/);
  assert.match(source, /a cobertura histórica permanece desconhecida/);
  assert.doesNotMatch(source, /Cobertura do histórico<\/div>/);
  assert.match(source, /com movimento registrado\)/);
  assert.match(source, /histórico patrimonial indisponível/);
});
