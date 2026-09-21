const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('V259 expõe completude do replay dentro do painel fiscal existente', () => {
  assert.match(html, /buildHistoricalReconstructionCompleteness/);
  assert.match(html, /V259 completude da reconstrução histórica/);
  assert.match(html, /Vendas em revisão/);
});

test('V259 continua read-only e preserva autoridade da posição corrente', () => {
  const panel = html.match(/function v254FiscalPanel\(\)\{([\s\S]*?)\r?\n\}\r?\nfunction reportsTab/);
  assert.ok(panel, 'painel fiscal deve existir');
  assert.match(panel[1], /currentPositions:S\.assets/);
  assert.match(panel[1], /authoritativeCostBasis:result/);
  assert.match(panel[1], /sem writes/);
  assert.doesNotMatch(panel[1], /onclick|submit|save|persist/i);
});
