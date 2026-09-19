const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function source() {
  return fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
}

function context() {
  const html = source();
  const start = html.indexOf('function filteredAporteRows(');
  const end = html.indexOf('function deleteMovementLaunch(', start);
  assert.ok(start >= 0 && end > start, 'read model de movimentações precisa existir');
  const ctx = {
    S: { apSearch: '', aportesFilter: 'todos', aportesSort: 'date-desc' },
    parseAnyDate(value) {
      const date = new Date(`${String(value)}T12:00:00`);
      return Number.isNaN(date.getTime()) ? null : date;
    },
    String, Number, Date, Array, Map, Math, Object, RegExp, Intl,
  };
  vm.createContext(ctx);
  vm.runInContext(html.slice(start, end), ctx);
  const assetStart = html.indexOf('function assetDetailSortRecords(');
  const assetEnd = html.indexOf('function assetDetailRecords(', assetStart);
  assert.ok(assetStart >= 0 && assetEnd > assetStart, 'ordenação do detalhe do ativo precisa existir');
  vm.runInContext(html.slice(assetStart, assetEnd), ctx);
  return ctx;
}

function rows() {
  return [
    { date: '2026-02-01', ticker: 'ZZZ3', name: 'Zeta', kind: 'compra', total: 100 },
    { date: '2026-03-01', ticker: 'AAA3', name: 'Alfa', kind: 'venda', total: 900 },
    { date: '2026-01-01', ticker: 'BBB3', name: 'Beta', kind: 'provento', total: 25 },
  ];
}

test('V208 ordena o histórico de movimentações sem alterar os registros', () => {
  const ctx = context();
  const input = rows();
  ctx.S.aportesSort = 'date-desc';
  assert.deepEqual(Array.from(ctx.sortedAporteRows(input), row => row.ticker), ['AAA3', 'ZZZ3', 'BBB3']);
  ctx.S.aportesSort = 'asset-asc';
  assert.deepEqual(Array.from(ctx.sortedAporteRows(input), row => row.ticker), ['AAA3', 'BBB3', 'ZZZ3']);
  assert.deepEqual(input.map(row => row.ticker), ['ZZZ3', 'AAA3', 'BBB3']);
});

test('V208 mantém ordenação por valor e filtros locais previsíveis', () => {
  const ctx = context();
  const input = rows();
  ctx.S.aportesSort = 'value-asc';
  assert.deepEqual(Array.from(ctx.sortedAporteRows(input), row => row.total), [25, 100, 900]);
  ctx.S.aportesFilter = 'provento';
  assert.deepEqual(Array.from(ctx.filteredAporteRows(input), row => row.ticker), ['BBB3']);
});

test('V208 não introduz escrita financeira no contrato da área de histórico', () => {
  const html = source();
  const start = html.indexOf('function aporteSortControl(');
  const end = html.indexOf('function apTab(', start);
  const block = html.slice(start, end);
  assert.match(block, /aria-label="Ordenar histórico de movimentações"/);
  assert.equal(/\b(save|remove|delete|svP|save\()\b/i.test(block), false);
});

test('V208 ordena histórico do ativo por data sem alterar identidade ou valores', () => {
  const ctx = context();
  const input = [
    { id: 'old', date: '2025-01-01', value: 10 },
    { id: 'new', date: '2026-01-01', value: 20 },
    { id: 'unknown', value: 30 },
  ];
  assert.deepEqual(Array.from(ctx.assetDetailSortRecords(input), row => row.id), ['new', 'old', 'unknown']);
  assert.deepEqual(input.map(row => row.value), [10, 20, 30]);
});
