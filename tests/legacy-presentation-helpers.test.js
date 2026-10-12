const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const helperPath = path.join(root, 'legacy', 'js', 'ui', 'presentation.js');

function loadPresentationHarness() {
  const calls = { cleared: [], timers: [], children: [] };
  const toastArea = {
    replaceChildren(...nodes) { calls.children.push(nodes); },
  };
  const document = {
    getElementById(id) { return id === 'toast-area' ? toastArea : null; },
    createElement(tag) { return { tag, style: {}, className: '', textContent: '' }; },
  };
  const context = {
    document,
    assetContributionSignal() { return { tone: 'muted', label: 'Sem sinal confirmado' }; },
    fmt(value) { return `R$ ${Number(value).toFixed(2)}`; },
    fmtP(value) { return `${Number(value).toFixed(1)}%`; },
    esc(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); },
    clearTimeout(id) { calls.cleared.push(id); },
    setTimeout(callback, delay) { calls.timers.push({ callback, delay }); return calls.timers.length; },
  };
  vm.runInNewContext(fs.readFileSync(helperPath, 'utf8'), context, { filename: helperPath });
  return { context, calls };
}

test('presentation helpers load before app code and leave their definitions outside index.html', () => {
  const helperScript = html.indexOf('<script src="legacy/js/ui/presentation.js"></script>');
  const applicationScript = html.indexOf('<script>\nconst QUOTE_REFRESH_INTERVAL');
  assert.ok(helperScript >= 0 && helperScript < applicationScript);
  assert.doesNotMatch(html, /function (?:toast|dashboardMetricIcon|waveBIcon|dashboardInlineAction|dashboardConsultiveCard|dashboardMetricCard|dashboardRadarCard|assetSummaryCard|assetRankingRowHtml|dividendMonthlyHistoryYearMonthRow|dividendMonthlyHistoryYearCard)\s*\(/);
});

test('dashboard icons preserve accessible-hidden SVG mappings and readonly shield', () => {
  const { context } = loadPresentationHarness();
  assert.match(context.dashboardMetricIcon('trend'), /dashboard-metric-glyph/);
  assert.match(context.dashboardMetricIcon('unknown'), /<path d="M3 6\.5h14v10H3z"/);
  assert.match(context.waveBIcon('income'), /wave-b-icon ds-icon-container/);
  assert.match(context.waveBIcon('readonly'), /<path d="M10 2\.5l6 2\.2v4\.1/);
});

test('toast helper keeps message text, color, replacement, and timer behavior', () => {
  const { context, calls } = loadPresentationHarness();
  context.toast('<synthetic>', '#123456');
  assert.equal(calls.children[0][0].className, 'toast');
  assert.equal(calls.children[0][0].textContent, '<synthetic>');
  assert.equal(calls.children[0][0].style.color, '#123456');
  assert.equal(calls.timers[0].delay, 2800);
  context.toast('second');
  assert.deepEqual(calls.cleared, [null, 1]);
  assert.equal(calls.children[1][0].style.color, '#6ee7b7');
});

test('shared dashboard renderers preserve escaped labels and their existing markup contracts', () => {
  const { context } = loadPresentationHarness();
  assert.match(context.dashboardInlineAction('openAsset', 'A&B', '<Open>'), /openAsset\(&quot;A&amp;B&quot;\)/);
  assert.match(context.dashboardConsultiveCard('<Title>', 'Known', '<Text>', '<Action>', 'muted'), /&lt;Title&gt;/);
  assert.match(context.dashboardConsultiveCard('Title', 'Known', 'Text', '<Action>', 'muted'), /&lt;Action&gt;/);
  assert.match(context.dashboardMetricCard('<svg>', 'Capital', 'R$ 1.234,56', '<Known>', '#123456', 'rgba(0,0,0,.1)'), /premium-metric-value[^>]*>R\$ 1\.234,56/);
  assert.match(context.dashboardMetricCard('icon', '<Capital>', 'R$ 1', '<note>'), /&lt;Capital&gt;/);
  assert.match(context.dashboardRadarCard('Top', [{ ticker: '<ABC>' }], () => '<strong>1</strong>', 'Empty'), /&lt;ABC&gt;/);
  assert.match(context.dashboardRadarCard('Top', [], () => '', '<No data>'), /&lt;No data&gt;/);
  assert.match(context.assetSummaryCard('<Invested>', '—', '<Unknown>', 'muted'), /&lt;Invested&gt;/);
  assert.match(context.assetSummaryCard('Invested', '—', '<Unknown>', 'muted'), /&lt;Unknown&gt;/);
  const ranking = context.assetRankingRowHtml({ ticker: '<ABC>', type: 'Ação', sector: 'Bancos', current: 100, share: null, pct: null }, 1);
  assert.match(ranking, /&lt;ABC&gt;/);
  assert.match(ranking, /class="analysis-ranking-value">—/);
  assert.match(ranking, /class="analysis-ranking-value ">—/);
});

test('annual dividend presentation keeps unknown coverage separate from confirmed zero', () => {
  const { context } = loadPresentationHarness();
  const unknown = context.dividendMonthlyHistoryYearCard({ year: 2026, average: null, total: null, validCount: 0, bestMonth: null, months: [{ label: 'Jan', valueText: '—', kind: 'unknown' }] }, false);
  assert.match(unknown, /Média — · Total recebido — · Cobertura confirmada: 0\/12 meses/);
  assert.match(unknown, /div-year-month-value">—/);
  const completeZero = context.dividendMonthlyHistoryYearCard({ year: 2025, average: 0, total: 0, validCount: 12, bestMonth: null, months: [{ label: 'Jan', valueText: 'R$ 0,00', kind: 'complete-zero' }] }, false);
  assert.match(completeZero, /Média R\$ 0\.00 · Total recebido R\$ 0\.00 · Cobertura confirmada: 12\/12 meses/);
  assert.match(completeZero, /R\$ 0,00/);
});
