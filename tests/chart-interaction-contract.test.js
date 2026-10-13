const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('index.html', 'utf8');
const chartSource = fs.readFileSync('legacy/js/ui/charts.js', 'utf8');

test('line charts expose grouped period tooltips and a hidden crosshair', () => {
  assert.match(chartSource, /data-chart-index=/);
  assert.match(chartSource, /data-chart-x=/);
  assert.match(chartSource, /class="chart-crosshair"/);
  assert.match(chartSource, /querySelectorAll\(`\[data-chart-index=/);
  assert.match(chartSource, /onpointermove="showLineChartTooltip\(this,event\)"/);
});

test('asset search covers ticker, name, type and sector without changing numeric sources', () => {
  assert.match(source, /const sector = String\(a\.sector\|\|''\)\.toLowerCase\(\)/);
  assert.match(source, /type\.includes\(q\) \|\| sector\.includes\(q\)/);
});
