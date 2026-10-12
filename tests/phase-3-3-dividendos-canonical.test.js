const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Dividendos mantém o contrato canônico, fontes oficiais e bloqueios visuais', () => {
  const source = read('index.html');
  const canon = read('docs/ai/VISUAL_CANON.md');
  const refs = read('Refs/visual-canon/CANON_INDEX.md');

  assert.match(source, /function dividendExecutiveKpis\(rows=dividendPremiumRows\(\)\)/);
  for (const label of ['Recebido no ano', 'Média mensal', 'Último mês', 'Projeção anual', 'Yield atual']) assert.match(source, new RegExp(label));
  assert.match(source, /classifyIncomeState\(row\)!=='PAID'/);
  assert.match(source, /passiveIncomeGoalStats\(\)/);
  assert.match(source, /function dividendAnnualMatrixData\(rows,coverage=\{\}\)/);
  assert.match(source, /const monthNames=\['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'\]/);
  assert.match(source, /mat-future/);
  assert.match(source, /mat-absent/);
  assert.match(source, /mat-zero/);
  assert.match(source, /function dividendMonthlyTimeline\(rows=filteredDividendRows\(\)\)/);
  assert.match(source, /function canonDividendYearSummary\(rows\)/);
  assert.match(source, /class="dividend-calendar-primary"/);
  assert.match(source, /class="dividend-secondary-disclosure"/);
  assert.match(source, /aria-label="Modos de Dividendos"/);
  assert.match(source, /\['overview','Calendário'\]/);
  assert.match(source, /\['timeline','Evolução'\]/);
  assert.match(source, /\['monthly','Histórico'\]/);
  assert.match(source, /function setDividendYearFilter\(year\)/);
  assert.match(source, /onclick="exportBackup\(\)"/);
  assert.match(source, /Renda recebida/);

  assert.match(canon, /VISUAL_DIRECTION=PREMIUM_DARK_EXECUTIVE/);
  assert.match(canon, /DIVIDENDOS/);
  assert.match(refs, /No image is currently asserted as a public canonical asset/);
  assert.match(refs, /synthetic, independently/);
  assert.doesNotMatch(refs, /\.png|SHA-256/i);
});

test('Dividendos usa tres colunas nos tablets e rotulos legiveis', () => {
  const source = read('index.html');
  const tabletGrid = /@media\s*\(max-width:1180px\)\s*and\s*\(min-width:768px\)[\s\S]*?\.premium-dividends-3 \.dividend-kpis-canon-grid\s*\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/;
  assert.ok(tabletGrid.test(source), 'tablet KPI breakpoint must override the five-column desktop rule');
  assert.ok(/\.premium-dividends-3 \.dividend-executive-kpi-label\s*\{font-size:11px/.test(source), 'KPI labels remain readable');
  assert.ok(/\.premium-dividends-3 \.dividend-executive-kpi-sub\s*\{font-size:11px/.test(source), 'KPI context remains readable');
});

test('Top Ativos renders the result percentage with one sign only', () => {
  const source = read('index.html');
  const resultLine = source.split(/\r?\n/).find(line => line.includes('asset.pct===null'));
  assert.ok(resultLine, 'Top Ativos percentage row exists');
  assert.match(resultLine, /fmtP\(asset\.pct\)/);
  assert.doesNotMatch(resultLine, /asset\.result>=0/);
  assert.match(resultLine, /asset\.pct===null\?'resultado indisponível'/);
});

test('Ativos reorganiza as metricas do resumo de classe em tablets e celulares', () => {
  const source = read('index.html');
  assert.match(source, /@media\(max-width:900px\)\{\s*\.assets-premium-shell \.accordion-header\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(source, /@media\(max-width:640px\)\{\s*\.assets-premium-shell \.accordion-header\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(source, /\.assets-premium-shell \.accordion-header \.acc-info\s*\{[^}]*grid-column:1\/-1/);
});
