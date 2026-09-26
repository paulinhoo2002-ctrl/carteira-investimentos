const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('V274 dark secondary text and AI badge use readable foregrounds', () => {
  assert.match(html, /\.mu\{color:#94a3b8\}/);
  assert.match(html, /html\[data-theme="light"\] \.mu\{color:#4f6175\}/);
  assert.match(html, /\.ai-hub-pill\{color:#a5b4fc\}/);
});

test('Reports theme overrides and export action keep readable dark-theme contrast', () => {
  assert.match(html, /html\[data-theme="light"\] \.reports-intelligence-strip small,html\[data-theme="light"\] \.reports-intelligence-label/);
  assert.match(html, /html\[data-theme="light"\] \.reports-executive-summary-head p,html\[data-theme="light"\] \.reports-executive-summary-grid span,html\[data-theme="light"\] \.reports-executive-summary-grid small/);
  assert.match(html, /background:#047857!important;color:#fff!important/);
});

test('V274 scrollable financial regions are keyboard-focusable, named and visibly focused', () => {
  assert.match(html, /\.div-mat-scroll:focus-visible[^}]*outline:2px solid/);
  assert.match(html, /class="div-mat-scroll" tabindex="0" role="region" aria-label="Matriz anual de proventos com rolagem horizontal"/);
  assert.match(html, /class="data-trust-list" tabindex="0" role="region" aria-label="Lista de posições com rolagem"/);
  assert.match(html, /class="v254-fiscal-table-wrap" tabindex="0" role="region" aria-label=/);
  assert.match(html, /class="ts" tabindex="0" role="region" aria-label="Tabela de distribuição da carteira com rolagem horizontal"/);
});

test('Metas keeps its allocation action outside the disclosure summary', () => {
  const start = html.indexOf('function metasTab()');
  const end = html.indexOf('\nfunction ', start + 1);
  const metas = html.slice(start, end > start ? end : undefined);
  assert.match(metas, /Configurar distribuição/);
  assert.doesNotMatch(metas, /<summary>[\s\S]{0,500}<button[^>]*openAllocationGoal/);
});
