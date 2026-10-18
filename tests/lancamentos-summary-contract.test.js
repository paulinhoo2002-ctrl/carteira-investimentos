const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const { V213TransactionTrust } = require('../v213-transaction-trust.js');

const html = fs.readFileSync('index.html', 'utf8');

function extractFunction(name, nextName) {
  const start = html.indexOf('function ' + name + '(');
  const end = html.indexOf('\nfunction ' + nextName + '(', start);
  assert.ok(start >= 0 && end > start, 'funcao ' + name + ' nao encontrada');
  return html.slice(start, end);
}

function createContext(helper = V213TransactionTrust) {
  const context = {
    S: { apSearch: '', aportesFilter: 'todos' },
    V213TransactionTrust: helper,
    normalizeType(value, fallback) { return String(value || fallback || '').trim(); },
    parseAnyDate(value) {
      if (!value) return null;
      const date = new Date(String(value).slice(0, 10) + 'T12:00:00');
      return Number.isNaN(date.getTime()) ? null : date;
    },
    fmt(value) { return 'BRL ' + Number(value).toFixed(2); }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext([
    extractFunction('aporteMovementKind', 'isNeutralMovement'),
    extractFunction('isNeutralMovement', 'aporteMovementLabel'),
    extractFunction('aporteMovementLabel', 'aporteMovementTone'),
    extractFunction('aporteInvestmentStats', 'aporteInvestmentMetric'),
    extractFunction('aporteInvestmentMetric', 'summarizeAporteMovements'),
    extractFunction('summarizeAporteMovements', 'apTab'),
    extractFunction('filteredAporteRows', 'sortedAporteRows')
  ].join('\n'), context);
  return context;
}

test('maps only known movement categories and preserves unknown as unknown', () => {
  const context = createContext();
  const cases = [
    [{ operation: 'compra' }, 'compra'],
    [{ operation: 'renda-fixa' }, 'renda-fixa'],
    [{ operation: 'compra', type: 'Renda Fixa' }, 'renda-fixa'],
    [{ operation: 'custom', type: 'Outro' }, 'outro'],
    [{ type: 'Renda Fixa' }, 'renda-fixa'],
    [{ operation: 'venda' }, 'venda'],
    [{ operation: 'provento' }, 'provento'],
    [{ operation: 'reserva-entrada' }, 'reserva-entrada'],
    [{ operation: 'reserva-saida' }, 'reserva-saida'],
    [{ operation: 'aporte' }, 'aporte'],
    [{ operation: 'entrada' }, 'aporte'],
    [{ operation: 'transferencia-nao-mapeada' }, 'desconhecido'],
    [{ type: 'Ação' }, 'desconhecido']
  ];

  for (const [movement, expected] of cases) {
    assert.equal(context.aporteMovementKind(movement), expected);
  }
});

test('legacy Other remains neutral and RF asset rows keep their old category precedence', () => {
  const context = createContext();
  assert.equal(context.isNeutralMovement({ operation: 'custom', type: 'Outro' }), true);
  assert.equal(context.aporteMovementKind({ operation: 'compra', type: 'Renda Fixa' }), 'renda-fixa');
});
test('real classifier and real summarizer count canonical movement kinds separately', () => {
  const context = createContext();
  const inputs = [
    { operation: 'compra' },
    { operation: 'venda' },
    { operation: 'renda-fixa' },
    { operation: 'aporte' },
    { operation: 'entrada' },
    { operation: 'provento' },
    { operation: 'reserva-entrada' },
    { operation: 'reserva-saida' },
    { operation: 'outro' },
    { operation: 'transferencia-nao-mapeada' }
  ];
  const rows = inputs.map((movement, index) => ({
    id: String(index),
    kind: context.aporteMovementKind(movement),
    type: 'Ação'
  }));
  const summary = context.summarizeAporteMovements(rows);

  assert.equal(summary.total, 10);
  assert.equal(summary.buys, 1);
  assert.equal(summary.sells, 1);
  assert.equal(summary.fixedIncomeApplications, 1);
  assert.equal(summary.contributions, 2);
  assert.equal(summary.dividends, 1);
  assert.equal(summary.reserves, 2);
  assert.equal(summary.others, 1);
  assert.equal(summary.unknowns, 1);
  assert.match(context.aporteMovementSummaryText(summary, rows.length), /movimentações filtradas antes da paginação/);
});

test('investment summary distinguishes confirmed zero from missing and invalid values', () => {
  const context = createContext();
  const stats = context.aporteInvestmentStats([
    { operation: 'compra', totalValue: 0, date: '2026-01-02' },
    { operation: 'compra' },
    { operation: 'renda-fixa', totalValue: ' ', qty: 2, price: 50 },
    { operation: 'renda-fixa', totalValue: 'not-a-number' }
  ]);

  assert.equal(stats.total, 0);
  assert.equal(stats.rows.length, 1);
  assert.equal(stats.missingValueCount, 3);
  assert.equal(context.aporteInvestmentMetric(stats, 'total'), 'Parcial');
});

test('investment summary reports unavailable when every relevant amount is unknown', () => {
  const context = createContext();
  const stats = context.aporteInvestmentStats([{ operation: 'compra' }]);

  assert.equal(stats.missingValueCount, 1);
  assert.equal(context.aporteInvestmentMetric(stats, 'total'), 'Indisponível');
});

test('investment summary keeps confirmed zero as numeric zero when complete', () => {
  const context = createContext();
  const stats = context.aporteInvestmentStats([{ operation: 'compra', totalValue: 0 }]);

  assert.equal(stats.missingValueCount, 0);
  assert.equal(context.aporteInvestmentMetric(stats, 'total'), 'BRL 0.00');
});

test('unknown movement classification prevents a confirmed-zero contribution summary', () => {
  const context = createContext();
  const stats = context.aporteInvestmentStats([{ operation: 'transferencia-nao-mapeada', totalValue: 50 }]);

  assert.equal(stats.unknownMovementCount, 1);
  assert.equal(context.aporteInvestmentMetric(stats, 'total'), 'Indisponível');
});

test('summary helper absence or failure is unavailable, never false category zeroes', () => {
  const rows = [{ kind: 'compra', type: 'Ação' }];
  const noHelper = createContext(null);
  assert.equal(noHelper.summarizeAporteMovements(rows), null);

  const failing = createContext({ summarizeTransactions() { throw new Error('synthetic helper failure'); } });
  assert.equal(failing.summarizeAporteMovements(rows), null);
  assert.equal(failing.aporteMovementSummaryText(null, 1), '1 movimentações filtradas antes da paginação · resumo por tipo indisponível');
});

test('movement filters feed the summary before page slicing', () => {
  const context = createContext();
  const rows = Array.from({ length: 20 }, (_, index) => ({
    id: String(index),
    kind: index % 2 ? 'venda' : 'compra',
    type: 'Ação',
    ticker: index % 2 ? 'PETR4' : 'BBAS3',
    total: index + 1,
    date: '2026-01-01'
  }));
  context.S.aportesFilter = 'compra';
  context.S.apSearch = 'BBAS3';

  const filtered = Array.from(context.filteredAporteRows(rows));
  const page = filtered.slice(0, 15);
  const summary = context.summarizeAporteMovements(filtered);

  assert.equal(filtered.length, 10);
  assert.equal(page.length, 10);
  assert.equal(summary.total, 10);
  assert.equal(summary.buys, 10);
  assert.equal(summary.sells, 0);
});

test('unfiltered summary covers all rows before pagination', () => {
  const context = createContext();
  const rows = Array.from({ length: 20 }, (_, index) => ({
    id: String(index),
    kind: 'compra',
    type: 'Ação',
    total: index + 1
  }));
  const summary = context.summarizeAporteMovements(rows);
  const visiblePage = rows.slice(0, 15);

  assert.equal(summary.total, 20);
  assert.equal(visiblePage.length, 15);
  assert.ok(html.indexOf('summarizeAporteMovements(extractRows)') < html.indexOf('aporteExtractHtml(extractRows)'));
});

test('category filter keeps both reserve directions together', () => {
  const context = createContext();
  const rows = [
    { id: 'in', kind: 'reserva-entrada', type: 'Reserva de emergência' },
    { id: 'out', kind: 'reserva-saida', type: 'Reserva de emergência' },
    { id: 'buy', kind: 'compra', type: 'Ação' }
  ];
  context.S.aportesFilter = 'reserva';
  assert.deepEqual(Array.from(context.filteredAporteRows(rows), row => row.id), ['in', 'out']);
});
test('UI labels movement scope and renders helper failure as unavailable', () => {
  assert.ok(html.includes('aporteMovementSummaryText(movementSummary,extractRows.length)'));
  assert.ok(html.includes('movimentações filtradas antes da paginação'));
  assert.ok(html.includes('resumo por tipo indisponível'));
  assert.ok(!html.includes('buys:0,sells:0,contributions:0,others:0'));
});
