const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function monthKey(date) {
  const dt = new Date(date);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date) {
  const dt = new Date(date);
  return dt.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
}

function extractGoalsSnippet() {
  const html = read('index.html');
  const start = html.indexOf('function financialGoalsTone(metrics){');
  const end = html.indexOf('function normalizeAllocationItems(items){', start);
  assert.notEqual(start, -1, 'financialGoalsTone precisa existir');
  assert.notEqual(end, -1, 'normalizeAllocationItems precisa existir depois do bloco de metas');
  return html.slice(start, end);
}

function buildContext({ goals = {}, assets = [], historyRows = [] } = {}) {
  const calls = {
    cx: 0,
    historyRows: 0,
    historyGroupRows: 0,
    historySummary: 0,
    dashboardSnapshot: 0,
    dashboardSummaryPanel: 0,
    dashboardPassiveIncomePanel: 0,
    dashboardHighlightsPanel: 0,
    dashboardCompositionPanel: 0,
    assetAnalysisRows: 0,
    assetPerformanceOverviewRows: 0,
    pie: 0,
  };
  const state = {
    calls,
    S: { goals, assets },
    lastGo: null,
    renderCount: 0,
    fmt(value) {
      return `R$ ${Number(value ?? 0).toFixed(2)}`;
    },
    fmtP(value) {
      return `${Number(value ?? 0).toFixed(1)}%`;
    },
    esc: escapeHtml,
    normalizeGoals(value) {
      return JSON.parse(JSON.stringify(value || {}));
    },
    passiveIncomeGoalTarget() {
      return Number(state.S?.goals?.proventos?.monthly) || 0;
    },
    passiveIncomeMonthKey(date) {
      return monthKey(date);
    },
    dashboardSnapshot(analysisRows) {
      calls.dashboardSnapshot += 1;
      return {
        analysisRows,
        portfolio: state.cx(),
        financialGoals: state.financialGoalsSnapshot(),
        income: { target: Number(state.S?.goals?.proventos?.monthly) || 0, monthlyAvg: 0 },
        recent: { month: monthKey(new Date()), total: 0 },
        typeRows: [],
      };
    },
    dashboardHomeSummaryPanel() {
      calls.dashboardSummaryPanel += 1;
      return '<section class="dashboard-home-summary">Resumo patrimonial</section>';
    },
    dashboardPassiveIncomePanel() {
      calls.dashboardPassiveIncomePanel += 1;
      return '<section class="dashboard-passive-income">Renda passiva</section>';
    },
    dashboardHomeHighlightsPanel() {
      calls.dashboardHighlightsPanel += 1;
      return '<section class="dashboard-home-highlights">Destaques da carteira</section>';
    },
    dashboardHomeCompositionPanel() {
      calls.dashboardCompositionPanel += 1;
      return '<section class="dashboard-home-composition">Composição por classe</section>';
    },
    assetAnalysisRows() {
      calls.assetAnalysisRows += 1;
      return [];
    },
    assetPerformanceOverviewRows() {
      calls.assetPerformanceOverviewRows += 1;
      return [];
    },
    pie() {
      calls.pie += 1;
      return [];
    },
    dividendMonthlyHistoryRows() {
      calls.historyRows += 1;
      return historyRows;
    },
    dividendMonthlyHistoryGroupRows(rows) {
      calls.historyGroupRows += 1;
      const grouped = new Map();
      rows.forEach((row) => {
        if (!grouped.has(row.monthKey)) {
          grouped.set(row.monthKey, {
            key: row.monthKey,
            total: 0,
            count: 0,
            rows: [],
            tickers: new Map(),
          });
        }
        const group = grouped.get(row.monthKey);
        group.total += Number(row.value) || 0;
        group.count += 1;
        group.rows.push(row);
        group.tickers.set(row.ticker, (group.tickers.get(row.ticker) || 0) + (Number(row.value) || 0));
      });
      const months = [...grouped.values()].sort((a, b) => String(b.key).localeCompare(String(a.key)));
      return months.map((month, index) => {
        const previous = months[index + 1] || null;
        const diff = previous ? month.total - previous.total : null;
        const diffPct = previous && previous.total > 0 ? (diff / previous.total) * 100 : null;
        const dt = new Date(`${month.key}-01T12:00:00`);
        const label = dt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const best = [...month.tickers.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'pt-BR'))[0] || null;
        return { ...month, dt, label, diff, diffPct, best, previousKey: previous?.key || null, monthKey: month.key, isCurrent: index === 0 };
      });
    },
    dividendMonthlyHistorySummary(groups) {
      calls.historySummary += 1;
      const total = groups.reduce((sum, row) => sum + row.total, 0);
      const monthCount = groups.length;
      const avg = monthCount ? total / monthCount : null;
      const best = groups.reduce((acc, row) => (!acc || row.total > acc.total ? row : acc), null);
      return { total, monthCount, avg, best };
    },
    cx() {
      calls.cx += 1;
      const totalApplied = assets.reduce((sum, asset) => sum + (Number(asset.applied) || 0), 0);
      const totalCurrent = assets.reduce((sum, asset) => sum + (Number(asset.current) || 0), 0);
      return {
        tI: totalApplied,
        tC: totalCurrent,
        tG: totalCurrent - totalApplied,
        tGP: totalApplied > 0 ? ((totalCurrent - totalApplied) / totalApplied) * 100 : 0,
      };
    },
    go(route) {
      state.lastGo = route;
    },
    render() {
      state.renderCount += 1;
    },
    Date,
    Math,
    Number,
    String,
    Array,
    Object,
    Set,
    Map,
    JSON,
    RegExp,
    Intl,
    Boolean,
    Promise,
    console,
  };

  state.globalThis = state;
  vm.createContext(state);
  vm.runInContext(extractGoalsSnippet(), state, { filename: 'financial-goals-snippet.js' });
  return state;
}

