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
  const snippet = extract('function portfolioSectorConcentrationRows(', 'function dashboardAssetByTicker(');
  const context = {};
  vm.runInNewContext(`${snippet}\nportfolioSectorConcentrationRows;`, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.portfolioSectorConcentrationRows([
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
  const snapshot = extract('function dashboardSnapshot(analysisRows){', 'function portfolioSectorConcentrationRows(');
  assert.match(snapshot, /sectorRows:portfolioSectorConcentrationRows\(analysis\)/);
  assert.doesNotMatch(snapshot, /FinanceCore|localStorage|save\(/);
});

// Reconciliação V3 (HYBRID V2 aprovada): a spec MOVE recebíveis → Dividendos
// (rota dona) e consolida o grid dashboard-intelligence-grid (receipts +
// insights) em "no máximo uma prioridade" (spec seções 4-5: "Dashboard
// conserva metadado essencial e um link de prioridade"). O comportamento
// protegido — insights baseados em evidência continuam presentes e
// acionáveis no dashboard — migraram para dashboardV3PriorityPanel, que
// consome data.insights (portfolioInsightsSnapshot) e roteia para a rota
// relacionada/IA. As funções donas antigas permanecem para as rotas donas.
test('dashboard keeps evidence-based insights reachable via a single priority', () => {
  const dash = extract('function dash(){', 'function patrimonySnapshot(');
  // A prioridade V3 é o novo lar dos insights no dashboard.
  assert.match(dash, /dashboardV3PriorityPanel\(data\)/);
  // O snapshot de insights continua sendo produzido com evidência real.
  assert.match(dash, /portfolioInsightsSnapshot\(/);
  // O grid V2 dedicado não deve voltar à primeira dobra.
  assert.doesNotMatch(dash, /dashboard-intelligence-grid/);
  assert.doesNotMatch(dash, /dashboardReceiptsPanel\(data\)/);

  const priority = extract('function dashboardV3PriorityPanel(', 'function dashboardQuickActions()');
  assert.match(priority, /data\?\.insights/);
  assert.match(priority, /relatedRoute/);
  assert.match(priority, /go\('/);
});

test('dashboard creates a sector concentration insight using an existing route', () => {
  const insights = extract('function portfolioInsightsSnapshot(source=null){', 'function dashboardInsightsPanel(data){');
  assert.match(insights, /concentration-top-sector/);
  assert.match(insights, /relatedRoute:'ativos'/);
  assert.match(insights, /assetAnalysisRows/);
});

test('assets analysis exposes sector concentration from the shared portfolio helper', () => {
  const analysis = extract('function assetAnalysisBlock(rowsInput){', 'function hasOwnFiniteNumber(');
  assert.match(analysis, /portfolioSectorConcentrationRows\(rows\)/);
  assert.match(analysis, /Exposição por setor/);
  assert.doesNotMatch(analysis, /FinanceCore|localStorage|save\(/);
});

test('desktop navigation keeps launches near assets', () => {
  const navigation = extract('function desktopTabs(){', 'function mobileTabs(){');
  assert.ok(navigation.indexOf("navItem('ativos'") < navigation.indexOf("navItem('aportes'") );
  assert.ok(navigation.indexOf("navItem('aportes'") < navigation.indexOf("navItem('renda-fixa'") );
});

test('assets result cells preserve positive, negative and neutral semantics', () => {
  assert.match(source, /\.assets-premium-table \.result-indicator\.pos\{color:var\(--success\)\}/);
  assert.match(source, /\.assets-premium-table \.result-indicator\.neg\{color:var\(--danger\)\}/);
  assert.match(source, /\.assets-premium-table \.result-indicator\.neutral\{color:var\(--muted\)\}/);
  assert.match(source, /result > 0 \? 'pos' : result < 0 \? 'neg' : 'neutral'/);
});
