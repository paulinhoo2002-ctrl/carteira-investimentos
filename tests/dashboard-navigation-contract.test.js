const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('dashboard period controls expose an explicit selection state', () => {
  const dashBlock = source.slice(source.indexOf('function dash(){'), source.indexOf('function patrimonySnapshot('));
  assert.match(dashBlock, /aria-label="Mostrar evolução de \$\{period\} meses"/);
  assert.match(dashBlock, /aria-pressed="\$\{Number\(S\.dashPeriod\)===period\?'true':'false'\}"/);
});

test('dashboard exposes safe drilldowns for the primary analysis tasks', () => {
  const dashBlock = source.slice(source.indexOf('function dash(){'), source.indexOf('function patrimonySnapshot('));
  assert.match(dashBlock, /dashboard-quick-actions/);
  assert.match(dashBlock, /\['ativos','Ativos','Posições e concentração'/);
  assert.match(dashBlock, /\['dividendos','Dividendos','Histórico de proventos'/);
  assert.match(dashBlock, /\['rentabilidade','Rentabilidade','Evolução e benchmarks'/);
  assert.match(dashBlock, /onclick="go\('\$\{route\}'\)"/);
  assert.doesNotMatch(dashBlock, /save\(|persist|confirm/i);
});
