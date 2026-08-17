const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync('index.html', 'utf8');
const start = source.indexOf('function aporteInvestmentStats(');
const end = source.indexOf('\nfunction apTab()', start);
assert.ok(start >= 0 && end > start, 'helper de estatisticas de aportes nao encontrado');

function loadStats(rows) {
  const context = {
    S: { aportes: rows },
    aporteMovementKind(row) {
      const op = String(row.operation || row.op || '').toLowerCase();
      if (op.startsWith('reserva')) return op.includes('saida') ? 'reserva-saida' : 'reserva-entrada';
      if (op === 'venda') return 'venda';
      if (op === 'provento') return 'provento';
      if (op === 'outro') return 'outro';
      if (String(row.type || '') === 'Renda Fixa') return 'renda-fixa';
      return 'compra';
    },
    normalizeType(value, fallback) { return value || fallback; },
    aporteMovementLabel(row) { return row.operation === 'renda-fixa' ? 'Renda Fixa' : 'Compra'; },
    parseAnyDate(value) { const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? null : date; },
  };
  return vm.runInNewContext(`${source.slice(start, end)}\naporteInvestmentStats`, context)(rows);
}

test('aporteInvestmentStats conta somente entradas de investimento', () => {
  const stats = loadStats([
    { operation: 'compra', date: '2026-01-10', ticker: 'PETR4', qty: 10, price: 100, type: 'Ação' },
    { operation: 'renda-fixa', date: '2026-02-10', ticker: 'CDB', totalValue: 500, type: 'Renda Fixa' },
    { operation: 'venda', date: '2026-02-15', ticker: 'PETR4', qty: 1, price: 100 },
    { operation: 'provento', date: '2026-02-20', ticker: 'PETR4', value: 80 },
    { operation: 'outro', date: '2026-02-22', ticker: 'NOTA', value: 40 },
    { operation: 'reserva-entrada', date: '2026-02-25', ticker: 'Reserva', totalValue: 300, type: 'Reserva de emergência' },
  ]);

  assert.equal(stats.total, 1500);
  assert.equal(stats.average, 750);
  assert.equal(stats.largest, 1000);
  assert.equal(stats.months.length, 2);
  assert.deepEqual(Array.from(stats.months, item => item.value), [1000, 500]);
  assert.deepEqual(Array.from(stats.classes, item => item[0]), ['Ação', 'Renda Fixa']);
  assert.equal(stats.rows.length, 2);
});

test('aporteInvestmentStats preserva o contrato quando nao ha aportes', () => {
  const stats = loadStats([{ operation: 'venda', date: '2026-01-01', qty: 1, price: 10 }]);
  assert.equal(stats.total, 0);
  assert.equal(stats.average, 0);
  assert.equal(stats.largest, 0);
  assert.equal(stats.months.length, 0);
  assert.equal(stats.latest.length, 0);
});
