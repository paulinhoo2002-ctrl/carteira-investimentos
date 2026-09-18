const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('shared line chart exposes semantic name and text summary', () => {
  const start = source.indexOf('function lineChart(series, labels, chartClass=', 0);
  const end = source.indexOf('\nfunction syncAssetsFromAportes', start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  assert.match(block, /role="img"/);
  assert.match(block, /aria-labelledby=/);
  assert.match(block, /chartSummary/);
  assert.match(block, /labels\[0\]/);
});

test('reports evolution keeps a non-visual summary for chart values', () => {
  const start = source.indexOf('function reportsTab(){');
  const end = source.indexOf('\nfunction render(){', start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  assert.match(block, /reports-evolution-summary/);
  assert.match(block, /evolutionBars/);
});
