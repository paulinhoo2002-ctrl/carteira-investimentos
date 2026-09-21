const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('V255 carrega a camada de reconstrução histórica antes do painel fiscal', () => {
  assert.match(html, /<script src="historical-reconstruction-hardening\.js"><\/script>/);
  assert.match(html, /function v255HistoryStatusLabel\(status\)/);
  assert.match(html, /Reconstrução histórica/);
});

test('V255 mantém reconciliação read-only e estados de cobertura explícitos', () => {
  const panel = html.match(/function v254FiscalPanel\(\)\{([\s\S]*?)\r?\n\}\r?\nfunction reportsTab/);
  assert.ok(panel, 'painel fiscal deve existir');
  assert.match(panel[1], /buildHistoricalReconstructionAudit/);
  assert.match(panel[1], /aria-label="V255 reconstrução histórica"/);
  assert.doesNotMatch(panel[1], /onclick|submit|save|persist/i);
});
