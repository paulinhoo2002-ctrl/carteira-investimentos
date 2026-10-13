'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rendererPath = path.join(__dirname, '..', 'legacy', 'js', 'screens', 'dashboard-executive-kpis.js');

function render(portfolio, availability = { state: 'AVAILABLE', note: 'Valores atuais informados' }) {
  const context = {
    cx: () => ({ tC: 700, tI: 500, tG: 200, tGP: 40 }),
    dashboardCurrentValueAvailability: () => availability,
    dashboardMetricIcon: name => `<i>${name}</i>`,
    dashboardMetricCard: (_icon, label, value, description, tone) => `<article data-label="${label}" data-tone="${tone}"><b>${label}</b><strong>${value}</strong><small>${description}</small></article>`,
    fmt: value => value === null || value === undefined ? '—' : `R$ ${Number(value).toFixed(2)}`,
    fmtP: value => value === null || value === undefined ? '—' : `${Number(value).toFixed(1)}%`,
    passiveIncomeMonthKey: () => '2026-10',
    passiveIncomeMonthSummary: () => ({ month: '2026-10', total: null, coverage: 'UNKNOWN' }),
    passiveIncomeValue: value => value === null || value === undefined ? '—' : `R$ ${Number(value).toFixed(2)}`,
    S: { hideValues: false, proventos: [], rfEvents: [] },
  };
  vm.runInNewContext(fs.readFileSync(rendererPath, 'utf8'), context, { filename: rendererPath });
  return context.executiveKPIs({ portfolio, recent: { month: '2026-10', total: null, coverage: 'UNKNOWN' } });
}

test('real Dashboard KPI renderer keeps missing values unavailable', () => {
  const html = render({ tC: null, tI: '', tG: null, tGP: null }, { state: 'UNKNOWN', note: 'Valor atual indisponível' });
  assert.match(html, /<article data-label="Patrimônio atual"[^>]*><b>Patrimônio atual<\/b><strong>—<\/strong><small>Capital aplicado indisponível · Valor atual indisponível/);
  assert.match(html, /<article data-label="Resultado"[^>]*><b>Resultado<\/b><strong>—<\/strong><small>Base parcial ou indisponível/);
  assert.match(html, /<article data-label="Recebido"[^>]*><b>Recebido<\/b><strong>—<\/strong><small>Cobertura desconhecida/);
  assert.doesNotMatch(html, /R\$ 0\.00/);
});

test('real Dashboard KPI renderer labels partial coverage and suppresses complete-looking result', () => {
  const html = render({ tC: 1000, tI: 500, tG: 500, tGP: 100 }, { state: 'PARTIAL', note: 'Parcial: 1 valor atual indisponível' });
  assert.match(html, /R\$ 1000\.00/);
  assert.match(html, /Parcial: 1 valor atual indisponível/);
  assert.match(html, /<article data-label="Resultado"[^>]*><b>Resultado<\/b><strong>—<\/strong><small>Base parcial ou indisponível/);
});

test('real Dashboard KPI renderer preserves explicitly confirmed zero', () => {
  const html = render({ tC: 0, tI: 0, tG: 0, tGP: 0 });
  assert.match(html, /<article data-label="Patrimônio atual"[^>]*><b>Patrimônio atual<\/b><strong>R\$ 0\.00<\/strong><small>Sem capital aplicado · Valor conhecido: zero/);
  assert.match(html, /<article data-label="Resultado"[^>]*><b>Resultado<\/b><strong>R\$ 0\.00<\/strong>/);
});

test('real Dashboard KPI renderer does not derive missing result or rentabilidade', () => {
  const html = render({ tC: 1000, tI: 1000, tG: null, tGP: null });
  assert.match(html, /<article data-label="Resultado"[^>]*><b>Resultado<\/b><strong>—<\/strong>/);
  assert.match(html, /Medidas sem base comum; não pareadas/);
  assert.doesNotMatch(html, /<strong>R\$ 0\.00<\/strong>/);
});
