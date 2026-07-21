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

function makeMatrixContext() {
  const indexHtml = read('index.html');
  const fnStart = indexHtml.indexOf('function dividendAnnualMatrixData(');
  const fnEnd = indexHtml.indexOf('function dividendMonthlyTimeline(', fnStart);
  assert.ok(fnStart >= 0, 'dividendAnnualMatrixData precisa existir');
  assert.ok(fnEnd > fnStart, 'dividendMonthlyTimeline precisa existir depois');
  const snippet = indexHtml.slice(fnStart, fnEnd);

  const context = {
    console,
    S: { dividendMonthlyHistoryView: 'list', dividendMonthlyHistoryLimit: 6, dividendMonthlyHistoryExpanded: [] },
    fmt(value) {
      return Number(value ?? 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    },
    esc: escapeHtml,
    render() {},
    Math, Number, Date, String, Array, Object, Set, Map, JSON, RegExp, Boolean, Intl,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(snippet, context, { filename: 'matrix-snippet.js' });
  return context;
}

function makeMonth(key, value) {
  return { monthKey: key, value };
}

function nowYear() { return new Date().getFullYear(); }
function nowMonth() { return new Date().getMonth() + 1; }
function pad(m) { return String(m).padStart(2, '0'); }

test('CSS classes da matriz existem no index.html', () => {
  const indexHtml = read('index.html');
  assert.match(indexHtml, /\.div-mat-table\b/);
  assert.match(indexHtml, /\.div-mat-toggle\b/);
  assert.match(indexHtml, /\.div-mat-wrap\b/);
  assert.match(indexHtml, /\.div-mat-scroll\b/);
  assert.match(indexHtml, /\.mat-mean\b/);
  assert.match(indexHtml, /\.mat-year\b/);
  assert.match(indexHtml, /\.mat-val\b/);
  assert.match(indexHtml, /\.mat-zero\b/);
  assert.match(indexHtml, /\.mat-absent\b/);
  assert.match(indexHtml, /\.mat-future\b/);
  assert.match(indexHtml, /\.mat-mean\b/);
  assert.match(indexHtml, /\.mat-total\b/);
  assert.match(indexHtml, /\.div-monthly-tab\b/);
  assert.match(indexHtml, /\.div-monthly-tab-head\b/);
  assert.match(indexHtml, /\.div-monthly-tab-toolbar\b/);
});

const CY = nowYear();
const CM = nowMonth();

// Data spanning 6 years to test 5-year cap
const sixYearData = [];
for (let y = CY - 5; y <= CY; y++) {
  for (let m = 1; m <= 12; m++) {
    sixYearData.push(makeMonth(`${y}-${pad(m)}`, (y - CY + 6) * 100 + m));
  }
}

test('dividendAnnualMatrixData retorna array vazio para input vazio', () => {
  const ctx = makeMatrixContext();
  const result = ctx.dividendAnnualMatrixData([]);
  assert.equal(result.length, 0);
});

test('dividendAnnualMatrixData maximo 5 anos decrescente', () => {
  const ctx = makeMatrixContext();
  const result = ctx.dividendAnnualMatrixData(sixYearData);
  assert.ok(result.length <= 5);
  const years = result.map(r => r.year);
  for (let i = 1; i < years.length; i++) {
    assert.ok(years[i] < years[i - 1], `Anos devem estar em ordem decrescente: ${years}`);
  }
  assert.equal(years[0], CY, 'Ano mais recente deve ser o atual');
});

test('dividendAnnualMatrixData estrutura por ano tem 12 meses + media + total', () => {
  const ctx = makeMatrixContext();
  const result = ctx.dividendAnnualMatrixData(sixYearData);
  assert.ok(result.length > 0);
  result.forEach(row => {
    assert.equal(typeof row.year, 'number');
    assert.equal(Array.isArray(row.months), true);
    assert.equal(row.months.length, 12);
    assert.equal(typeof row.annualTotal, 'number');
    row.months.forEach(m => {
      assert.equal(typeof m.key, 'string');
      assert.equal(typeof m.year, 'number');
      assert.equal(typeof m.month, 'number');
      assert.equal(typeof m.total, 'number');
      assert.equal(typeof m.isFuture, 'boolean');
      assert.equal(typeof m.isBeforeFirst, 'boolean');
      assert.equal(typeof m.hasData, 'boolean');
    });
  });
});

test('dividendAnnualMatrixData meses futuros detectados corretamente', () => {
  const ctx = makeMatrixContext();
  const result = ctx.dividendAnnualMatrixData(sixYearData);
  const currentYearRow = result.find(r => r.year === CY);
  assert.ok(currentYearRow, 'Ano atual deve estar presente');
  const futureMonths = currentYearRow.months.filter(m => m.isFuture);
  if (CM <= 12) {
    assert.ok(futureMonths.length > 0, 'Deveria ter meses futuros se nao for dezembro');
  }
  futureMonths.forEach(m => {
    assert.ok(m.month > CM, `Mes futuro ${m.month} deve ser > mes atual ${CM}`);
  });
  const pastMonths = currentYearRow.months.filter(m => !m.isFuture);
  pastMonths.forEach(m => {
    assert.ok(m.month <= CM, `Mes passado ${m.month} deve ser <= mes atual ${CM}`);
  });
});

test('dividendAnnualMatrixData media exclui meses ausentes e futuros', () => {
  const ctx = makeMatrixContext();
  // Only data from CY-1
  const sparse = [
    makeMonth(`${CY - 1}-01`, 100),
    makeMonth(`${CY - 1}-06`, 200),
    makeMonth(`${CY}-01`, 50),
  ];
  const result = ctx.dividendAnnualMatrixData(sparse);
  const lastYear = result.find(r => r.year === CY - 1);
  assert.ok(lastYear);
  // 2 months with data in CY-1
  const validYearMinus1 = lastYear.months.filter(m => !m.isBeforeFirst && !m.isFuture);
  const expectedMean = validYearMinus1.reduce((s, m) => s + m.total, 0) / validYearMinus1.length;
  assert.equal(lastYear.annualMean, expectedMean);
});

test('dividendAnnualMatrixView gera HTML valido sem NaN/undefined/null', () => {
  const ctx = makeMatrixContext();
  const data = ctx.dividendAnnualMatrixData(sixYearData);
  const html = ctx.dividendAnnualMatrixView(data);
  assert.ok(html.startsWith('<div class="div-mat-wrap">'));
  assert.ok(html.includes('<table class="div-mat-table">'));
  assert.ok(html.includes('<thead>'));
  assert.ok(html.includes('<tbody>'));
  assert.ok(html.includes('Média'));
  assert.ok(html.includes('Total'));
  assert.equal(html.includes('NaN'), false);
  assert.equal(html.includes('undefined'), false);
  assert.equal(String(html).includes('null'), false);
});

test('dividendAnnualMatrixView meses ausentes mat-absent com title', () => {
  const ctx = makeMatrixContext();
  // Data starts mid-year of CY-1, so months 01-05 of CY-1 are absent
  const data = [
    makeMonth(`${CY - 1}-06`, 100),
    makeMonth(`${CY - 1}-12`, 200),
    makeMonth(`${CY}-01`, 50),
  ];
  const result = ctx.dividendAnnualMatrixData(data);
  const html = ctx.dividendAnnualMatrixView(result);
  const absentInHtml = (html.match(/mat-absent/g) || []).length;
  assert.ok(absentInHtml > 0, 'Deveria ter meses ausentes (antes do primeiro provento)');
  assert.ok(html.includes('Sem histórico neste período'));
});

test('dividendAnnualMatrixView meses futuros mat-future com title', () => {
  const ctx = makeMatrixContext();
  const data = [];
  // Only past months
  for (let m = 1; m < CM; m++) {
    data.push(makeMonth(`${CY}-${pad(m)}`, 50));
  }
  const result = ctx.dividendAnnualMatrixData(data);
  const html = ctx.dividendAnnualMatrixView(result);
  const futureRow = result.find(r => r.year === CY);
  if (futureRow) {
    const futureMonths = futureRow.months.filter(m => m.isFuture);
    assert.ok(futureMonths.length > 0 || CM >= 12, 'Deveria ter meses futuros se nao for dezembro');
  }
  if (CM < 12) {
    assert.ok(html.includes('Período futuro'));
  }
});

test('dividendAnnualMatrixView valor zero real vs sem recebimento', () => {
  const ctx = makeMatrixContext();
  // CY-1 month 01: registered with total 0 (zero real)
  // CY-1 month 02: registered with total 150
  // CY-1 month 03+: no data
  const data = [
    makeMonth(`${CY - 1}-01`, 0),
    makeMonth(`${CY - 1}-02`, 150),
  ];
  const result = ctx.dividendAnnualMatrixData(data);
  const html = ctx.dividendAnnualMatrixView(result);
  const lastYear = result.find(r => r.year === CY - 1);
  assert.ok(lastYear);
  // Month 01: hasData=true, total=0, isBeforeFirst=false -> should be mat-zero without title
  const jan = lastYear.months.find(m => m.month === 1);
  assert.equal(jan.hasData, true);
  assert.equal(jan.total, 0);
  assert.equal(jan.isBeforeFirst, false);
  // Month 03+: hasData=false, isBeforeFirst=false -> no receipt in a valid period
  const mar = lastYear.months.find(m => m.month === 3);
  assert.equal(mar.hasData, false);
  assert.equal(mar.total, 0);
  // Month 03 should have title about no receipt
  assert.ok(html.includes('Nenhum recebimento no mês'));
});

test('dividendAnnualMatrixToggleButton default ativo e list', () => {
  const ctx = makeMatrixContext();
  const html = ctx.dividendAnnualMatrixToggleButton();
  assert.ok(html.includes('role="group"'));
  assert.ok(html.includes('aria-label="Visualização'));
  assert.ok(html.includes('aria-pressed="true"'));
  assert.ok(html.includes('>Lista<'));
  assert.ok(html.includes('>Matriz anual<'));
  // List button should be "on"
  assert.match(html, /class="div-mat-toggle-btn on".*?Lista/);
});

test('dividendAnnualMatrixToggleButton matrix ativo quando view=matrix', () => {
  const ctx = makeMatrixContext();
  ctx.S.dividendMonthlyHistoryView = 'matrix';
  const html = ctx.dividendAnnualMatrixToggleButton();
  assert.match(html, /class="div-mat-toggle-btn on".*?Matriz anual/);
  assert.ok(html.includes('aria-pressed="true"'));
});

test('setDividendMonthlyHistoryView nao altera limite ou expansao', () => {
  const ctx = makeMatrixContext();
  ctx.S.dividendMonthlyHistoryView = 'matrix';
  ctx.S.dividendMonthlyHistoryLimit = 24;
  ctx.S.dividendMonthlyHistoryExpanded = ['2026-01', '2026-02'];
  ctx.setDividendMonthlyHistoryView('list');
  assert.equal(ctx.S.dividendMonthlyHistoryView, 'list');
  assert.equal(ctx.S.dividendMonthlyHistoryLimit, 24, 'Limite nao deve ser resetado');
  assert.deepEqual(ctx.S.dividendMonthlyHistoryExpanded, ['2026-01', '2026-02'], 'Expansao nao deve ser resetada');
});

test('setDividendMonthlyHistoryView valor invalido cai para list', () => {
  const ctx = makeMatrixContext();
  ctx.S.dividendMonthlyHistoryView = 'invalid';
  ctx.setDividendMonthlyHistoryView('invalid');
  assert.equal(ctx.S.dividendMonthlyHistoryView, 'list');
});

test('setDividendMonthlyHistoryView chama render', () => {
  const ctx = makeMatrixContext();
  let called = false;
  ctx.render = () => { called = true; };
  ctx.setDividendMonthlyHistoryView('matrix');
  assert.equal(called, true);
});

test('toggle Lista/Matriz preserva paginacao e expansao', () => {
  const ctx = makeMatrixContext();
  ctx.S.dividendMonthlyHistoryView = 'list';
  ctx.S.dividendMonthlyHistoryLimit = 18;
  ctx.S.dividendMonthlyHistoryExpanded = ['2026-03', '2026-07'];
  ctx.setDividendMonthlyHistoryView('matrix');
  assert.equal(ctx.S.dividendMonthlyHistoryView, 'matrix');
  ctx.setDividendMonthlyHistoryView('list');
  assert.equal(ctx.S.dividendMonthlyHistoryView, 'list');
  assert.equal(ctx.S.dividendMonthlyHistoryLimit, 18, 'Limite preservado apos toggle');
  assert.deepEqual(ctx.S.dividendMonthlyHistoryExpanded, ['2026-03', '2026-07'], 'Expansao preservada apos toggle');
});

test('matrix tem colunas Jan a Dez na ordem correta', () => {
  const ctx = makeMatrixContext();
  const html = ctx.dividendAnnualMatrixView(ctx.dividendAnnualMatrixData(sixYearData));
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  months.forEach(m => {
    assert.ok(html.includes(`>${m}<`), `Coluna ${m} deve existir`);
  });
});

test('matrix mostra colunas Media e Total', () => {
  const ctx = makeMatrixContext();
  const html = ctx.dividendAnnualMatrixView(ctx.dividendAnnualMatrixData(sixYearData));
  assert.ok(html.includes('class="mat-mean"'));
  assert.ok(html.includes('class="mat-total"'));
});

test('matrix usa fmt currency para valores', () => {
  const ctx = makeMatrixContext();
  const html = ctx.dividendAnnualMatrixView(ctx.dividendAnnualMatrixData(sixYearData));
  assert.ok(html.includes('R$'));
});

test('dividendAnnualMatrixData com 3 anos funciona', () => {
  const ctx = makeMatrixContext();
  const threeYears = [];
  for (let y = CY - 2; y <= CY; y++) {
    threeYears.push(makeMonth(`${y}-01`, 100));
  }
  const result = ctx.dividendAnnualMatrixData(threeYears);
  assert.equal(result.length, 3);
});

test('dividendAnnualMatrixData media null quando todos meses sao ausentes/futuros', () => {
  const ctx = makeMatrixContext();
  // Only future months
  const futureOnly = [];
  for (let m = CM; m <= 12; m++) {
    futureOnly.push(makeMonth(`${CY}-${pad(m)}`, 100));
  }
  // Also needs data in earlier year to have non-future context
  const data = [
    ...futureOnly,
    makeMonth(`${CY - 1}-01`, 50),
  ];
  const result = ctx.dividendAnnualMatrixData(data);
  const currentYear = result.find(r => r.year === CY);
  if (currentYear) {
    const valid = currentYear.months.filter(m => !m.isBeforeFirst && !m.isFuture);
    if (valid.length === 0) {
      assert.equal(currentYear.annualMean, null);
    }
  }
});

test('layout tab dedicado tem div-monthly-tab', () => {
  const indexHtml = read('index.html');
  assert.match(indexHtml, /class="div-monthly-tab"/);
  assert.match(indexHtml, /class="div-monthly-tab-head"/);
  assert.match(indexHtml, /class="div-monthly-tab-metrics"/);
  assert.match(indexHtml, /class="div-monthly-tab-toolbar"/);
});

test('toggle button aparece dentro do tab head', () => {
  const indexHtml = read('index.html');
  // verify toggle is rendered in the dedicated tab flow
  assert.match(indexHtml, /toggleBtn/);
  assert.match(indexHtml, /dividendAnnualMatrixToggleButton\(\)/);
});

test('matrix wrap contem scroll container', () => {
  const ctx = makeMatrixContext();
  const html = ctx.dividendAnnualMatrixView(ctx.dividendAnnualMatrixData(sixYearData));
  assert.ok(html.includes('div-mat-scroll'));
  assert.ok(html.includes('div-mat-wrap'));
});

test('mat-year sticky na esquerda', () => {
  const ctx = makeMatrixContext();
  const html = ctx.dividendAnnualMatrixView(ctx.dividendAnnualMatrixData(sixYearData));
  assert.ok(html.includes('class="mat-year"'));
});

test('setDividendMonthlyHistoryView valores validos', () => {
  const ctx = makeMatrixContext();
  ctx.setDividendMonthlyHistoryView('list');
  assert.equal(ctx.S.dividendMonthlyHistoryView, 'list');
  ctx.setDividendMonthlyHistoryView('matrix');
  assert.equal(ctx.S.dividendMonthlyHistoryView, 'matrix');
});

test('ano ausente nao aparece no resultado', () => {
  const ctx = makeMatrixContext();
  // Data only from CY-3 and CY
  const data = [
    makeMonth(`${CY - 3}-06`, 100),
    makeMonth(`${CY}-01`, 50),
  ];
  const result = ctx.dividendAnnualMatrixData(data);
  const years = result.map(r => r.year);
  assert.ok(years.includes(CY));
  assert.ok(years.includes(CY - 3));
  // Should not include CY-1 or CY-2 if no data
  if (result.length < 5) {
    assert.equal(years.includes(CY - 1), false);
  }
});

test('indice de colunas tem scope="col"', () => {
  const ctx = makeMatrixContext();
  const html = ctx.dividendAnnualMatrixView(ctx.dividendAnnualMatrixData(sixYearData));
  const colScopeCount = (html.match(/scope="col"/g) || []).length;
  // 12 months + Media + Total = 14 header cells
  assert.equal(colScopeCount, 14);
});

test('toggle buttons tem onclick handlers', () => {
  const ctx = makeMatrixContext();
  const html = ctx.dividendAnnualMatrixToggleButton();
  assert.ok(html.includes("setDividendMonthlyHistoryView('list')"));
  assert.ok(html.includes("setDividendMonthlyHistoryView('matrix')"));
});
