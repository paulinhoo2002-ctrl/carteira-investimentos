const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('index.html', 'utf8');

test('line charts expose grouped period tooltips and a hidden crosshair', () => {
  assert.match(source, /data-chart-index=/);
  assert.match(source, /data-chart-x=/);
  assert.match(source, /class="chart-crosshair"/);
  assert.match(source, /querySelectorAll\(`\[data-chart-index=/);
  assert.match(source, /onpointermove="showLineChartTooltip\(this,event\)"/);
});

test('asset search covers ticker, name, type and sector without changing numeric sources', () => {
  assert.match(source, /const sector = String\(a\.sector\|\|''\)\.toLowerCase\(\)/);
  assert.match(source, /type\.includes\(q\) \|\| sector\.includes\(q\)/);
});
