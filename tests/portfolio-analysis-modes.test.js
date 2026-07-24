const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function extractFunctionBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} precisa existir`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `${endMarker} precisa existir depois de ${startMarker}`);
  return source.slice(start, end);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function makeAnalysisHarness(overrides = {}) {
  const indexHtml = read("index.html");
  const source = extractFunctionBlock(
    indexHtml,
    "function prudentContributionAnalysis(){",
    "function bind(){",
  );

  const renders = [];
  const saves = [];
  const documentState = {
    "reb-val": { value: "500" },
    "reb-out": { innerHTML: "" },
  };
  const context = {
    console,
    Math,
    Date,
    JSON,
    Number,
    String,
    Array,
    Object,
    Set,
    Map,
    Promise,
    S: {
      assets: [],
      aiText: "",
      aiLoad: false,
      aiStatus: "idle",
      aiResult: null,
      aiError: "",
      aiFocus: "overview",
      ...overrides.state,
    },
    fmt(value) {
      const n = Number(value);
      if (!Number.isFinite(n)) return "—";
      return `R$ ${n.toFixed(2)}`;
    },
    fmtP(value) {
      const n = Number(value);
      if (!Number.isFinite(n)) return "—";
      return `${n.toFixed(1)}%`;
    },
    esc(value) {
      return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch]);
    },
    save() {
      saves.push(JSON.parse(JSON.stringify({
        aiFocus: context.S.aiFocus,
        aiStatus: context.S.aiStatus,
        aiLoad: context.S.aiLoad,
      })));
    },
    render() {
      renders.push({
        aiFocus: context.S.aiFocus,
        aiStatus: context.S.aiStatus,
        aiLoad: context.S.aiLoad,
        aiText: context.S.aiText,
        aiError: context.S.aiError,
      });
    },
    cx() {
      return typeof overrides.cx === "function" ? overrides.cx() : (overrides.cx || {
        tC: 400,
        tI: 350,
        tGP: 12.5,
        mD: 60,
        aD: 720,
        avgDY: 6.5,
        tG: 50,
      });
    },
    normalizeType(value, fallback) {
      return String(value ?? fallback ?? "").trim() || String(fallback ?? "");
    },
    assetCurrentValue(row) {
      return Number(row?.current ?? row?.current_price ?? row?.value ?? 0) || 0;
    },
    proventoStats() {
      return typeof overrides.proventoStats === "function" ? overrides.proventoStats() : (overrides.proventoStats || {
        mes: 0,
        ano: 0,
        total: 0,
      });
    },
    assetAnalysisRows() {
      if (typeof overrides.assetAnalysisRows === "function") return overrides.assetAnalysisRows();
      return overrides.assetAnalysisRows || [
        { ticker: "AAA", type: "Ação", sector: "Tech", current: 100, applied: 80, share: 25, pct: 25, dy: 2.2, profit: 20 },
        { ticker: "BBB", type: "FII", sector: "Imóveis", current: 120, applied: 150, share: 30, pct: -20, dy: 8.1, profit: -30 },
        { ticker: "CCC", type: "ETF", sector: "Global", current: 90, applied: 90, share: 22.5, pct: 0, dy: 0, profit: 0 },
        { ticker: "DDD", type: "Ação", sector: "Bancos", current: 0, applied: 0, share: 0, pct: 0, dy: 0, profit: 0 },
      ];
    },
    dashboardHighlightsRows(kind, classFilter) {
      if (typeof overrides.dashboardHighlightsRows === "function") return overrides.dashboardHighlightsRows(kind, classFilter);
      return kind === "low"
        ? [
            { ticker: "BBB", type: "FII", sector: "Imóveis", result: -30, resultPct: -20, hasPerformanceData: true },
            { ticker: "EEE", type: "Ação", sector: "Varejo", result: -10, resultPct: -8, hasPerformanceData: true },
          ]
        : [
            { ticker: "AAA", type: "Ação", sector: "Tech", result: 20, resultPct: 25, hasPerformanceData: true },
            { ticker: "FFF", type: "ETF", sector: "Global", result: 12, resultPct: 10, hasPerformanceData: true },
          ];
    },
    dataQualitySnapshot() {
      if (typeof overrides.dataQualitySnapshot === "function") return overrides.dataQualitySnapshot();
      return overrides.dataQualitySnapshot || {
        summary: { criticalRecords: 1, warningRecords: 2, validRecords: 5 },
        issues: [
          { message: "Ativo sem cotação atual", recommendation: "Revisar origem", entityType: "ativo" },
          { message: "Provento desatualizado", recommendation: "Atualizar registro", entityType: "provento" },
        ],
        score: 84,
      };
    },
    passiveIncomeGoalStats() {
      if (typeof overrides.passiveIncomeGoalStats === "function") return overrides.passiveIncomeGoalStats();
      return overrides.passiveIncomeGoalStats || {
        target: 100,
        hasData: true,
        total12: 960,
        monthlyAvg: 80,
        annualProjection: 960,
        percent: 80,
        missing: 20,
        monthKeys: ["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"],
        byMonth: Array.from({ length: 12 }, (_, idx) => ({ key: `2025-${String(idx + 1).padStart(2, "0")}`, total: idx % 3 === 0 ? 120 : 0 })),
        currentMonthKey: "2026-07",
        currentMonthTotal: 40,
        topPayers: [
          { ticker: "AAA", total: 500, count: 4 },
          { ticker: "BBB", total: 300, count: 3 },
        ],
        bestPayer: { ticker: "AAA", total: 500 },
      };
    },
    dividendMonthlyHistoryRows() {
      return overrides.dividendMonthlyHistoryRows || [];
    },
    dividendMonthlyHistoryGroupRows(rows) {
      if (typeof overrides.dividendMonthlyHistoryGroupRows === "function") return overrides.dividendMonthlyHistoryGroupRows(rows);
      return overrides.dividendMonthlyHistoryGroupRows || [
        { key: "2025-06", dt: new Date(2025, 5, 1), total: 90, count: 2 },
        { key: "2025-07", dt: new Date(2025, 6, 1), total: 120, count: 3 },
      ];
    },
    dividendMonthlyHistorySummary(groups) {
      if (typeof overrides.dividendMonthlyHistorySummary === "function") return overrides.dividendMonthlyHistorySummary(groups);
      return overrides.dividendMonthlyHistorySummary || {
        total: 210,
        monthCount: (groups || []).length || 2,
        avg: 105,
        best: { label: "Jul", total: 120 },
      };
    },
    proventoResumoPorAtivo() {
      if (typeof overrides.proventoResumoPorAtivo === "function") return overrides.proventoResumoPorAtivo();
      return overrides.proventoResumoPorAtivo || [
        { key: "AAA", ticker: "AAA", name: "Empresa AAA", type: "Ação", total: 500, count: 4, lastDate: "2026-06-01" },
        { key: "BBB", ticker: "BBB", name: "Empresa BBB", type: "FII", total: 300, count: 3, lastDate: "2026-05-01" },
        { key: "CCC", ticker: "CCC", name: "Empresa CCC", type: "ETF", total: 160, count: 2, lastDate: "2026-04-01" },
      ];
    },
    allocationGoalItems() {
      if (typeof overrides.allocationGoalItems === "function") return overrides.allocationGoalItems();
      return overrides.allocationGoalItems || [
        { type: "Ação", pct: 60 },
        { type: "FII", pct: 25 },
        { type: "ETF", pct: 15 },
      ];
    },
    allocationActualByType() {
      if (typeof overrides.allocationActualByType === "function") return overrides.allocationActualByType();
      return overrides.allocationActualByType || {
        total: 400,
        map: { "Ação": 220, "FII": 120, "ETF": 60 },
      };
    },
    assetContributionSignal(row) {
      if (row.share > 30) return { label: "Evitar aumentar por concentração", tone: "danger" };
      if (row.pct < 0 && row.share < 20) return { label: "Pode estudar aporte", tone: "ok" };
      if (row.pct >= 0 && row.share < 20) return { label: "Acompanhar", tone: "info" };
      return { label: "Aguardar", tone: "warn" };
    },
  };

  Object.assign(context, overrides.context || {});

  context.document = {
    getElementById(id) {
      if (!documentState[id]) documentState[id] = { value: "", innerHTML: "" };
      return documentState[id];
    },
  };

  const exported = vm.runInNewContext(
    `${source}\n({ prudentContributionAnalysis, ajudarTab, calcRebalance, iaTab, setAIFocus, getAI, generateOverviewAnalysis, generateIncomeAnalysis, generateRebalanceAnalysis, generateConcentrationAnalysis, aiModeMeta, aiNormalizeFocus });`,
    context,
  );

  return { ...exported, context, renders, saves, documentState };
}test('modes da IA tem contratos distintos e CTA dinamico', () => {
  const harness = makeAnalysisHarness();
  const { context } = harness;

  assert.equal(harness.iaTab().includes('Análise da carteira'), true);
  assert.equal(harness.iaTab().includes('Gerar visão geral'), true);

  context.S.aiFocus = 'income';
  assert.equal(harness.iaTab().includes('Analisar renda'), true);
  context.S.aiFocus = 'rebalance';
  assert.equal(harness.iaTab().includes('Analisar rebalanceamento'), true);
  context.S.aiFocus = 'concentration';
  assert.equal(harness.iaTab().includes('Analisar concentração'), true);

  const overview = harness.generateOverviewAnalysis();
  const income = harness.generateIncomeAnalysis();
  const rebalance = harness.generateRebalanceAnalysis();
  const concentration = harness.generateConcentrationAnalysis();

  assert.equal(overview.mode, 'overview');
  assert.equal(income.mode, 'income');
  assert.equal(rebalance.mode, 'rebalance');
  assert.equal(concentration.mode, 'concentration');
  assert.notDeepEqual(overview.metrics, income.metrics);
  assert.notDeepEqual(income.metrics, rebalance.metrics);
  assert.notDeepEqual(rebalance.metrics, concentration.metrics);
  for (const result of [overview, income, rebalance, concentration]) {
    const text = JSON.stringify(result);
    assert.equal(text.includes('NaN'), false);
    assert.equal(text.includes('Infinity'), false);
    assert.equal(result.emptyMessage ? result.emptyMessage.length > 0 : true, true);
  }
});

test('setAIFocus limpa resultado e nao gera automaticamente', () => {
  const harness = makeAnalysisHarness({
    state: { aiStatus: 'success', aiResult: { mode: 'overview', title: 'Resumo', metrics: [] }, aiText: 'x' },
  });
  const { context } = harness;
  const rendersBefore = harness.renders.length;

  context.getAI = () => {
    throw new Error('nao deveria chamar getAI');
  };

  harness.setAIFocus('income');

  assert.equal(context.S.aiFocus, 'income');
  assert.equal(context.S.aiStatus, 'idle');
  assert.equal(context.S.aiResult, null);
  assert.equal(context.S.aiError, '');
  assert.equal(context.S.aiLoad, false);
  assert.equal(harness.renders.length, rendersBefore + 1);
});

test('getAI roteia por modo e produz loading/sucesso/erro', () => {
  const harness = makeAnalysisHarness();
  const { context } = harness;

  context.S.aiFocus = 'overview';
  const overview = harness.getAI();
  assert.equal(overview.mode, 'overview');
  assert.equal(context.S.aiStatus, 'success');
  assert.equal(harness.renders.some(step => step.aiStatus === 'loading'), true);
  assert.equal(harness.renders.some(step => step.aiStatus === 'success'), true);
  assert.equal(JSON.stringify(context.S.aiResult).includes('NaN'), false);
  assert.equal(JSON.stringify(context.S.aiResult).includes('Infinity'), false);

  const errorHarness = makeAnalysisHarness({
  });
  errorHarness.context.generateConcentrationAnalysis = () => {
    throw new Error('falha simulada');
  };
  errorHarness.context.S.aiFocus = 'concentration';
  const result = errorHarness.getAI();
  assert.equal(result, null);
  assert.equal(errorHarness.context.S.aiStatus, 'error');
  assert.equal(errorHarness.context.S.aiError, 'Error: falha simulada');
  assert.equal(errorHarness.renders.some(step => step.aiStatus === 'loading'), true);
  assert.equal(errorHarness.renders.some(step => step.aiStatus === 'error'), true);
});

test('ajudarTab e calcRebalance preservam contrato pÃºblico do aporte', () => {
  const harness = makeAnalysisHarness();
  const html = harness.ajudarTab();
  assert.equal(html.includes('Sugestão de aporte'), true);
  assert.equal(html.includes('Simular</button>'), true);

  const { context, documentState } = harness;
  context.S.assets = [
    { ticker: 'AAA', type: 'AÃ§Ã£o', current_price: 100, avg_price: 80, qty: 1, sector: 'Tech', dy: 2 },
    { ticker: 'BBB', type: 'FII', current_price: 120, avg_price: 150, qty: 1, sector: 'ImÃ³veis', dy: 8 },
  ];
  documentState['reb-val'].value = '500';

  harness.calcRebalance();

  assert.equal(context.S.aiStatus, 'idle');
  assert.match(documentState['reb-out'].innerHTML, /Valor analisado/);
  assert.equal(documentState['reb-out'].innerHTML.includes('Nenhum ativo atende aos critérios prudentes'), true);
  assert.equal(documentState['reb-out'].innerHTML.includes('NaN'), false);
  assert.equal(documentState['reb-out'].innerHTML.includes('Infinity'), false);
});

test('prudentContributionAnalysis mantÃ©m shape e nao muta base', () => {
  const assets = [
    { ticker: 'AAA', type: 'AÃ§Ã£o', current_price: 100, avg_price: 80, qty: 1, sector: 'Tech', dy: 2 },
    { ticker: 'BBB', type: 'FII', current_price: 120, avg_price: 150, qty: 1, sector: 'ImÃ³veis', dy: 8 },
    { ticker: 'CCC', type: 'ETF', current_price: 90, avg_price: 90, qty: 1, sector: 'Global', dy: 0 },
  ];
  const snapshot = JSON.parse(JSON.stringify(assets));
  const harness = makeAnalysisHarness({
    assetAnalysisRows: () => [
      { ticker: 'AAA', type: 'AÃ§Ã£o', sector: 'Tech', current: 100, applied: 80, share: 12, pct: 25, dy: 2.2, profit: 20 },
      { ticker: 'BBB', type: 'FII', sector: 'ImÃ³veis', current: 120, applied: 150, share: 18, pct: -20, dy: 8.1, profit: -30 },
      { ticker: 'CCC', type: 'ETF', sector: 'Global', current: 90, applied: 90, share: 8, pct: 0, dy: 0, profit: 0 },
    ],
    state: { assets },
  });

  const analysis = harness.prudentContributionAnalysis();

  assert.deepEqual(assets, snapshot);
  assert.equal(Array.isArray(analysis.rows), true);
  assert.equal(Array.isArray(analysis.evaluated), true);
  assert.equal(Array.isArray(analysis.candidates), true);
  assert.equal(Number.isFinite(analysis.total), true);
  assert.equal(Number.isFinite(analysis.insufficient), true);
  assert.equal(Number.isFinite(analysis.avoided), true);
  assert.equal(JSON.stringify(analysis).includes('NaN'), false);
  assert.equal(JSON.stringify(analysis).includes('Infinity'), false);
});