function buildHistoryRows(now) {
  return [
    { monthKey: monthKey(now), date: now.toISOString(), ticker: 'AAA1', name: 'AAA1', type: 'Dividendo', value: 1800 },
    { monthKey: monthKey(now), date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(), ticker: 'BBB2', name: 'BBB2', type: 'JCP', value: 1000 },
    { monthKey: monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 12)), date: new Date(now.getFullYear(), now.getMonth() - 1, 12).toISOString(), ticker: 'CCC3', name: 'CCC3', type: 'Dividendo', value: 2000 },
    { monthKey: monthKey(new Date(now.getFullYear(), now.getMonth() - 2, 12)), date: new Date(now.getFullYear(), now.getMonth() - 2, 12).toISOString(), ticker: 'DDD4', name: 'DDD4', type: 'Rendimento', value: 1000 },
  ];
}

test('dashboard keeps passive income panel and adds financial goals', () => {
  const ctx = buildContext({
    goals: {
      patrimonio: { target: 1000000 },
      proventos: { monthly: 4000 },
    },
    assets: [{ current: 620000, applied: 500000 }],
    historyRows: buildHistoryRows(new Date()),
  });

  const html = ctx.dash();
  assert.match(html, /dashboard-home-summary/);
  assert.match(html, /dashboard-home-goals/);
  assert.match(html, /dashboard-passive-income/);
  assert.match(html, /dashboard-home-highlights/);
  assert.match(html, /dashboard-home-composition/);
  assert.ok(html.indexOf('dashboard-home-summary') < html.indexOf('dashboard-home-goals'));
  assert.ok(html.indexOf('dashboard-home-goals') < html.indexOf('dashboard-passive-income'));
  assert.ok(html.indexOf('dashboard-passive-income') < html.indexOf('dashboard-home-highlights'));
  assert.ok(html.indexOf('dashboard-home-highlights') < html.indexOf('dashboard-home-composition'));
  assert.equal(ctx.calls.dashboardSnapshot, 1);
  assert.equal(ctx.calls.dashboardSummaryPanel, 1);
  assert.equal(ctx.calls.dashboardPassiveIncomePanel, 1);
});

test('financial goals snapshot uses cx and official history helpers', () => {
  const ctx = buildContext({
    goals: {
      patrimonio: { target: 1000000 },
      proventos: { monthly: 4000 },
    },
    assets: [{ current: 123, applied: 45 }],
    historyRows: buildHistoryRows(new Date()),
  });

  let cxCalls = 0;
  ctx.cx = () => {
    cxCalls += 1;
    return { tI: 11, tC: 22, tG: 11, tGP: 100 };
  };

  const snapshot = ctx.financialGoalsSnapshot();
  assert.equal(cxCalls, 1);
  assert.equal(snapshot.portfolioCurrent, 22);
  assert.equal(snapshot.hasPortfolioData, true);
  assert.equal(ctx.calls.historyRows, 1);
  assert.equal(ctx.calls.historyGroupRows, 1);
  assert.equal(ctx.calls.historySummary, 1);
  assert.equal(snapshot.historySummary.total, 5800);
  assert.equal(snapshot.historySummary.monthCount, 3);
  assert.equal(snapshot.historySummary.best.total, 2800);
  assert.equal(snapshot.currentIncome, 2800);
  assert.equal(snapshot.currentIncomeCount, 2);
});

