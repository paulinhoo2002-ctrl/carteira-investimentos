const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

function extractBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.equal(start >= 0, true, `${startMarker} precisa existir`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.equal(end > start, true, `${endMarker} precisa existir depois de ${startMarker}`);
  return text.slice(start, end);
}

function createSandbox(state = {}) {
  const sandbox = {
    console: {
      log() {},
      warn() {},
      error() {},
      info() {},
      debug() {},
    },
    Date,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    JSON,
    RegExp,
    Intl,
    Promise,
    S: state,
    TYPE_CHOICES: ['Ação', 'FII', 'ETF', 'BDR', 'Stock', 'Reit', 'Renda Fixa', 'Tesouro Direto', 'Reserva de emergência', 'Fundos de Investimento'],
    TYPE_FORM_CHOICES: ['Ação', 'FII', 'ETF', 'BDR', 'Stock', 'Reit', 'Renda Fixa', 'Tesouro Direto', 'Reserva de emergência', 'Fundos de Investimento'],
    TYPE_ALIAS_LOOKUP: {
      ACAO: 'Ação',
      ACOES: 'Ação',
      'AÇÕES': 'Ação',
      FII: 'FII',
      FIIS: 'FII',
      ETF: 'ETF',
      ETFS: 'ETF',
      BDR: 'BDR',
      BDRS: 'BDR',
      STOCK: 'Stock',
      STOCKS: 'Stock',
      REIT: 'Reit',
      REITS: 'Reit',
      RENDAFIXA: 'Renda Fixa',
      'RENDA FIXA': 'Renda Fixa',
      TESOURODIRETO: 'Tesouro Direto',
      'TESOURO DIRETO': 'Tesouro Direto',
      RESERVADEEMERGENCIA: 'Reserva de emergência',
      'FUNDO DE INVESTIMENTO': 'Fundos de Investimento',
      'FUNDOS DE INVESTIMENTO': 'Fundos de Investimento',
    },
    cleanAssetCode(value) {
      let text = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
      text = text.replace(/\s+/g, ' ');
      if (!text) return '';
      text = text.replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
      return text.slice(0, 38);
    },
    normTypeKey(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
    },
    normalizeType(value, fallback = 'Ação') {
      const raw = String(value || '').trim();
      if (!raw) return fallback || 'Ação';
      if (sandbox.TYPE_CHOICES.includes(raw)) return raw;
      const key = sandbox.normTypeKey(raw);
      if (sandbox.TYPE_ALIAS_LOOKUP[key]) return sandbox.TYPE_ALIAS_LOOKUP[key];
      const compact = key.replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
      if (sandbox.TYPE_ALIAS_LOOKUP[compact]) return sandbox.TYPE_ALIAS_LOOKUP[compact];
      if (compact === 'FUNDO DE INVESTIMENTO' || compact === 'FUNDOS DE INVESTIMENTO') return 'Fundos de Investimento';
      if (compact === 'RENDA FIXA') return 'Renda Fixa';
      if (compact === 'TESOURO DIRETO') return 'Tesouro Direto';
      if (compact === 'RESERVA DE EMERGENCIA') return 'Reserva de emergência';
      if (compact === 'STOCK' || compact === 'STOCKS') return 'Stock';
      if (compact === 'REIT' || compact === 'REITS') return 'Reit';
      return raw;
    },
    parseAnyDate(value) {
      if (!value) return null;
      if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
      const text = String(value).trim();
      const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
      const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (br) return new Date(+br[3] < 100 ? 2000 + +br[3] : +br[3], +br[2] - 1, +br[1]);
      const date = new Date(text);
      return Number.isNaN(date.getTime()) ? null : date;
    },
    toISODate(date) {
      if (!date) return '';
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    },
    rfPosNorm(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
    },
    esc(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },
    fmt(value) {
      const number = Number(value || 0);
      return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    fmtP(value) {
      return `${Number(value || 0).toFixed(1)}%`;
    },
    render() {
      sandbox.renderCalls = (sandbox.renderCalls || 0) + 1;
    },
    toast(message) {
      sandbox.lastToast = message;
    },
    go(route) {
      sandbox.lastRoute = route;
    },
    isNeutralMovement() {
      return false;
    },
    metaTicker(ticker) {
      const text = String(ticker || '');
      return /Renda Fixa|CDB|LCI|LCA|TESOURO|RF/i.test(text)
        ? { type: 'Renda Fixa', sector: '' }
        : { type: 'Ação', sector: '' };
    },
    isRendaFixaText(value) {
      return /Renda Fixa|CDB|LCI|LCA|Tesouro|RF/i.test(String(value || ''));
    },
    rfMetaFromText(value) {
      const text = String(value || '').trim();
      return /CDB/i.test(text) ? { type: 'CDB', sector: 'Renda Fixa' } : { type: 'Renda Fixa', sector: 'Renda Fixa' };
    },
    FinanceCore: {
      assetAppliedValue(asset) {
        return Number(
          asset?.applied_value ??
            asset?.appliedValue ??
            asset?.rf_applied_value ??
            asset?.fixed_initial_value ??
            asset?.avg_price ??
            0,
        ) || 0;
      },
      assetCurrentValue(asset) {
        return Number(
          asset?.current_value ??
            asset?.currentValue ??
            asset?.rf_liquid_value ??
            asset?.fixed_current_value ??
            asset?.current_price ??
            asset?.rf_gross_value ??
            asset?.fixed_gross_value ??
            0,
        ) || 0;
      },
      assetJurosValue(asset) {
        return Number(asset?.rf_profit_value ?? asset?.profit ?? 0) || 0;
      },
      assetRentabPct(asset) {
        const applied = Number(
          asset?.applied_value ??
            asset?.appliedValue ??
            asset?.rf_applied_value ??
            asset?.fixed_initial_value ??
            asset?.avg_price ??
            0,
        ) || 0;
        const current = Number(
          asset?.current_value ??
            asset?.currentValue ??
            asset?.rf_liquid_value ??
            asset?.fixed_current_value ??
            asset?.current_price ??
            asset?.rf_gross_value ??
            asset?.fixed_gross_value ??
            0,
        ) || 0;
        return applied > 0 ? ((current - applied) / applied) * 100 : 0;
      },
    },
  };

  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  return sandbox;
}

function loadRuntime(state) {
  const sandbox = createSandbox(state);
  const context = vm.createContext(sandbox);
  const blocks = [
    extractBetween(indexHtml, 'function isRendaFixaAsset(a){', 'function dataQualitySnapshot(){'),
    extractBetween(indexHtml, 'function dataQualitySnapshot(){', 'function dashboardPassiveIncomePanel(data){'),
    extractBetween(indexHtml, 'function dashboardPassiveIncomePanel(data){', 'function goalProgressText(current,target){'),
    extractBetween(indexHtml, 'function goalProgressText(current,target){', 'function dividendMonthlyHistoryRows(rows=Array.isArray(S.proventos) ? S.proventos : []){'),
    extractBetween(indexHtml, 'function dividendMonthlyHistoryRows(rows=Array.isArray(S.proventos) ? S.proventos : []){', 'function dividendMonthlyHistoryPremium(rows){'),
  ];

  for (const block of blocks) {
    vm.runInContext(block, context, { timeout: 1000 });
  }

  sandbox.render = () => {
    sandbox.renderCalls = (sandbox.renderCalls || 0) + 1;
  };

  return context;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('fase 208 helpers destacam dados invalidos sem corromper estado', () => {
  const runtime = loadRuntime({
    assets: [
      { ticker: ' petr--4 ', name: 'Petrobras', type: 'Ação', qty: 10, avg_price: 10, current_price: 12, currency: 'BRL' },
      { name: 'Sem ticker', type: 'Ação', qty: -1, avg_price: null, current_price: undefined, currency: '' },
      { ticker: 'CDB001', name: 'CDB 001', type: 'Renda Fixa', qty: 1, avg_price: 1000, currency: 'BRL', rf_applied_value: 1000, rf_liquid_value: 1030, rf_maturity_date: '' },
      { ticker: 'PETR4', name: 'Duplicado', type: 'Ação', qty: 10, avg_price: 10, current_price: 12, currency: 'BRL' },
    ],
    proventos: [
      { ticker: 'PETR4', value: 100, date: '2026-07-10', type: 'Dividendo' },
      { ticker: 'PETR4', value: 50, date: '2026-06-10', type: 'JCP' },
      { ticker: 'PETR4', value: 25, date: '2099-01-10', type: 'Dividendo', status: 'previsto' },
      { ticker: 'PETR4', value: 30, date: 'bad-date', type: 'Dividendo' },
      { ticker: 'PETR4', value: 'bad', date: '2026-07-10', type: 'Dividendo' },
      { ticker: 'PETR4', value: 100, date: '2026-07-10', type: 'Dividendo' },
      { ticker: 'RF1', value: 10, date: '2026-07-10', type: 'Juros de Renda Fixa', sourceEventKind: 'rf' },
    ],
    rfEvents: [
      { ticker: 'RF1', date: 'bad-date', value: 100, type: 'Aporte' },
      { ticker: 'RF1', date: '2026-07-10', value: 100, type: 'Aporte' },
      { ticker: 'RF1', date: '2026-07-10', value: 100, type: 'Aporte' },
    ],
    aportes: [
      { ticker: 'PETR4', name: 'Compra', type: 'Ação', date: '2026-07-01', qty: 1, price: 10, totalValue: 10 },
      { ticker: 'PETR4', name: 'Compra', type: 'Ação', date: '2026-07-01', qty: 1, price: 10, totalValue: 10 },
      { ticker: 'RF1', name: 'RF', type: 'Renda Fixa', date: '2026-07-01', qty: 1, price: 1000, totalValue: 1000 },
    ],
    goals: {
      patrimonio: { target: 'abc' },
      proventos: { monthly: 4000 },
      ativos: { ticker: '', type: '' },
    },
  });

  const before = JSON.stringify(runtime.S);
  const numberZero = runtime.dataQualityNumberState(0);
  const numberMissing = runtime.dataQualityNumberState(null);
  const numberInvalid = runtime.dataQualityNumberState('foo');
  const numberString = runtime.dataQualityNumberState('12,5');

  assert.equal(numberZero.state, 'zero');
  assert.equal(numberMissing.state, 'missing');
  assert.equal(numberInvalid.state, 'invalid');
  assert.equal(numberString.state, 'value');
  assert.equal(numberString.value, 12.5);
  assert.equal(runtime.dataQualityNormalizeTicker(' petr--4 '), 'PETR4');
  assert.equal(runtime.dataQualityTypeState('Renda Fixa').value, 'Renda Fixa');
  assert.equal(runtime.dataQualityDateState('2026-07-18').state, 'value');

  const snapshot = runtime.dataQualitySnapshot();
  assert.equal(JSON.stringify(runtime.S), before, 'dataQualitySnapshot nao pode alterar S');
  assert.equal(snapshot.summary.totalRecords > 0, true);
  assert.equal(snapshot.summary.criticalRecords > 0, true);
  assert.equal(snapshot.summary.warningRecords > 0, true);
  assert.equal(snapshot.issues.some((issue) => issue.field === 'ticker' && issue.severity === 'critical'), true);
  assert.equal(snapshot.issues.some((issue) => issue.field === 'date' && issue.message.includes('futura')), true);
  assert.equal(snapshot.issues.some((issue) => issue.category === 'Duplicidades'), true);
  assert.equal(snapshot.issues.some((issue) => issue.field === 'status'), true);
  assert.equal(snapshot.issues.some((issue) => issue.field === 'patrimonio.target'), true);

  runtime.setDataQualitySeverity('critical');
  runtime.setDataQualityCategory('Moedas');
  runtime.setDataQualityEntityType('Meta');
  const filteredTab = runtime.dataQualityTab();
  assert.match(filteredTab, /Nenhum problema encontrado para os filtros selecionados\./);
  assert.match(filteredTab, /Limpar filtros/);

  const healthyContext = loadRuntime({
    assets: [
      { ticker: 'PETR4', name: 'Petrobras', type: 'Ação', qty: 10, avg_price: 10, current_price: 12, appliedValue: 10, currentValue: 12, currency: 'BRL' },
    ],
    proventos: [],
    rfEvents: [],
    aportes: [],
    goals: {
      patrimonio: { target: 1000 },
      proventos: { monthly: 4000 },
      ativos: { ticker: 'PETR4', type: 'Ação' },
    },
  });
  const healthyTab = healthyContext.dataQualityTab();
  assert.match(healthyTab, /Dados consistentes/);
  assert.match(healthyTab, /Nenhuma correcao e feita automaticamente/);

  healthyContext.setDataQualitySeverity('critical');
  healthyContext.setDataQualityCategory('Moedas');
  healthyContext.setDataQualityEntityType('Meta');
  const healthyFilteredTab = healthyContext.dataQualityTab();
  assert.match(healthyFilteredTab, /Dados consistentes/);
  assert.match(healthyFilteredTab, /Nenhum problema relevante foi encontrado nos registros analisados\./);

  const routeCards = [
    healthyContext.renderDataQualityIssueCard({ severity: 'critical', category: 'Ativos', entityType: 'Ativo', entityIndex: 1, entityLabel: 'PETR4', field: 'ticker', message: 'Ticker ausente', recommendation: 'Abrir Ativos' }),
    healthyContext.renderDataQualityIssueCard({ severity: 'warning', category: 'Dividendos', entityType: 'Provento', entityIndex: 2, entityLabel: 'Dividendos', field: 'date', message: 'Data futura', recommendation: 'Abrir Dividendos' }),
    healthyContext.renderDataQualityIssueCard({ severity: 'info', category: 'Renda Fixa', entityType: 'Renda Fixa', entityIndex: 3, entityLabel: 'CDB001', field: 'rf_maturity_date', message: 'Vencimento ausente', recommendation: 'Abrir Renda Fixa' }),
    healthyContext.renderDataQualityIssueCard({ severity: 'warning', category: 'Metas', entityType: 'Meta', entityIndex: 4, entityLabel: 'Metas', field: 'target', message: 'Meta ausente', recommendation: 'Abrir Metas' }),
  ];
  assert.equal(routeCards.every((html) => /go\("(ativos|dividendos|renda-fixa|metas)"\)/.test(html)), true);
  assert.equal(healthyContext.dataAuditTab(), healthyContext.dataQualityTab());
});

test('fase 206 usa patrimonio atual real e historico mensal real sem mutacao', () => {
  const emptyRuntime = loadRuntime({
    assets: [],
    proventos: [],
    rfEvents: [],
    aportes: [],
    goals: {},
  });
  assert.equal(emptyRuntime.financialGoalsHasPortfolioData({}), false);

  const runtime = loadRuntime({
    assets: [
      { ticker: 'PETR4', name: 'Petrobras', type: 'Ação', qty: 100, avg_price: 10, current_price: 12, appliedValue: 10, currentValue: 12, currency: 'BRL' },
    ],
    proventos: [
      { ticker: 'PETR4', value: 100, date: '2026-07-10', eventType: 'Dividendo' },
      { ticker: 'PETR4', value: 50, date: '2026-06-10', eventType: 'JCP' },
      { ticker: 'PETR4', value: 25, date: '2099-01-10', eventType: 'Dividendo' },
      { ticker: 'RF1', value: 10, date: '2026-07-10', eventType: 'Juros de Renda Fixa', sourceEventKind: 'rf' },
      { ticker: 'PETR4', value: 'bad', date: '2026-07-10', eventType: 'Dividendo' },
    ],
    rfEvents: [],
    aportes: [],
    goals: {},
    divGoal: 3000,
  });

  const before = JSON.stringify(runtime.S);
  const portfolio = runtime.cx();
  assert.equal(portfolio.tI, 10);
  assert.equal(portfolio.tC, 12);
  assert.equal(portfolio.tG, 2);
  assert.equal(runtime.financialGoalsHasPortfolioData(portfolio), true);

  runtime.S.assets = [{ ticker: 'CDB001', name: 'CDB 001', type: 'Renda Fixa', qty: 1, avg_price: 1000, current_price: 1030, appliedValue: 1000, currentValue: 1030, rf_applied_value: 1000, rf_liquid_value: 1030, rf_maturity_date: '2027-01-01' }];
  const rfPortfolio = runtime.cx();
  assert.equal(rfPortfolio.tI, 1000);
  assert.equal(rfPortfolio.tC, 1030);
  assert.equal(runtime.financialGoalsHasPortfolioData(rfPortfolio), true);

  runtime.S.assets = [{ ticker: 'PETR4', name: 'Zero real', type: 'Ação', qty: 0, avg_price: 0, current_price: 0, appliedValue: 0, currentValue: 0, currency: 'BRL' }];
  const zeroPortfolio = runtime.cx();
  assert.equal(zeroPortfolio.tI, 0);
  assert.equal(zeroPortfolio.tC, 0);
  assert.equal(runtime.financialGoalsHasPortfolioData(zeroPortfolio), true);

  runtime.S.assets = [];
  runtime.S.proventos = clone([
    { ticker: 'PETR4', value: 100, date: '2026-07-10', eventType: 'Dividendo' },
    { ticker: 'PETR4', value: 50, date: '2026-06-10', eventType: 'JCP' },
    { ticker: 'PETR4', value: 25, date: '2099-01-10', eventType: 'Dividendo' },
    { ticker: 'RF1', value: 10, date: '2026-07-10', eventType: 'Juros de Renda Fixa', sourceEventKind: 'rf' },
    { ticker: 'PETR4', value: 'bad', date: '2026-07-10', eventType: 'Dividendo' },
  ]);
  const rows = runtime.dividendMonthlyHistoryRows();
  const groups = runtime.dividendMonthlyHistoryGroupRows(rows);
  const summary = runtime.dividendMonthlyHistorySummary(groups);
  const snapshotRuntime = loadRuntime({
    assets: [],
    proventos: clone([
      { ticker: 'PETR4', value: 100, date: '2026-07-10', eventType: 'Dividendo' },
      { ticker: 'PETR4', value: 50, date: '2026-06-10', eventType: 'JCP' },
      { ticker: 'PETR4', value: 25, date: '2099-01-10', eventType: 'Dividendo' },
      { ticker: 'RF1', value: 10, date: '2026-07-10', eventType: 'Juros de Renda Fixa', sourceEventKind: 'rf' },
      { ticker: 'PETR4', value: 'bad', date: '2026-07-10', eventType: 'Dividendo' },
    ]),
    rfEvents: [],
    aportes: [],
    goals: {
      patrimonio: { target: 1000 },
      proventos: { monthly: 4000 },
    },
    divGoal: 3000,
  });
  let cxCalls = 0;
  const originalCx = snapshotRuntime.cx;
  snapshotRuntime.cx = (...args) => {
    cxCalls += 1;
    return originalCx(...args);
  };
  const snapshot = snapshotRuntime.financialGoalsSnapshot();

  assert.equal(JSON.stringify(snapshot.historyRows), JSON.stringify(rows));
  assert.equal(JSON.stringify(snapshot.historyGroups), JSON.stringify(groups));
  assert.equal(JSON.stringify(snapshot.historySummary), JSON.stringify(summary));
  assert.equal(snapshot.currentIncome, 100);
  assert.equal(snapshot.currentIncomeCount, 1);
  assert.equal(snapshot.currentMonthGroup.total, 100);
  assert.equal(snapshot.currentMonthGroup.count, 1);
  assert.equal(snapshot.incomeTarget, 4000);
  assert.equal(snapshot.patrimonyTarget, 1000);
  assert.equal(snapshot.hasPortfolioData, false);
  assert.equal(cxCalls, 1);
  assert.equal(JSON.stringify(snapshotRuntime.S), JSON.stringify({
    assets: [],
    proventos: snapshotRuntime.S.proventos,
    rfEvents: [],
    aportes: [],
    goals: {
      patrimonio: { target: 1000 },
      proventos: { monthly: 4000 },
    },
    divGoal: 3000,
  }), 'financialGoalsSnapshot nao pode alterar S');

  const metrics = runtime.goalProgressMetrics(1200, 1000);
  assert.equal(metrics.hasCurrent, true);
  assert.equal(metrics.hasTarget, true);
  assert.equal(metrics.current, 1200);
  assert.equal(metrics.target, 1000);
  assert.equal(metrics.percent, 120);
  assert.equal(metrics.barPercent, 100);
  assert.equal(metrics.missing, 0);
  assert.equal(metrics.excess, 200);
  assert.equal(metrics.reached, true);

  const emptyMetrics = runtime.goalProgressMetrics(0, 1000);
  assert.equal(emptyMetrics.percent, 0);
  assert.equal(emptyMetrics.barPercent, 0);
  assert.equal(emptyMetrics.missing, 1000);
  assert.equal(emptyMetrics.excess, 0);
  assert.equal(emptyMetrics.reached, false);

  const invalidMetrics = runtime.goalProgressMetrics(null, 0);
  assert.equal(invalidMetrics.hasCurrent, false);
  assert.equal(invalidMetrics.hasTarget, false);
  assert.equal(invalidMetrics.percent, null);
  assert.equal(invalidMetrics.barPercent, 0);

  const incomeStats = runtime.passiveIncomeGoalStats();
  const currentMonthSummary = runtime.passiveIncomeMonthSummary(snapshot.currentMonthKey);
  const passiveHtml = runtime.dashboardPassiveIncomePanel({
    income: incomeStats,
    recent: currentMonthSummary,
  });
  const goalsHtml = runtime.dashboardFinancialGoalsPanel({
    financialGoals: snapshot,
    income: incomeStats,
    recent: currentMonthSummary,
  });
  assert.match(passiveHtml, /Renda passiva/);
  assert.match(passiveHtml, /Recebido no m[eê]s/);
  assert.match(goalsHtml, /Metas financeiras/);
  assert.match(goalsHtml, /Patrim[oô]nio atual/);
  assert.match(goalsHtml, /Meta de renda passiva/);
  assert.match(goalsHtml, /role="progressbar"/);
  assert.match(goalsHtml, /go\('metas'\)/);
  assert.match(passiveHtml, /go\('dividendos'\)/);
});
