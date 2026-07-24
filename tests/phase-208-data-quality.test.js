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
    extractBetween(indexHtml, 'function proventoResumo(){', 'function passiveIncomeRollingMonthKeys(baseDate=new Date(), count=12){'),
    extractBetween(indexHtml, 'function dividendMonthlyHistoryRows(rows=Array.isArray(S.proventos) ? S.proventos : []){', 'function dividendMonthlyHistoryPremium(rows,startOpen=false){'),
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
  const numberDot = runtime.dataQualityNumberState('1234.56');
  const numberComma = runtime.dataQualityNumberState('1234,56');
  const numberGrouped = runtime.dataQualityNumberState('1.234,56');
  const numberTextZero = runtime.dataQualityNumberState('0');
  const numberInfinity = runtime.dataQualityNumberState(Infinity);
  const numberEmpty = runtime.dataQualityNumberState('');
  const numberUndefined = runtime.dataQualityNumberState(undefined);
  const numberNaN = runtime.dataQualityNumberState(Number.NaN);

  assert.equal(numberZero.state, 'zero');
  assert.equal(numberMissing.state, 'missing');
  assert.equal(numberInvalid.state, 'invalid');
  assert.equal(numberString.state, 'value');
  assert.equal(numberString.value, 12.5);
  assert.equal(numberDot.state, 'value');
  assert.equal(numberDot.value, 1234.56);
  assert.equal(numberComma.state, 'value');
  assert.equal(numberComma.value, 1234.56);
  assert.equal(numberGrouped.state, 'value');
  assert.equal(numberGrouped.value, 1234.56);
  assert.equal(numberTextZero.state, 'zero');
  assert.equal(numberTextZero.value, 0);
  assert.equal(numberInfinity.state, 'invalid');
  assert.equal(numberEmpty.state, 'missing');
  assert.equal(numberUndefined.state, 'missing');
  assert.equal(numberNaN.state, 'invalid');
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

