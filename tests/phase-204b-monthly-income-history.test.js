const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function iso(date) {
  const dt = new Date(date);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function monthAt(now, offset, day = 15) {
  return new Date(now.getFullYear(), now.getMonth() - offset, day, 12, 0, 0, 0);
}

function makeContext(proventos, overrides = {}) {
  const indexHtml = read('index.html');
  const start = indexHtml.indexOf('function proventoTipoCanonical(value){');
  const end = indexHtml.indexOf('function dividendSummaryCards(){', start);
  assert.equal(start >= 0, true, 'proventoTipoCanonical precisa existir');
  assert.equal(end > start, true, 'dividendSummaryCards precisa existir depois do bloco mensal');

  const context = {
    console,
    S: {
      proventos,
      dividendMonthlyHistoryPeriod: 'all',
      dividendMonthlyHistoryTicker: 'all',
      dividendMonthlyHistoryType: 'all',
      dividendMonthlyHistoryLimit: 6,
      dividendMonthlyHistoryExpanded: [],
      ...overrides,
    },
    fmt(value) {
      return `R$ ${Number(value ?? 0).toFixed(2)}`;
    },
    esc: escapeHtml,
    parseAnyDate(value) {
      if (value == null || value === '') return null;
      const dt = new Date(value);
      return Number.isNaN(dt.getTime()) ? null : dt;
    },
    toISODate(value) {
      return iso(value);
    },
    rfPosNorm(value) {
      return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
    },
    renderCount: 0,
    render() {
      context.renderCount += 1;
    },
    dividendEmptyState(message = 'Nenhum provento encontrado para os filtros atuais.', detail = 'Ajuste a busca, os filtros ou a visão selecionada.') {
      return `<div class="empty"><h3>${escapeHtml(message)}</h3>${detail ? `<p>${escapeHtml(detail)}</p>` : ''}</div>`;
    },
    window: {
      scrollX: 0,
      scrollY: 0,
      scrollTo() {},
    },
    document: {
      getElementById() {
        return null;
      },
    },
    requestAnimationFrame(fn) {
      fn();
    },
    setTimeout,
    clearTimeout,
    Math,
    Number,
    Date,
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
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(indexHtml.slice(start, end), context, { filename: 'monthly-history-snippet.js' });
  return context;
}

function buildRows(now) {
  const rows = [
    {
      id: 'current-positive',
      ticker: 'AAA1',
      type: 'Dividendo',
      value: 100,
      dataPagamento: monthAt(now, 0, 10).toISOString(),
      note: 'Mes atual',
    },
    {
      id: 'current-zero',
      ticker: 'AAA1',
      type: 'JCP',
      value: 0,
      paymentDate: monthAt(now, 0, 12).toISOString(),
      note: 'Zero real',
    },
    {
      id: 'prev-zero',
      ticker: 'BBB2',
      type: 'Dividendo',
      value: 0,
      dataPagamento: monthAt(now, 1, 10).toISOString(),
    },
    {
      id: 'prev-positive',
      ticker: 'CCC3',
      type: 'Rendimento',
      value: 50,
      data: monthAt(now, 2, 20).toISOString(),
    },
    {
      id: 'two-months',
      ticker: 'DDD4',
      type: 'JCP',
      value: 40,
      date: monthAt(now, 2, 8).toISOString(),
    },
    {
      id: 'three-months',
      ticker: 'EEE5',
      type: 'Dividendo',
      value: 30,
      pagamento: monthAt(now, 3, 14).toISOString(),
      observation: 'Observacao real',
    },
    {
      id: 'four-months',
      ticker: 'FFF6',
      type: 'Dividendo',
      value: 20,
      dataPagamento: monthAt(now, 4, 1).toISOString(),
    },
    {
      id: 'five-months',
      ticker: 'GGG7',
      type: 'JCP',
      value: 10,
      paymentDate: monthAt(now, 5, 5).toISOString(),
    },
    {
      id: 'six-months',
      ticker: 'HHH8',
      type: 'Dividendo',
      value: 5,
      dataPagamento: monthAt(now, 6, 17).toISOString(),
    },
    {
      id: 'seven-months',
      ticker: 'III9',
      type: 'Dividendo',
      value: 1,
      dataPagamento: monthAt(now, 7, 22).toISOString(),
    },
    {
      id: 'future',
      ticker: 'ZZZ9',
      type: 'Dividendo',
      value: 999,
      dataPagamento: monthAt(now, -1, 10).toISOString(),
    },
    {
      id: 'invalid-date',
      ticker: 'INV0',
      type: 'Dividendo',
      value: 11,
      dataPagamento: 'not-a-date',
    },
    {
      id: 'rf',
      ticker: 'RF01',
      type: 'Juros de Renda Fixa',
      sourceEventKind: 'rf',
      value: 33,
      dataPagamento: monthAt(now, 0, 9).toISOString(),
    },
    {
      id: 'excluded',
      ticker: 'EXC1',
      type: 'Dividendo',
      excludedFromIncomeTotals: true,
      value: 44,
      dataPagamento: monthAt(now, 0, 13).toISOString(),
    },
    {
      id: 'missing-value',
      ticker: 'MISS',
      type: 'Dividendo',
      value: null,
      dataPagamento: monthAt(now, 0, 14).toISOString(),
    },
    {
      id: 'precedence',
      ticker: 'PRI1',
      type: 'Dividendo',
      value: 70,
      dataPagamento: monthAt(now, 2, 11).toISOString(),
      paymentDate: monthAt(now, 4, 11).toISOString(),
      pagamento: monthAt(now, 5, 11).toISOString(),
      data: monthAt(now, 6, 11).toISOString(),
      date: monthAt(now, 7, 11).toISOString(),
    },
  ];

  return rows;
}

test('seleciona somente recebidos e respeita a data oficial', () => {
  const now = new Date();
  const context = makeContext(buildRows(now));
  const rows = context.dividendMonthlyHistoryRows(context.S.proventos);

  assert.equal(rows.some(row => row.id === 'future'), false);
  assert.equal(rows.some(row => row.id === 'invalid-date'), false);
  assert.equal(rows.some(row => row.id === 'rf'), false);
  assert.equal(rows.some(row => row.id === 'excluded'), false);
  assert.equal(rows.some(row => row.id === 'missing-value'), false);
  assert.equal(rows.some(row => row.value === null), false);
  assert.equal(rows.some(row => row.value === 0), true);
  assert.equal(rows.some(row => row.value < 0), false);
  assert.equal(rows.some(row => row.ticker === ''), false);
  const precedence = rows.find(row => row.id === 'precedence');
  assert.equal(precedence.date, iso(monthAt(now, 2, 11)));
  assert.equal(precedence.monthKey, `${monthAt(now, 2, 11).getFullYear()}-${String(monthAt(now, 2, 11).getMonth() + 1).padStart(2, '0')}`);
  assert.equal(rows.findIndex(row => row.id === 'current-positive') < rows.findIndex(row => row.id === 'prev-positive'), true);
  assert.equal(rows.findIndex(row => row.id === 'prev-positive') < rows.findIndex(row => row.id === 'two-months'), true);
});

test('agrupa meses reais, limita a seis e preserva expandir recolher', () => {
  const now = new Date();
  const context = makeContext(buildRows(now));
  const html = context.dividendMonthlyHistoryPremium(context.S.proventos);
  const rows = context.dividendMonthlyHistoryGroupRows(context.dividendMonthlyHistoryFilterRows(context.dividendMonthlyHistoryRows(context.S.proventos), {
    period: context.S.dividendMonthlyHistoryPeriod,
    ticker: context.S.dividendMonthlyHistoryTicker,
    type: context.S.dividendMonthlyHistoryType,
  }));

  assert.equal(rows.length >= 7, true);
  assert.match(html, /Histórico mensal/);
  assert.match(html, /Acompanhe os proventos efetivamente recebidos ao longo do tempo\./);
  assert.match(html, /Mostrar mais/);
  assert.equal((html.match(/div-month-history-row/g) || []).length, 6);

  context.S.dividendMonthlyHistoryLimit = 12;
  const expanded = context.dividendMonthlyHistoryPremium(context.S.proventos);
  assert.match(expanded, /Mostrar menos/);
  assert.equal((expanded.match(/div-month-history-row/g) || []).length >= 7, true);
});

test('filtros combinam e estados vazios permanecem neutros', () => {
  const now = new Date();
  const context = makeContext(buildRows(now));

  const filtered = context.dividendMonthlyHistoryFilterRows(
    context.dividendMonthlyHistoryRows(context.S.proventos),
    { period: 'current', ticker: 'AAA1', type: 'Dividendo' },
  );
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].ticker, 'AAA1');

  context.S.dividendMonthlyHistoryPeriod = 'current';
  context.S.dividendMonthlyHistoryTicker = 'ZZZ9';
  context.S.dividendMonthlyHistoryType = 'Dividendo';
  const emptyHtml = context.dividendMonthlyHistoryPremium(context.S.proventos);
  assert.match(emptyHtml, /Nenhum recebimento encontrado para os filtros selecionados\./);
  assert.match(emptyHtml, /Limpar filtros/);

  context.S.proventos = [];
  const noReceiptsHtml = context.dividendMonthlyHistoryPremium(context.S.proventos);
  assert.match(noReceiptsHtml, /Nenhum provento recebido ainda\./);
});

