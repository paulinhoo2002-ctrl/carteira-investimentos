const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('V274 dark secondary text and AI badge use readable foregrounds', () => {
  assert.match(html, /\.mu\{color:#94a3b8\}/);
  assert.match(html, /html\[data-theme="light"\] \.mu\{color:#4f6175\}/);
  assert.match(html, /\.ai-hub-pill\{color:#a5b4fc\}/);
});

test('Reports theme overrides and export action keep readable dark-theme contrast', () => {
  assert.match(html, /html\[data-theme="light"\] \.reports-intelligence-strip small,html\[data-theme="light"\] \.reports-intelligence-label/);
  assert.match(html, /html\[data-theme="light"\] \.reports-executive-summary-head p,html\[data-theme="light"\] \.reports-executive-summary-grid span,html\[data-theme="light"\] \.reports-executive-summary-grid small/);
  assert.match(html, /background:#047857!important;color:#fff!important/);
});

test('Reports fiscal summaries use theme-aware readable foregrounds in light mode', () => {
  assert.ok(/html\[data-theme="light"\][^{]*\.reports-premium-shell \.v254-fiscal-kpis span,[^{]*\{color:#475569\}/.test(html), 'light fiscal KPI labels need a readable foreground');
  assert.ok(/html\[data-theme="light"\][^{]*\.reports-premium-shell \.v254-fiscal-section-head>span,[^{]*\{color:#1d4ed8\}/.test(html), 'light fiscal section status needs a readable foreground');
  assert.ok(/html\[data-theme="light"\][^{]*\.reports-premium-shell \.v254-fiscal-table td small,[^{]*\{color:#475569\}/.test(html), 'light fiscal table metadata needs a readable foreground');
  assert.ok(/html\[data-theme="light"\] \.reports-premium-shell \.v254-fiscal-status--partial,\s*html\[data-theme="light"\] \.reports-premium-shell \.v254-fiscal-status--needs_review\{color:#854d0e;background:#fffbeb\}/.test(html), 'light review badges need a readable semantic palette');
  assert.ok(/html\[data-theme="light"\][^{]*\.reports-premium-shell \.v254-fiscal-rules a\{color:#1d4ed8\}/.test(html), 'light fiscal references need readable link color');
});

test('Reports light panels and controls override the later dark scoped declarations', () => {
  const darkPanel = html.lastIndexOf('.reports-premium-shell .reports-panel{padding:13px 14px;background:#0a121f');
  const lightPanel = html.lastIndexOf('html[data-theme="light"] .reports-premium-shell .reports-panel{background:#fff');
  assert.ok(darkPanel >= 0 && lightPanel > darkPanel, 'light panel surface must win the later dark scoped rule');
  assert.ok(/html\[data-theme="light"\] \.reports-premium-shell \.reports-filter button\{color:#334155/.test(html), 'light report period controls need readable text');
  assert.ok(/html\[data-theme="light"\] \.reports-premium-shell \.reports-inline-link\{color:#1d4ed8/.test(html), 'light report links need readable text');
  assert.ok(/html\[data-theme="light"\][^{]*\.reports-premium-shell \.reports-panel-footer span,[^{]*\{color:#52647b\}/.test(html), 'light report footer labels need readable text');
});

test('V274 light mobile navigation labels retain readable contrast', () => {
  assert.ok(/html\[data-theme="light"\] #investBottomNav button span:last-child\{color:#526174!important\}/.test(html));
});

test('corporate events light legend and review status use semantic readable colors', () => {
  assert.ok(/html\[data-theme="light"\] \.corporate-events-legend span\{color:#0f766e;background:#f0fdfa\}/.test(html));
  assert.ok(/html\[data-theme="light"\] \.corporate-events-review-queue strong\{color:#854d0e\}/.test(html));
});

test('Dashboard light actions, dense tables and interactive highlight rows remain legible and reachable', () => {
  assert.ok(/html\[data-theme="light"\] \.canon-dashboard \.dashboard-quick-action\{color:#1e293b;background:#f8fafc\}/.test(html));
  assert.ok(/html\[data-theme="light"\] \.canon-dashboard \.dashboard-quick-action-sub\{color:#526174\}/.test(html));
  assert.ok(/\.canon-dashboard \.allocation-intelligence-table\{width:100%;min-width:0;table-layout:fixed\}/.test(html));
  assert.ok(/\.canon-dashboard \.allocation-intelligence-table td\{overflow-wrap:anywhere\}/.test(html));
  assert.ok(/\.canon-dashboard \.dashboard-highlight-column \.dashboard-highlight-row,\.canon-dashboard \.dashboard-highlight-column \.dashboard-context-action\{height:auto!important;min-height:44px!important\}/.test(html));
  assert.ok(html.includes("document.addEventListener('focusin',event=>{const nav=event.target?.closest?.('.tabs-desktop')"));
  assert.ok(html.includes('visibleBottom=Math.min(innerHeight,navRect.bottom)'));
  assert.ok(html.includes('nav.scrollTop+=targetRect.bottom-visibleBottom'));
});

test('Dashboard light theme gives gain/loss cards readable surfaces and semantic text colors', () => {
  assert.match(html, /html\[data-theme="light"\] \.perf-card\.hi,\s*html\[data-theme="light"\] \.perf-card\.lo\{[\s\S]*?background:#fff!important;[\s\S]*?color:var\(--text\)!important/);
  assert.match(html, /html\[data-theme="light"\] \.perf-card\.hi \.perf-pct\{color:#047857!important\}/);
  assert.match(html, /html\[data-theme="light"\] \.perf-card\.lo \.perf-pct\{color:#b91c1c!important\}/);
});

test('Dashboard light theme raises muted text contrast on its own surfaces', () => {
  assert.match(html, /html\[data-theme="light"\] \.canon-dashboard\{--canon-muted:#405267\}/);
  assert.match(html, /html\[data-theme="light"\] \.canon-dashboard \.dashboard-receipts-header \.premium-panel-sub,[\s\S]*?\.canon-dashboard \.dash-receipt-date,[\s\S]*?\.canon-dashboard \.dash-receipt-rate\{color:#405267!important\}/);
  assert.match(html, /html\[data-theme="light"\] \.canon-dashboard \.dashboard-highlight-column\{[\s\S]*?background:#fff!important;[\s\S]*?color:#13202b!important/);
  assert.match(html, /html\[data-theme="light"\] \.canon-dashboard \.dashboard-highlight-row \.premium-exec-sub,[\s\S]*?\.canon-dashboard \.dashboard-highlight-row \.dashboard-highlight-details{color:#405267!important}/);
  assert.match(html, /html\[data-theme="light"\] \.canon-dashboard \.dashboard-evolution-card \.premium-panel-title\{color:#f1f5f9!important\}/);
  assert.match(html, /html\[data-theme="light"\] \.canon-dashboard \.dashboard-patrimony-chart text\{fill:#cbd5e1!important\}/);
});

test('V274 scrollable financial regions are keyboard-focusable, named and visibly focused', () => {
  assert.match(html, /\.div-mat-scroll:focus-visible[^}]*outline:2px solid/);
  assert.match(html, /class="div-mat-scroll" tabindex="0" role="region" aria-label="Matriz anual de proventos com rolagem horizontal"/);
  assert.match(html, /class="data-trust-list" tabindex="0" role="region" aria-label="Lista de posições com rolagem"/);
  assert.match(html, /class="v254-fiscal-table-wrap" tabindex="0" role="region" aria-label=/);
  assert.match(html, /class="ts" tabindex="0" role="region" aria-label="Tabela de distribuição da carteira com rolagem horizontal"/);
});

test('Metas keeps its allocation action outside the disclosure summary', () => {
  const start = html.indexOf('function metasTab()');
  const end = html.indexOf('\nfunction ', start + 1);
  const metas = html.slice(start, end > start ? end : undefined);
  assert.match(metas, /Configurar distribuição/);
  assert.doesNotMatch(metas, /<summary>[\s\S]{0,500}<button[^>]*openAllocationGoal/);
});