test('renda fixa oficial usa uma unica fonte e preserva fallback compatível', () => {
  const runtime = loadRuntime({
    assets: [
      { ticker: 'RF01', name: 'RF oficial', type: 'Renda Fixa', qty: 1, avg_price: 0, current_price: 0, rf_applied_value: '1.234,56', rf_liquid_value: '1.500,00', rf_gross_value: '1.600,00', rf_ir_iof: '100,00', rf_maturity_date: '2027-01-01', rf_contract_rate: 'CDI + 1,00%' },
      { ticker: 'RF02', name: 'RF fallback', type: 'Renda Fixa', qty: '2', avg_price: '500,00', current_price: 0, rf_applied_value: '', rf_liquid_value: '', rf_gross_value: '1.100,00', rf_ir_iof: '0', rf_maturity_date: '2027-01-01', rf_contract_rate: 'CDI + 1,00%' },
      { ticker: 'RF03', name: 'RF zerada', type: 'Renda Fixa', qty: 1, avg_price: 0, current_price: 0, rf_applied_value: '0', rf_liquid_value: '0', rf_gross_value: '0', rf_ir_iof: '0', rf_maturity_date: '2027-01-01', rf_contract_rate: 'CDI + 1,00%' },
    ],
    proventos: [],
    rfEvents: [],
    aportes: [],
    goals: {},
  });

  const official = runtime.fixedIncomeOfficialValues(runtime.S.assets[0]);
  const fallback = runtime.fixedIncomeOfficialValues(runtime.S.assets[1]);
  const zero = runtime.fixedIncomeOfficialValues(runtime.S.assets[2]);

  assert.deepEqual(runtime.rfValues(runtime.S.assets[0]), official);
  assert.equal(official.applied, 1234.56);
  assert.equal(official.current, 1500);
  assert.equal(official.hasExplicitCurrent, true);
  assert.equal(Number(official.profit.toFixed(2)), 265.44);
  assert.equal(Math.abs(official.rentab - 21.5) < 0.2, true);

  assert.equal(fallback.applied, 1000);
  assert.equal(fallback.current, 1100);
  assert.equal(fallback.hasExplicitCurrent, true);
  assert.equal(runtime.assetNeedsRFUpdate(runtime.S.assets[1]), false);

  assert.equal(zero.applied, 0);
  assert.equal(zero.current, 0);
  assert.equal(zero.hasExplicitCurrent, false);
  assert.equal(runtime.assetNeedsRFUpdate(runtime.S.assets[2]), true);

  const snapshot = runtime.dataQualitySnapshot();
  assert.equal(snapshot.issues.some((issue) => issue.category === 'Renda Fixa' && issue.field === 'rf_applied_value' && issue.severity === 'critical'), false);
  assert.equal(snapshot.issues.some((issue) => issue.category === 'Renda Fixa' && issue.field === 'rf_current_value'), true);
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
  const officialStats = snapshotRuntime.proventoStats();
  const officialResumo = snapshotRuntime.proventoResumo();

  assert.equal(JSON.stringify(snapshot.historyRows), JSON.stringify(rows));
  assert.equal(JSON.stringify(snapshot.historyGroups), JSON.stringify(groups));
  assert.equal(JSON.stringify(snapshot.historySummary), JSON.stringify(summary));
  assert.equal(JSON.stringify(officialResumo.summary), JSON.stringify(summary));
  assert.equal(officialStats.total, summary.total);
  assert.equal(officialStats.mes, 100);
  assert.equal(officialStats.ano, 150);
  assert.equal(officialResumo.meses.reduce((acc, row) => acc + row.valor, 0), summary.total);
  assert.equal(officialResumo.anos.reduce((acc, row) => acc + row.valor, 0), summary.total);
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
  assert.match(passiveHtml, /M[eé]dia 12 meses/);
  assert.match(goalsHtml, /Metas financeiras/);
  assert.match(goalsHtml, /Patrim[oô]nio atual/);
  assert.match(goalsHtml, /Meta de renda passiva/);
  assert.match(goalsHtml, /M[eé]dia mensal hist[oó]rica/);
  assert.match(goalsHtml, /Melhor m[eê]s hist[oó]rico/);
  assert.match(goalsHtml, /role="progressbar"/);
  assert.match(goalsHtml, /go\('metas'\)/);
  assert.match(passiveHtml, /go\('dividendos'\)/);
});
test('proventos oficiais normalizam strings e excluem registros invalidos', () => {
  const runtime = loadRuntime({
    assets: [],
    proventos: [
      { ticker: 'AAA1', value: '1234.56', date: '2026-07-10', type: 'Dividendo' },
      { ticker: 'BBB2', value: '1234,56', date: '2026-06-10', type: 'JCP' },
      { ticker: 'CCC3', value: '0', date: '2026-06-11', type: 'Dividendo' },
      { ticker: 'DDD4', value: null, date: '2026-06-12', type: 'Dividendo' },
      { ticker: 'EEE5', value: undefined, date: '2026-06-13', type: 'Dividendo' },
      { ticker: 'FFF6', value: -10, date: '2026-07-10', type: 'Dividendo' },
      { ticker: 'GGG7', value: 50, date: 'bad-date', type: 'Dividendo' },
      { ticker: '', value: 10, date: '2026-07-10', type: 'Dividendo' },
      { ticker: 'HHH8', value: 10, date: '2028-01-01', type: 'Dividendo' },
      { ticker: 'RF1', value: 10, date: '2026-07-10', type: 'Juros de Renda Fixa', sourceEventKind: 'rf' },
    ],
    rfEvents: [],
    aportes: [],
    goals: {},
    divGoal: 3000,
  });

  const rows = runtime.dividendMonthlyHistoryRows();
  const groups = runtime.dividendMonthlyHistoryGroupRows(rows);
  const summary = runtime.dividendMonthlyHistorySummary(groups);
  const stats = runtime.proventoStats();
  const resumo = runtime.proventoResumo();

  assert.equal(rows.some((row) => row.ticker === 'AAA1' && row.value === 1234.56), true);
  assert.equal(rows.some((row) => row.ticker === 'BBB2' && row.value === 1234.56), true);
  assert.equal(rows.some((row) => row.value === 0), true);
  assert.equal(rows.some((row) => row.value < 0), false);
  assert.equal(rows.some((row) => row.ticker === ''), false);
  assert.equal(rows.some((row) => row.ticker === 'RF1'), false);
  assert.equal(summary.total, 2469.12);
  assert.equal(stats.total, summary.total);
  assert.equal(JSON.stringify(resumo.summary), JSON.stringify(summary));
  assert.equal(resumo.meses.reduce((acc, row) => acc + row.valor, 0), summary.total);
  assert.equal(resumo.anos.reduce((acc, row) => acc + row.valor, 0), summary.total);
});
test('proventoResumoTipos e proventoResumoPorAtivo derivam do historico oficial', () => {
  const runtime = loadRuntime({
    assets: [
      { ticker: 'AAA1', name: 'Alpha', type: 'AÃ§Ã£o', qty: 1, avg_price: 10, current_price: 12, currency: 'BRL' },
      { ticker: 'BBB2', name: 'Beta', type: 'FII', qty: 1, avg_price: 8, current_price: 9, currency: 'BRL' },
    ],
    proventos: [
      { ticker: 'RAW9', value: 999, date: '2026-07-10', type: 'Dividendo' },
    ],
    rfEvents: [],
    aportes: [],
    goals: {},
  });

  const officialRows = [
    {
      ticker: 'AAA1',
      name: 'Alpha',
      type: 'Dividendo',
      value: 100,
      date: '2026-07-10',
    },
    {
      ticker: 'AAA1',
      name: 'Alpha',
      type: 'JCP',
      value: 0,
      date: '2026-07-09',
    },
    {
      ticker: 'BBB2',
      name: 'Beta',
      type: 'Rendimento',
      value: 80,
      date: '2026-06-11',
    },
  ];

  runtime.dividendMonthlyHistoryRows = () => officialRows.map((row) => ({ ...row }));

  const tiposSource = runtime.proventoResumoTipos.toString();
  const porAtivoSource = runtime.proventoResumoPorAtivo.toString();
  assert.match(tiposSource, /dividendMonthlyHistoryRows\(\)/);
  assert.match(porAtivoSource, /dividendMonthlyHistoryRows\(\)/);
  assert.equal(tiposSource.includes('S.proventos'), false);
  assert.equal(porAtivoSource.includes('S.proventos'), false);
  assert.equal(tiposSource.includes('passiveIncomeGoalStats'), false);
  assert.equal(porAtivoSource.includes('passiveIncomeGoalStats'), false);

  const tipos = runtime.proventoResumoTipos();
  const porAtivo = runtime.proventoResumoPorAtivo();

  assert.equal(tipos.total, 180);
  assert.equal(tipos.count, 3);
  assert.equal(tipos.tipos.Dividendo, 100);
  assert.equal(tipos.tipos.JCP, 0);
  assert.equal(tipos.tipos.Rendimento, 80);
  assert.equal(tipos.tipos['Juros de Renda Fixa'], 0);
  assert.equal(tipos.tipos.Reembolso, 0);
  assert.equal(tipos.tipos.Outro, 0);

  assert.equal(porAtivo.length, 2);
  assert.equal(porAtivo[0].ticker, 'AAA1');
  assert.equal(porAtivo[0].name, 'AAA1 · Alpha');
  assert.equal(porAtivo[0].assetName, 'Alpha');
  assert.equal(porAtivo[0].total, 100);
  assert.equal(porAtivo[0].count, 2);
  assert.equal(porAtivo[0].lastDate, '2026-07-10');
  assert.equal(porAtivo[1].ticker, 'BBB2');
  assert.equal(porAtivo[1].name, 'BBB2 · Beta');
  assert.equal(porAtivo[1].assetName, 'Beta');
  assert.equal(porAtivo[1].total, 80);
  assert.equal(porAtivo[1].count, 1);
  assert.equal(porAtivo[1].lastDate, '2026-06-11');
  assert.equal(JSON.stringify(runtime.S.proventos), JSON.stringify([
    { ticker: 'RAW9', value: 999, date: '2026-07-10', type: 'Dividendo' },
  ]));
  assert.equal(runtime.proventoRankingPagadores().length, 2);
});
