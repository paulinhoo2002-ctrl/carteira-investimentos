const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = source.indexOf('function dividendExecutiveKpis(rows=dividendPremiumRows()){');
const end = source.indexOf('function dividendDistributionRow(', start);
assert.ok(start >= 0 && end > start, 'Dividendos executive KPI renderer must exist');

function renderKpis(stats, monthRows) {
  const context = {
    S: { assets: [] },
    Date,
    Math,
    Number,
    String,
    Array,
    Set,
    Map,
    JSON,
    globalThis: { DividendIntelligence: { classifyIncomeState: row => row.state || 'PAID' } },
    passiveIncomeGoalStats: () => stats,
    dividendPremiumRows: () => [],
    dividendAnnualMatrixData: () => [{ months: monthRows }],
    proventoAuditBuildRows: () => ({ summary: { pending: 0, quebrados: 0, possiveis: 0 } }),
    assetCurrentValue: () => null,
    passiveIncomeValue: value => value == null ? '—' : `R$ ${Number(value).toFixed(2)}`,
    fmt: value => `R$ ${Number(value).toFixed(2)}`,
    esc: value => String(value ?? ''),
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  return context.dividendExecutiveKpis([]);
}

const monthKeys = Array.from({ length: 12 }, (_, index) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 11 + index);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
});

test('primary passive income summary shows current month and known 12-month receipts without promoting coverage', () => {
  const months = monthKeys.map((key, index) => ({
    key,
    total: index === 11 ? 125 : index === 10 ? 80 : null,
    coverage: index === 11 ? 'PARTIAL' : index === 10 ? 'PARTIAL' : 'UNKNOWN',
  }));
  const html = renderKpis({
    monthKeys,
    currentMonthKey: monthKeys[11],
    currentMonthTotal: 125,
    currentMonthCoverage: 'PARTIAL',
    total12: 205,
    monthlyAvg: null,
    monthlyAverageStatus: 'UNKNOWN',
    completeMonthCount: 0,
    annualProjection: null,
  }, months);

  assert.match(html, /Recebido este mês/);
  assert.match(html, /R\$ 125\.00/);
  assert.match(html, /cobertura parcial/i);
  assert.match(html, /Recebido nos últimos 12 meses/);
  assert.match(html, /R\$ 205\.00/);
  assert.match(html, /subtotal conhecido/i);
  assert.match(html, /Média mensal/);
  assert.doesNotMatch(html, /R\$ 205\.00[^]*Média mensal[^]*R\$ 100\.00/);
  assert.match(html, /Cobertura confirmada: 0\/12 meses/);
});

test('unknown current month and incomplete history never render monetary zero or an average', () => {
  const months = monthKeys.map(key => ({ key, total: null, coverage: 'UNKNOWN' }));
  const html = renderKpis({
    monthKeys,
    currentMonthKey: monthKeys[11],
    currentMonthTotal: null,
    currentMonthCoverage: 'UNKNOWN',
    total12: null,
    monthlyAvg: null,
    monthlyAverageStatus: 'UNKNOWN',
    completeMonthCount: 0,
    annualProjection: null,
  }, months);

  assert.match(html, /Recebido este mês[^]*Cobertura desconhecida/);
  assert.match(html, /Recebido nos últimos 12 meses[^]*—/);
  assert.match(html, /Média mensal[^]*—/);
  assert.doesNotMatch(html, /R\$ 0\.00|0\.00%/);
});

test('12-month average is shown only when all twelve months are complete', () => {
  const months = monthKeys.map(key => ({ key, total: 100, coverage: 'COMPLETE' }));
  const html = renderKpis({
    monthKeys,
    currentMonthKey: monthKeys[11],
    currentMonthTotal: 100,
    currentMonthCoverage: 'COMPLETE',
    total12: 1200,
    monthlyAvg: 100,
    monthlyAverageStatus: 'COMPLETE',
    completeMonthCount: 12,
    annualProjection: 1200,
  }, months);

  assert.match(html, /Média mensal[^]*R\$ 100\.00/);
  assert.match(html, /12\/12 meses completos/);
});

test('missing complete-month count stays unavailable instead of becoming zero', () => {
  const months = monthKeys.map(key => ({ key, total: null, coverage: 'UNKNOWN' }));
  const stats = {
    monthKeys,
    currentMonthKey: monthKeys[11],
    currentMonthTotal: null,
    currentMonthCoverage: 'UNKNOWN',
    total12: null,
    monthlyAvg: null,
    monthlyAverageStatus: 'UNKNOWN',
    annualProjection: null,
  };
  const html = renderKpis(stats, months);

  assert.match(html, /Cobertura de meses completos indisponível/);
  assert.doesNotMatch(html, /0\/12 meses completos/);
});

