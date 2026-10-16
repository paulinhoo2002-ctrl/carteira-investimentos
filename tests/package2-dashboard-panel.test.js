'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');

function extractSnippet(startMarker, endMarker) {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert.notEqual(start, -1, `Start marker not found: ${startMarker}`);
  assert.notEqual(end, -1, `End marker not found: ${endMarker}`);
  return html.slice(start, end);
}

function makeContext(overrides = {}) {
  const context = {
    S: { hideValues: false, ...(overrides.S || {}) },
    FB: { package2: overrides.package2 !== undefined ? overrides.package2 : null, ...(overrides.FB || {}) },
    esc(value) { return String(value ?? ''); },
    fmt(value) { return `R$ ${Number(value || 0).toFixed(2)}`; },
    dashboardMetricIcon() { return '<i></i>'; },
    dashboardMetricCard(icon, label, value, note, tone, glow) {
      return `<div class="premium-metric" data-label="${label}" data-value="${value}" data-note="${note}" data-tone="${tone}"></div>`;
    },
    ...(overrides.globals || {})
  };
  return context;
}

function renderPanel(overrides) {
  const snippet = extractSnippet('function package2ExecutivePanel(){', 'function dashboardEvolutionPanel(data){');
  const context = makeContext(overrides);
  vm.createContext(context);
  vm.runInContext(snippet + '\npackage2ExecutivePanel', context);
  return context.package2ExecutivePanel();
}

// The certified payload (mirrors package2_v2 income/result summaries)
const certifiedSummary = {
  current_result_summary: {
    label: 'CURRENT_POSITION_RESULT',
    rv_certified_count: 31,
    rv_total: -10337.12,
    coverage_ratio: 0.6304,
    coverage_status: 'PARTIAL'
  },
  income_summary: {
    y2026_total: 27108.91,
    y2026_events: 234,
    all_history_total: 126647.14
  }
};

test('package2 panel renders certified capital gain with PARTIAL and coverage', () => {
  const html = renderPanel({ package2: certifiedSummary });
  assert.match(html, /data-package2="present"/);
  assert.match(html, /Ganho de capital atual/);
  assert.match(html, /R\$ -10337\.12/);
  assert.match(html, /31 posições certificadas · cobertura 63,04% · PARCIAL/);
  assert.match(html, /não é lucro realizado/);
});

test('package2 panel renders certified 2026 received income (never stale all-history as 2026)', () => {
  const html = renderPanel({ package2: certifiedSummary });
  assert.match(html, /Proventos recebidos/);
  assert.match(html, /R\$ 27108\.91/);
  assert.match(html, /234 eventos/);
  // The stale all-history total must NOT appear as the 2026 value
  assert.doesNotMatch(html, /R\$ 119324\.80/);
  assert.doesNotMatch(html, /R\$ 24315\.30/);
});

test('package2 panel keeps total result in consolidation (no fake total profit)', () => {
  const html = renderPanel({ package2: certifiedSummary });
  assert.match(html, /Resultado total/);
  assert.match(html, /Em consolidação/);
  assert.match(html, /Combinação de escopos ainda não certificada/);
});

test('package2 panel renders nothing when summary absent (first-fold preserved)', () => {
  const html = renderPanel({ package2: null });
  assert.equal(html, '');
  // no certified numbers leak
  assert.doesNotMatch(html, /10337/);
  assert.doesNotMatch(html, /27108/);
});

test('package2 panel hides values in hidden-value mode', () => {
  const html = renderPanel({ package2: certifiedSummary, S: { hideValues: true } });
  assert.match(html, /data-package2="present"/);
  assert.doesNotMatch(html, /R\$ -10337\.12/);
  assert.doesNotMatch(html, /R\$ 27108\.91/);
  // coverage note remains (it is not a monetary value)
  assert.match(html, /cobertura 63,04%/);
});

test('package2 panel renders nothing for malformed summary (no empty cards)', () => {
  const html = renderPanel({ package2: { current_result_summary: {}, income_summary: {} } });
  assert.equal(html, '');
  assert.doesNotMatch(html, /R\$ \d/);
});

test('dashboard wires the package2 panel after executive KPIs', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  assert.match(html, /\$\{executiveKPIs\(data\)\}\s*\r?\n\s*\$\{package2ExecutivePanel\(\)\}/);
});

test('cloud snapshot captures package2_v2 read-only into FB', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  assert.match(html, /FB\.package2=data\.package2_v2\|\|null;/);
  // package2 must never enter the persisted/uploaded state payload
  const payloadStart = html.indexOf('function cloudPayload(){');
  const payloadEnd = html.indexOf('function readFreshCloudPayload()', payloadStart);
  const payload = html.slice(payloadStart, payloadEnd);
  assert.doesNotMatch(payload, /package2/);
});