const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extract(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0, `missing ${start}`);
  assert.ok(to > from, `missing ${end}`);
  return source.slice(from, to);
}

test('dashboard freshness formatter keeps source and missing state explicit', () => {
  const block = extract('function dashboardDataQuality(data,audit){', 'function dashboardPerformanceSnapshot(');
  assert.match(source, /function dashboardFreshnessLabel\(source\)/);
  assert.match(block, /dashboardFreshnessLabel\(source\)/);
  assert.match(source, /Sem origem recente identificada/);
  assert.doesNotMatch(block, /source\?0/);
});

test('dashboard contextual actions expose destination in visible and accessible copy', () => {
  const block = extract('function dashboardInsightsPanel(data){', 'function dashboardLatestSourceInfo(){');
  assert.match(block, /dashboard-insight-action/);
  assert.match(block, /aria-label=.*item\.title/);
  assert.match(block, /actionLabel/);
});
