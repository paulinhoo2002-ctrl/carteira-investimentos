const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// V348: the Dashboard must render the highs/lows panel again using the
// canonical rows source, the existing row renderer, the class filter state
// and the canon CSS that never left the codebase.

test('V348: dash() renders the highs/lows panel between priority and quick actions', () => {
  const dashFn = html.slice(html.indexOf('function dash(){'), html.indexOf('function dashboardV3AllocationPanel'));
  assert.ok(dashFn.length > 0, 'dash() not found');
  assert.match(dashFn, /dashboardHomeHighsLowsPanel/, 'dash() must render the highs/lows panel');
  const priorityIdx = dashFn.indexOf('${dashboardV3PriorityPanel(data)}');
  const panelIdx = dashFn.indexOf('${dashboardHomeHighsLowsPanel');
  const actionsIdx = dashFn.indexOf('${dashboardQuickActions()}');
  assert.ok(priorityIdx >= 0 && actionsIdx >= 0, 'priority/quick anchors missing');
  assert.ok(panelIdx > priorityIdx && panelIdx < actionsIdx, 'highlights panel must sit between priority panel and quick actions');
});

test('V348: panel renders two columns of five from the canonical source with class filter chips', () => {
  const fn = html.slice(html.indexOf('function dashboardHomeHighsLowsPanel'), html.indexOf('function dashboardHomeCompositionPanel'));
  assert.ok(fn.length > 0, 'dashboardHomeHighlightsPanel not found');
  assert.match(fn, /renderColumn=\(kind,title,empty\)=>\{\s*\n\s*const rows=dashboardHighlightsRows\(kind,\s*classFilter\)/, 'must use canonical rows with kind+classFilter');
  assert.match(fn, /renderColumn\('high'/, 'high column from canonical source');
  assert.match(fn, /renderColumn\('low'/, 'low column from canonical source');
  assert.match(fn, /dashboardHighlightsRowHtml\(row,\s*kind\)/, 'must reuse the existing row renderer');
  assert.match(fn, /slice\(0,\s*5\)/, 'columns cap at five positions');
  assert.match(fn, /dashboard-highlight-column/, 'must render the canon highlight column class');
  assert.match(fn, /Maiores altas/, 'high column title');
  assert.match(fn, /Maiores baixas/, 'low column title');
  // class filter chips: all/acao/fii/etf driven by the existing state + setter
  assert.match(fn, /S\.dashboardHighlightsClassFilter/, 'must bind the existing filter state');
});

test('V348: filter setter and canonical rows source already exist (no reimplementation allowed)', () => {
  // the pre-existing pieces V347 verified in main must remain untouched
  assert.match(html, /function dashboardHighlightsRows\(kind='high', classFilter='all'\)/);
  assert.match(html, /function dashboardHighlightsRowHtml\(row, kind\)/);
  assert.match(html, /function setDashboardHighlightsClassFilter|S\.dashboardHighlightsClassFilter=next/);
  assert.match(html, /\.canon-dashboard \.dashboard-highlight-column\{/, 'canon CSS for the columns must remain');
});