function renderTimeline(matrix, hideValues = false) {
  const start = source.indexOf('function dividendMonthlyTimeline(rows=filteredDividendRows()){');
  const end = source.indexOf('function showDividendChartTooltip(', start);
  assert.ok(start >= 0 && end > start, 'Dividendos timeline renderer must exist');
  const state = { hideValues };
  const context = {
    S: state,
    Date,
    Math,
    Number,
    String,
    Array,
    Set,
    Map,
    JSON,
    fmt: value => state.hideValues ? 'R$ ••••' : `R$ ${Number(value).toFixed(2)}`,
    esc: value => String(value ?? ''),
    dividendAnnualMatrixData: () => matrix,
    dividendEmptyState: message => `<div>${message}</div>`,
    lineChart: series => `<svg data-series="${series.length}"></svg>`,
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  return context.dividendMonthlyTimeline([]);
}

function timelineYear({ paidMonths }) {
  const months = Array.from({ length: 12 }, (_, index) => ({
    year: 2026,
    month: index + 1,
    key: `2026-${String(index + 1).padStart(2, '0')}`,
    total: paidMonths[index + 1]?.total ?? null,
    hasData: Boolean(paidMonths[index + 1]),
    coverage: paidMonths[index + 1]?.coverage || 'UNKNOWN',
  }));
  const annualTotal = Object.values(paidMonths).reduce((sum, item) => sum + item.total, 0);
  return [{ year: 2026, months, annualTotal }];
}

test('one received month uses a compact summary with month, value, and limited coverage', () => {
  const html = renderTimeline(timelineYear({ paidMonths: { 4: { total: 42.5, coverage: 'PARTIAL' } } }));

  assert.match(html, /Abr 2026/);
  assert.match(html, /R\$ 42\.50/);
  assert.match(html, /histórico limitado a um mês/i);
  assert.doesNotMatch(html, /<svg/);
});

test('multiple received months keep the historical evolution chart', () => {
  const html = renderTimeline(timelineYear({ paidMonths: {
    3: { total: 20, coverage: 'PARTIAL' },
    4: { total: 42.5, coverage: 'PARTIAL' },
  } }));

  assert.match(html, /<svg/);
  assert.doesNotMatch(html, /cobertura limitada/i);
});

test('compact one-month summary respects Hide Values in visible and accessible text', () => {
  const html = renderTimeline(timelineYear({ paidMonths: { 4: { total: 42.5, coverage: 'PARTIAL' } } }), true);

  assert.match(html, /R\$ ••••/);
  assert.doesNotMatch(html, /42\.50/);
});

test('historical summaries identify known subsets without implying a complete portfolio total', () => {
  const summaryStart = source.indexOf('function dividendMonthlyHistorySummaryLine(summary, groups){');
  const summaryEnd = source.indexOf('function setDividendMonthlyHistoryExpandedYears(', summaryStart);
  const yearSummaryStart = source.indexOf('function canonDividendYearSummary(rows){');
  const yearSummaryEnd = source.indexOf('function v253DividendIntelligencePanel(', yearSummaryStart);
  assert.ok(summaryStart >= 0 && summaryEnd > summaryStart);
  assert.ok(yearSummaryStart >= 0 && yearSummaryEnd > yearSummaryStart);
  assert.match(source.slice(summaryStart, summaryEnd), /Total conhecido/);
  assert.match(source.slice(yearSummaryStart, yearSummaryEnd), /Total conhecido/);
  assert.doesNotMatch(source.slice(yearSummaryStart, yearSummaryEnd), /Total geral/);
});

test('light annual history keeps incomplete month labels readable on the light surface', () => {
  const styleStart = source.indexOf('<style id="m562-dividends-premium-slim">');
  const styleEnd = source.indexOf('</style>', styleStart);
  const style = source.slice(styleStart, styleEnd);
  assert.ok(style.includes('html[data-theme="light"] .premium-dividends-3 .div-year-card{background:var(--canon-panel);color:var(--canon-text);border-color:var(--canon-border)}'));
});

test('light-theme register-income action overrides the low-contrast inherited gradient', () => {
  const styleStart = source.indexOf('<style id="m562-dividends-premium-slim">');
  const styleEnd = source.indexOf('</style>', styleStart);
  const style = source.slice(styleStart, styleEnd);
  assert.match(style, /div-premium-head \.btn\.bp:not\(:disabled\):not\(\[aria-disabled="true"\]\)\{[^}]*background:#2f6fd1!important;[^}]*background-image:none!important;[^}]*color:#fff!important/);
});