test('portfolio availability distinguishes real zero from absence', () => {
  const activeZero = buildContext({
    assets: [{ current: 0, applied: 0 }],
    historyRows: [],
  });
  assert.equal(activeZero.financialGoalsHasPortfolioData({ tI: 0, tC: 0, tG: 0, tGP: 0 }), true);
  assert.equal(activeZero.financialGoalsSnapshot().hasPortfolioData, true);

  const fixedIncomeOnly = buildContext({
    assets: [{ type: 'Renda Fixa', rf_current_value: 0, rf_applied_value: 0 }],
    historyRows: [],
  });
  assert.equal(fixedIncomeOnly.financialGoalsHasPortfolioData({ tI: 0, tC: 0, tG: 0, tGP: 0 }), true);
  assert.equal(fixedIncomeOnly.financialGoalsSnapshot().hasPortfolioData, true);

  const absent = buildContext({
    assets: [],
    historyRows: [],
  });
  assert.equal(absent.financialGoalsHasPortfolioData({ tI: 0, tC: 0, tG: 0, tGP: 0 }), false);
  assert.equal(absent.financialGoalsSnapshot().hasPortfolioData, false);

  const invalid = buildContext({
    assets: [{ current: 'abc', applied: Infinity }],
    historyRows: [],
  });
  assert.equal(invalid.financialGoalsHasPortfolioData({ tI: 0, tC: 0, tG: 0, tGP: 0 }), false);
  assert.equal(invalid.financialGoalsSnapshot().hasPortfolioData, false);
});

test('metas financeiras calculam progresso, limite e estado executivo', () => {
  const ctx = buildContext({
    goals: {
      patrimonio: { target: 1000000 },
      proventos: { monthly: 4000 },
    },
    assets: [
      { current: 620000, applied: 500000 },
    ],
    historyRows: buildHistoryRows(new Date()),
  });

  const patrimony = ctx.goalProgressMetrics(620000, 1000000);
  assert.equal(patrimony.hasCurrent, true);
  assert.equal(patrimony.hasTarget, true);
  assert.equal(patrimony.percent, 62);
  assert.equal(patrimony.barPercent, 62);
  assert.equal(patrimony.missing, 380000);
  assert.equal(patrimony.excess, 0);
  assert.equal(patrimony.reached, false);

  const overshoot = ctx.goalProgressMetrics(1250000, 1000000);
  assert.equal(overshoot.percent, 125);
  assert.equal(overshoot.barPercent, 100);
  assert.equal(overshoot.excess, 250000);
  assert.equal(overshoot.reached, true);

  const noCurrent = ctx.goalProgressMetrics(null, 1000000);
  assert.equal(noCurrent.hasCurrent, false);
  assert.equal(noCurrent.current, null);
  assert.equal(noCurrent.barPercent, 0);
  assert.equal(noCurrent.missing, null);

  const noTarget = ctx.goalProgressMetrics(620000, 0);
  assert.equal(noTarget.hasTarget, false);
  assert.equal(noTarget.barPercent, 0);
  assert.equal(noTarget.reached, false);

  const snapshot = ctx.financialGoalsSnapshot();
  assert.equal(snapshot.hasPortfolioData, true);
  assert.equal(snapshot.portfolioCurrent, 620000);
  assert.equal(snapshot.currentIncome, 2800);
  assert.equal(snapshot.currentIncomeCount, 2);
  assert.equal(snapshot.historySummary.total, 5800);
  assert.equal(snapshot.historySummary.monthCount, 3);
  assert.equal(snapshot.historySummary.best.total, 2800);

  const html = ctx.dashboardFinancialGoalsPanel({ financialGoals: snapshot });
  assert.match(html, /Metas financeiras/);
  assert.match(html, /Meta patrimonial/);
  assert.match(html, /Meta de renda passiva/);
  assert.match(html, /Patrimônio atual estimado da carteira/);
  assert.match(html, /R\$ 620000\.00/);
  assert.match(html, /R\$ 2800\.00/);
  assert.match(html, /Faltam R\$ 380000\.00/);
  assert.match(html, /Faltam R\$ 1200\.00/);
  assert.match(html, /Média real/);
  assert.match(html, /Melhor mês/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-valuemin="0"/);
  assert.match(html, /aria-valuemax="100"/);
  assert.match(html, /aria-valuenow="62\.0"/);
  assert.match(html, /aria-valuetext="62\.0% alcancado"/);
  assert.match(html, /go\('metas'\)/);
});

test('metas financeiras tratam ausencia como estado neutro', () => {
  const ctx = buildContext({
    goals: {},
    assets: [],
    historyRows: [],
  });

  const snapshot = ctx.financialGoalsSnapshot();
  assert.equal(snapshot.hasPortfolioData, false);
  assert.equal(snapshot.portfolioCurrent, null);
  assert.equal(snapshot.currentIncome, 0);
  assert.equal(snapshot.currentIncomeCount, 0);

  const html = ctx.dashboardFinancialGoalsPanel({ financialGoals: snapshot });
  assert.match(html, /Patrimônio atual indisponível/);
  assert.match(html, /Revise os valores e cotações cadastrados para acompanhar esta meta\./);
  assert.match(html, /Meta de renda passiva/);
  assert.match(html, /R\$ 0\.00 recebidos neste mês|0,00 recebidos neste mês/);
  assert.match(html, /Meta nao configurada|Meta não configurada/);
});
