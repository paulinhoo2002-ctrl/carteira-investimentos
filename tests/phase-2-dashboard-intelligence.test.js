const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extract(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing start marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

test('dashboard sector concentration uses current values and ignores incomplete sectors', () => {
  const snippet = extract('function dashboardSectorConcentrationRows(', 'function dashboardAssetByTicker(');
  const context = {};
  vm.runInNewContext(`${snippet}\ndashboardSectorConcentrationRows;`, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.dashboardSectorConcentrationRows([
    { sector: 'Bancos', current: 600 },
    { sector: 'Bancos', current: 400 },
    { sector: 'Energia', current: 500 },
    { sector: '—', current: 900 },
    { sector: '', current: 700 },
    { sector: 'Energia', current: 0 },
  ]))), [
    { sector: 'Bancos', current: 1000, share: 66.66666666666666 },
    { sector: 'Energia', current: 500, share: 33.33333333333333 },
  ]);
});

test('dashboard snapshot exposes sector concentration without a parallel financial source', () => {
  const snapshot = extract('function dashboardSnapshot(analysisRows){', 'function dashboardSectorConcentrationRows(');
  assert.match(snapshot, /sectorRows:dashboardSectorConcentrationRows\(analysis\)/);
  assert.doesNotMatch(snapshot, /FinanceCore|localStorage|save\(/);
});

test('dashboard renders fixed-income agenda and evidence-based insights', () => {
  const dash = extract('function dash(){', 'function patrimonySnapshot(');
  assert.match(dash, /dashboardReceiptsPanel\(data\)/);
  assert.match(dash, /dashboardInsightsPanel\(data\)/);
  assert.match(dash, /dashboard-intelligence-grid/);
});

test('dashboard creates a sector concentration insight using an existing route', () => {
  const insights = extract('function portfolioInsightsSnapshot(source=null){', 'function dashboardInsightsPanel(data){');
  assert.match(insights, /concentration-top-sector/);
  assert.match(insights, /relatedRoute:'ativos'/);
  assert.match(insights, /assetAnalysisRows/);
});