test('expansao mensal e comparacao segura nao quebram', () => {
  const now = new Date();
  const context = makeContext(buildRows(now));
  const rows = context.dividendMonthlyHistoryGroupRows(
    context.dividendMonthlyHistoryFilterRows(context.dividendMonthlyHistoryRows(context.S.proventos), {
      period: 'all',
      ticker: 'all',
      type: 'all',
    }),
  );
  const current = rows[0];
  const comparison = context.dividendMonthlyHistoryComparisonText(current);

  assert.equal(typeof comparison, 'string');
  assert.equal(comparison.includes('Infinity'), false);
  assert.equal(comparison.includes('NaN'), false);
  assert.match(comparison, /^([+-]R\$ \d+\.\d{2}|Sem base anterior|Compara\u00e7\u00e3o indispon\u00edvel)( \([+-]?\d+(\.\d+)?%\))?$/);
  assert.equal(rows[1].total, 0);
  assert.equal(comparison.includes('%'), false);

  context.S.dividendMonthlyHistoryExpanded = [current.key];
  const html = context.dividendMonthlyHistoryPremium(context.S.proventos);
  assert.match(html, new RegExp(`aria-expanded="true"`));
  assert.match(html, new RegExp(`aria-controls="div-month-history-${current.key}"`));
  assert.match(html, /Ocultar detalhes/);

  const beforeToggle = [...context.S.dividendMonthlyHistoryExpanded];
  context.dividendMonthlyHistoryToggleMonth(current.key);
  assert.equal(beforeToggle.length, 1);
  assert.equal(beforeToggle[0], current.key);
  assert.equal(context.S.dividendMonthlyHistoryExpanded.length, 0);
});
