const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const marker = '/* Phase 3.1: compact desktop pass for 14-inch notebooks.';
const start = source.indexOf(marker);
const end = source.indexOf('</style>', start);
const compactCss = source.slice(start, end);

test('Phase 3.1: compactação fica limitada ao intervalo de notebook', () => {
  assert.ok(start >= 0 && end > start, 'bloco CSS da Phase 3.1 precisa existir');
  assert.match(compactCss, /min-width:1181px/);
  assert.match(compactCss, /max-width:1535px/);
  assert.doesNotMatch(compactCss, /zoom\s*:/i);
  assert.doesNotMatch(compactCss, /transform\s*:\s*scale/i);
});

test('Phase 3.1: densidade preserva legibilidade financeira e não altera mobile/wide', () => {
  assert.match(compactCss, /dashboard-executive-kpis \.premium-metric-value\{font-size:20px\}/);
  assert.match(compactCss, /dashboard-evolution-card svg\{height:176px/);
  assert.match(compactCss, /assets-premium-table th,\.assets-premium-shell \.assets-premium-table td\{padding-top:8px;padding-bottom:8px\}/);
  assert.doesNotMatch(compactCss, /transform\s*:/i);
});

test('Phase 3.1: composição e navegação não são redesenhadas', () => {
  assert.match(compactCss, /\.canon-dashboard/);
  assert.match(compactCss, /\.assets-premium-shell/);
  assert.match(compactCss, /\.aporte-premium/);
  assert.match(compactCss, /\.premium-dividends-3/);
  assert.match(compactCss, /\.rent-premium/);
  assert.match(compactCss, /\.metas-shell/);
  assert.doesNotMatch(compactCss, /\.tabs-desktop\s*\{[^}]*position\s*:/);
});
